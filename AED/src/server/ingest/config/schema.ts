import { z } from "zod";

/**
 * Runtime contract for a declarative AED source configuration.
 *
 * This module is the single source of truth for the shape of a source config.
 * It mirrors `backend/ingest/source-config.schema.json`, but adds parser-specific
 * unions and semantic refinements that JSON Schema alone cannot express (URL
 * policy, parser/family matrix, license mirroring, lookup paths).
 *
 * The JSON Schema artifact is generated with `buildSourceConfigJsonSchema()` and
 * checked in by `scripts/generate-source-config-schema.ts`.
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

/** Family/parser compatibility matrix from docs/ingest-source-config.md §4.3. */
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

export const ACCESS_TYPES = ["file", "api", "html", "kml", "manual"] as const;
export const RELIABILITY_TIERS = [
	"authoritative",
	"official_local",
	"community",
	"aggregator",
	"derived",
	"app",
	"register",
] as const;
export const UPDATE_FREQUENCIES = [
	"continuous",
	"daily",
	"weekly",
	"monthly",
	"quarterly",
	"once",
	"unknown",
] as const;
export const ENCODINGS = ["utf-8", "utf-8-sig", "iso-8859-2"] as const;
export const PAGINATION_TYPES = [
	"none",
	"page",
	"offset",
	"cursor",
	"link_header",
] as const;
export const AUTH_TYPES = ["none", "bearer", "header", "basic"] as const;
export const DRIFT_ACTIONS = ["ignore", "warn", "review", "fail"] as const;
export const FIELD_ON_MISSING = [
	"null",
	"reject",
	"review",
	"default",
] as const;
export const EXPORT_FORMATS = ["csv", "geojson", "json"] as const;

export type AccessType = (typeof ACCESS_TYPES)[number];
export type ReliabilityTier = (typeof RELIABILITY_TIERS)[number];
export type UpdateFrequency = (typeof UPDATE_FREQUENCIES)[number];
export type Encoding = (typeof ENCODINGS)[number];
export type PaginationType = (typeof PAGINATION_TYPES)[number];
export type AuthType = (typeof AUTH_TYPES)[number];
export type DriftAction = (typeof DRIFT_ACTIONS)[number];
export type FieldOnMissing = (typeof FIELD_ON_MISSING)[number];

export const canonicalFieldSchema = z.enum(CANONICAL_FIELDS);
export const accessTypeSchema = z.enum(ACCESS_TYPES);
export const reliabilityTierSchema = z.enum(RELIABILITY_TIERS);
export const updateFrequencySchema = z.enum(UPDATE_FREQUENCIES);
export const encodingSchema = z.enum(ENCODINGS);
export const driftActionSchema = z.enum(DRIFT_ACTIONS);
export const exportFormatSchema = z.enum(EXPORT_FORMATS);

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

