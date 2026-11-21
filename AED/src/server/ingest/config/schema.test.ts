import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {
	CANONICAL_FIELD_METADATA,
	CONNECTOR_FAMILY_METADATA,
	groupConfigFieldsBySection,
	PARSER_METADATA,
	toFormIssues,
	validateSourceConfigForForm,
} from "./form-metadata";
import {
	CANONICAL_FIELDS,
	CONNECTOR_FAMILIES,
	CONNECTOR_PARSER_MATRIX,
	datasourcesConfigJsonSchema,
	datasourcesConfigSchema,
	PARSERS,
	SOURCE_CONFIG_VARIANTS,
	sourceConfigSchema,
} from "./schema";

const backendDir = join(import.meta.dir, "../../../../backend/ingest");
const registryPath = join(backendDir, "datasources-config.json");

type RegistryValue = {
	version: number;
	sources: Record<string, unknown>[];
};

function loadRegistry(): RegistryValue {
	return JSON.parse(readFileSync(registryPath, "utf8")) as RegistryValue;
}

function cloneSource(id: string): Record<string, unknown> {
	const source = loadRegistry().sources.find(
		(entry) =>
			entry["source"] !== null &&
			typeof entry["source"] === "object" &&
			(entry["source"] as Record<string, unknown>)["id"] === id,
	);
	if (!source) {
		throw new Error(`Brak źródła ${id} w rejestrze.`);
	}
	return structuredClone(source);
}

describe("datasources registry", () => {
	test("accepts the canonical registry file", () => {
		const result = datasourcesConfigSchema.safeParse(loadRegistry());
		expect(result.success).toBe(true);
		if (!result.success) {
			throw new Error(JSON.stringify(result.error.issues, null, 2));
		}
		expect(result.data.version).toBe(1);
		expect(result.data.sources).toHaveLength(11);
		expect(
			result.data.sources.every((config) => config.connector.parser),
		).toBe(true);
	});

	test("generated JSON schema validates the checked-in registry", () => {
		const ajv = new Ajv2020({ strict: true, allErrors: true });
		addFormats(ajv);
		const validate = ajv.compile(datasourcesConfigJsonSchema);
		const ok = validate(loadRegistry());
		if (!ok) {
			throw new Error(JSON.stringify(validate.errors, null, 2));
		}
	});

	test("JSON schema is portable and free of Zod internals", () => {
		expect(datasourcesConfigJsonSchema["$schema"]).toBe(
			"https://json-schema.org/draft/2020-12/schema",
		);
		expect(JSON.stringify(datasourcesConfigJsonSchema)).not.toContain(
			"~standard",
		);
	});

	test("checked-in generated schemas are up to date", () => {
		const expected = `${JSON.stringify(datasourcesConfigJsonSchema, null, 2)}\n`;
		for (const path of [
			join(import.meta.dir, "datasources-config.generated.schema.json"),
			join(backendDir, "datasources-config.schema.json"),
		]) {
			const current = readFileSync(path, "utf8");
			expect(current).toBe(expected);
		}
	});

	test("rejects a registry with an unsupported version", () => {
		const value = loadRegistry();
		value.version = 2;
		const result = datasourcesConfigSchema.safeParse(value);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((issue) => issue.path[0] === "version")).toBe(
				true,
			);
		}
	});

	test("rejects a registry with duplicate source ids", () => {
		const value = loadRegistry();
		value.sources.push(structuredClone(value.sources[0]!));
		const result = datasourcesConfigSchema.safeParse(value);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some(
					(issue) =>
						issue.path.join(".") === "sources.11.source.id" &&
						issue.message.includes("Zduplikowany"),
				),
			).toBe(true);
		}
	});

	test("every source config in the registry is individually valid", () => {
		for (const source of loadRegistry().sources) {
			const result = sourceConfigSchema.safeParse(source);
			expect(result.success).toBe(true);
			if (!result.success) {
				throw new Error(JSON.stringify(result.error.issues, null, 2));
			}
		}
	});
});

