import { z } from "zod";

/**
 * Runtime contract for a declarative AED source configuration (slim).
 *
 * A source config describes only:
 * - source identity (`source`: id, name, enabled),
 * - connector type (`connector`: family + parser, compatibility matrix),
 * - where the data lives and how to fetch it (`fetch`),
 * - how to decode it (`parse`),
 * - where the records are (`records.path`),
 * - how source columns map to the canonical schema (`map`),
 * - minimal per-source data-quality validation (`validate`: required + coords).
 *
 * Deduplication, schema-change detection, publish gates and quality scoring
 * are intentionally NOT part of this contract; they run later on the
 * aggregated dataframe.
 *
 * The JSON Schema artifact is generated with `buildDatasourcesConfigJsonSchema()`
 * and checked in by `scripts/generate-source-config-schema.ts`.
 */

export const CONNECTOR_FAMILIES = [
	"file_static",
	"http_json",
	"http_json_api",
	"google_my_maps_kml",
	"arcgis_query",
	"ckan_datastore",
	"html_table",
	"html_list",
	"pdf_table",
	"manual",
] as const;

export type ConnectorFamily = (typeof CONNECTOR_FAMILIES)[number];

export const PARSERS = [
	"csv",
	"xlsx",
	"json",
	"geojson",
	"kml",
	"jsonapi",
	"html_table",
	"html_list",
	"pdf_table",
	"manual",
] as const;

export type Parser = (typeof PARSERS)[number];

/** Family/parser compatibility matrix. */
export const CONNECTOR_PARSER_MATRIX = {
	file_static: ["csv", "xlsx", "json", "geojson", "kml"],
	http_json: ["json"],
	http_json_api: ["jsonapi", "json"],
	google_my_maps_kml: ["kml"],
	arcgis_query: ["json"],
	ckan_datastore: ["json"],
	html_table: ["html_table"],
	html_list: ["html_list"],
	pdf_table: ["pdf_table"],
	manual: ["manual"],
} as const satisfies Record<ConnectorFamily, readonly Parser[]>;

export const CANONICAL_FIELDS = [
	"public_code",
	"source_record_id",
	"source_url",
	"name",
	"description",
	"note",
	"facility_type",
	"lat",
	"lon",
	"coord_precision_m",
	"country_code",
	"voivodeship",
	"county",
	"commune",
	"city",
	"district",
	"street",
	"house_number",
	"postcode",
	"address_text",
	"teryt_voivodeship",
	"teryt_county",
	"teryt_commune",
	"simc",
	"ulic",
	"indoor",
	"level",
	"room",
	"entrance_description",
	"access_type",
	"opening_hours",
	"is_24_7",
	"requires_dispatcher",
	"fee",
	"wheelchair_access",
	"label",
	"manufacturer",
	"model",
	"serial_number",
	"device_type",
	"pads_type",
	"installed_at",
	"battery_expiry",
	"pads_expiry",
	"last_inspection_at",
	"next_inspection_at",
	"status",
	"status_reason",
	"verification_status",
	"confidence",
	"last_verified_at",
	"last_seen_at",
	"is_public",
	"operator_name",
	"operator_type",
	"phone",
	"email",
	"website",
	"photo_url",
	"photo_license",
	"source_updated_at",
	"address_kind",
	"address_source",
	"address_confidence",
	"location_status",
	"geom_source",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export const ENCODINGS = ["utf-8", "utf-8-sig", "iso-8859-2"] as const;
export const PAGINATION_TYPES = [
	"none",
	"page",
	"offset",
	"cursor",
	"link_header",
] as const;
export const AUTH_TYPES = ["none", "bearer", "header", "basic"] as const;

export type Encoding = (typeof ENCODINGS)[number];
export type PaginationType = (typeof PAGINATION_TYPES)[number];
export type AuthType = (typeof AUTH_TYPES)[number];

export const canonicalFieldSchema = z.enum(CANONICAL_FIELDS);
export const encodingSchema = z.enum(ENCODINGS);

// ---------------------------------------------------------------------------
// Mapping DSL
// ---------------------------------------------------------------------------

export type JsonScalar = string | number | boolean | null;

export type BuiltinName = "fetched_at" | "now" | "row_index" | "source_id";

export type ConditionOp =
	| "eq"
	| "neq"
	| "in"
	| "not_in"
	| "exists"
	| "missing"
	| "empty"
	| "non_empty"
	| "regex"
	| "gt"
	| "gte"
	| "lt"
	| "lte";

export type CoordFormat = "geojson" | "kml" | "pair" | "object" | "wkt";
export type CoordOrder = "lat_lon" | "lon_lat";
export type CoordPick = "lat" | "lon" | "both";
export type AxisPolicy = "declared" | "auto_detect" | "swap_if_invalid";
export type CoordInvalidAction = "reject" | "review" | "null";

export type CoordSpec = {
	from?: Expr | [Expr, Expr] | undefined;
	lat?: Expr | undefined;
	lon?: Expr | undefined;
	format: CoordFormat;
	order?: CoordOrder | undefined;
	delimiter?: string | undefined;
	pick?: CoordPick | undefined;
	unwrap_single?: boolean | undefined;
	precision_m?: number | null | undefined;
	axis_policy?: AxisPolicy | undefined;
	on_invalid?: CoordInvalidAction | undefined;
};

export type Condition = {
	op: ConditionOp;
	left: Expr;
	right?: JsonScalar | JsonScalar[] | undefined;
};

export type Expr =
	| string
	| number
	| boolean
	| null
	| { field: string }
	| { pointer: string }
	| { builtin: BuiltinName }
	| { const: JsonScalar }
	| { func: string; args: Expr[] }
	| { coalesce: Expr[] }
	| { template: string; vars?: Record<string, Expr> | undefined }
	| {
			regex: {
				in: Expr;
				pattern: string;
				group?: number | undefined;
				flags?: string | undefined;
			};
	  }
	| {
			map: {
				value: Expr;
				cases: Record<string, JsonScalar>;
				default?: JsonScalar | undefined;
			};
	  }
	| { when: Condition; then: Expr; else?: Expr | undefined }
	| { coord: CoordSpec }
	| { json: Expr }
	| { first: Expr }
	| {
			lookup: {
				file: string;
				key: Expr;
				default?: JsonScalar | undefined;
			};
	  };

const jsonScalarSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
]);

