import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {
	clearSourceConfigCache,
	DATASOURCES_CONFIG_ENV,
	defaultDatasourcesConfigPath,
	getEnabledSourceConfigs,
	getSourceConfig,
	getSourceConfigSummary,
	loadSourceConfigs,
	loadSourceConfigsOrThrow,
	SourceConfigRegistryError,
} from "./loader";
import { datasourcesConfigJsonSchema } from "./schema";

const tempDirs: string[] = [];

function tempConfigFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "aed-datasources-config-"));
	tempDirs.push(dir);
	return join(dir, "datasources-config.json");
}

const registryPath = join(
	import.meta.dir,
	"../../../../backend/ingest/datasources-config.json",
);

function readRegistry(): Record<string, unknown> {
	return JSON.parse(readFileSync(registryPath, "utf8"));
}

afterEach(() => {
	clearSourceConfigCache();
	delete process.env[DATASOURCES_CONFIG_ENV];
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("datasources registry", () => {
	test("loads 11 source configs from one file without errors", () => {
		const registry = loadSourceConfigsOrThrow({ force: true });
		expect(registry.configs).toHaveLength(11);
		expect(registry.errors).toEqual([]);
		expect(registry.byId.size).toBe(11);
		expect(registry.summary.total).toBe(11);
		expect(registry.summary.withCoordinates).toBe(11);
		expect(registry.summary.byParser["csv"]).toBe(2);
		expect(registry.summary.byParser["json"]).toBe(2);
		expect(registry.summary.byParser["geojson"]).toBe(1);
		expect(registry.summary.byParser["kml"]).toBe(6);
	});

	test("resolves the canonical file by default", () => {
		expect(defaultDatasourcesConfigPath()).toBe(registryPath);
		expect(loadSourceConfigs({ force: true }).configPath).toBe(registryPath);
	});

	test("honours AED_DATASOURCES_CONFIG", () => {
		const path = tempConfigFile();
		writeFileSync(path, JSON.stringify(readRegistry()), "utf8");
		process.env[DATASOURCES_CONFIG_ENV] = path;
		const registry = loadSourceConfigs({ force: true });
		expect(registry.configPath).toBe(path);
		expect(registry.configs).toHaveLength(11);
	});

	test("the checked-in registry validates against the generated JSON Schema", () => {
		const ajv = new Ajv2020({ strict: true, allErrors: true });
		addFormats(ajv);
		const validate = ajv.compile(datasourcesConfigJsonSchema);
		const value = readRegistry();
		const ok = validate(value);
		if (!ok) {
			throw new Error(JSON.stringify(validate.errors, null, 2));
		}
		expect((value["sources"] as unknown[]).length).toBe(11);
	});

	test("exposes configs by id and filters disabled ones", () => {
		const registry = loadSourceConfigs({ force: true });
		expect(getSourceConfig("openaedmap")?.source.enabled).toBe(true);
		expect(getSourceConfig("kml-tczew")).toBeUndefined();
		const enabled = getEnabledSourceConfigs();
		expect(enabled.every((config) => config.source.enabled !== false)).toBe(
			true,
		);
		expect(enabled.length).toBe(registry.summary.enabled);
	});

	test("returns a stable summary and reloads from disk", () => {
		const first = loadSourceConfigs({ force: true });
		const second = loadSourceConfigs({ force: true });
		expect(second.summary).toEqual(first.summary);
		expect(second.loadedAt >= first.loadedAt).toBe(true);
		expect(getSourceConfigSummary().total).toBe(11);
	});

	test("reports file read, JSON parse and Zod errors without throwing", () => {
		const missing = tempConfigFile();
		const missingRegistry = loadSourceConfigs({ path: missing, force: true });
		expect(missingRegistry.configs).toHaveLength(0);
		expect(missingRegistry.errors[0]?.issues[0]?.code).toBe("file_read");

		const broken = tempConfigFile();
		writeFileSync(broken, "{", "utf8");
		const brokenRegistry = loadSourceConfigs({ path: broken, force: true });
		expect(brokenRegistry.configs).toHaveLength(0);
		expect(brokenRegistry.errors[0]?.issues[0]?.code).toBe("json_parse");

		const invalid = tempConfigFile();
		writeFileSync(
			invalid,
			JSON.stringify({
				version: 1,
				sources: [{ version: 1, source: { id: "other" } }],
			}),
			"utf8",
		);
		const invalidRegistry = loadSourceConfigs({ path: invalid, force: true });
		expect(invalidRegistry.configs).toHaveLength(0);
		expect(invalidRegistry.errors).toHaveLength(1);
		expect(invalidRegistry.errors[0]?.issues[0]?.path).toBe("sources.0");
		expect(invalidRegistry.errors[0]?.issues[0]?.code).toBe("invalid_union");
	});

	test("reports a wrong registry version as a Zod error", () => {
		const path = tempConfigFile();
		const value = readRegistry();
		value["version"] = 2;
		writeFileSync(path, JSON.stringify(value), "utf8");
		const registry = loadSourceConfigs({ path, force: true });
		expect(registry.configs).toHaveLength(0);
		expect(registry.errors).toHaveLength(1);
		expect(registry.errors[0]?.issues.some((issue) => issue.path === "version")).toBe(
			true,
		);
	});

	test("throws one aggregated registry error", () => {
		const path = tempConfigFile();
		writeFileSync(path, "{", "utf8");
		expect(() => loadSourceConfigsOrThrow({ path, force: true })).toThrow(
			SourceConfigRegistryError,
		);
		try {
			loadSourceConfigsOrThrow({ path, force: true });
		} catch (error) {
			expect(error).toBeInstanceOf(SourceConfigRegistryError);
			expect((error as SourceConfigRegistryError).errors).toHaveLength(1);
		}
	});

	test("detects a duplicate source id", () => {
		const path = tempConfigFile();
		const value = readRegistry();
		const sources = value["sources"] as Record<string, unknown>[];
		sources.push(structuredClone(sources[0]!));
		writeFileSync(path, JSON.stringify(value), "utf8");
		const registry = loadSourceConfigs({ path, force: true });
		expect(registry.errors.map((error) => error.issues[0]?.code)).toContain(
			"duplicate_id",
		);
		expect(registry.errors[0]?.issues[0]?.path).toBe("sources.11.source.id");
	});
});
