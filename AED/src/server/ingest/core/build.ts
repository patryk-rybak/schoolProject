import { loadSourceConfigsOrThrow } from "../config/loader";
import type { SourceConfig } from "../config/schema";
import { mapSourceRecords } from "./map";
import { parseRawSource } from "./parse";
import { RawSnapshotError, loadRawSnapshot } from "./raw";
import { validateCanonicalRecord } from "./validate";
import {
	type CoreDataset,
	type CoreManifest,
	type CoreSourceManifest,
	writeCoreDataset,
} from "./write";

export type BuildCoreOptions = {
	rawDir: string;
	outDir: string;
	sourceIds?: string[];
	write?: boolean;
};

function sourceManifest(
	config: SourceConfig,
	overrides: Partial<CoreSourceManifest> & {
		records_seen?: number;
		records_duplicate?: number;
		records_accepted?: number;
		records_rejected?: number;
		records_quarantined?: number;
		with_point?: number;
		address_only?: number;
		unresolved?: number;
	},
): CoreSourceManifest {
	const source = config.source;
	const license = source.license;
	return {
		source_id: source.id,
		source_name: source.name,
		publisher: source.publisher,
		license_id: license?.id ?? "unknown",
		license_url: license?.url ?? null,
		access_type: source.access_type,
		reliability_tier: source.reliability_tier,
		parser: config.connector.parser,
		enabled: config.source.enabled ?? true,
		publish_enabled: config.publish?.enabled ?? false,
		allowed_for_export: config.publish?.allowed_for_export ?? false,
		raw_file: null,
		raw_sha256: null,
		config_sha256: null,
		fetched_at: null,
		records_seen: 0,
		records_duplicate: 0,
		records_accepted: 0,
		records_rejected: 0,
		records_quarantined: 0,
		with_point: 0,
		address_only: 0,
		unresolved: 0,
		error: null,
		...overrides,
	};
}

export function buildCoreDataset(options: BuildCoreOptions): CoreDataset {
	const registry = loadSourceConfigsOrThrow();
	const selected = registry.configs.filter(
		(config) =>
			options.sourceIds === undefined ||
			options.sourceIds.includes(config.source.id),
	);
	const records: CoreDataset["records"] = [];
	const sources: CoreSourceManifest[] = [];
	const notes: string[] = [];
	const usedRecordIds = new Set<string>();
	let idCollisions = 0;

	for (const config of selected) {
		try {
			const snapshot = loadRawSnapshot(options.rawDir, config);
			const parsed = parseRawSource(config, snapshot.text);
			const mapped = mapSourceRecords(config, parsed.records);
			const licenseId = config.source.license?.id ?? "unknown";
			const accepted: CoreDataset["records"] = [];
			let rejected = mapped.rejected.length;
			let quarantined = 0;
			for (const { record } of mapped.mapped) {
				const validation = validateCanonicalRecord(config, record);
				if (validation.action === "reject") {
					rejected += 1;
					if (rejected <= 3) {
						notes.push(
							`${config.source.id}: odrzucono ${record.record_id}: ${validation.reason}`,
						);
					}
					continue;
				}
				if (validation.action === "quarantine") {
					quarantined += 1;
				}
				record.attributes = {
					...(record.attributes ?? {}),
					license_id: licenseId,
					publisher: config.source.publisher,
					source_name: config.source.name,
				};
				let recordId = record.record_id;
				let suffix = 1;
				while (usedRecordIds.has(recordId)) {
					suffix += 1;
					recordId = `${record.record_id}#${suffix}`;
				}
				if (suffix > 1) {
					idCollisions += 1;
					record.record_id = recordId;
				}
				usedRecordIds.add(recordId);
				accepted.push(record);
			}
			records.push(...accepted);
			const withPoint = accepted.filter(
				(record) => record.location_status === "point",
			).length;
			const addressOnly = accepted.filter(
				(record) => record.location_status === "address_only",
			).length;
			const unresolved = accepted.filter(
				(record) => record.location_status === "unresolved",
			).length;
			sources.push(
				sourceManifest(config, {
					address_only: addressOnly,
					config_sha256: snapshot.configSha256,
					fetched_at:
						typeof snapshot.meta.fetched_at === "string"
							? snapshot.meta.fetched_at
							: null,
					raw_file: snapshot.rawFile,
					raw_sha256: snapshot.sha256,
					records_accepted: accepted.length,
					records_duplicate: 0,
					records_quarantined: quarantined,
					records_rejected: rejected,
					records_seen: parsed.seen,
					unresolved,
					with_point: withPoint,
				}),
			);
			if (mapped.rejected.length > 0) {
				notes.push(
					`${config.source.id}: odrzucono ${mapped.rejected.length} rekordów (walidacja kanoniczna).`,
				);
			}
		} catch (error) {
			const code = error instanceof RawSnapshotError ? error.code : "parse";
			const message = error instanceof Error ? error.message : String(error);
			sources.push(
				sourceManifest(config, {
					error: `[${code}] ${message}`,
				}),
			);
			notes.push(`${config.source.id}: ${message}`);
		}
	}

	sources.sort((a, b) => a.source_id.localeCompare(b.source_id));
	records.sort((a, b) => a.record_id.localeCompare(b.record_id));
	if (idCollisions > 0) {
		notes.push(
			`${idCollisions} kolizji record_id rozwiązano sufiksem #N; właściwy dedupe po wspólnym schemacie.`,
		);
	}
	const licenses: Record<string, number> = {};
	for (const record of records) {
		const attributes =
			record.attributes !== null && typeof record.attributes === "object"
				? record.attributes
				: {};
		const license =
			typeof attributes["license_id"] === "string"
				? attributes["license_id"]
				: "unknown";
		licenses[license] = (licenses[license] ?? 0) + 1;
	}
	const publicCount = records.filter(
		(record) => record.publish_state === "published",
	).length;
	const mappableCount = records.filter(
		(record) =>
			(record.location_status === "point" ||
				record.location_status === "geocoded") &&
			record.lat !== null &&
			record.lon !== null,
	).length;
	const manifest: CoreManifest = {
		version: 1,
		generated_at: new Date().toISOString(),
		source_count: sources.length,
		record_count: records.length,
		public_count: publicCount,
		internal_count: records.length - publicCount,
		mappable_count: mappableCount,
		licenses,
		sources,
		notes,
	};

	return { manifest, records };
}

export function buildAndWriteCoreDataset(options: BuildCoreOptions): CoreDataset {
	const dataset = buildCoreDataset(options);
	if (options.write !== false) {
		writeCoreDataset(options.outDir, dataset);
	}
	return dataset;
}