const builtinSchema = z.enum([
	"fetched_at",
	"now",
	"row_index",
	"source_id",
] as const);

const conditionOpSchema = z.enum([
	"eq",
	"neq",
	"in",
	"not_in",
	"exists",
	"missing",
	"empty",
	"non_empty",
	"regex",
	"gt",
	"gte",
	"lt",
	"lte",
] as const);

const coordFormatSchema = z.enum([
	"geojson",
	"kml",
	"pair",
	"object",
	"wkt",
] as const);

export const exprSchema: z.ZodType<Expr> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.strictObject({ field: z.string().min(1) }),
		z.strictObject({ pointer: z.string().min(1) }),
		z.strictObject({ builtin: builtinSchema }),
		z.strictObject({ const: jsonScalarSchema }),
		z.strictObject({ func: z.string().min(1), args: z.array(exprSchema) }),
		z.strictObject({ coalesce: z.array(exprSchema).min(1) }),
		z.strictObject({
			template: z.string().min(1),
			vars: z.record(z.string(), exprSchema).optional(),
		}),
		z.strictObject({
			regex: z.strictObject({
				in: exprSchema,
				pattern: z.string().min(1),
				group: z.number().int().min(0).optional(),
				flags: z.string().optional(),
			}),
		}),
		z.strictObject({
			map: z.strictObject({
				value: exprSchema,
				cases: z.record(z.string(), jsonScalarSchema),
				default: jsonScalarSchema.optional(),
			}),
		}),
		z.strictObject({
			when: conditionSchema,
			// biome-ignore lint/suspicious/noThenProperty: the mapping DSL uses when/then/else
			then: exprSchema,
			else: exprSchema.optional(),
		}),
		z.strictObject({ coord: coordSpecSchema }),
		z.strictObject({ json: exprSchema }),
		z.strictObject({ first: exprSchema }),
		z.strictObject({
			lookup: z.strictObject({
				file: z.string().min(1),
				key: exprSchema,
				default: jsonScalarSchema.optional(),
			}),
		}),
	]),
);

export const conditionSchema: z.ZodType<Condition> = z.strictObject({
	op: conditionOpSchema,
	left: exprSchema,
	right: z.union([jsonScalarSchema, z.array(jsonScalarSchema)]).optional(),
});

