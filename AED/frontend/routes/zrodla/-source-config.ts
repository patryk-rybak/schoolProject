/**
 * Pure helpers for the /zrodla/nowe connector form: state shapes, defaults
 * and the builders that turn form state into a SourceConfig payload for
 * `previewSourceFn` / `saveSourceFn`. No React and no server imports, so the
 * route components and these helpers stay client-safe.
 *
 * The payload shape mirrors `src/server/ingest/config/schema.ts`; the server
 * re-validates everything with that Zod schema before touching the registry.
 */

export type FileParser = "csv" | "xlsx" | "json" | "geojson" | "kml";
export type S3Parser = "csv" | "xlsx" | "json" | "geojson";
export type StorageKind = "sqlite" | "postgres" | "s3";
export type LatLonMode = "columns" | "pair" | "geojson" | "kml" | "none";
export type SourceTab = "file" | "storage";
export type PairOrder = "lat_lon" | "lon_lat";

/** Sentinel for "no column selected" in the mapping selects. */
export const NONE = "__none__";

/** Poland sanity bbox: [minLon, minLat, maxLon, maxLat]. */
export const POLAND_BBOX = [14, 49, 24.5, 55] as const;

/** Canonical text fields offered in the mapping step, in display order. */
export const TEXT_MAPPING_FIELDS = [
	{ key: "name", label: "Nazwa *" },
	{ key: "description", label: "Opis" },
	{ key: "city", label: "Miejscowość" },
	{ key: "street", label: "Ulica" },
	{ key: "house_number", label: "Numer budynku" },
	{ key: "postcode", label: "Kod pocztowy" },
	{ key: "address_text", label: "Adres (pełny tekst)" },
	{ key: "opening_hours", label: "Godziny dostępności" },
	{ key: "operator_name", label: "Opiekun / operator" },
	{ key: "phone", label: "Telefon" },
	{ key: "email", label: "E-mail" },
	{ key: "website", label: "WWW" },
	{ key: "manufacturer", label: "Producent" },
	{ key: "model", label: "Model" },
	{ key: "source_record_id", label: "Identyfikator rekordu w źródle" },
] as const;

/** Step 1 state: source identity plus connector configuration. */
export interface ConnectorState {
	tab: SourceTab;
	sourceId: string;
	sourceName: string;
	enabled: boolean;
	fileParser: FileParser;
	url: string;
	delimiter: string;
	skipRows: string;
	sheet: string;
	jsonPath: string;
	storageKind: StorageKind;
	sqlitePath: string;
	query: string;
	postgresMode: "env" | "url";
	postgresEnv: string;
	postgresUrl: string;
	s3Parser: S3Parser;
	bucket: string;
	objectKey: string;
	region: string;
	endpoint: string;
	s3AuthMode: "public" | "env";
	s3KeyEnv: string;
	s3SecretEnv: string;
}

/** Step 3 state: column mapping and coordinate handling. */
export interface MappingState {
	mapping: Record<string, string>;
	latLonMode: LatLonMode;
	latColumn: string;
	lonColumn: string;
	pairColumn: string;
	pairOrder: PairOrder;
	polandOnly: boolean;
}

/** JSON cell values returned by the preview server function. */
export type PreviewCell =
	| string
	| number
	| boolean
	| null
	| PreviewCell[]
	| { [key: string]: PreviewCell };

export interface SourcePreviewData {
	columns: string[];
	sample: Record<string, PreviewCell>[];
	recordCount: number;
}

export function initialConnectorState(): ConnectorState {
	return {
		tab: "file",
		sourceId: "",
		sourceName: "",
		enabled: true,
		fileParser: "csv",
		url: "",
		delimiter: ",",
		skipRows: "0",
		sheet: "",
		jsonPath: "$",
		storageKind: "sqlite",
		sqlitePath: "",
		query: "SELECT * FROM aed",
		postgresMode: "env",
		postgresEnv: "AED_POSTGRES_URL",
		postgresUrl: "",
		s3Parser: "csv",
		bucket: "",
		objectKey: "",
		region: "",
		endpoint: "",
		s3AuthMode: "public",
		s3KeyEnv: "AWS_ACCESS_KEY_ID",
		s3SecretEnv: "AWS_SECRET_ACCESS_KEY",
	};
}

export function initialMappingState(): MappingState {
	return {
		mapping: {},
		latLonMode: "columns",
		latColumn: NONE,
		lonColumn: NONE,
		pairColumn: NONE,
		pairOrder: "lat_lon",
		polandOnly: true,
	};
}

