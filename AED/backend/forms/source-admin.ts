import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
	type CanonicalAedRecord,
	parseCanonicalAedRecord,
} from "../../src/server/ingest/canonical.ts";
import {
	defaultDatasourcesConfigPath,
	reloadSourceConfigs,
} from "../../src/server/ingest/config/loader.ts";
import {
	type SourceConfigInput,
	safeParseSourceConfig,
} from "../../src/server/ingest/config/schema.ts";
import { mapSourceRecords } from "../../src/server/ingest/core/map.ts";
import { parseRawSource } from "../../src/server/ingest/core/parse.ts";
import { validateCanonicalRecord } from "../../src/server/ingest/core/validate.ts";
import { fetchSource } from "../../src/server/ingest/fetch/source-fetch.ts";
import {
	addAedDevices,
	canonicalToRow,
	deleteAedDevicesBySource,
} from "../store/aed-store.ts";
import process from "node:process";

/**
 * Server-side admin operations behind the source forms (/zrodla):
 * list the registry, save a new connector config, preview its raw columns,
 * and run a single-source import into the dev store.
 *
 * Saving rewrites `backend/ingest/datasources-config.json` atomically after
 * validating the merged registry, so a bad form submission can never corrupt
 * the file. Imports reuse the ingest pipeline (fetch -> parse -> map ->
 * validate) and replace the store rows of that source.
 */

export interface SourceListItem {
	id: string;
	name: string;
	enabled: boolean;
	family: string;
	parser: string;
	url: string | null;
}

export class SourceAdminError extends Error {
	readonly issues: readonly { path: string; message: string }[];

	constructor(
		message: string,
		issues: readonly { path: string; message: string }[] = [],
	) {
		super(message);
		this.name = "SourceAdminError";
		this.issues = issues;
	}
}

function registryPath(): string {
	return defaultDatasourcesConfigPath();
}