const coordSpecBaseSchema = z.strictObject({
	from: z.union([exprSchema, z.tuple([exprSchema, exprSchema])]).optional(),
	lat: exprSchema.optional(),
	lon: exprSchema.optional(),
	format: coordFormatSchema,
	order: z.enum(["lat_lon", "lon_lat"]).optional(),
	delimiter: z.string().optional(),
	pick: z.enum(["lat", "lon", "both"]).optional(),
	unwrap_single: z.boolean().optional(),
	precision_m: z.union([z.number(), z.null()]).optional(),
	axis_policy: z
		.enum(["declared", "auto_detect", "swap_if_invalid"])
		.optional(),
	on_invalid: z.enum(["reject", "review", "null"]).optional(),
});

export const coordSpecSchema: z.ZodType<CoordSpec> = z.union([
	coordSpecBaseSchema.extend({
		from: z.union([exprSchema, z.tuple([exprSchema, exprSchema])]),
	}),
	coordSpecBaseSchema.extend({
		lat: exprSchema,
		lon: exprSchema,
	}),
]);

/** Field spec: an expression, or a wrapper adding a fallback default. */
const fieldSpecWrapperSchema = z.strictObject({
	value: exprSchema,
	default: jsonScalarSchema.optional(),
});

export const fieldSpecSchema = z.union([exprSchema, fieldSpecWrapperSchema]);

// ---------------------------------------------------------------------------
// Source identity
// ---------------------------------------------------------------------------

const httpsUrlSchema = z.url({ protocol: /^https$/ });

const sourceIdSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,31}$/, {
	message:
		"Identyfikator źródła: 1-32 znaków [a-z0-9._-], musi zaczynać się od litery lub cyfry.",
});