/** The parser actually used by the current tab/storage combination. */
export function activeParser(state: ConnectorState): FileParser | S3Parser {
	if (state.tab === "file") {
		return state.fileParser;
	}
	return state.storageKind === "s3" ? state.s3Parser : "json";
}

export function familyLabel(state: ConnectorState): string {
	if (state.tab === "file") {
		return "file_static";
	}
	switch (state.storageKind) {
		case "sqlite":
			return "sqlite_db";
		case "postgres":
			return "postgres_db";
		case "s3":
			return "s3_object";
		default:
			throw new Error(`Nieznany typ magazynu: ${String(state.storageKind)}`);
	}
}

function buildConnection(state: ConnectorState): Record<string, unknown> {
	if (state.storageKind === "sqlite") {
		return {
			kind: "sqlite",
			path: state.sqlitePath.trim(),
			query: state.query.trim(),
		};
	}
	if (state.storageKind === "postgres") {
		const base =
			state.postgresMode === "env"
				? { env: state.postgresEnv.trim() }
				: { url: state.postgresUrl.trim() };
		return { kind: "postgres", ...base, query: state.query.trim() };
	}
	return {
		kind: "s3",
		bucket: state.bucket.trim(),
		key: state.objectKey.trim(),
		...(state.region.trim() !== "" ? { region: state.region.trim() } : {}),
		...(state.endpoint.trim() !== ""
			? { endpoint: state.endpoint.trim() }
			: {}),
		...(state.s3AuthMode === "env"
			? {
					access_key_id_env: state.s3KeyEnv.trim(),
					secret_access_key_env: state.s3SecretEnv.trim(),
				}
			: {}),
	};
}

function buildParse(
	state: ConnectorState,
	parser: FileParser | S3Parser,
): Record<string, unknown> {
	const parse: Record<string, unknown> = { encoding: "utf-8" };
	if (parser === "csv") {
		return {
			...parse,
			csv: {
				delimiter: state.delimiter === "" ? "," : state.delimiter,
				header: true,
				empty_as_null: true,
				skip_rows: Math.max(0, Number.parseInt(state.skipRows, 10) || 0),
			},
		};
	}
	if (parser === "xlsx") {
		const trimmedSheet = state.sheet.trim();
		const asNumber = Number.parseInt(trimmedSheet, 10);
		const xlsx: Record<string, unknown> =
			trimmedSheet === ""
				? {}
				: {
						sheet:
							Number.isFinite(asNumber) &&
							asNumber >= 1 &&
							String(asNumber) === trimmedSheet
								? asNumber
								: trimmedSheet,
					};
		return { ...parse, xlsx };
	}
	if (parser === "json" || parser === "geojson") {
		return { ...parse, json: { unwrap_string: false } };
	}
	if (parser === "kml") {
		return { ...parse, kml: { point_only: true } };
	}
	return parse;
}

function recordsPath(
	state: ConnectorState,
	parser: FileParser | S3Parser,
): string {
	if (parser === "kml") {
		return "//Placemark";
	}
	if (parser === "geojson") {
		return "/features";
	}
	if (parser === "json") {
		return state.jsonPath.trim() === "" ? "$" : state.jsonPath.trim();
	}
	return "$";
}

/**
 * Canonical field keys used by the builders. Keeping them in a const object
 * means every access is a computed key, which satisfies both Biome's
 * useLiteralKeys and TS noPropertyAccessFromIndexSignature on the
 * Record<string, unknown> payloads.
 */
const FIELD = {
	name: "name",
	lat: "lat",
	lon: "lon",
	country_code: "country_code",
	device_type: "device_type",
	fetch: "fetch",
	connection: "connection",
} as const;

