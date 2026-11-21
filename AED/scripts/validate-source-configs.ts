import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

/**
 * Validates the five A-source configs that are not KML:
 * OpenAEDMap/OSM, Przemyśl, Krosno, Marki and Warszawa.
 *
 * Checks:
 * - JSON Schema validity for the YAML source and the canonical JSON version;
 * - semantic parity between YAML and JSON;
 * - the per-source source_record_id and dedupe key;
 * - the known transport/format quirks of each source;
 * - license and publish gates, including secret handling.
 */

const root = join(import.meta.dir, "..");
const schemaPath = join(root, "backend", "ingest", "source-config.schema.json");
const exampleDir = join(root, "backend", "ingest", "examples");
const sourceDir = join(root, "backend", "ingest", "sources");

const AS_OF = Date.parse("2026-11-21T00:00:00Z");
const MAX_TERMS_AGE_DAYS = 90;

const errors: string[] = [];
const expect = (condition: unknown, message: string): void => {
	if (!condition) errors.push(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
	isRecord(value) ? value : undefined;
const asArray = (value: unknown): unknown[] | undefined =>
	Array.isArray(value) ? value : undefined;
const asString = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

const sortValue = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value === null || typeof value !== "object") return value;
	const record = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(record).sort()) {
		const child = record[key];
		if (child !== undefined) sorted[key] = sortValue(child);
	}
	return sorted;
};

const stable = (value: unknown): string => JSON.stringify(sortValue(value));

const constValue = (expr: unknown): unknown => asRecord(expr)?.["const"];

const readPath = (value: unknown, keys: string[]): unknown => {
	let current: unknown = value;
	for (const key of keys) {
		const record = asRecord(current);
		if (!record) return undefined;
		current = record[key];
	}
	return current;
};

const text = (value: unknown): string => (asString(value) ?? "").trim();

type SourceConfig = {
	version: number;
	source: {
		id: string;
		license: { id: string; attribution?: string; share_alike?: boolean };
		enabled?: boolean;
	};
	connector: { family: string; parser: string };
	fetch: {
		url: string;
		method?: string;
		auth?: { type?: string; header?: string; env?: string };
	};
	parse: Record<string, unknown>;
	records: {
		path: string;
		identity: {
			source_record_id: unknown;
			dataset_id?: unknown;
			stable?: boolean;
		};
		dedupe?: { key: unknown[]; keep?: string; on_duplicate?: string };
	};
	map: Record<string, unknown>;
	validate: {
		required?: string[];
		coords?: { bbox?: number[]; on_invalid?: string };
		enums?: boolean;
		on_error?: string;
	};
	publish?: {
		enabled?: boolean;
		license_id?: string;
		attribution?: string;
		allowed_for_ingest?: boolean;
		allowed_for_export?: boolean;
		terms_url?: string;
		terms_hash?: string;
		terms_checked_at?: string;
		redact?: string[];
		exports?: string[];
	};
};

const asConfig = (value: unknown, label: string): SourceConfig | undefined => {
	if (!isRecord(value)) {
		errors.push(`${label}: top-level value must be an object`);
		return undefined;
	}
	return value as unknown as SourceConfig;
};

const checkCommon = (config: SourceConfig, label: string): void => {
	expect(config.version === 1, `${label}: version must be 1`);
	const source = config.source;
	expect(
		/^[a-z0-9][a-z0-9._-]*$/.test(source.id),
		`${label}: invalid source.id`,
	);
	expect(
		config.connector.family.length > 0 && config.connector.parser.length > 0,
		`${label}: connector family/parser is missing`,
	);
	expect(text(config.fetch.url).startsWith("https://"), `${label}: fetch.url must be https`);
	expect(config.records.path.length > 0, `${label}: records.path is missing`);
	expect(
		config.records.identity.source_record_id !== undefined,
		`${label}: records.identity.source_record_id is missing`,
	);
	expect(
		(config.records.dedupe?.key.length ?? 0) > 0,
		`${label}: records.dedupe.key is missing`,
	);
	expect(
		(config.validate.required ?? []).includes("lat") &&
			(config.validate.required ?? []).includes("lon"),
		`${label}: validate.required must include lat and lon`,
	);
	expect(
		(config.validate.coords?.bbox?.length ?? 0) === 4,
		`${label}: validate.coords.bbox must have 4 numbers`,
	);
	const bbox = config.validate.coords?.bbox ?? [];
	if (bbox.length === 4) {
		expect(
			bbox[0]! < bbox[2]! && bbox[1]! < bbox[3]!,
			`${label}: bbox must be [minLon, minLat, maxLon, maxLat]`,
		);
	}
	const map = config.map;
	for (const field of ["lat", "lon", "name"] as const) {
		expect(map[field] !== undefined, `${label}: map.${field} is missing`);
	}
};