const fieldSpecWrapperSchema = z.strictObject({
	value: exprSchema,
	required: z.boolean().optional(),
	on_missing: z.enum(FIELD_ON_MISSING).optional(),
	default: jsonScalarSchema.optional(),
	confidence: z.number().min(0).max(1).optional(),
	note: z.string().optional(),
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

const licenseSchema = z.strictObject({
	id: z.string().min(1),
	url: httpsUrlSchema.optional(),
	attribution: z.string().optional(),
	share_alike: z.boolean().optional(),
});

const coverageSchema = z.strictObject({
	country: z
		.string()
		.regex(/^[A-Z]{2}$/, {
			message: "Kod kraju musi mieć dwa znaki ISO 3166-1.",
		})
		.optional(),
	teryt: z.array(z.string().regex(/^\d{2,7}$/)).optional(),
	notes: z.string().optional(),
});

export const sourceSchema = z.strictObject({
	id: sourceIdSchema,
	name: z.string().min(1),
	publisher: z.string().min(1),
	homepage_url: httpsUrlSchema.optional(),
	access_type: accessTypeSchema,
	reliability_tier: reliabilityTierSchema,
	license: licenseSchema,
	coverage: coverageSchema.optional(),
	update_frequency: updateFrequencySchema.optional(),
	enabled: z.boolean().optional(),
	notes: z.string().optional(),
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

const conditionalSchema = z.strictObject({
	etag: z.boolean().optional(),
	last_modified: z.boolean().optional(),
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
	conditional: conditionalSchema.optional(),
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
// Records, validation, drift, publish, schedule
// ---------------------------------------------------------------------------

const identitySchema = z.strictObject({
	source_record_id: exprSchema,
	dataset_id: exprSchema.optional(),
	stable: z.boolean().optional(),
});

const dedupeSchema = z.strictObject({
	key: z.array(exprSchema).min(1).optional(),
	keep: z.enum(["first", "last"]).optional(),
	on_duplicate: z.enum(["warn", "reject", "merge"]).optional(),
});

export const recordsSchema = z.strictObject({
	path: z.string().min(1),
	identity: identitySchema,
	dedupe: dedupeSchema.optional(),
});

const bboxSchema = z.tuple([
	z.number().min(-180).max(180),
	z.number().min(-90).max(90),
	z.number().min(-180).max(180),
	z.number().min(-90).max(90),
]);

export const validateSchema = z.strictObject({
	required: z.array(canonicalFieldSchema).optional(),
	require_location: z
		.enum(["point", "address_or_point", "address", "none"])
		.optional(),
	coords: z
		.strictObject({
			bbox: bboxSchema.optional(),
			on_invalid: z.enum(["reject", "review", "null"]).optional(),
			on_missing: z.enum(["reject", "review", "null"]).optional(),
		})
		.optional(),
	enums: z.boolean().optional(),
	on_error: z.enum(["reject", "review"]).optional(),
});

const baselineSchema = z.strictObject({
	record_count: z.union([z.number().int().min(0), z.null()]).optional(),
	schema_file: z.string().optional(),
	schema_fields: z.array(z.string()).optional(),
	generated_at: z.string().optional(),
});

const driftRulesSchema = z.strictObject({
	on_new_field: driftActionSchema.optional(),
	on_missing_field: driftActionSchema.optional(),
	on_type_change: driftActionSchema.optional(),
	on_header_order_change: driftActionSchema.optional(),
});

const volumeDriftSchema = z.strictObject({
	min_records: z.number().int().min(0).optional(),
	max_records: z.union([z.number().int().min(0), z.null()]).optional(),
	max_delta_ratio: z.number().min(0).max(1).optional(),
	on_breach: driftActionSchema.optional(),
});

const qualityDriftSchema = z.strictObject({
	max_coord_invalid_ratio: z.number().min(0).max(1).optional(),
	max_duplicate_id_ratio: z.number().min(0).max(1).optional(),
	max_null_ratio: z
		.partialRecord(canonicalFieldSchema, z.number().min(0).max(1))
		.optional(),
	on_breach: driftActionSchema.optional(),
});

const axisDriftSchema = z.strictObject({
	enabled: z.boolean().optional(),
	max_suspicious_ratio: z.number().min(0).max(1).optional(),
	on_breach: driftActionSchema.optional(),
});

const goldenSampleSchema = z.strictObject({
	file: z.string().optional(),
	size: z.number().int().min(1).optional(),
	required_match_ratio: z.number().min(0).max(1).optional(),
});

const driftActionsSchema = z.strictObject({
	warn: z.literal("log").optional(),
	review: z.literal("quarantine").optional(),
	fail: z.enum(["disable", "abort"]).optional(),
});

export const driftSchema = z.strictObject({
	baseline: baselineSchema.optional(),
	schema: driftRulesSchema.optional(),
	volume: volumeDriftSchema.optional(),
	quality: qualityDriftSchema.optional(),
	axis: axisDriftSchema.optional(),
	golden_sample: goldenSampleSchema.optional(),
	actions: driftActionsSchema.optional(),
});

export const publishSchema = z.strictObject({
	enabled: z.boolean().optional(),
	license_id: z.string().min(1).optional(),
	attribution: z.string().optional(),
	allowed_for_ingest: z.boolean().optional(),
	allowed_for_export: z.boolean().optional(),
	terms_url: httpsUrlSchema.optional(),
	terms_hash: z
		.string()
		.regex(/^sha256:[0-9a-f]{64}$/, {
			message: "terms_hash musi mieć format sha256:<64 znaki hex>.",
		})
		.optional(),
	terms_checked_at: z.string().optional(),
	permission_document_url: httpsUrlSchema.optional(),
	approved_by: z.string().optional(),
	redact: z.array(canonicalFieldSchema).optional(),
	exports: z.array(exportFormatSchema).optional(),
});

export const scheduleSchema = z.strictObject({
	cron: z.string().regex(/^(?:\S+\s+){4}\S+$/, {
		message: "Cron musi mieć dokładnie 5 pól.",
	}),
	timezone: z.string().min(1),
	jitter_seconds: z.number().int().min(0).max(3600).optional(),
});

export const activationSchema = z.strictObject({
	mode: z.enum(["canary", "immediate"]).optional(),
	canary: z.boolean().optional(),
	auto_rollback: z.boolean().optional(),
	watch_window_runs: z.number().int().min(1).optional(),
	rollback_revision: z.number().int().min(1).optional(),
});

export const geocodingSchema = z.strictObject({
	enabled: z.boolean().optional(),
	strategy: z
		.enum(["structured_first", "unstructured_first", "structured_only"])
		.optional(),
	provider_order: z.array(z.string()).optional(),
	address_template: z.string().optional(),
	required_components: z.array(z.string()).optional(),
	min_confidence: z.number().min(0).max(1).optional(),
	precision_m: z.record(z.string(), z.number().min(0)).optional(),
	on_failure: z.enum(["address_only", "review", "reject"]).optional(),
	cache_ttl_days: z.number().int().min(0).optional(),
	refresh_after_days: z.number().int().min(1).optional(),
	rate_limit: z
		.strictObject({ requests_per_minute: z.number().min(0.1).optional() })
		.optional(),
	verification: z
		.strictObject({
			cross_check_source_id: z.string().optional(),
			max_distance_m: z.number().min(0).optional(),
			promote_verification: z
				.enum(["never", "probable", "confirmed"])
				.optional(),
		})
		.optional(),
	geoportal: z
		.strictObject({
			endpoint: httpsUrlSchema.optional(),
			request: z.string().min(1).optional(),
			max_results: z.number().int().min(1).max(15).optional(),
			min_accuracy: z.number().min(0).max(1).optional(),
			only_exact_numbers: z.boolean().optional(),
			srid: z.literal(2180).optional(),
			output_srid: z.literal(4326).optional(),
		})
		.optional(),
});

/** Defaults for the public GUGiK UUG geocoder used by address-only sources. */
export const GUGIK_UUG_GEOCODER = {
	id: "gugik-uug",
	endpoint: "https://services.gugik.gov.pl/uug/",
	request: "GetAddress",
	srid: 2180,
	output_srid: 4326,
} as const;

/** @deprecated Use GUGIK_UUG_GEOCODER. Kept for configs written before the name was fixed. */
export const GEOPORTAL_GEOCODER = GUGIK_UUG_GEOCODER;

// ---------------------------------------------------------------------------
// Top-level config: one variant per parser
// ---------------------------------------------------------------------------

const connectorNotesSchema = z.string().optional();

const baseSections = {
	version: z.literal(1),
	source: sourceSchema,
	fetch: fetchSchema,
	records: recordsSchema,
	map: z.partialRecord(canonicalFieldSchema, fieldSpecSchema),
	validate: validateSchema,
	drift: driftSchema,
	publish: publishSchema.optional(),
	geocoding: geocodingSchema.optional(),
	schedule: scheduleSchema.optional(),
	activation: activationSchema.optional(),
};

const csvSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("file_static"),
		parser: z.literal("csv"),
		notes: connectorNotesSchema,
	}),
	parse: csvParseSchema,
});

const xlsxSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("file_static"),
		parser: z.literal("xlsx"),
		notes: connectorNotesSchema,
	}),
	parse: xlsxParseSchema,
});

const jsonSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.enum([
			"file_static",
			"http_json",
			"http_json_api",
			"arcgis_query",
			"ckan_datastore",
		]),
		parser: z.literal("json"),
		notes: connectorNotesSchema,
	}),
	parse: jsonParseSchema,
});

const geojsonSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("file_static"),
		parser: z.literal("geojson"),
		notes: connectorNotesSchema,
	}),
	parse: geojsonParseSchema,
});

const kmlSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.enum(["file_static", "google_my_maps_kml"]),
		parser: z.literal("kml"),
		notes: connectorNotesSchema,
	}),
	parse: kmlParseSchema,
});

const jsonapiSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("http_json_api"),
		parser: z.literal("jsonapi"),
		notes: connectorNotesSchema,
	}),
	parse: jsonapiParseSchema,
});

const htmlTableSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("html_table"),
		parser: z.literal("html_table"),
		notes: connectorNotesSchema,
	}),
	parse: htmlTableParseSchema,
});

const htmlListSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("html_list"),
		parser: z.literal("html_list"),
		notes: connectorNotesSchema,
	}),
	parse: htmlListParseSchema,
});

const pdfTableSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("pdf_table"),
		parser: z.literal("pdf_table"),
		notes: connectorNotesSchema,
	}),
	parse: pdfTableParseSchema,
});