export const sourceSchema = z.strictObject({
	id: sourceIdSchema,
	name: z.string().min(1),
	enabled: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Fetch, auth, pagination
// ---------------------------------------------------------------------------

const envNameSchema = z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/, {
	message:
		"Nazwa zmiennej środowiskowej: wielkie litery, cyfry i _, 3-64 znaki.",
});

export const authSchema = z.discriminatedUnion("type", [
	z.strictObject({ type: z.literal("none") }),
	z.strictObject({ type: z.literal("bearer"), env: envNameSchema }),
	z.strictObject({
		type: z.literal("header"),
		header: z.string().min(1),
		env: envNameSchema,
		prefix: z.string().optional(),
	}),
	z.strictObject({
		type: z.literal("basic"),
		env: envNameSchema.optional(),
		user_env: envNameSchema.optional(),
		password_env: envNameSchema.optional(),
	}),
]);

export const paginationSchema = z.discriminatedUnion("type", [
	z.strictObject({ type: z.literal("none") }),
	z.strictObject({
		type: z.literal("page"),
		page_param: z.string().min(1),
		limit_param: z.string().min(1),
		page_size: z.number().int().min(1),
		start_page: z.number().int().min(0).optional(),
		total_path: z.string().optional(),
	}),
	z.strictObject({
		type: z.literal("offset"),
		offset_param: z.string().min(1),
		limit_param: z.string().min(1),
		page_size: z.number().int().min(1),
		start_offset: z.number().int().min(0).optional(),
		total_path: z.string().optional(),
	}),
	z.strictObject({
		type: z.literal("cursor"),
		cursor_path: z.string().min(1),
		next_path: z.string().optional(),
		page_size: z.number().int().min(1).optional(),
	}),
	z.strictObject({
		type: z.literal("link_header"),
		page_param: z.string().optional(),
	}),
]);

const retriesSchema = z.strictObject({
	max: z.number().int().min(0).optional(),
	backoff_ms: z.number().int().min(0).optional(),
});

const rateLimitSchema = z.strictObject({
	requests_per_minute: z.number().min(0.1).optional(),
});

export const fetchSchema = z.strictObject({
	url: httpsUrlSchema,
	method: z.enum(["GET", "POST"]).optional(),
	headers: z.record(z.string(), z.string()).optional(),
	query: z
		.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
		.optional(),
	body: z.record(z.string(), z.unknown()).optional(),
	auth: authSchema.optional(),
	timeout_ms: z.number().int().min(1000).max(120_000).optional(),
	max_bytes: z.number().int().min(1).optional(),
	max_redirects: z.number().int().min(0).max(5).optional(),
	retries: retriesSchema.optional(),
	rate_limit: rateLimitSchema.optional(),
	pagination: paginationSchema.optional(),
	user_agent: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Parser-specific parse configs
// ---------------------------------------------------------------------------

const csvParseConfigSchema = z.strictObject({
	delimiter: z.string().length(1).optional(),
	quote: z.string().length(1).optional(),
	skip_rows: z.number().int().min(0).optional(),
	header: z.boolean().optional(),
	unwrap_outer_quotes: z.boolean().optional(),
	repair_double_quotes: z.boolean().optional(),
	empty_as_null: z.boolean().optional(),
});

const xlsxParseConfigSchema = z.strictObject({
	sheet: z.union([z.string(), z.number().int().min(1)]).optional(),
	header_row: z.number().int().min(0).optional(),
});

const jsonParseConfigSchema = z.strictObject({
	unwrap_string: z.boolean().optional(),
});

const kmlParseConfigSchema = z.strictObject({
	point_only: z.boolean().optional(),
	document_name_must_match: z.string().optional(),
});

const regexFilterSchema = z.strictObject({
	regex: z.string().min(1),
	flags: z.string().optional(),
});

const htmlFieldExtractSchema = z.strictObject({
	source: z.enum(["text", "html", "attr"]).optional(),
	attr: z.string().optional(),
	regex: z.string().optional(),
	group: z.number().int().min(0).optional(),
	flags: z.string().optional(),
	null_values: z.array(z.string()).optional(),
	default: z.unknown().optional(),
});

const htmlTableParseConfigSchema = z.strictObject({
	select: z.string().optional(),
	table_index: z.number().int().min(0).optional(),
	require_headers: z.array(z.string()).optional(),
	require_keys: z.array(z.string()).optional(),
	orientation: z.enum(["rows", "key_value"]).optional(),
	columns: z.array(z.string()).optional(),
	header_row: z.number().int().min(0).optional(),
	data_start_row: z.number().int().min(0).optional(),
	key_column: z.number().int().min(0).optional(),
	value_column: z.number().int().min(0).optional(),
	value_join: z.enum(["space", "newline"]).optional(),
	normalize_headers: z.boolean().optional(),
	trim: z.boolean().optional(),
	collapse_whitespace: z.boolean().optional(),
	empty_as_null: z.boolean().optional(),
	skip_empty_rows: z.boolean().optional(),
	min_records: z.number().int().min(0).optional(),
	max_records: z.union([z.number().int().min(0), z.null()]).optional(),
	terms_confirmed: z.boolean().optional(),
});

const htmlListParseConfigSchema = z.strictObject({
	select: z.string().min(1).optional(),
	record_filter: regexFilterSchema.optional(),
	fields: z.record(z.string(), htmlFieldExtractSchema).optional(),
	item_text_separator: z.string().optional(),
	trim: z.boolean().optional(),
	collapse_whitespace: z.boolean().optional(),
	empty_as_null: z.boolean().optional(),
	min_records: z.number().int().min(0).optional(),
	max_records: z.union([z.number().int().min(0), z.null()]).optional(),
});

const pdfColumnSchema = z.strictObject({
	key: z.string().min(1),
	x_min: z.number(),
	x_max: z.number(),
});

const pdfTableParseConfigSchema = z.strictObject({
	pages: z.array(z.number().int().min(1)).min(1).max(2).optional(),
	require_text_layer: z.boolean().optional(),
	min_text_chars: z.number().int().min(0).optional(),
	expected_page_count: z.number().int().min(1).optional(),
	strategy: z.literal("word_positions").optional(),
	columns: z.array(pdfColumnSchema).min(1),
	row_anchor: z.strictObject({
		column: z.string().min(1),
		regex: z.string().min(1),
	}),
	row_tolerance: z.number().min(0).optional(),
	multi_line: z.enum(["join_space", "join_newline", "first"]).optional(),
	trim: z.boolean().optional(),
	collapse_whitespace: z.boolean().optional(),
	empty_as_null: z.boolean().optional(),
	min_records: z.number().int().min(0).optional(),
	max_records: z.union([z.number().int().min(0), z.null()]).optional(),
});

const manualParseConfigSchema = z.strictObject({
	document_url: httpsUrlSchema.optional(),
	format: z
		.enum(["pdf", "docx", "xlsx", "csv", "html", "emapa", "image", "other"])
		.optional(),
	transcription_file: z.string().min(1).optional(),
	instructions: z.string().optional(),
});

const parseBaseShape = {
	encoding: encodingSchema.optional(),
	trim_headers: z.boolean().optional(),
};

export const csvParseSchema = z.strictObject({
	...parseBaseShape,
	csv: csvParseConfigSchema.optional(),
});

export const xlsxParseSchema = z.strictObject({
	...parseBaseShape,
	xlsx: xlsxParseConfigSchema.optional(),
});

export const jsonParseSchema = z.strictObject({
	...parseBaseShape,
	json: jsonParseConfigSchema.optional(),
});

export const geojsonParseSchema = z.strictObject({
	...parseBaseShape,
	json: jsonParseConfigSchema.optional(),
});

export const kmlParseSchema = z.strictObject({
	...parseBaseShape,
	kml: kmlParseConfigSchema.optional(),
});

export const jsonapiParseSchema = z.strictObject({
	...parseBaseShape,
	json: jsonParseConfigSchema.optional(),
});

export const htmlTableParseSchema = z.strictObject({
	...parseBaseShape,
	html_table: htmlTableParseConfigSchema.optional(),
});

export const htmlListParseSchema = z.strictObject({
	...parseBaseShape,
	html_list: htmlListParseConfigSchema.optional(),
	json: jsonParseConfigSchema.optional(),
});

export const pdfTableParseSchema = z.strictObject({
	...parseBaseShape,
	pdf_table: pdfTableParseConfigSchema.optional(),
});

export const manualParseSchema = z.strictObject({
	manual: manualParseConfigSchema.optional(),
});

export const PARSER_PARSE_SCHEMAS = {
	csv: csvParseSchema,
	xlsx: xlsxParseSchema,
	json: jsonParseSchema,
	geojson: geojsonParseSchema,
	kml: kmlParseSchema,
	jsonapi: jsonapiParseSchema,
	html_table: htmlTableParseSchema,
	html_list: htmlListParseSchema,
	pdf_table: pdfTableParseSchema,
	manual: manualParseSchema,
} as const;

export const parseConfigSchema = z.union([
	csvParseSchema,
	xlsxParseSchema,
	jsonParseSchema,
	geojsonParseSchema,
	kmlParseSchema,
	jsonapiParseSchema,
	htmlTableParseSchema,
	htmlListParseSchema,
	pdfTableParseSchema,
	manualParseSchema,
]);

export type CsvParseConfig = z.infer<typeof csvParseSchema>;
export type XlsxParseConfig = z.infer<typeof xlsxParseSchema>;
export type JsonParseConfig = z.infer<typeof jsonParseSchema>;
export type GeoJsonParseConfig = z.infer<typeof geojsonParseSchema>;
export type KmlParseConfig = z.infer<typeof kmlParseSchema>;
export type JsonApiParseConfig = z.infer<typeof jsonapiParseSchema>;
export type HtmlTableParseConfig = z.infer<typeof htmlTableParseSchema>;
export type HtmlListParseConfig = z.infer<typeof htmlListParseSchema>;
export type PdfTableParseConfig = z.infer<typeof pdfTableParseSchema>;
export type ManualParseConfig = z.infer<typeof manualParseSchema>;
export type ParseConfig = z.infer<typeof parseConfigSchema>;

// ---------------------------------------------------------------------------
// Records and minimal validation
// ---------------------------------------------------------------------------

export const recordsSchema = z.strictObject({
	path: z.string().min(1),
});

/** Sanity range for coordinates: [minLon, minLat, maxLon, maxLat]. */
const bboxSchema = z.tuple([
	z.number().min(-180).max(180),
	z.number().min(-90).max(90),
	z.number().min(-180).max(180),
	z.number().min(-90).max(90),
]);

export const validateSchema = z.strictObject({
	required: z.array(canonicalFieldSchema).optional(),
	coords: z
		.strictObject({
			bbox: bboxSchema.optional(),
		})
		.optional(),
});

// ---------------------------------------------------------------------------
// Top-level config: one variant per parser
// ---------------------------------------------------------------------------

function buildSourceVariant<P extends Parser>(parser: P) {
	const families = CONNECTOR_FAMILIES.filter((family) =>
		(CONNECTOR_PARSER_MATRIX[family] as readonly Parser[]).includes(parser),
	) as [ConnectorFamily, ...ConnectorFamily[]];
	return z.strictObject({
		source: sourceSchema,
		connector: z.strictObject({
			family: z.enum(families),
			parser: z.literal(parser),
		}),
		fetch: fetchSchema,
		parse: PARSER_PARSE_SCHEMAS[parser],
		records: recordsSchema,
		map: z.partialRecord(canonicalFieldSchema, fieldSpecSchema),
		validate: validateSchema,
	});
}

export const SOURCE_CONFIG_VARIANTS = {
	csv: buildSourceVariant("csv"),
	xlsx: buildSourceVariant("xlsx"),
	json: buildSourceVariant("json"),
	geojson: buildSourceVariant("geojson"),
	kml: buildSourceVariant("kml"),
	jsonapi: buildSourceVariant("jsonapi"),
	html_table: buildSourceVariant("html_table"),
	html_list: buildSourceVariant("html_list"),
	pdf_table: buildSourceVariant("pdf_table"),
	manual: buildSourceVariant("manual"),
} as const;

/** Structural schema. Semantic, cross-field checks live in `sourceConfigSchema`. */
export const sourceConfigBaseSchema = z.union([
	SOURCE_CONFIG_VARIANTS.csv,
	SOURCE_CONFIG_VARIANTS.xlsx,
	SOURCE_CONFIG_VARIANTS.json,
	SOURCE_CONFIG_VARIANTS.geojson,
	SOURCE_CONFIG_VARIANTS.kml,
	SOURCE_CONFIG_VARIANTS.jsonapi,
	SOURCE_CONFIG_VARIANTS.html_table,
	SOURCE_CONFIG_VARIANTS.html_list,
	SOURCE_CONFIG_VARIANTS.pdf_table,
	SOURCE_CONFIG_VARIANTS.manual,
]);

export type SourceConfigBase = z.infer<typeof sourceConfigBaseSchema>;

// ---------------------------------------------------------------------------
// Semantic refinements
// ---------------------------------------------------------------------------

const FORBIDDEN_HEADERS = [
	"host",
	"content-length",
	"transfer-encoding",
	"connection",
	"proxy-connection",
	"proxy-authorization",
	"x-forwarded-for",
	"x-forwarded-host",
	"x-forwarded-proto",
];

function collectLookupFiles(
	expr: Expr,
	out: { path: string; file: string }[],
): void {
	if (expr === null || typeof expr !== "object") {
		return;
	}
	if ("lookup" in expr && typeof expr.lookup === "object") {
		out.push({ path: "expr", file: expr.lookup.file });
		collectLookupFiles(expr.lookup.key, out);
		return;
	}
	if ("coord" in expr) {
		const spec = expr.coord;
		if (Array.isArray(spec.from)) {
			for (const item of spec.from) {
				collectLookupFiles(item, out);
			}
		} else if (spec.from) {
			collectLookupFiles(spec.from, out);
		}
		if (spec.lat) collectLookupFiles(spec.lat, out);
		if (spec.lon) collectLookupFiles(spec.lon, out);
		return;
	}
	if ("func" in expr) {
		for (const arg of expr.args) {
			collectLookupFiles(arg, out);
		}
		return;
	}
	if ("coalesce" in expr) {
		for (const item of expr.coalesce) {
			collectLookupFiles(item, out);
		}
		return;
	}
	if ("template" in expr && expr.vars) {
		for (const item of Object.values(expr.vars)) {
			collectLookupFiles(item, out);
		}
		return;
	}
	if ("regex" in expr) {
		collectLookupFiles(expr.regex.in, out);
		return;
	}
	if ("map" in expr) {
		collectLookupFiles(expr.map.value, out);
		return;
	}
	if ("when" in expr) {
		collectLookupFiles(expr.when.left, out);
		collectLookupFiles(expr.then, out);
		if (expr.else) collectLookupFiles(expr.else, out);
		return;
	}
	if ("json" in expr) {
		collectLookupFiles(expr.json, out);
		return;
	}
	if ("first" in expr) {
		collectLookupFiles(expr.first, out);
	}
}

function safeRelativeLookupPath(file: string): boolean {
	if (file.startsWith("/") || /^[A-Za-z]:[\\/]/.test(file)) {
		return false;
	}
	return !file.split(/[\\/]/).includes("..");
}

function refineSourceConfig(
	value: SourceConfigBase,
	ctx: z.RefinementCtx,
): void {
	if (value.source.id.includes("..")) {
		ctx.addIssue({
			code: "custom",
			path: ["source", "id"],
			message: "Identyfikator źródła nie może zawierać '..'.",
		});
	}

	if (Object.keys(value.map).length === 0) {
		ctx.addIssue({
			code: "custom",
			path: ["map"],
			message: "Mapping musi zawierać co najmniej jedno pole kanoniczne.",
		});
	}

	const required = value.validate.required ?? [];
	const seenRequired = new Set<string>();
	for (const [index, field] of required.entries()) {
		if (seenRequired.has(field)) {
			ctx.addIssue({
				code: "custom",
				path: ["validate", "required", index],
				message: `Pole ${field} jest wymienione więcej niż raz.`,
			});
		}
		seenRequired.add(field);
		if (!(field in value.map)) {
			ctx.addIssue({
				code: "custom",
				path: ["validate", "required", index],
				message: `Pole ${field} jest wymagane, ale nie ma mapowania w map.`,
			});
		}
	}

	const bbox = value.validate.coords?.bbox;
	if (bbox) {
		const [minLon, minLat, maxLon, maxLat] = bbox;
		if (minLon >= maxLon) {
			ctx.addIssue({
				code: "custom",
				path: ["validate", "coords", "bbox"],
				message: "Bbox: minLon musi być mniejsze od maxLon.",
			});
		}
		if (minLat >= maxLat) {
			ctx.addIssue({
				code: "custom",
				path: ["validate", "coords", "bbox"],
				message: "Bbox: minLat musi być mniejsze od maxLat.",
			});
		}
	}

	const headers = value.fetch.headers ?? {};
	for (const name of Object.keys(headers)) {
		if (FORBIDDEN_HEADERS.includes(name.toLowerCase())) {
			ctx.addIssue({
				code: "custom",
				path: ["fetch", "headers", name],
				message: `Nagłówek ${name} jest zabroniony w konfiguracji.`,
			});
		}
	}

	const auth = value.fetch.auth;
	if (auth?.type === "basic") {
		const hasUserPair = Boolean(auth.user_env && auth.password_env);
		const hasEnvPair = Boolean(auth.env && auth.password_env);
		if (!hasUserPair && !hasEnvPair) {
			ctx.addIssue({
				code: "custom",
				path: ["fetch", "auth"],
				message:
					"Auth basic wymaga password_env oraz user_env albo env (zgodnie z kontraktem sekretów).",
			});
		}
	}

	const lookupFiles: { path: string; file: string }[] = [];
	for (const [field, spec] of Object.entries(value.map)) {
		const expr =
			spec && typeof spec === "object" && "value" in spec ? spec.value : spec;
		if (expr) {
			collectLookupFiles(expr as Expr, lookupFiles);
			for (const lookup of lookupFiles) {
				if (!safeRelativeLookupPath(lookup.file)) {
					ctx.addIssue({
						code: "custom",
						path: ["map", field],
						message: `lookup.file musi być relatywną ścieżką bez '..': ${lookup.file}`,
					});
				}
			}
		}
		lookupFiles.length = 0;
	}
}

export const sourceConfigSchema =
	sourceConfigBaseSchema.superRefine(refineSourceConfig);

export type SourceConfig = z.infer<typeof sourceConfigSchema>;
export type SourceConfigInput = z.input<typeof sourceConfigSchema>;
export type SourceConfigOutput = z.output<typeof sourceConfigSchema>;

export function parseSourceConfig(input: unknown): SourceConfig {
	return sourceConfigSchema.parse(input);
}

export function safeParseSourceConfig(
	input: unknown,
): z.ZodSafeParseResult<SourceConfig> {
	return sourceConfigSchema.safeParse(input);
}

// ---------------------------------------------------------------------------
// Datasources registry
// ---------------------------------------------------------------------------

/** Structural registry schema used for JSON Schema generation. */
export const datasourcesConfigBaseSchema = z.strictObject({
	version: z.literal(1),
	sources: z.array(sourceConfigBaseSchema),
});

export type DatasourcesConfigBase = z.infer<typeof datasourcesConfigBaseSchema>;

type DatasourcesRegistryShape = {
	version: 1;
	sources: readonly { source: { id: string } }[];
};

function refineDatasourcesConfig(
	value: DatasourcesRegistryShape,
	ctx: z.RefinementCtx,
): void {
	const firstIndexById = new Map<string, number>();

	value.sources.forEach((config, index) => {
		const id = config.source.id;
		const firstIndex = firstIndexById.get(id);
		if (firstIndex === undefined) {
			firstIndexById.set(id, index);
			return;
		}
		ctx.addIssue({
			code: "custom",
			path: ["sources", index, "source", "id"],
			message: `Zduplikowany identyfikator źródła: ${id}. Pierwsze wystąpienie: sources.${firstIndex}.`,
		});
	});
}

/**
 * Canonical registry of all source configs. The file on disk lives at
 * `backend/ingest/datasources-config.json` and has the shape
 * `{ "version": 1, "sources": SourceConfig[] }`.
 */
export const datasourcesConfigSchema = z
	.strictObject({
		version: z.literal(1),
		sources: z.array(sourceConfigSchema),
	})
	.superRefine(refineDatasourcesConfig);

export type DatasourcesConfig = z.infer<typeof datasourcesConfigSchema>;
export type DatasourcesConfigInput = z.input<typeof datasourcesConfigSchema>;
export type DatasourcesConfigOutput = z.output<typeof datasourcesConfigSchema>;

export function parseDatasourcesConfig(input: unknown): DatasourcesConfig {
	return datasourcesConfigSchema.parse(input);
}

export function safeParseDatasourcesConfig(
	input: unknown,
): z.ZodSafeParseResult<DatasourcesConfig> {
	return datasourcesConfigSchema.safeParse(input);
}

// ---------------------------------------------------------------------------
// JSON Schema generation
// ---------------------------------------------------------------------------

function stripInternalKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(stripInternalKeys);
	}
	if (value && typeof value === "object") {
		const output: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			if (key === "~standard") continue;
			if (typeof item === "function") continue;
			output[key] = stripInternalKeys(item);
		}
		return output;
	}
	return value;
}

