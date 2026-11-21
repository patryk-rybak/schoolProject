import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {
	CANONICAL_FIELDS,
	CONNECTOR_FAMILIES,
	CONNECTOR_PARSER_MATRIX,
	datasourcesConfigJsonSchema,
	datasourcesConfigSchema,
	PARSERS,
	SOURCE_CONFIG_VARIANTS,
	type SourceConfigInput,
	parseDatasourcesConfig,
	parseSourceConfig,
	safeParseDatasourcesConfig,
	safeParseSourceConfig,
	sourceConfigSchema,
} from "./schema";

const schemaArtifactPath = join(
	import.meta.dir,
	"../../../../backend/ingest/datasources-config.schema.json",
);

function slimSource(
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		source: { id: "demo", name: "Demo AED", enabled: true },
		connector: { family: "file_static", parser: "csv" },
		fetch: {
			url: "https://example.org/aed.csv",
			method: "GET",
			timeout_ms: 30_000,
			pagination: { type: "none" },
		},
		parse: {
			encoding: "utf-8",
			csv: { delimiter: ",", header: true },
		},
		records: { path: "$" },
		map: {
			name: { field: "Nazwa" },
			lat: { field: "szerokosc" },
			lon: { field: "dlugosc" },
		},
		validate: {
			required: ["name", "lat", "lon"],
			coords: { bbox: [14.1, 49.0, 24.2, 54.9] },
		},
		...overrides,
	};
}

