import { afterEach, describe, expect, test } from "bun:test";
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {
	clearSourceConfigCache,
	getEnabledSourceConfigs,
	getSourceConfig,
	getSourceConfigSummary,
	loadSourceConfigs,
	loadSourceConfigsOrThrow,
	SourceConfigRegistryError,
} from "./loader";
import { sourceConfigJsonSchema } from "./schema";

const tempDirs: string[] = [];

function tempConfigDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "aed-source-config-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	clearSourceConfigCache();
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("source config registry", () => {
	test("loads all 11 tabular configs without errors", () => {
		const registry = loadSourceConfigsOrThrow({ force: true });
		expect(registry.configs).toHaveLength(11);
		expect(registry.errors).toEqual([]);
		expect(registry.byId.size).toBe(11);
		expect(registry.summary.total).toBe(11);
		expect(registry.summary.addressOnly).toBe(0);
		expect(registry.summary.withCoordinates).toBe(11);
		expect(registry.summary.byParser["csv"]).toBe(2);
		expect(registry.summary.byParser["json"]).toBe(2);
		expect(registry.summary.byParser["geojson"]).toBe(1);
		expect(registry.summary.byParser["kml"]).toBe(6);
	});

	test("all checked-in configs validate against the generated JSON Schema", () => {
		const ajv = new Ajv2020({ strict: true, allErrors: true });
		addFormats(ajv);
		const validate = ajv.compile(sourceConfigJsonSchema);
		const sourceDir = join(
			import.meta.dir,
			"../../../../backend/ingest/sources",
		);
		const files = readdirSync(sourceDir)
			.filter((file) => file.endsWith(".json"))
			.sort();
		expect(files).toHaveLength(11);
		for (const file of files) {
			const value = JSON.parse(readFileSync(join(sourceDir, file), "utf8"));
			const ok = validate(value);
			if (!ok) {
				throw new Error(`${file}: ${JSON.stringify(validate.errors, null, 2)}`);
			}
		}
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

	test("reports JSON parse and Zod errors without throwing", () => {
		const dir = tempConfigDir();
		writeFileSync(join(dir, "broken.json"), "{", "utf8");
		writeFileSync(
			join(dir, "wrong-name.json"),
			JSON.stringify({
				version: 1,
				source: { id: "other" },
			}),
			"utf8",
		);
		const registry = loadSourceConfigs({ dir, force: true });
		expect(registry.configs).toHaveLength(0);
		expect(registry.errors).toHaveLength(2);
		expect(registry.errors[0]?.issues[0]?.code).toBe("json_parse");
		expect(registry.errors[1]?.issues[0]?.code).toBe("invalid_union");
	});

	test("throws one aggregated registry error", () => {
		const dir = tempConfigDir();
		writeFileSync(join(dir, "broken.json"), "{", "utf8");
		expect(() => loadSourceConfigsOrThrow({ dir, force: true })).toThrow(
			SourceConfigRegistryError,
		);
		try {
			loadSourceConfigsOrThrow({ dir, force: true });
		} catch (error) {
			expect(error).toBeInstanceOf(SourceConfigRegistryError);
			expect((error as SourceConfigRegistryError).errors).toHaveLength(1);
		}
	});

	test("detects a duplicate source id", () => {
		const dir = tempConfigDir();
		const config = loadSourceConfigs({ force: true }).configs.find(
			(entry) => entry.source.id === "krosno",
		);
		expect(config).toBeDefined();
		if (!config) return;
		writeFileSync(
			join(dir, "krosno.json"),
			`${JSON.stringify(config, null, 2)}\n`,
			"utf8",
		);
		writeFileSync(
			join(dir, "krosno-copy.json"),
			`${JSON.stringify(config, null, 2)}\n`,
			"utf8",
		);
		const registry = loadSourceConfigs({ dir, force: true });
		expect(registry.errors.map((error) => error.issues[0]?.code)).toContain(
			"duplicate_id",
		);
	});

	test("detects a filename that does not match source.id", () => {
		const dir = tempConfigDir();
		const config = loadSourceConfigs({ force: true }).configs.find(
			(entry) => entry.source.id === "krosno",
		);
		expect(config).toBeDefined();
		if (!config) return;
		writeFileSync(
			join(dir, "krosno-other.json"),
			`${JSON.stringify(config, null, 2)}\n`,
			"utf8",
		);
		const registry = loadSourceConfigs({ dir, force: true });
		expect(registry.errors.map((error) => error.issues[0]?.code)).toContain(
			"filename_mismatch",
		);
	});
});