const checkLicenseGates = (config: SourceConfig, label: string): void => {
	const publish = config.publish;
	const license = config.source.license;
	if (!publish) {
		errors.push(`${label}: publish block is required for the A-source set`);
		return;
	}
	expect(
		publish.license_id === license.id,
		`${label}: publish.license_id must match source.license.id`,
	);
	expect(
		typeof publish.allowed_for_ingest === "boolean",
		`${label}: publish.allowed_for_ingest must be boolean`,
	);
	expect(
		typeof publish.allowed_for_export === "boolean",
		`${label}: publish.allowed_for_export must be boolean`,
	);
	expect(
		typeof publish.enabled === "boolean",
		`${label}: publish.enabled must be boolean`,
	);
	if (license.id !== "CC0-1.0") {
		expect(
			text(publish.attribution).length > 0,
			`${label}: attribution is required for ${license.id}`,
		);
		expect(
			text(license.attribution).length > 0,
			`${label}: source.license.attribution is required for ${license.id}`,
		);
	}
	if (license.id === "ODbL-1.0") {
		expect(
			license.share_alike === true,
			`${label}: ODbL must set source.license.share_alike=true`,
		);
	}
	expect(
		/^sha256:[0-9a-f]{64}$/.test(text(publish.terms_hash)),
		`${label}: publish.terms_hash must be sha256:<64 hex>`,
	);
	const checkedAt = Date.parse(text(publish.terms_checked_at));
	expect(
		Number.isFinite(checkedAt),
		`${label}: publish.terms_checked_at must be ISO date-time`,
	);
	if (Number.isFinite(checkedAt)) {
		const ageDays = (AS_OF - checkedAt) / 86_400_000;
		expect(
			ageDays >= 0 && ageDays <= MAX_TERMS_AGE_DAYS,
			`${label}: terms_checked_at must be within ${MAX_TERMS_AGE_DAYS} days of ${new Date(AS_OF).toISOString()}`,
		);
	}
	expect(
		text(publish.terms_url).startsWith("https://"),
		`${label}: publish.terms_url must be https`,
	);
	for (const redacted of publish.redact ?? []) {
		expect(
			redacted === "serial_number" || redacted === "phone",
			`${label}: unexpected redact field ${redacted}`,
		);
	}
	const auth = config.fetch.auth;
	if (auth) {
		expect(
			auth.env !== undefined,
			`${label}: auth must use an env reference, never a literal secret`,
		);
		expect(
			asString(auth.env)?.startsWith("AED_") ||
				asString(auth.env)?.startsWith("WARSZAWA_"),
			`${label}: auth.env must point to a source-scoped environment variable`,
		);
		const serialized = stable(config);
		expect(
			!/"(token|secret|password|apiKey|api_key)"\s*:/i.test(serialized),
			`${label}: config must not contain literal secret values`,
		);
	}
};

const checkIdentity = (
	config: SourceConfig,
	label: string,
	sourceRecordId: unknown,
	dedupeKey: unknown[],
): void => {
	expect(
		stable(config.records.identity.source_record_id) === stable(sourceRecordId),
		`${label}: unexpected source_record_id expression`,
	);
	expect(
		stable(config.records.dedupe?.key) === stable(dedupeKey),
		`${label}: unexpected dedupe key`,
	);
	expect(
		config.records.identity.stable === true,
		`${label}: records.identity.stable must be true`,
	);
};

const checkOpenAedMap = (config: SourceConfig): void => {
	const label = "openaedmap";
	checkIdentity(
		config,
		label,
		{ template: "{@osm_type}/{@osm_id}" },
		[{ field: "@osm_type" }, { field: "@osm_id" }],
	);
	expect(
		config.connector.family === "file_static" &&
			config.connector.parser === "geojson",
		`${label}: expected file_static/geojson`,
	);
	expect(config.records.path === "/features", `${label}: expected /features`);
	expect(
		readPath(config.parse, ["json", "unwrap_string"]) === false,
		`${label}: parse.json.unwrap_string must be false`,
	);
	const lat = asRecord(config.map["lat"]);
	expect(
		stable(readPath(lat, ["coord", "format"])) === stable("geojson"),
		`${label}: lat must use coord format geojson`,
	);
	const name = asRecord(config.map["name"]);
	const fallback = asArray(name?.["coalesce"]) ?? [];
	expect(
		fallback.some((expr) => constValue(expr) === "Defibrylator AED"),
		`${label}: name needs a generic final fallback; only 0.6% of PL features have name`,
	);
	expect(
		config.source.enabled === true,
		`${label}: OpenAEDMap is the only complete national open source`,
	);
	expect(
		config.publish?.allowed_for_ingest === true &&
			config.publish.allowed_for_export === true,
		`${label}: ODbL data may be ingested and exported with attribution`,
	);
};