const manualSourceConfigSchema = z.strictObject({
	...baseSections,
	connector: z.strictObject({
		family: z.literal("manual"),
		parser: z.literal("manual"),
		notes: connectorNotesSchema,
	}),
	parse: manualParseSchema,
});

export const SOURCE_CONFIG_VARIANTS = {
	csv: csvSourceConfigSchema,
	xlsx: xlsxSourceConfigSchema,
	json: jsonSourceConfigSchema,
	geojson: geojsonSourceConfigSchema,
	kml: kmlSourceConfigSchema,
	jsonapi: jsonapiSourceConfigSchema,
	html_table: htmlTableSourceConfigSchema,
	html_list: htmlListSourceConfigSchema,
	pdf_table: pdfTableSourceConfigSchema,
	manual: manualSourceConfigSchema,
} as const;

/** Structural schema. Semantic, cross-field checks live in `sourceConfigSchema`. */
export const sourceConfigBaseSchema = z.union([
	csvSourceConfigSchema,
	xlsxSourceConfigSchema,
	jsonSourceConfigSchema,
	geojsonSourceConfigSchema,
	kmlSourceConfigSchema,
	jsonapiSourceConfigSchema,
	htmlTableSourceConfigSchema,
	htmlListSourceConfigSchema,
	pdfTableSourceConfigSchema,
	manualSourceConfigSchema,
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

function isConstantExpr(expr: Expr): boolean {
	if (expr === null || typeof expr !== "object") {
		return true;
	}
	return "const" in expr;
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

	for (const [field, spec] of Object.entries(value.map)) {
		if (spec && typeof spec === "object" && "required" in spec) {
			if (spec.on_missing === "default" && spec.default === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["map", field, "default"],
					message: "on_missing=default wymaga wartości default.",
				});
			}
		}
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

	const volume = value.drift.volume;
	if (
		volume?.min_records !== undefined &&
		typeof volume.max_records === "number" &&
		volume.max_records < volume.min_records
	) {
		ctx.addIssue({
			code: "custom",
			path: ["drift", "volume", "max_records"],
			message: "max_records nie może być mniejsze od min_records.",
		});
	}

	if (value.publish?.enabled) {
		if (!value.publish.license_id) {
			ctx.addIssue({
				code: "custom",
				path: ["publish", "license_id"],
				message: "Publikacja wymaga license_id.",
			});
		} else if (value.publish.license_id !== value.source.license.id) {
			ctx.addIssue({
				code: "custom",
				path: ["publish", "license_id"],
				message:
					"license_id publikacji musi być zgodny z source.license.id (rollback przywraca stan prawny).",
			});
		}
		if (
			value.source.license.attribution !== undefined &&
			!value.publish.attribution
		) {
			ctx.addIssue({
				code: "custom",
				path: ["publish", "attribution"],
				message:
					"Licencja źródła wymaga atrybucji także w publish.attribution.",
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

	const dedupe = value.records.dedupe;
	if (dedupe?.on_duplicate && !dedupe.key) {
		ctx.addIssue({
			code: "custom",
			path: ["records", "dedupe", "key"],
			message: "on_duplicate wymaga klucza dedupe.key.",
		});
	}

	if (isConstantExpr(value.records.identity.source_record_id)) {
		ctx.addIssue({
			code: "custom",
			path: ["records", "identity", "source_record_id"],
			message:
				"source_record_id nie może być stałą; musi identyfikować rekord źródłowy.",
		});
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

export function buildSourceConfigJsonSchema(): GeneratedJsonSchema {
	const generated = z.toJSONSchema(sourceConfigBaseSchema, {
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
		$id: "https://aed.local/schemas/source-config.schema.json",
		title: "AED source connector configuration",
		description:
			"Deklaratywna konfiguracja źródła AED: pobranie, parsowanie, mapowanie i dryf. Brak kodu wykonywalnego. Schemat generowany z src/server/ingest/config/schema.ts.",
		...cleaned,
	};
}

export const sourceConfigJsonSchema = buildSourceConfigJsonSchema();
