import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CanonicalAedRecord } from "../canonical";

export type CoreSourceManifest = {
	source_id: string;
	source_name: string;
	publisher: string;
	license_id: string;
	license_url: string | null;
	access_type: string;
	reliability_tier: string;
	parser: string;
	enabled: boolean;
	publish_enabled: boolean;
	allowed_for_export: boolean;
	raw_file: string | null;
	raw_sha256: string | null;
	config_sha256: string | null;
	fetched_at: string | null;
	records_seen: number;
	records_duplicate: number;
	records_accepted: number;
	records_rejected: number;
	records_quarantined: number;
	with_point: number;
	address_only: number;
	unresolved: number;
	error: string | null;
};

export type CoreManifest = {
	version: 1;
	generated_at: string;
	source_count: number;
	record_count: number;
	public_count: number;
	internal_count: number;
	mappable_count: number;
	licenses: Record<string, number>;
	sources: CoreSourceManifest[];
	notes: string[];
};

export type CoreDataset = {
	records: CanonicalAedRecord[];
	manifest: CoreManifest;
};

function json(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return "";
	const text = String(value);
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function feature(record: CanonicalAedRecord): Record<string, unknown> | null {
	if (
		(record.location_status !== "point" &&
			record.location_status !== "geocoded") ||
		record.lat === null ||
		record.lon === null
	) {
		return null;
	}
	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates: [record.lon, record.lat],
		},
		properties: {
			...record,
			field_provenance: record.field_provenance ?? {},
		},
	};
}

function featureCollection(records: CanonicalAedRecord[]): Record<string, unknown> {
	const features = records
		.map(feature)
		.filter((entry): entry is Record<string, unknown> => entry !== null);
	return {
		type: "FeatureCollection",
		features,
	};
}