const checkPrzemysl = (config: SourceConfig): void => {
	const label = "przemysl";
	checkIdentity(
		config,
		label,
		{ template: "przemysl:15:{id}" },
		[{ field: "id" }],
	);
	expect(
		config.connector.family === "http_json" &&
			config.connector.parser === "json",
		`${label}: expected http_json/json`,
	);
	expect(
		config.fetch.url.endsWith("/resources/15/structured"),
		`${label}: must use /structured, not format=csv`,
	);
	expect(config.records.path === "/rows", `${label}: expected /rows`);
	expect(
		readPath(config.fetch, ["pagination", "total_path"]) === "/total_rows",
		`${label}: total_path must be /total_rows to detect the default 10/21 limit`,
	);
	expect(
		readPath(config.fetch, ["pagination", "page_size"]) === 100,
		`${label}: page_size must cover all 21 rows in one page`,
	);
	expect(
		constValue(config.map["source_updated_at"]) === "2024-11-05",
		`${label}: source date is 2024-11-05, not the import date`,
	);
	expect(
		stable(readPath(config.map["operator_name"], ["const"])) === stable(null),
		`${label}: operator is not published by the source`,
	);
	expect(
		config.publish?.allowed_for_ingest === true &&
			config.publish.allowed_for_export === true,
		`${label}: local CC BY 4.0 gate allows ingest and export`,
	);
};

const checkKrosno = (config: SourceConfig): void => {
	const label = "krosno";
	checkIdentity(
		config,
		label,
		{ template: "krosno:{Numer Id}" },
		[{ field: "Numer Id" }],
	);
	expect(
		readPath(config.parse, ["encoding"]) === "utf-8-sig",
		`${label}: UTF-8 BOM requires utf-8-sig`,
	);
	expect(
		readPath(config.parse, ["trim_headers"]) === true,
		`${label}: four headers have a leading space`,
	);
	const latArg = asRecord(asArray(asRecord(config.map["lat"])?.["args"])?.[0]);
	const lonArg = asRecord(asArray(asRecord(config.map["lon"])?.["args"])?.[0]);
	expect(
		asString(latArg?.["field"]) === "Szerokość geograficzna",
		`${label}: lat column is "Szerokość geograficzna"`,
	);
	expect(
		asString(lonArg?.["field"]) === "Długość geograficzna",
		`${label}: lon column is "Długość geograficzna"`,
	);
	expect(
		config.validate.coords?.on_invalid === "reject",
		`${label}: invalid coordinates must reject`,
	);
	expect(
		config.validate.coords?.bbox?.[0] === 14.1 &&
			config.validate.coords.bbox[3] === 54.9,
		`${label}: expected Poland bbox`,
	);
	expect(
		config.publish?.allowed_for_ingest === true &&
			config.publish.allowed_for_export === true,
		`${label}: CC0 gate allows ingest and export`,
	);
};

const checkMarki = (config: SourceConfig): void => {
	const label = "marki";
	checkIdentity(
		config,
		label,
		{ template: "marki:{Numer Id}" },
		[{ field: "Numer Id" }],
	);
	expect(
		readPath(config.parse, ["csv", "unwrap_outer_quotes"]) === true &&
			readPath(config.parse, ["csv", "repair_double_quotes"]) === true,
		`${label}: requires outer-quote unwrap and double-quote repair`,
	);
	const latArg = asRecord(asArray(asRecord(config.map["lat"])?.["args"])?.[0]);
	const lonArg = asRecord(asArray(asRecord(config.map["lon"])?.["args"])?.[0]);
	expect(
		asString(latArg?.["field"]) === "Długość geograficzna",
		`${label}: header says longitude but rows carry latitude in that column`,
	);
	expect(
		asString(lonArg?.["field"]) === "Szerokość geograficzna",
		`${label}: header says latitude but rows carry longitude in that column`,
	);
	expect(
		config.validate.coords?.on_invalid === "review",
		`${label}: row 7 must go to review, not the map`,
	);
	const bbox = config.validate.coords?.bbox ?? [];
	expect(
		bbox[0] === 21.05 && bbox[1] === 52.28 && bbox[2] === 21.18 && bbox[3] === 52.38,
		`${label}: expected narrow Marki bbox`,
	);
	expect(
		config.validate.on_error === "review",
		`${label}: per-record errors must not remove the whole source`,
	);
	expect(
		config.publish?.allowed_for_ingest === true &&
			config.publish.allowed_for_export === true,
		`${label}: CC BY 4.0 gate allows ingest and export`,
	);
};

