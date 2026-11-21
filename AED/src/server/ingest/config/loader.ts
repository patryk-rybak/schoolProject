import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
	type DatasourcesConfig,
	datasourcesConfigSchema,
	type SourceConfig,
} from "./schema";

/**
 * Loads the single canonical datasources registry from disk into one validated,
 * in-memory registry. The registry is the runtime boundary between the
 * declarative config file and the ingestion code: nothing downstream should
 * read `backend/ingest/datasources-config.json` directly.
 */

export const DATASOURCES_CONFIG_ENV = "AED_DATASOURCES_CONFIG";

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
	withCoordinates: number;
	byParser: Record<string, number>;
	byFamily: Record<string, number>;
};

export type SourceConfigRegistry = {
	/** Directory containing the registry file. Kept for backwards compatibility. */
	configDir: string;
	/** Resolved path of the registry file. */
	configPath: string;
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
	/** Override the registry file path. Defaults to AED_DATASOURCES_CONFIG or backend/ingest/datasources-config.json. */
	path?: string;
	/** Read the file again instead of returning the cached registry. */
	force?: boolean;
	/** Keep disabled configs in the registry. Defaults to true. */
	includeDisabled?: boolean;
};

let cachedRegistry: SourceConfigRegistry | undefined;

export function defaultDatasourcesConfigPath(): string {
	return resolve(
		process.env[DATASOURCES_CONFIG_ENV]?.trim() ||
			join(process.cwd(), "backend", "ingest", "datasources-config.json"),
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

function readSourceId(entry: unknown): string | undefined {
	if (entry === null || typeof entry !== "object" || !("source" in entry)) {
		return undefined;
	}
	const source = entry.source;
	if (source === null || typeof source !== "object" || !("id" in source)) {
		return undefined;
	}
	return typeof source.id === "string" ? source.id : undefined;
}

function duplicateIdErrors(
	file: string,
	value: unknown,
): SourceConfigFileError[] {
	if (
		value === null ||
		typeof value !== "object" ||
		!("sources" in value) ||
		!Array.isArray(value.sources)
	) {
		return [];
	}

	const firstIndexById = new Map<string, number>();
	const errors: SourceConfigFileError[] = [];

	value.sources.forEach((entry, index) => {
		const sourceId = readSourceId(entry);
		if (sourceId === undefined) return;
		const firstIndex = firstIndexById.get(sourceId);
		if (firstIndex === undefined) {
			firstIndexById.set(sourceId, index);
			return;
		}
		errors.push({
			file,
			sourceId,
			issues: [
				{
					path: `sources.${index}.source.id`,
					code: "duplicate_id",
					message: `Identyfikator ${sourceId} już występuje w rejestrze (pierwsze wystąpienie: sources.${firstIndex}).`,
				},
			],
		});
	});

	return errors;
}

function parseRegistryFile(configPath: string): {
	config?: DatasourcesConfig;
	errors?: SourceConfigFileError[];
} {
	const file = basename(configPath);
	let text: string;
	try {
		text = readFileSync(configPath, "utf8");
	} catch (cause) {
		return {
			errors: [
				{
					file,
					issues: [
						{
							path: "",
							code: "file_read",
							message: cause instanceof Error ? cause.message : String(cause),
						},
					],
				},
			],
		};
	}

	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (cause) {
		return {
			errors: [
				{
					file,
					issues: [
						{
							path: "",
							code: "json_parse",
							message: cause instanceof Error ? cause.message : String(cause),
						},
					],
				},
			],
		};
	}

	const duplicates = duplicateIdErrors(file, value);
	if (duplicates.length > 0) {
		return { errors: duplicates };
	}

	const parsed = datasourcesConfigSchema.safeParse(value);
	if (!parsed.success) {
		return {
			errors: [
				{
					file,
					issues: zodIssues(parsed.error),
				},
			],
		};
	}

	return { config: parsed.data };
}

function summarize(configs: readonly SourceConfig[]): SourceConfigSummary {
	const byParser: Record<string, number> = {};
	const byFamily: Record<string, number> = {};
	let enabled = 0;
	let withCoordinates = 0;

	for (const config of configs) {
		byParser[config.connector.parser] =
			(byParser[config.connector.parser] ?? 0) + 1;
		byFamily[config.connector.family] =
			(byFamily[config.connector.family] ?? 0) + 1;
		if (config.source.enabled !== false) enabled += 1;
		if (config.map.lat !== undefined && config.map.lon !== undefined) {
			withCoordinates += 1;
		}
	}

	return {
		total: configs.length,
		enabled,
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

	const configPath = resolve(options.path ?? defaultDatasourcesConfigPath());
	const includeDisabled = options.includeDisabled ?? true;
	const configs: SourceConfig[] = [];
	const byId = new Map<string, SourceConfig>();

	const result = parseRegistryFile(configPath);
	const errors = result.errors ?? [];

	if (result.config) {
		for (const config of result.config.sources) {
			if (!includeDisabled && config.source.enabled === false) continue;
			byId.set(config.source.id, config);
			configs.push(config);
		}
	}

	configs.sort((left, right) =>
		left.source.id.localeCompare(right.source.id, "pl"),
	);

	const registry: SourceConfigRegistry = {
		configDir: dirname(configPath),
		configPath,
		loadedAt: new Date().toISOString(),
		configs,
		byId,
		errors,
		summary: summarize(configs),
	};

	cachedRegistry = registry;
	return registry;
}

/** Loads the registry and throws one aggregated error when it is invalid. */
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
			`Nie można załadować rejestru konfiguracji źródeł (${registry.configPath}).\n${details}`,
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

/** Reloads the registry file from disk and returns the fresh registry. */
export function reloadSourceConfigs(
	options: Omit<LoadSourceConfigsOptions, "force"> = {},
): SourceConfigRegistry {
	return loadSourceConfigs({ ...options, force: true });
}