function writeCsv(path: string, records: CanonicalAedRecord[]): void {
	const columns = [
		"record_id",
		"source_id",
		"source_record_id",
		"name",
		"lat",
		"lon",
		"address_text",
		"city",
		"access_type",
		"verification_status",
		"confidence",
		"license_id",
		"publish_state",
		"claim_status",
		"source_url",
	];
	const lines = [columns.join(",")];
	for (const record of records) {
		const attributes =
			record.attributes !== null && typeof record.attributes === "object"
				? record.attributes
				: {};
		const license =
			typeof attributes["license_id"] === "string"
				? attributes["license_id"]
				: "";
		lines.push(
			[
				record.record_id,
				record.source_id,
				record.source_record_id,
				record.name,
				record.lat,
				record.lon,
				record.address_text,
				typeof attributes["city"] === "string" ? attributes["city"] : "",
				record.access_type,
				record.verification_status,
				record.confidence,
				license,
				record.publish_state,
				record.claim_status,
				record.source_url,
			]
				.map(csvCell)
				.join(","),
		);
	}
	writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

function writeSqlite(
	path: string,
	records: CanonicalAedRecord[],
	manifest: CoreManifest,
): void {
	const db = new Database(path, { create: true });
	db.exec("PRAGMA journal_mode = WAL;");
	db.exec("PRAGMA synchronous = NORMAL;");
	db.exec("DROP TABLE IF EXISTS source; DROP TABLE IF EXISTS aed_core;");
	db.exec(`
		CREATE TABLE IF NOT EXISTS source (
			source_id TEXT PRIMARY KEY,
			source_name TEXT NOT NULL,
			publisher TEXT NOT NULL,
			license_id TEXT NOT NULL,
			license_url TEXT,
			access_type TEXT NOT NULL,
			reliability_tier TEXT NOT NULL,
			parser TEXT NOT NULL,
			enabled INTEGER NOT NULL,
			publish_enabled INTEGER NOT NULL,
			allowed_for_export INTEGER NOT NULL,
			raw_file TEXT,
			raw_sha256 TEXT,
			config_sha256 TEXT,
			fetched_at TEXT,
			records_seen INTEGER NOT NULL,
			records_duplicate INTEGER NOT NULL,
			records_accepted INTEGER NOT NULL,
			records_rejected INTEGER NOT NULL,
			records_quarantined INTEGER NOT NULL,
			with_point INTEGER NOT NULL,
			address_only INTEGER NOT NULL,
			unresolved INTEGER NOT NULL,
			error TEXT
		);
		CREATE TABLE IF NOT EXISTS aed_core (
			record_id TEXT PRIMARY KEY,
			source_id TEXT NOT NULL,
			source_record_id TEXT NOT NULL,
			name TEXT,
			lat REAL,
			lon REAL,
			address_text TEXT,
			city TEXT,
			access_type TEXT,
			verification_status TEXT,
			confidence REAL,
			license_id TEXT,
			publish_state TEXT NOT NULL,
			claim_status TEXT NOT NULL,
			claimed_by TEXT,
			claimed_at TEXT,
			claim_note TEXT,
			source_url TEXT,
			attributes_json TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_aed_core_source ON aed_core(source_id);
		CREATE INDEX IF NOT EXISTS idx_aed_core_publish ON aed_core(publish_state);
		CREATE TABLE IF NOT EXISTS owner_claim (
			claim_id TEXT PRIMARY KEY,
			record_id TEXT NOT NULL,
			claimed_by TEXT NOT NULL,
			status TEXT NOT NULL,
			created_at TEXT NOT NULL,
			verified_at TEXT,
			note TEXT
		);
		CREATE INDEX IF NOT EXISTS idx_owner_claim_record ON owner_claim(record_id);
	`);
	db.exec("DELETE FROM source;");
	db.exec("DELETE FROM aed_core;");

	const insertSource = db.prepare(`
		INSERT INTO source VALUES (
			$source_id, $source_name, $publisher, $license_id, $license_url,
			$access_type, $reliability_tier, $parser, $enabled, $publish_enabled,
			$allowed_for_export, $raw_file, $raw_sha256, $config_sha256, $fetched_at,
			$records_seen, $records_duplicate, $records_accepted, $records_rejected,
			$records_quarantined, $with_point, $address_only, $unresolved, $error
		)
	`);
	const insertRecord = db.prepare(`
		INSERT INTO aed_core VALUES (
			$record_id, $source_id, $source_record_id, $name, $lat, $lon,
			$address_text, $city, $access_type, $verification_status, $confidence,
			$license_id, $publish_state, $claim_status, $claimed_by, $claimed_at,
			$claim_note, $source_url, $attributes_json
		)
	`);

	const write = db.transaction(() => {
		for (const source of manifest.sources) {
			insertSource.run({
				$access_type: source.access_type,
				$address_only: source.address_only,
				$allowed_for_export: source.allowed_for_export ? 1 : 0,
				$config_sha256: source.config_sha256,
				$enabled: source.enabled ? 1 : 0,
				$error: source.error,
				$fetched_at: source.fetched_at,
				$license_id: source.license_id,
				$license_url: source.license_url,
				$parser: source.parser,
				$publish_enabled: source.publish_enabled ? 1 : 0,
				$publisher: source.publisher,
				$raw_file: source.raw_file,
				$raw_sha256: source.raw_sha256,
				$records_accepted: source.records_accepted,
				$records_rejected: source.records_rejected,
				$records_duplicate: source.records_duplicate,
				$records_quarantined: source.records_quarantined,
				$records_seen: source.records_seen,
				$reliability_tier: source.reliability_tier,
				$source_id: source.source_id,
				$source_name: source.source_name,
				$unresolved: source.unresolved,
				$with_point: source.with_point,
			});
		}
		for (const record of records) {
			const attributes =
				record.attributes !== null && typeof record.attributes === "object"
					? record.attributes
					: {};
			insertRecord.run({
				$access_type: record.access_type,
				$address_text: record.address_text,
				$attributes_json: JSON.stringify(attributes),
				$city: typeof attributes["city"] === "string" ? attributes["city"] : null,
				$confidence: record.confidence,
				$lat: record.lat,
				$license_id:
					typeof attributes["license_id"] === "string"
						? attributes["license_id"]
						: null,
				$lon: record.lon,
				$name: record.name,
				$publish_state: record.publish_state,
				$claim_status: record.claim_status,
				$claimed_by: record.claimed_by,
				$claimed_at: record.claimed_at,
				$claim_note: record.claim_note,
				$record_id: record.record_id,
				$source_id: record.source_id,
				$source_record_id: record.source_record_id,
				$source_url: record.source_url,
				$verification_status: record.verification_status,
			});
		}
	});
	write();
	db.close();
}

export function writeCoreDataset(outDir: string, dataset: CoreDataset): void {
	mkdirSync(outDir, { recursive: true });
	const { records, manifest } = dataset;
	const published = records.filter((record) => record.publish_state === "published");
	const internal = records.filter((record) => record.publish_state !== "published");
	const osm = published.filter((record) => record.source_id === "openaedmap");
	const local = published.filter((record) => record.source_id !== "openaedmap");

	writeFileSync(join(outDir, "core.json"), json(records), "utf8");
	writeFileSync(join(outDir, "core-public.json"), json(published), "utf8");
	writeFileSync(join(outDir, "core-internal.json"), json(internal), "utf8");
	writeFileSync(join(outDir, "core.geojson"), json(featureCollection(records)), "utf8");
	writeFileSync(
		join(outDir, "core-public.geojson"),
		json(featureCollection(published)),
		"utf8",
	);
	writeFileSync(
		join(outDir, "core-public-osm.geojson"),
		json(featureCollection(osm)),
		"utf8",
	);
	writeFileSync(
		join(outDir, "core-public-local.geojson"),
		json(featureCollection(local)),
		"utf8",
	);
	writeCsv(join(outDir, "core.csv"), records);
	writeSqlite(join(outDir, "core.sqlite"), records, manifest);
	writeFileSync(join(outDir, "manifest.json"), json(manifest), "utf8");
}