const checkWarszawa = (config: SourceConfig): void => {
	const label = "warszawa";
	checkIdentity(
		config,
		label,
		{ template: "warszawa:{properties.defibrillator_id}" },
		[{ field: "properties.defibrillator_id" }],
	);
	expect(
		config.connector.family === "http_json" &&
			config.connector.parser === "json",
		`${label}: expected http_json/json`,
	);
	expect(config.fetch.method === "POST", `${label}: API requires POST`);
	expect(
		config.fetch.auth?.type === "header" &&
			config.fetch.auth.header?.toLowerCase() === "authorization",
		`${label}: API requires an Authorization header`,
	);
	expect(
		config.fetch.auth?.env === "WARSZAWA_API_TOKEN",
		`${label}: token must come from WARSZAWA_API_TOKEN`,
	);
	const lat = asRecord(config.map["lat"]);
	expect(
		readPath(lat, ["coord", "unwrap_single"]) === true,
		`${label}: geometry.coordinates is sometimes [[lon, lat]]`,
	);
	const accessCases = asRecord(readPath(config.map["access_type"], ["map", "cases"]));
	expect(
		accessCases?.["publiczny"] === "public" &&
			accessCases?.["prywatny"] === "private",
		`${label}: access map must handle Polish values such as Publiczny/Prywatny`,
	);
	expect(
		text(readPath(config.map["is_24_7"], ["when", "right"])).includes("całodob"),
		`${label}: 24/7 must be parsed from the prose access description`,
	);
	expect(
		config.source.enabled === false && config.publish?.enabled === false,
		`${label}: keep disabled until the listing mode and token are confirmed`,
	);
	expect(
		config.publish?.allowed_for_ingest === true &&
			config.publish.allowed_for_export === true,
		`${label}: license gate is CC BY 4.0; operational readiness is separate`,
	);
};

const expectedSources: Array<{
	id: string;
	yaml: string;
	check: (config: SourceConfig) => void;
}> = [
	{ id: "openaedmap", yaml: "openaedmap-pl.yaml", check: checkOpenAedMap },
	{ id: "przemysl", yaml: "przemysl-sod.yaml", check: checkPrzemysl },
	{ id: "krosno", yaml: "krosno-dane-gov-pl.yaml", check: checkKrosno },
	{ id: "marki", yaml: "marki-dane-gov-pl.yaml", check: checkMarki },
	{ id: "warszawa", yaml: "warszawa-api.yaml", check: checkWarszawa },
];

const schema = (await Bun.file(schemaPath).json()) as Record<string, unknown>;
// Formats are checked explicitly below; Ajv is used for structure and enums.
const ajv = new Ajv2020({ allErrors: true, strict: false, logger: false });
const validate = ajv.compile(schema);

for (const expected of expectedSources) {
	const label = expected.id;
	const jsonPath = join(sourceDir, `${expected.id}.json`);
	const yamlPath = join(exampleDir, expected.yaml);

	const jsonValue: unknown = await Bun.file(jsonPath).json();
	const yamlValue: unknown = Bun.YAML.parse(await Bun.file(yamlPath).text());

	if (!validate(jsonValue)) {
		for (const issue of validate.errors ?? []) {
			errors.push(
				`${label}: JSON schema ${issue.instancePath || "/"} ${issue.message}`,
			);
		}
	}
	if (!validate(yamlValue)) {
		for (const issue of validate.errors ?? []) {
			errors.push(
				`${label}: YAML schema ${issue.instancePath || "/"} ${issue.message}`,
			);
		}
	}
	expect(
		stable(jsonValue) === stable(yamlValue),
		`${label}: canonical JSON is out of date with ${expected.yaml}; run scripts/build-source-configs.ts`,
	);

	const config = asConfig(jsonValue, label);
	if (!config) continue;
	checkCommon(config, label);
	checkLicenseGates(config, label);
	expected.check(config);

	if (config.source.id !== expected.id) {
		errors.push(`${label}: source.id is ${config.source.id}`);
	}
}

if (errors.length > 0) {
	console.error(`Source config validation failed with ${errors.length} error(s):`);
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log(
	`Source configs valid: ${expectedSources.length} A sources, JSON/YAML parity, identity/dedupe, quirks and license gates.`,
);