function buildMap(mapping: MappingState): Record<string, unknown> {
	const map: Record<string, unknown> = {};
	for (const { key } of TEXT_MAPPING_FIELDS) {
		const column = mapping.mapping[key];
		if (column && column !== NONE) {
			map[key] = { field: column };
		}
	}
	if (mapping.latLonMode === "columns") {
		if (mapping.latColumn !== NONE) {
			map[FIELD.lat] = { field: mapping.latColumn };
		}
		if (mapping.lonColumn !== NONE) {
			map[FIELD.lon] = { field: mapping.lonColumn };
		}
	} else if (mapping.latLonMode === "pair" && mapping.pairColumn !== NONE) {
		map[FIELD.lat] = {
			coord: {
				from: { field: mapping.pairColumn },
				format: "pair",
				order: mapping.pairOrder,
				pick: "lat",
				on_invalid: "null",
			},
		};
		map[FIELD.lon] = {
			coord: {
				from: { field: mapping.pairColumn },
				format: "pair",
				order: mapping.pairOrder,
				pick: "lon",
				on_invalid: "null",
			},
		};
	} else if (mapping.latLonMode === "geojson") {
		map[FIELD.lat] = {
			coord: {
				from: { field: "geometry" },
				format: "geojson",
				pick: "lat",
				on_invalid: "null",
			},
		};
		map[FIELD.lon] = {
			coord: {
				from: { field: "geometry" },
				format: "geojson",
				pick: "lon",
				on_invalid: "null",
			},
		};
	} else if (mapping.latLonMode === "kml") {
		map[FIELD.lat] = { field: "lat" };
		map[FIELD.lon] = { field: "lon" };
	}
	map[FIELD.country_code] = { const: "PL" };
	map[FIELD.device_type] = { const: "public_aed" };
	return map;
}

/**
 * Builds the full SourceConfig payload. `withMapping` is false for the
 * preview call: the schema requires at least one mapped field, so a
 * placeholder is sent and the real mapping is chosen after the preview.
 */
export function buildConfig(
	connector: ConnectorState,
	mapping: MappingState,
	withMapping: boolean,
): Record<string, unknown> {
	const parser = activeParser(connector);
	const config: Record<string, unknown> = {
		source: {
			id: connector.sourceId.trim(),
			name: connector.sourceName.trim(),
			enabled: connector.enabled,
		},
		connector: { family: familyLabel(connector), parser },
		parse: buildParse(connector, parser),
		records: { path: recordsPath(connector, parser) },
		map: withMapping ? buildMap(mapping) : { name: { const: "" } },
		validate: withMapping
			? mapping.polandOnly
				? { required: ["name"], coords: { bbox: [...POLAND_BBOX] } }
				: { required: ["name"] }
			: {},
	};
	if (connector.tab === "file") {
		config[FIELD.fetch] = { url: connector.url.trim() };
	} else {
		config[FIELD.connection] = buildConnection(connector);
	}
	return config;
}

/** True when the mandatory name column is mapped to a real source column. */
export function hasNameMapping(mapping: MappingState): boolean {
	const column = mapping.mapping[FIELD.name];
	return column !== undefined && column !== NONE && column !== "";
}

function guessColumn(columns: string[], candidates: string[]): string {
	for (const candidate of candidates) {
		const found = columns.find(
			(column) =>
				column.toLowerCase().replace(/\s+/g, " ").trim() === candidate,
		);
		if (found) {
			return found;
		}
	}
	return NONE;
}

/** Sensible mapping defaults once the preview columns are known. */
export function guessMapping(
	columns: string[],
	parser: FileParser | S3Parser,
): MappingState {
	const mapping: Record<string, string> = {
		name: guessColumn(columns, ["name", "nazwa", "nazwa aed", "obiekt"]),
		city: guessColumn(columns, [
			"city",
			"miejscowosc",
			"miejscowość",
			"miasto",
		]),
		street: guessColumn(columns, ["street", "ulica"]),
		house_number: guessColumn(columns, ["house_number", "numer", "nr"]),
		postcode: guessColumn(columns, ["postcode", "kod", "kod pocztowy"]),
		address_text: guessColumn(columns, [
			"address",
			"adres",
			"adres pełny",
			"lokalizacja",
		]),
		description: guessColumn(columns, ["description", "opis"]),
	};
	let latLonMode: LatLonMode = "columns";
	if (parser === "geojson") {
		latLonMode = "geojson";
	} else if (parser === "kml") {
		latLonMode = "kml";
	}
	return {
		mapping,
		latLonMode,
		latColumn: guessColumn(columns, [
			"lat",
			"latitude",
			"szerokosc",
			"szerokość",
			"szerokość geograficzna",
			"szerokosc geograficzna",
		]),
		lonColumn: guessColumn(columns, [
			"lon",
			"lng",
			"longitude",
			"dlugosc",
			"długość",
			"długość geograficzna",
			"dlugosc geograficzna",
		]),
		pairColumn: guessColumn(columns, [
			"coordinates",
			"wspolrzedne",
			"współrzędne",
			"lat,lon",
		]),
		pairOrder: "lat_lon",
		polandOnly: true,
	};
}

export function formatCell(value: PreviewCell | undefined): string {
	if (value === null || value === undefined) {
		return "—";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}