describe("parser and family unions", () => {
	test("every parser has a top-level variant", () => {
		expect(Object.keys(SOURCE_CONFIG_VARIANTS).sort()).toEqual(
			[...PARSERS].sort(),
		);
	});

	test("rejects a family/parser combination outside the matrix", () => {
		const config = cloneSource("krosno");
		config["connector"] = {
			family: "file_static",
			parser: "jsonapi",
		};
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
	});

	test("parser metadata and matrix stay aligned", () => {
		for (const parser of PARSERS) {
			const metadata = PARSER_METADATA[parser];
			expect(metadata.parser).toBe(parser);
			for (const family of metadata.families) {
				expect(CONNECTOR_PARSER_MATRIX[family]).toContain(parser);
			}
			expect(metadata.parseFields.length).toBeGreaterThan(0);
		}
		for (const family of CONNECTOR_FAMILIES) {
			const metadata = CONNECTOR_FAMILY_METADATA[family];
			expect(metadata.family).toBe(family);
			expect(metadata.allowedParsers).toEqual(CONNECTOR_PARSER_MATRIX[family]);
		}
	});
});

describe("semantic refinements", () => {
	test("rejects a constant source_record_id", () => {
		const config = cloneSource("krosno");
		const records = config["records"] as Record<string, unknown>;
		const identity = records["identity"] as Record<string, unknown>;
		identity["source_record_id"] = "constant-id";
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) =>
					issue.path.join(".").includes("source_record_id"),
				),
			).toBe(true);
		}
	});

	test("rejects an inverted bbox", () => {
		const config = cloneSource("krosno");
		const validate = config["validate"] as Record<string, unknown>;
		const coords = validate["coords"] as Record<string, unknown>;
		coords["bbox"] = [24.2, 54.9, 14.1, 49.0];
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

	test("rejects publish license drift", () => {
		const config = cloneSource("krosno");
		const publish = config["publish"] as Record<string, unknown>;
		publish["license_id"] = "CC-BY-4.0";
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) =>
					issue.path.join(".").includes("publish.license_id"),
				),
			).toBe(true);
		}
	});

	test("rejects required fields without a mapping", () => {
		const config = cloneSource("krosno");
		const validate = config["validate"] as Record<string, unknown>;
		validate["required"] = ["name", "lat", "lon", "operator_name"];
		const map = config["map"] as Record<string, unknown>;
		delete map["operator_name"];
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

	test("rejects secrets in static headers through the forbidden-header polish", () => {
		const config = cloneSource("krosno");
		const fetch = config["fetch"] as Record<string, unknown>;
		fetch["headers"] = { Host: "evil.example" };
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
});

describe("form metadata and validation errors", () => {
	test("every canonical field has UI metadata", () => {
		for (const field of CANONICAL_FIELDS) {
			expect(CANONICAL_FIELD_METADATA[field].field).toBe(field);
		}
	});

	test("fields are grouped into known sections", () => {
		const grouped = groupConfigFieldsBySection();
		expect(grouped.identity.length).toBeGreaterThan(0);
		expect(grouped.mapping).toBeArray();
		expect(grouped.parse).toBeArray();
	});

	test("maps Zod issues to a section, label and path", () => {
		const config = cloneSource("krosno");
		const source = config["source"] as Record<string, unknown>;
		source["id"] = "INVALID ID";
		const result = sourceConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
		if (!result.success) {
			const issues = toFormIssues(result.error);
			expect(issues.length).toBeGreaterThan(0);
			const issue = issues.find((item) => item.path === "source.id");
			expect(issue).toBeDefined();
			expect(issue?.section).toBe("identity");
			expect(issue?.label).toContain("Identyfikator");
			expect(issue?.severity).toBe("error");
		}
	});

	test("form validation helper returns issues instead of throwing", () => {
		const result = validateSourceConfigForForm({ version: 1 });
		expect(result.success).toBe(false);
		expect(result.issues.length).toBeGreaterThan(0);
	});
});
