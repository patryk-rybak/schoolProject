import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { type SourceConfig, sourceConfigSchema } from "./schema";

/**
 * Loads the JSON source configurations from disk into one validated,
 * in-memory registry. The registry is the runtime boundary between the
 * declarative config files and the ingestion code: nothing downstream should
 * read `backend/ingest/sources/*.json` directly.
 */

export const SOURCE_CONFIG_DIR_ENV = "AED_SOURCE_CONFIG_DIR";

export type SourceConfigIssue = {
	path: string;
	message: string;
	code: string;
};

export type SourceConfigFileError = {
	file: string;
	sourceId?: string;
	issues: SourceConfigIssue[];
};

export type SourceConfigSummary = {
	total: number;
	enabled: number;
	publishable: number;
	addressOnly: number;
	withCoordinates: number;
	byParser: Record<string, number>;
	byFamily: Record<string, number>;
};

export type SourceConfigRegistry = {
	configDir: string;
	loadedAt: string;
	configs: readonly SourceConfig[];
	byId: ReadonlyMap<string, SourceConfig>;
	errors: readonly SourceConfigFileError[];
	summary: SourceConfigSummary;
};

export class SourceConfigRegistryError extends Error {
	readonly errors: readonly SourceConfigFileError[];

	constructor(message: string, errors: readonly SourceConfigFileError[]) {
		super(message);
		this.name = "SourceConfigRegistryError";
		this.errors = errors;
	}
}

export type LoadSourceConfigsOptions = {
	/** Override the config directory. Defaults to AED_SOURCE_CONFIG_DIR or backend/ingest/sources. */
	dir?: string;
	/** Read every file again instead of returning the cached registry. */
	force?: boolean;
	/** Keep disabled configs in the registry. Defaults to true. */
	includeDisabled?: boolean;
};

let cachedRegistry: SourceConfigRegistry | undefined;

export function defaultSourceConfigDir(): string {
	return resolve(
		process.env[SOURCE_CONFIG_DIR_ENV]?.trim() ||
			join(process.cwd(), "backend", "ingest", "sources"),
	);
}

function zodIssues(error: {
	issues: readonly {
		path: readonly PropertyKey[];
		message: string;
		code: string;
	}[];
}): SourceConfigIssue[] {
	return error.issues.map((issue) => ({
		path: issue.path.map(String).join("."),
		message: issue.message,
		code: issue.code,
	}));
}

function listJsonFiles(dir: string): string[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith(".json"))
		.sort((left, right) => left.localeCompare(right, "pl"));
}

function parseFile(
	dir: string,
	file: string,
): { config?: SourceConfig; error?: SourceConfigFileError } {
	const path = join(dir, file);
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch (cause) {
		return {
			error: {
				file,
				issues: [
					{
						path: "",
						code: "file_read",
						message: cause instanceof Error ? cause.message : String(cause),
					},
				],
			},
		};
	}

	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (cause) {
		return {
			error: {
				file,
				issues: [
					{
						path: "",
						code: "json_parse",
						message: cause instanceof Error ? cause.message : String(cause),
					},
				],
			},
		};
	}

	const parsed = sourceConfigSchema.safeParse(value);
	if (!parsed.success) {
		const sourceId =
			value !== null &&
			typeof value === "object" &&
			"source" in value &&
			value.source !== null &&
			typeof value.source === "object" &&
			"id" in value.source &&
			typeof value.source.id === "string"
				? value.source.id
				: undefined;
		return {
			error: {
				file,
				...(sourceId ? { sourceId } : {}),
				issues: zodIssues(parsed.error),
			},
		};
	}

	return { config: parsed.data };
}