function readRegistryJson(): { version: 1; sources: unknown[] } {
	const path = registryPath();
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		throw new SourceAdminError(
			`Nie można odczytać rejestru źródeł (${path}): ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	const registry = parsed as { version?: unknown; sources?: unknown };
	if (registry.version !== 1 || !Array.isArray(registry.sources)) {
		throw new SourceAdminError("Rejestr źródeł ma nieoczekiwany format.");
	}
	return { version: 1, sources: registry.sources };
}

function writeRegistryJson(sources: readonly unknown[]): void {
	const path = registryPath();
	mkdirSync(dirname(path), { recursive: true });
	const tmp = `${path}.tmp`;
	writeFileSync(
		tmp,
		`${JSON.stringify({ version: 1, sources }, null, "\t")}\n`,
	);
	renameSync(tmp, path);
	reloadSourceConfigs();
}

export function listSources(): SourceListItem[] {
	const registry = reloadSourceConfigs();
	if (registry.errors.length > 0) {
		throw new SourceAdminError(
			`Rejestr źródeł zawiera błędy: ${registry.errors
				.flatMap((error) => error.issues.map((issue) => issue.message))
				.join("; ")}`,
		);
	}
	return registry.configs.map((config) => ({
		id: config.source.id,
		name: config.source.name,
		enabled: config.source.enabled !== false,
		family: config.connector.family,
		parser: config.connector.parser,
		url: "fetch" in config ? config.fetch.url : null,
	}));
}

/**
 * Validates and appends one connector config to the registry.
 * `input` is the full SourceConfig object built by the form.
 */
export function saveSourceConfig(input: unknown): SourceListItem {
	const parsed = safeParseSourceConfig(input);
	if (!parsed.success) {
		throw new SourceAdminError(
			"Konfiguracja źródła jest niepoprawna.",
			parsed.error.issues.map((issue) => ({
				path: issue.path.map(String).join("."),
				message: issue.message,
			})),
		);
	}
	const config = parsed.data;
	const registry = readRegistryJson();
	const exists = registry.sources.some((entry) => {
		const source = (entry as { source?: { id?: unknown } }).source;
		return source?.id === config.source.id;
	});
	if (exists) {
		throw new SourceAdminError(
			`Źródło o identyfikatorze "${config.source.id}" już istnieje.`,
			[{ path: "source.id", message: "Identyfikator musi być unikalny." }],
		);
	}
	writeRegistryJson([...registry.sources, config]);
	return {
		id: config.source.id,
		name: config.source.name,
		enabled: config.source.enabled !== false,
		family: config.connector.family,
		parser: config.connector.parser,
		url: "fetch" in config ? config.fetch.url : null,
	};
}

function configSha256(config: SourceConfigInput): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(JSON.stringify(config));
	return hasher.digest("hex");
}

/** JsonValue: TanStack server fns require serializable payloads (no unknown). */
export type PreviewValue =
	| string
	| number
	| boolean
	| null
	| PreviewValue[]
	| { [key: string]: PreviewValue };

export interface SourcePreview {
	columns: string[];
	sample: Record<string, PreviewValue>[];
	recordCount: number;
}

const PREVIEW_SAMPLE_ROWS = 5;
const PREVIEW_MAX_COLUMNS = 60;

/**
 * Fetches (or reads the existing snapshot of) a source and returns its raw
 * columns plus sample rows, so the form can build the column mapping.
 * Accepts an unsaved config; the snapshot lands in .data/core/raw like a
 * regular ingest run.
 */
export async function previewSource(input: unknown): Promise<SourcePreview> {
	const parsed = safeParseSourceConfig(input);
	if (!parsed.success) {
		throw new SourceAdminError(
			"Konfiguracja źródła jest niepoprawna.",
			parsed.error.issues.map((issue) => ({
				path: issue.path.map(String).join("."),
				message: issue.message,
			})),
		);
	}
	const config = parsed.data;
	const rawDir = resolve(process.cwd(), ".data/core/raw");
	const result = await fetchSource(config, {
		rawDir,
		includeDisabled: true,
		configSha256: configSha256(config),
	});
	if (!result.ok || result.rawFile === null) {
		throw new SourceAdminError(
			`Nie udało się pobrać źródła: ${result.error ?? result.status}`,
		);
	}
	const body = readFileSync(result.rawFile);
	const text = new TextDecoder("utf-8").decode(body);
	const parsedSource = parseRawSource(config, text, body);
	const columns: string[] = [];
	const seen = new Set<string>();
	for (const record of parsedSource.records.slice(0, PREVIEW_SAMPLE_ROWS * 4)) {
		for (const key of Object.keys(record)) {
			if (!seen.has(key) && columns.length < PREVIEW_MAX_COLUMNS) {
				seen.add(key);
				columns.push(key);
			}
		}
	}
	return {
		columns,
		// Parsed rows come from JSON/CSV/KML text, so they are JSON values.
		sample: parsedSource.records.slice(0, PREVIEW_SAMPLE_ROWS) as Record<
			string,
			PreviewValue
		>[],
		recordCount: parsedSource.seen,
	};
}

export interface SourceImportResult {
	sourceId: string;
	seen: number;
	accepted: number;
	rejected: number;
	withPoint: number;
	stored: number;
	notes: string[];
}

function rawDirFor(): string {
	return resolve(process.cwd(), ".data/core/raw");
}

/**
 * Runs the single-source ingest pipeline and replaces the source's rows in
 * the dev store. Records without a point are counted but not stored (the dev
 * table requires lat/lon); the full canonical record is kept per row.
 */
export async function importSource(
	sourceId: string,
): Promise<SourceImportResult> {
	const registry = reloadSourceConfigs();
	const config = registry.byId.get(sourceId);
	if (!config) {
		throw new SourceAdminError(`Nieznane źródło: ${sourceId}.`);
	}
	const rawDir = rawDirFor();
	const result = await fetchSource(config, {
		rawDir,
		includeDisabled: true,
		configSha256: configSha256(config),
	});
	if (!result.ok || result.rawFile === null) {
		throw new SourceAdminError(
			`Nie udało się pobrać źródła: ${result.error ?? result.status}`,
		);
	}
	const body = readFileSync(result.rawFile);
	const parsedSource = parseRawSource(
		config,
		new TextDecoder("utf-8").decode(body),
		body,
	);
	const mapped = mapSourceRecords(config, parsedSource.records);
	const notes: string[] = [];
	const accepted: CanonicalAedRecord[] = [];
	let rejected = mapped.rejected.length;
	for (const { record } of mapped.mapped) {
		const validation = validateCanonicalRecord(config, record);
		if (validation.action === "reject") {
			rejected += 1;
			if (notes.length < 5) {
				notes.push(`Odrzucono ${record.record_id}: ${validation.reason}`);
			}
			continue;
		}
		accepted.push(parseCanonicalAedRecord(record));
	}
	const withPoint = accepted.filter(
		(record) => record.lat !== null && record.lon !== null,
	);
	const removed = deleteAedDevicesBySource(config.source.id);
	if (removed > 0) {
		notes.push(`Zastąpiono ${removed} wcześniejszych rekordów tego źródła.`);
	}
	const stored = addAedDevices(
		withPoint.map((record) => canonicalToRow(record, config.source.id)),
	).length;
	return {
		sourceId: config.source.id,
		seen: parsedSource.seen,
		accepted: accepted.length,
		rejected,
		withPoint: withPoint.length,
		stored,
		notes,
	};
}

/** Removes a source config from the registry and its rows from the store. */
export function deleteSource(sourceId: string): { removedRows: number } {
	const registry = readRegistryJson();
	const next = registry.sources.filter((entry) => {
		const source = (entry as { source?: { id?: unknown } }).source;
		return source?.id !== sourceId;
	});
	if (next.length === registry.sources.length) {
		throw new SourceAdminError(`Nieznane źródło: ${sourceId}.`);
	}
	writeRegistryJson(next);
	return { removedRows: deleteAedDevicesBySource(sourceId) };
}