describe("slim source config contract", () => {
	test("accepts a minimal slim config", () => {
		const result = sourceConfigSchema.safeParse(slimSource());
		expect(result.success).toBe(true);
		if (!result.success) {
			throw new Error(JSON.stringify(result.error.issues, null, 2));
		}
		expect(result.data.source.id).toBe("demo");
		expect(result.data.records.path).toBe("$");
		expect(result.data.validate.required).toEqual(["name", "lat", "lon"]);
	});

	test("accepts a config with only required sections", () => {
		const minimal = {
			source: { id: "min", name: "Minimal" },
			connector: { family: "manual", parser: "manual" },
			fetch: { url: "https://example.org/list.pdf" },
			parse: {},
			records: { path: "$" },
			map: { name: { field: "nazwa" } },
			validate: {},
		};
		expect(sourceConfigSchema.safeParse(minimal).success).toBe(true);
	});

	test("supports expression mappings and value/default wrappers", () => {
		const config = slimSource({
			map: {
				name: {
					coalesce: [{ field: "Nazwa" }, { field: "Tytul" }],
				},
				house_number: { value: { field: "nr" }, default: null },
				city: { const: "Krosno" },
				source_record_id: { template: "demo:{id}", vars: { id: { field: "id" } } },
				lat: { field: "y" },
				lon: { field: "x" },
			},
			validate: { required: ["name", "lat", "lon"] },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(true);
	});

	test("rejects quality-metadata keys on the field spec wrapper", () => {
		for (const extra of [
			{ on_missing: "null" },
			{ required: true },
			{ confidence: 0.6 },
			{ note: "quality hint" },
		]) {
			const config = slimSource({
				map: {
					name: { value: { field: "Nazwa" }, ...extra },
					lat: { field: "y" },
					lon: { field: "x" },
				},
				validate: {},
			});
			expect(sourceConfigSchema.safeParse(config).success).toBe(false);
		}
	});

	test("rejects an empty mapping", () => {
		const config = slimSource({ map: {}, validate: {} });
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
	});

	test("rejects unknown canonical fields in map and validate.required", () => {
		expect(
			sourceConfigSchema.safeParse(
				slimSource({
					map: { not_a_field: { field: "x" } },
					validate: {},
				}),
			).success,
		).toBe(false);
		expect(
			sourceConfigSchema.safeParse(
				slimSource({ validate: { required: ["not_a_field"] } }),
			).success,
		).toBe(false);
	});

	test("rejects invalid source ids", () => {
		const config = slimSource({
			source: { id: "INVALID ID", name: "Demo" },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});
});

describe("removed sections are rejected by strictObject", () => {
	const removedSections: Record<string, unknown>[] = [
		{ drift: {} },
		{ publish: { enabled: true } },
		{ schedule: { cron: "0 3 * * *", timezone: "Europe/Warsaw" } },
		{ activation: {} },
		{ geocoding: { enabled: true } },
		{ version: 1 },
	];

	for (const extra of removedSections) {
		const [key] = Object.keys(extra);
		test(`rejects top-level section ${key}`, () => {
			expect(
				sourceConfigSchema.safeParse(slimSource(extra)).success,
			).toBe(false);
		});
	}

	test("rejects records.dedupe and records.identity", () => {
		for (const extra of [
			{ dedupe: { key: [{ field: "id" }] } },
			{ identity: { source_record_id: { field: "id" } } },
		]) {
			const config = slimSource({ records: { path: "$", ...extra } });
			expect(sourceConfigSchema.safeParse(config).success).toBe(false);
		}
	});

	test("rejects removed source metadata", () => {
		for (const extra of [
			{ publisher: "Urząd Miasta" },
			{ license: { id: "CC-BY-4.0" } },
			{ reliability_tier: "official_local" },
			{ access_type: "file" },
			{ update_frequency: "weekly" },
			{ homepage_url: "https://example.org" },
			{ coverage: { country: "PL" } },
			{ notes: "note" },
		]) {
			const config = slimSource({
				source: { id: "demo", name: "Demo", ...extra },
			});
			expect(sourceConfigSchema.safeParse(config).success).toBe(false);
		}
	});

	test("rejects connector.notes", () => {
		const config = slimSource({
			connector: { family: "file_static", parser: "csv", notes: "note" },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});

	test("rejects fetch.conditional (unused by the fetch layer)", () => {
		const config = slimSource();
		(config["fetch"] as Record<string, unknown>)["conditional"] = {
			etag: true,
		};
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});

	test("rejects removed validate knobs", () => {
		for (const extra of [
			{ enums: true },
			{ on_error: "reject" },
			{ require_location: "point" },
		]) {
			const config = slimSource({
				validate: { required: ["name", "lat", "lon"], ...extra },
			});
			expect(sourceConfigSchema.safeParse(config).success).toBe(false);
		}
		for (const extra of [{ on_invalid: "reject" }, { on_missing: "null" }]) {
			const config = slimSource({
				validate: { coords: { bbox: [14.1, 49, 24.2, 54.9], ...extra } },
			});
			expect(sourceConfigSchema.safeParse(config).success).toBe(false);
		}
	});
});

describe("connector family/parser matrix", () => {
	test("every parser has a top-level variant", () => {
		expect(Object.keys(SOURCE_CONFIG_VARIANTS).sort()).toEqual(
			[...PARSERS].sort(),
		);
	});

	test("every matrix family is a known connector family", () => {
		expect(Object.keys(CONNECTOR_PARSER_MATRIX).sort()).toEqual(
			[...CONNECTOR_FAMILIES].sort(),
		);
	});

	test("accepts every compatible family/parser pair", () => {
		for (const family of CONNECTOR_FAMILIES) {
			for (const parser of CONNECTOR_PARSER_MATRIX[family]) {
				const parse =
					parser === "pdf_table"
						? {
								pdf_table: {
									columns: [{ key: "name", x_min: 0, x_max: 100 }],
									row_anchor: { column: "name", regex: "AED" },
								},
							}
						: {};
				const config = slimSource({
					connector: { family, parser },
					parse,
				});
				const result = sourceConfigSchema.safeParse(config);
				expect(result.success).toBe(true);
				if (!result.success) {
					throw new Error(
						`${family}/${parser}: ${JSON.stringify(result.error.issues)}`,
					);
				}
			}
		}
	});

	test("rejects a family/parser combination outside the matrix", () => {
		const config = slimSource({
			connector: { family: "file_static", parser: "jsonapi" },
			parse: {},
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});

	test("rejects parser-specific parse options for another parser", () => {
		const config = slimSource({
			parse: { encoding: "utf-8", kml: { point_only: true } },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});
});

describe("fetch contract", () => {
	test("supports the warszawa POST shape (headers, body, env-token auth)", () => {
		const config = slimSource({
			connector: { family: "http_json_api", parser: "json" },
			fetch: {
				url: "https://api.example.org/aed",
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: {},
				auth: {
					type: "header",
					header: "Authorization",
					env: "WARSZAWA_API_TOKEN",
				},
				timeout_ms: 30_000,
			},
			parse: { encoding: "utf-8", json: { unwrap_string: false } },
			records: { path: "/result" },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(true);
	});

	test("accepts an inline token instead of an env variable", () => {
		const config = slimSource({
			connector: { family: "http_json_api", parser: "json" },
			fetch: {
				url: "https://api.example.org/aed",
				method: "POST",
				auth: {
					type: "header",
					header: "Authorization",
					token: "inline-secret",
				},
			},
			parse: { encoding: "utf-8", json: { unwrap_string: false } },
			records: { path: "/result" },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(true);
	});

	test("treats an empty token slot as absent (env still required)", () => {
		const base = {
			connector: { family: "http_json_api", parser: "json" },
			fetch: {
				url: "https://api.example.org/aed",
				auth: {
					type: "header",
					header: "Authorization",
					env: "WARSZAWA_API_TOKEN",
					token: "",
				},
			},
			parse: { encoding: "utf-8", json: { unwrap_string: false } },
			records: { path: "/result" },
		};
		expect(sourceConfigSchema.safeParse(slimSource(base)).success).toBe(true);
		const noEnv = structuredClone(base);
		(
			(noEnv.fetch as Record<string, unknown>)["auth"] as Record<
				string,
				unknown
			>
		)["env"] = undefined;
		expect(sourceConfigSchema.safeParse(slimSource(noEnv)).success).toBe(false);
	});

	test("supports the przemysl page pagination shape", () => {
		const config = slimSource({
			connector: { family: "ckan_datastore", parser: "json" },
			fetch: {
				url: "https://example.org/api/datastore",
				method: "GET",
				pagination: {
					type: "page",
					page_param: "page",
					limit_param: "per_page",
					page_size: 100,
					start_page: 1,
					total_path: "/total_rows",
				},
				rate_limit: { requests_per_minute: 60 },
				retries: { max: 3, backoff_ms: 1000 },
			},
			parse: { encoding: "utf-8" },
			records: { path: "/result/records" },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(true);
	});

	test("rejects non-https urls", () => {
		const config = slimSource();
		(config["fetch"] as Record<string, unknown>)["url"] =
			"http://example.org/a.csv";
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});

	test("rejects forbidden static headers", () => {
		const config = slimSource();
		(config["fetch"] as Record<string, unknown>)["headers"] = {
			Host: "evil.example",
		};
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) =>
					issue.message.includes("zabroniony"),
				),
			).toBe(true);
		}
	});

	test("rejects basic auth without a password env pairing", () => {
		const config = slimSource();
		(config["fetch"] as Record<string, unknown>)["auth"] = {
			type: "basic",
			user_env: "AED_USER",
		};
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});
});

describe("minimal validation contract", () => {
	test("accepts required fields that exist in the mapping", () => {
		const config = slimSource({
			validate: { required: ["name", "lat", "lon"] },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(true);
	});

	test("rejects required fields without a mapping", () => {
		const config = slimSource({
			validate: { required: ["name", "lat", "lon", "operator_name"] },
		});
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) =>
					issue.message.includes("nie ma mapowania"),
				),
			).toBe(true);
		}
	});

	test("rejects duplicated required fields", () => {
		const config = slimSource({
			validate: { required: ["name", "name"] },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});

	test("accepts a sane coords bbox", () => {
		const config = slimSource({
			validate: { coords: { bbox: [14.1, 49.0, 24.2, 54.9] } },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(true);
	});

	test("rejects an inverted bbox", () => {
		const config = slimSource({
			validate: { coords: { bbox: [24.2, 54.9, 14.1, 49.0] } },
		});
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) =>
					issue.message.includes("minLon musi być mniejsze"),
				),
			).toBe(true);
		}
	});

	test("rejects an out-of-range bbox", () => {
		const config = slimSource({
			validate: { coords: { bbox: [-200, 49, 24.2, 54.9] } },
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});

	test("rejects unsafe lookup paths in mappings", () => {
		const config = slimSource({
			map: {
				city: {
					lookup: { file: "../secrets.json", key: { field: "id" } },
				},
				name: { field: "Nazwa" },
			},
			validate: {},
		});
		expect(sourceConfigSchema.safeParse(config).success).toBe(false);
	});
});

describe("datasources registry", () => {
	test("accepts a slim registry", () => {
		const registry = { version: 1, sources: [slimSource()] };
		const result = datasourcesConfigSchema.safeParse(registry);
		expect(result.success).toBe(true);
	});

	test("rejects an unsupported version", () => {
		const result = datasourcesConfigSchema.safeParse({
			version: 2,
			sources: [slimSource()],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) => issue.path[0] === "version"),
			).toBe(true);
		}
	});

	test("rejects duplicate source ids", () => {
		const result = datasourcesConfigSchema.safeParse({
			version: 1,
			sources: [slimSource(), slimSource()],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some(
					(issue) =>
						issue.path.join(".") === "sources.1.source.id" &&
						issue.message.includes("Zduplikowany"),
				),
			).toBe(true);
		}
	});

	test("parse helpers agree with the schemas", () => {
		const config = parseSourceConfig(slimSource());
		expect(config.source.id).toBe("demo");
		const registry = parseDatasourcesConfig({
			version: 1,
			sources: [slimSource()],
		});
		expect(registry.sources).toHaveLength(1);
		expect(safeParseSourceConfig({ version: 1 }).success).toBe(false);
		expect(safeParseDatasourcesConfig({ version: 1 }).success).toBe(false);
	});

	test("SourceConfigInput type matches the slim shape", () => {
		const typed: SourceConfigInput = slimSource() as SourceConfigInput;
		expect(sourceConfigSchema.safeParse(typed).success).toBe(true);
	});
});

describe("generated JSON schema artifact", () => {
	test("is portable and free of Zod internals", () => {
		expect(datasourcesConfigJsonSchema["$schema"]).toBe(
			"https://json-schema.org/draft/2020-12/schema",
		);
		expect(JSON.stringify(datasourcesConfigJsonSchema)).not.toContain(
			"~standard",
		);
	});

	test("checked-in generated schema is up to date", () => {
		const expected = `${JSON.stringify(datasourcesConfigJsonSchema, null, 2)}\n`;
		expect(readFileSync(schemaArtifactPath, "utf8")).toBe(expected);
	});

	test("validates a slim registry with Ajv strict mode", () => {
		const ajv = new Ajv2020({ strict: true, allErrors: true });
		addFormats(ajv);
		const validate = ajv.compile(datasourcesConfigJsonSchema);
		const ok = validate({ version: 1, sources: [slimSource()] });
		if (!ok) {
			throw new Error(JSON.stringify(validate.errors, null, 2));
		}
	});

	test("rejects removed sections at the JSON Schema level too", () => {
		const ajv = new Ajv2020({ strict: true, allErrors: true });
		addFormats(ajv);
		const validate = ajv.compile(datasourcesConfigJsonSchema);
		expect(
			validate({
				version: 1,
				sources: [slimSource({ drift: {} })],
			}),
		).toBe(false);
	});
});

describe("canonical fields export", () => {
	test("keeps the canonical field list stable", () => {
		expect(CANONICAL_FIELDS).toContain("lat");
		expect(CANONICAL_FIELDS).toContain("lon");
		expect(CANONICAL_FIELDS).toContain("name");
		expect(CANONICAL_FIELDS).toContain("source_record_id");
		expect(new Set(CANONICAL_FIELDS).size).toBe(CANONICAL_FIELDS.length);
	});
});