/**
 * Ajv's strict mode rejects `type: ["string", "number"]` in draft 2020-12
 * unless `allowUnionTypes` is enabled. The JSON Schema is still valid, but the
 * project validates with `strict: true`, so expand those unions into `anyOf`.
 */
function expandTypeArrays(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(expandTypeArrays);
	}
	if (!value || typeof value !== "object") {
		return value;
	}
	const input = value as Record<string, unknown>;
	const output: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(input)) {
		output[key] = expandTypeArrays(item);
	}
	const type = output["type"];
	if (Array.isArray(type)) {
		delete output["type"];
		const union = type.map((entry) => ({ type: entry }));
		const existing = output["anyOf"];
		output["anyOf"] = Array.isArray(existing) ? [...existing, ...union] : union;
	}
	return output;
}

export type GeneratedJsonSchema = Record<string, unknown>;

export function buildDatasourcesConfigJsonSchema(): GeneratedJsonSchema {
	const generated = z.toJSONSchema(datasourcesConfigBaseSchema, {
		target: "draft-2020-12",
		io: "input",
		unrepresentable: "any",
		reused: "ref",
	}) as Record<string, unknown>;

	const cleaned = expandTypeArrays(stripInternalKeys(generated)) as Record<
		string,
		unknown
	>;
	delete cleaned["$schema"];
	delete cleaned["$id"];
	delete cleaned["title"];
	delete cleaned["description"];

	return {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		$id: "https://aed.local/schemas/datasources-config.schema.json",
		title: "AED datasources registry",
		description:
			"Rejestr źródeł AED: wersja rejestru i lista deklaratywnych konfiguracji źródeł. Schemat generowany z src/server/ingest/config/schema.ts.",
		...cleaned,
	};
}

export const datasourcesConfigJsonSchema = buildDatasourcesConfigJsonSchema();
