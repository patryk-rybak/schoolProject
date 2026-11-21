import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
	PARSERS,
	SOURCE_CONFIG_VARIANTS,
	sourceConfigJsonSchema,
	sourceConfigSchema,
} from "./schema";

const examplesDir = resolve(
	import.meta.dir,
	"../../../../backend/ingest/examples",
);

const exampleFiles = readdirSync(examplesDir)
	.filter((file) => file.endsWith(".yaml"))
	.sort();

function loadExample(file: string): unknown {
	return Bun.YAML.parse(readFileSync(join(examplesDir, file), "utf8"));
}

function cloneExample(file: string): Record<string, unknown> {
	return structuredClone(loadExample(file)) as Record<string, unknown>;
}

describe("source config examples", () => {
	for (const file of exampleFiles) {
		test(`accepts ${file}`, () => {
			const result = sourceConfigSchema.safeParse(loadExample(file));
			expect(result.success).toBe(true);
			if (!result.success) {
				throw new Error(JSON.stringify(result.error.issues, null, 2));
			}
			expect(result.data["connector"]["parser"]).toBeDefined();
		});
	}

	test("generated JSON schema validates every checked-in example", () => {
		const ajv = new Ajv2020({ strict: true, allErrors: true });
		addFormats(ajv);
		const validate = ajv.compile(sourceConfigJsonSchema);
		for (const file of exampleFiles) {
			const ok = validate(loadExample(file));
			if (!ok) {
				throw new Error(`${file}: ${JSON.stringify(validate.errors, null, 2)}`);
			}
		}
		expect(exampleFiles.length).toBeGreaterThanOrEqual(5);
	});

	test("JSON schema is portable and free of Zod internals", () => {
		expect(sourceConfigJsonSchema["$schema"]).toBe(
			"https://json-schema.org/draft/2020-12/schema",
		);
		expect(JSON.stringify(sourceConfigJsonSchema)).not.toContain("~standard");
	});

	test("checked-in generated schema is up to date", () => {
		const generatedPath = join(
			import.meta.dir,
			"source-config.generated.schema.json",
		);
		const current = readFileSync(generatedPath, "utf8");
		expect(current).toBe(
			`${JSON.stringify(sourceConfigJsonSchema, null, 2)}\n`,
		);
	});
});

describe("parser and family unions", () => {
	test("every parser has a top-level variant", () => {
		expect(Object.keys(SOURCE_CONFIG_VARIANTS).sort()).toEqual(
			[...PARSERS].sort(),
		);
	});

	test("rejects a family/parser combination outside the matrix", () => {
		const config = cloneExample("krosno-dane-gov-pl.yaml");
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
		const config = cloneExample("krosno-dane-gov-pl.yaml");
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
		const config = cloneExample("krosno-dane-gov-pl.yaml");
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
		const config = cloneExample("krosno-dane-gov-pl.yaml");
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
		const config = cloneExample("krosno-dane-gov-pl.yaml");
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
		const config = cloneExample("krosno-dane-gov-pl.yaml");
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
		const config = cloneExample("krosno-dane-gov-pl.yaml");
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
