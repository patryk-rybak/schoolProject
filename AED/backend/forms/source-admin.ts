import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import {
	defaultDatasourcesConfigPath,
	reloadSourceConfigs,
} from "../../src/server/ingest/config/loader.ts";
import {
	type SourceConfigInput,
	safeParseSourceConfig,
} from "../../src/server/ingest/config/schema.ts";
import { parseRawSource } from "../../src/server/ingest/core/parse.ts";
import { fetchSource } from "../../src/server/ingest/fetch/source-fetch.ts";
import { deleteSourceAedDevices } from "../store/aed-store.ts";

/**
 * Server-side admin operations behind the source forms (/zrodla):
 * list the registry, save a new connector config, preview its raw columns,
 * and remove a source together with its stored rows.
 *
 * Saving rewrites `backend/ingest/datasources-config.json` atomically after
 * validating the merged registry, so a bad form submission can never corrupt
 * the file. Ingesting the registered sources is a separate, scheduled step
 * (`bun scripts/ingest-run.ts`); the UI never imports to the map directly.
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
			`Nie udało się odczytać rejestru źródeł (${path}): ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	const registry = parsed as { version?: unknown; sources?: unknown };
	if (registry.version !== 1 || !Array.isArray(registry.sources)) {
		throw new SourceAdminError("Rejestr źródeł ma nieprawidłowy format.");
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
			`Rejestr źródeł zawiera błędy w konfiguracji: ${registry.errors
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
			"Konfiguracja źródła jest nieprawidłowa.",
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
			`Źródło o identyfikatorze "${config.source.id}" już istnieje w rejestrze.`,
			[
				{
					path: "source.id",
					message: "Identyfikator źródła musi być unikalny.",
				},
			],
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
			"Konfiguracja źródła jest nieprawidłowa.",
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
			`Nie udało się pobrać danych źródła: ${result.error ?? result.status}`,
		);
	}
	const body = readFileSync(resolve(rawDir, result.rawFile));
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

/** Removes a source config and only its imported rows. */
export function deleteSource(sourceId: string): { removedRows: number } {
	const registry = readRegistryJson();
	const next = registry.sources.filter((entry) => {
		const source = (entry as { source?: { id?: unknown } }).source;
		return source?.id !== sourceId;
	});
	if (next.length === registry.sources.length) {
		throw new SourceAdminError(`Nie znaleziono źródła: ${sourceId}.`);
	}
	writeRegistryJson(next);
	return { removedRows: deleteSourceAedDevices(sourceId) };
}