function summarize(configs: readonly SourceConfig[]): SourceConfigSummary {
	const byParser: Record<string, number> = {};
	const byFamily: Record<string, number> = {};
	let enabled = 0;
	let publishable = 0;
	let addressOnly = 0;
	let withCoordinates = 0;

	for (const config of configs) {
		byParser[config.connector.parser] =
			(byParser[config.connector.parser] ?? 0) + 1;
		byFamily[config.connector.family] =
			(byFamily[config.connector.family] ?? 0) + 1;
		if (config.source.enabled !== false) enabled += 1;
		if (
			config.publish?.enabled === true &&
			config.publish.allowed_for_export === true
		) {
			publishable += 1;
		}
		const requireLocation = config.validate.require_location;
		if (
			requireLocation === "address" ||
			requireLocation === "address_or_point"
		) {
			addressOnly += 1;
		}
		if (config.map.lat !== undefined && config.map.lon !== undefined) {
			withCoordinates += 1;
		}
	}

	return {
		total: configs.length,
		enabled,
		publishable,
		addressOnly,
		withCoordinates,
		byParser: Object.fromEntries(
			Object.entries(byParser).sort(([left], [right]) =>
				left.localeCompare(right),
			),
		),
		byFamily: Object.fromEntries(
			Object.entries(byFamily).sort(([left], [right]) =>
				left.localeCompare(right),
			),
		),
	};
}

export function loadSourceConfigs(
	options: LoadSourceConfigsOptions = {},
): SourceConfigRegistry {
	if (cachedRegistry && options.force !== true) {
		return cachedRegistry;
	}

	const dir = resolve(options.dir ?? defaultSourceConfigDir());
	const includeDisabled = options.includeDisabled ?? true;
	const configs: SourceConfig[] = [];
	const errors: SourceConfigFileError[] = [];
	const byId = new Map<string, SourceConfig>();

	for (const file of listJsonFiles(dir)) {
		const result = parseFile(dir, file);
		if (result.error) {
			errors.push(result.error);
			continue;
		}
		if (!result.config) continue;
		if (!includeDisabled && result.config.source.enabled === false) continue;

		const existing = byId.get(result.config.source.id);
		if (existing) {
			errors.push({
				file,
				sourceId: result.config.source.id,
				issues: [
					{
						path: "source.id",
						code: "duplicate_id",
						message: `Identyfikator ${result.config.source.id} już występuje w rejestrze.`,
					},
				],
			});
			continue;
		}

		byId.set(result.config.source.id, result.config);
		configs.push(result.config);
		const expectedFile = `${result.config.source.id}.json`;
		if (file !== expectedFile) {
			errors.push({
				file,
				sourceId: result.config.source.id,
				issues: [
					{
						path: "source.id",
						code: "filename_mismatch",
						message: `Plik powinien nazywać się ${expectedFile}, a nazywa się ${file}.`,
					},
				],
			});
		}
	}

	configs.sort((left, right) =>
		left.source.id.localeCompare(right.source.id, "pl"),
	);

	const registry: SourceConfigRegistry = {
		configDir: dir,
		loadedAt: new Date().toISOString(),
		configs,
		byId,
		errors,
		summary: summarize(configs),
	};

	cachedRegistry = registry;
	return registry;
}

/** Loads the registry and throws one aggregated error when any file is invalid. */
export function loadSourceConfigsOrThrow(
	options: LoadSourceConfigsOptions = {},
): SourceConfigRegistry {
	const registry = loadSourceConfigs(options);
	if (registry.errors.length > 0) {
		const details = registry.errors
			.map((error) => {
				const issues = error.issues
					.map((issue) => `${issue.path || "<root>"}: ${issue.message}`)
					.join("; ");
				return `${error.file}: ${issues}`;
			})
			.join("\n");
		throw new SourceConfigRegistryError(
			`Nie można załadować ${registry.errors.length} konfiguracji źródeł.\n${details}`,
			registry.errors,
		);
	}
	return registry;
}

export function getSourceConfigs(): readonly SourceConfig[] {
	return loadSourceConfigs().configs;
}

export function getSourceConfig(id: string): SourceConfig | undefined {
	return loadSourceConfigs().byId.get(id);
}

export function getEnabledSourceConfigs(): readonly SourceConfig[] {
	return getSourceConfigs().filter((config) => config.source.enabled !== false);
}

export function getSourceConfigSummary(): SourceConfigSummary {
	return loadSourceConfigs().summary;
}

export function clearSourceConfigCache(): void {
	cachedRegistry = undefined;
}

/** Reloads all files from disk and returns the fresh registry. */
export function reloadSourceConfigs(
	options: Omit<LoadSourceConfigsOptions, "force"> = {},
): SourceConfigRegistry {
	return loadSourceConfigs({ ...options, force: true });
}
