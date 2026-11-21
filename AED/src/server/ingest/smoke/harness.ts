import type { SourceConfig } from "../config/schema";
import {
	collapseWhitespace,
	decodeText,
	evaluateCoordinate,
	evaluateFieldSpec,
	flattenGeoJsonFeature,
	isInsideBbox,
	parseCsv,
	parseHtmlList,
	parseHtmlTables,
	parseJsonRecords,
	parseKml,
	type RecordValue,
	readBbox,
	resolveJsonPath,
} from "./parsers";

export type SmokeStatus = "ok" | "warning" | "blocked" | "failed" | "manual";

export type SmokeSeverity = "info" | "warning" | "error";

export type SmokeIssue = {
	code: string;
	message: string;
	severity: SmokeSeverity;
};

export type SmokeMetric = string | number | boolean | null;

export type SourceSmokeResult = {
	sourceId: string;
	sourceName: string;
	registry?: "active" | "excluded";
	family: string;
	parser: string;
	status: SmokeStatus;
	url: string;
	finalUrl: string | null;
	httpStatus: number | null;
	contentType: string | null;
	bytes: number;
	durationMs: number;
	recordsSeen: number;
	recordsAccepted: number;
	recordsRejected: number;
	expectedRecords: number | null;
	minRecords: number | null;
	requiredCoverage: Record<string, number>;
	invalidCoordinates: number;
	duplicateIds: number;
	metrics: Record<string, SmokeMetric>;
	issues: SmokeIssue[];
};

export type SmokeRunOptions = {
	concurrency?: number | undefined;
	timeoutMs?: number | undefined;
	maxBytes?: number | undefined;
	respectRobots?: boolean | undefined;
	fetchImpl?: typeof fetch | undefined;
	now?: (() => Date) | undefined;
	onProgress?: ((result: SourceSmokeResult) => void) | undefined;
};

export type SmokeRunReport = {
	generatedAt: string;
	durationMs: number;
	loader?: {
		configDir: string;
		totalFiles: number;
		loaded: number;
		errors: Array<{
			file: string;
			sourceId: string | null;
			issues: Array<{ path: string; message: string; code: string }>;
		}>;
	};
	totals: Record<SmokeStatus, number> & { total: number };
	families: Array<
		Record<SmokeStatus, number> & { family: string; total: number }
	>;
	results: SourceSmokeResult[];
};

type FetchOutcome = {
	ok: boolean;
	status: number;
	contentType: string | null;
	bytes: number;
	body: Uint8Array;
	finalUrl: string;
	headers: Headers;
	error?: string;
	errorCode?: string;
};

type ParseOutcome = {
	records: RecordValue[];
	metrics: Record<string, SmokeMetric>;
	issues: SmokeIssue[];
	recordsSeen: number;
};

const DEFAULT_USER_AGENT =
	"AED-PL-smoke/0.1 (+https://example.org/aed; contact: data@example.org)";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

function issue(
	code: string,
	message: string,
	severity: SmokeSeverity = "warning",
): SmokeIssue {
	return { code, message, severity };
}

function isRecord(value: unknown): value is RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): RecordValue {
	return isRecord(value) ? value : {};
}

function numeric(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function expectedContentType(parser: string): RegExp | null {
	switch (parser) {
		case "geojson":
			return /json/i;
		case "json":
		case "jsonapi":
			return /json/i;
		case "csv":
			return /csv|text\/plain|application\/octet-stream/i;
		case "kml":
			return /kml|xml/i;
		case "html_table":
		case "html_list":
			return /html|xhtml/i;
		default:
			return null;
	}
}

function buildUrl(
	baseUrl: string,
	query: Record<string, unknown> | undefined,
): string {
	if (!query) return baseUrl;
	const url = new URL(baseUrl);
	for (const [key, value] of Object.entries(query)) {
		if (value === null) continue;
		url.searchParams.set(key, String(value));
	}
	return url.toString();
}

function authHeaders(auth: unknown): {
	headers: Record<string, string>;
	missing: string | null;
} {
	const headers: Record<string, string> = {};
	const spec = asRecord(auth);
	const type = spec["type"];
	if (type === "bearer") {
		const env = typeof spec["env"] === "string" ? spec["env"] : "";
		const value = process.env[env];
		if (!value) return { headers, missing: env };
		headers["Authorization"] = `Bearer ${value}`;
	}
	if (type === "header") {
		const env = typeof spec["env"] === "string" ? spec["env"] : "";
		const header = typeof spec["header"] === "string" ? spec["header"] : "";
		const prefix = typeof spec["prefix"] === "string" ? spec["prefix"] : "";
		const value = process.env[env];
		if (!value) return { headers, missing: env };
		headers[header] = `${prefix}${value}`;
	}
	if (type === "basic") {
		const env = typeof spec["env"] === "string" ? spec["env"] : "";
		const value = env ? process.env[env] : undefined;
		const userEnv =
			typeof spec["user_env"] === "string" ? spec["user_env"] : "";
		const passwordEnv =
			typeof spec["password_env"] === "string" ? spec["password_env"] : "";
		const user = userEnv ? process.env[userEnv] : undefined;
		const password = passwordEnv ? process.env[passwordEnv] : undefined;
		if (value) {
			headers["Authorization"] = `Basic ${value}`;
		} else if (user && password) {
			headers["Authorization"] = `Basic ${btoa(`${user}:${password}`)}`;
		} else {
			return {
				headers,
				missing: passwordEnv || userEnv || env || "BASIC_AUTH",
			};
		}
	}
	return { headers, missing: null };
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchResource(
	config: SourceConfig,
	options: SmokeRunOptions,
	request: {
		url: string;
		method?: string;
		headers?: Record<string, string>;
		body?: Record<string, unknown>;
	} = { url: config.fetch.url },
): Promise<FetchOutcome> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const timeoutMs =
		options.timeoutMs ?? config.fetch.timeout_ms ?? DEFAULT_TIMEOUT_MS;
	const maxBytes =
		options.maxBytes ?? config.fetch.max_bytes ?? DEFAULT_MAX_BYTES;
	const attempts = Math.max(
		1,
		Math.min(3, (config.fetch.retries?.max ?? 0) + 1),
	);
	const auth = authHeaders(config.fetch.auth);
	if (auth.missing) {
		return {
			body: new Uint8Array(),
			bytes: 0,
			contentType: null,
			error: `Brak zmiennej środowiskowej ${auth.missing}.`,
			errorCode: "missing_secret",
			finalUrl: request.url,
			headers: new Headers(),
			ok: false,
			status: 0,
		};
	}

	const headers: Record<string, string> = {
		"User-Agent": config.fetch.user_agent ?? DEFAULT_USER_AGENT,
		Accept: "*/*",
		...(config.fetch.headers ?? {}),
		...auth.headers,
		...(request.headers ?? {}),
	};
	const method = request.method ?? config.fetch.method ?? "GET";
	const payload =
		method === "POST" && (request.body ?? config.fetch.body) !== undefined
			? JSON.stringify(request.body ?? config.fetch.body)
			: undefined;

	let last: FetchOutcome | null = null;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			const controller = new AbortController();
			timer = setTimeout(() => controller.abort(), timeoutMs);
			const response = await fetchImpl(request.url, {
				...(payload !== undefined ? { body: payload } : {}),
				headers,
				method,
				redirect: "follow",
				signal: controller.signal,
			});
			const buffer = new Uint8Array(await response.arrayBuffer());
			const contentType = response.headers.get("content-type");
			const outcome: FetchOutcome = {
				body: buffer,
				bytes: buffer.byteLength,
				contentType,
				finalUrl: response.url || request.url,
				headers: response.headers,
				ok: response.ok,
				status: response.status,
			};
			if (buffer.byteLength > maxBytes) {
				outcome.ok = false;
				outcome.error = `Odpowiedź przekracza max_bytes=${maxBytes}.`;
				outcome.errorCode = "max_bytes";
			}
			if (outcome.ok) return outcome;
			last = outcome;
			if (response.status !== 429 && response.status < 500) return outcome;
		} catch (cause) {
			const aborted =
				cause instanceof Error &&
				(cause.name === "AbortError" || cause.name === "TimeoutError");
			last = {
				body: new Uint8Array(),
				bytes: 0,
				contentType: null,
				error: aborted
					? `Przekroczono limit ${timeoutMs} ms.`
					: cause instanceof Error
						? cause.message
						: String(cause),
				errorCode: aborted ? "timeout" : "network_error",
				finalUrl: request.url,
				headers: new Headers(),
				ok: false,
				status: 0,
			};
		} finally {
			if (timer !== undefined) clearTimeout(timer);
		}
		if (attempt + 1 < attempts)
			await sleep(config.fetch.retries?.backoff_ms ?? 500);
	}
	return (
		last ?? {
			body: new Uint8Array(),
			bytes: 0,
			contentType: null,
			error: "Nieznany błąd pobierania.",
			errorCode: "network_error",
			finalUrl: request.url,
			headers: new Headers(),
			ok: false,
			status: 0,
		}
	);
}

type RobotsRules = {
	rules: Array<{ allow: boolean; path: string }>;
};

const robotsCache = new Map<string, Promise<RobotsRules>>();

function parseRobots(text: string, userAgent: string): RobotsRules {
	const lines = text.split(/\r?\n/);
	const rules: Array<{ allow: boolean; path: string }> = [];
	let applies = false;
	const agentToken = userAgent.toLowerCase().split(/[ /]/)[0] ?? "";
	for (const rawLine of lines) {
		const line = rawLine.replace(/#.*/, "").trim();
		if (line === "") continue;
		const separator = line.indexOf(":");
		if (separator < 0) continue;
		const key = line.slice(0, separator).trim().toLowerCase();
		const value = line.slice(separator + 1).trim();
		if (key === "user-agent") {
			const agent = value.toLowerCase();
			applies =
				agent === "*" || (agentToken !== "" && agentToken.includes(agent));
			continue;
		}
		if (!applies) continue;
		if (key === "allow" && value !== "")
			rules.push({ allow: true, path: value });
		if (key === "disallow" && value !== "") {
			rules.push({ allow: false, path: value });
		}
	}
	return { rules };
}

async function robotsAllows(
	targetUrl: string,
	userAgent: string,
	options: SmokeRunOptions,
): Promise<{ allowed: boolean; reason: string | null }> {
	const fetchImpl = options.fetchImpl ?? fetch;
	let url: URL;
	try {
		url = new URL(targetUrl);
	} catch {
		return { allowed: true, reason: null };
	}
	const origin = url.origin;
	let pending = robotsCache.get(origin);
	if (!pending) {
		pending = (async () => {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 5_000);
			try {
				const response = await fetchImpl(new URL("/robots.txt", origin), {
					headers: { "User-Agent": userAgent },
					redirect: "follow",
					signal: controller.signal,
				});
				if (!response.ok) return { rules: [] };
				return parseRobots(await response.text(), userAgent);
			} catch {
				return { rules: [] };
			} finally {
				clearTimeout(timer);
			}
		})();
		robotsCache.set(origin, pending);
	}
	const rules = await pending;
	const path = `${url.pathname}${url.search}`;
	let best: { allow: boolean; path: string } | null = null;
	for (const rule of rules.rules) {
		if (rule.path === "") {
			if (!best) best = rule;
			continue;
		}
		if (!path.startsWith(rule.path)) continue;
		if (!best || rule.path.length > best.path.length) best = rule;
	}
	if (best && !best.allow) {
		return {
			allowed: false,
			reason: `robots.txt zabrania ${path} (reguła ${best.path}).`,
		};
	}
	return { allowed: true, reason: null };
}

function contentIssues(
	config: SourceConfig,
	outcome: FetchOutcome,
): SmokeIssue[] {
	const issues: SmokeIssue[] = [];
	const expected = expectedContentType(config.connector.parser);
	if (
		expected &&
		outcome.contentType !== null &&
		!expected.test(outcome.contentType)
	) {
		issues.push(
			issue(
				"content_type_mismatch",
				`Content-Type ${outcome.contentType} nie odpowiada parserowi ${config.connector.parser}.`,
				"warning",
			),
		);
	}
	return issues;
}

function fetchFailure(
	_config: SourceConfig,
	outcome: FetchOutcome,
): SmokeIssue[] {
	if (outcome.errorCode === "missing_secret") {
		return [
			issue(outcome.errorCode, outcome.error ?? "Brak sekretu.", "error"),
		];
	}
	if (outcome.errorCode === "timeout") {
		return [issue("timeout", outcome.error ?? "Timeout.", "error")];
	}
	if (outcome.errorCode === "network_error") {
		return [issue("network_error", outcome.error ?? "Błąd sieci.", "error")];
	}
	if (outcome.errorCode === "max_bytes") {
		return [issue("max_bytes", outcome.error ?? "Za duża odpowiedź.", "error")];
	}
	if (outcome.status === 401 || outcome.status === 403) {
		return [
			issue(
				"http_auth",
				`HTTP ${outcome.status}: źródło wymaga uwierzytelnienia lub blokuje klienta.`,
				"error",
			),
		];
	}
	if (outcome.status === 404) {
		return [issue("http_not_found", "HTTP 404: URL nie istnieje.", "error")];
	}
	return [
		issue(
			"http_error",
			`HTTP ${outcome.status || "?"}: ${outcome.error ?? "nieudane pobranie"}.`,
			"error",
		),
	];
}

function parseCsvOutcome(config: SourceConfig, text: string): ParseOutcome {
	const parse = asRecord(config.parse);
	const options = asRecord(parse["csv"]);
	const result = parseCsv(text, {
		delimiter:
			typeof options["delimiter"] === "string"
				? options["delimiter"]
				: undefined,
		emptyAsNull: options["empty_as_null"] !== false,
		header: options["header"] !== false,
		quote: typeof options["quote"] === "string" ? options["quote"] : undefined,
		repairDoubleQuotes: options["repair_double_quotes"] === true,
		skipRows:
			typeof options["skip_rows"] === "number"
				? options["skip_rows"]
				: undefined,
		trimHeaders: parse["trim_headers"] !== false,
		unwrapOuterQuotes: options["unwrap_outer_quotes"] === true,
	});
	return {
		issues: [],
		metrics: {
			headerCount: result.headers.length,
			headers: result.headers.join(" | "),
			rowCount: result.rows.length,
		},
		records: result.records,
		recordsSeen: result.rows.length,
	};
}

function parseHtmlTableOutcome(
	config: SourceConfig,
	html: string,
): ParseOutcome {
	const parse = asRecord(config.parse);
	const options = asRecord(parse["html_table"]);
	const result = parseHtmlTables(html, {
		collapseWhitespace: options["collapse_whitespace"] !== false,
		columns: Array.isArray(options["columns"])
			? options["columns"].filter(
					(entry): entry is string => typeof entry === "string",
				)
			: undefined,
		dataStartRow:
			typeof options["data_start_row"] === "number"
				? options["data_start_row"]
				: undefined,
		emptyAsNull: options["empty_as_null"] !== false,
		headerRow:
			typeof options["header_row"] === "number"
				? options["header_row"]
				: undefined,
		keyColumn:
			typeof options["key_column"] === "number"
				? options["key_column"]
				: undefined,
		normalizeHeaders: options["normalize_headers"] !== false,
		orientation: options["orientation"] === "key_value" ? "key_value" : "rows",
		requireHeaders: Array.isArray(options["require_headers"])
			? options["require_headers"].filter(
					(entry): entry is string => typeof entry === "string",
				)
			: undefined,
		requireKeys: Array.isArray(options["require_keys"])
			? options["require_keys"].filter(
					(entry): entry is string => typeof entry === "string",
				)
			: undefined,
		select:
			typeof options["select"] === "string" ? options["select"] : undefined,
		skipEmptyRows: options["skip_empty_rows"] !== false,
		tableIndex:
			typeof options["table_index"] === "number"
				? options["table_index"]
				: undefined,
		trim: options["trim"] !== false,
		valueColumn:
			typeof options["value_column"] === "number"
				? options["value_column"]
				: undefined,
		valueJoin: options["value_join"] === "newline" ? "newline" : "space",
	});
	const issues = result.diagnostics.map((message) =>
		issue(
			result.tableCount === 0 ? "html_no_table" : "html_no_rows",
			message,
			result.records.length === 0 ? "error" : "warning",
		),
	);
	if (options["terms_confirmed"] !== true) {
		issues.push(
			issue(
				"terms_unconfirmed",
				"Brak potwierdzenia regulaminu/robots dla źródła HTML.",
				"info",
			),
		);
	}
	return {
		issues,
		metrics: {
			headers: result.headers.join(" | "),
			matchedTables: result.matchedTables,
			rowCount: result.rowsAfterFilters,
			rowsSeen: result.rowsSeen,
			tableCount: result.tableCount,
		},
		records: result.records,
		recordsSeen: result.rowsAfterFilters,
	};
}

function parseHtmlListOutcome(
	config: SourceConfig,
	html: string,
): ParseOutcome {
	const parse = asRecord(config.parse);
	const options = asRecord(parse["html_list"]);
	const rawFields = asRecord(options["fields"]);
	const result = parseHtmlList(html, {
		collapseWhitespace: options["collapse_whitespace"] !== false,
		emptyAsNull: options["empty_as_null"] !== false,
		fields: Object.fromEntries(
			Object.entries(rawFields).map(([name, value]) => {
				const field = asRecord(value);
				return [
					name,
					{
						attr: typeof field["attr"] === "string" ? field["attr"] : undefined,
						default: field["default"],
						flags:
							typeof field["flags"] === "string" ? field["flags"] : undefined,
						group:
							typeof field["group"] === "number" ? field["group"] : undefined,
						nullValues: Array.isArray(field["null_values"])
							? field["null_values"].filter(
									(entry): entry is string => typeof entry === "string",
								)
							: undefined,
						regex:
							typeof field["regex"] === "string" ? field["regex"] : undefined,
						source:
							field["source"] === "html" || field["source"] === "attr"
								? field["source"]
								: "text",
					},
				] as const;
			}),
		),
		itemTextSeparator:
			typeof options["item_text_separator"] === "string"
				? options["item_text_separator"]
				: undefined,
		recordFlags:
			isRecord(options["record_filter"]) &&
			typeof options["record_filter"]["flags"] === "string"
				? options["record_filter"]["flags"]
				: undefined,
		recordRegex:
			isRecord(options["record_filter"]) &&
			typeof options["record_filter"]["regex"] === "string"
				? options["record_filter"]["regex"]
				: undefined,
		select:
			typeof options["select"] === "string" ? options["select"] : undefined,
		trim: options["trim"] !== false,
	});
	const issues = result.diagnostics.map((message) =>
		issue(
			"html_no_rows",
			message,
			result.records.length === 0 ? "error" : "warning",
		),
	);
	if (options["terms_confirmed"] !== true) {
		issues.push(
			issue(
				"terms_unconfirmed",
				"Brak potwierdzenia regulaminu/robots dla źródła HTML.",
				"info",
			),
		);
	}
	return {
		issues,
		metrics: {
			candidates: result.candidates,
			matched: result.matched,
			rowCount: result.records.length,
		},
		records: result.records,
		recordsSeen: result.matched,
	};
}

function parseJsonOutcome(config: SourceConfig, root: unknown): ParseOutcome {
	const unordered = parseJsonRecords(root, config.records.path);
	const records =
		config.connector.parser === "geojson"
			? unordered.map(flattenGeoJsonFeature)
			: unordered;
	const metrics: Record<string, SmokeMetric> = {
		path: config.records.path,
		recordCount: records.length,
	};
	if (config.connector.parser === "geojson") {
		const featureArray = resolveJsonPath(root, "$.features");
		const features = Array.isArray(featureArray) ? featureArray : [];
		let pointCount = 0;
		for (const feature of features) {
			if (!isRecord(feature)) continue;
			const geometry = asRecord(feature["geometry"]);
			if (geometry["type"] === "Point") pointCount += 1;
		}
		metrics["featureCount"] = features.length;
		metrics["pointCount"] = pointCount;
	}
	return {
		issues:
			records.length === 0
				? [
						issue(
							"no_records",
							"Ścieżka records.path nie zwróciła rekordów.",
							"error",
						),
					]
				: [],
		metrics,
		records,
		recordsSeen: records.length,
	};
}

function kmlToRecords(result: ReturnType<typeof parseKml>): {
	records: RecordValue[];
	issues: SmokeIssue[];
} {
	const records: RecordValue[] = [];
	const issues: SmokeIssue[] = [];
	for (const placemark of result.placemarks) {
		const isPoint = placemark.geometryTypes.includes("Point");
		const coordinate = placemark.coordinates[0];
		records.push({
			Nazwa: placemark.name,
			coordinates: coordinate ? [coordinate[0], coordinate[1]] : null,
			geometry:
				isPoint && coordinate
					? { coordinates: [coordinate[0], coordinate[1]], type: "Point" }
					: null,
			name: placemark.name,
			lat: isPoint && coordinate ? coordinate[1] : null,
			lon: isPoint && coordinate ? coordinate[0] : null,
		});
	}
	if (result.placemarks.length === 0) {
		issues.push(
			issue("kml_no_placemarks", "KML nie zawiera Placemark.", "error"),
		);
	}
	if (result.pointCount === 0) {
		issues.push(
			issue(
				"kml_no_points",
				"KML nie zawiera geometrii Point; źródło nie nadaje się do rekordów punktowych.",
				"error",
			),
		);
	}
	if (result.polygonCount > 0) {
		issues.push(
			issue(
				"kml_polygons",
				`KML zawiera ${result.polygonCount} Placemark z Polygon (zasięg, nie rekord AED).`,
				"warning",
			),
		);
	}
	if (result.pointlessCount > 0) {
		issues.push(
			issue(
				"kml_pointless",
				`KML zawiera ${result.pointlessCount} Placemark bez geometrii.`,
				"warning",
			),
		);
	}
	return { issues, records };
}

function discoverKmlUrl(pageUrl: string, body: string): string | null {
	const midMatch = /[?&]mid=([A-Za-z0-9_-]+)/.exec(body);
	if (midMatch?.[1]) {
		return `https://www.google.com/maps/d/kml?mid=${midMatch[1]}&forcekml=1`;
	}
	const direct = /https?:\/\/[^"'<> ]+\.kml[^"'<> ]*/i.exec(body);
	if (direct?.[0]) return direct[0].replaceAll("&amp;", "&");
	const pathMatch = /["']([^"']*\/maps\/d\/kml[^"']*)["']/i.exec(body);
	if (pathMatch?.[1]) {
		return pathMatch[1].startsWith("http")
			? pathMatch[1].replaceAll("&amp;", "&")
			: new URL(pathMatch[1], pageUrl).toString();
	}
	return null;
}

function valuePresent(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim() !== "";
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

function recordVariables(index: number): Record<string, unknown> {
	return { row_index: index };
}

function resolveMappedValue(
	map: Record<string, unknown>,
	field: string,
	record: RecordValue,
	variables: Record<string, unknown>,
): unknown {
	const spec = map[field];
	if (field === "lat" || field === "lon") {
		if (
			spec !== null &&
			typeof spec === "object" &&
			!Array.isArray(spec) &&
			"coord" in spec
		) {
			return evaluateCoordinate(spec, record, field, variables).value;
		}
	}
	return evaluateFieldSpec(spec, record, variables);
}

function computeValidation(
	config: SourceConfig,
	records: RecordValue[],
): {
	accepted: number;
	rejected: number;
	coverage: Record<string, number>;
	invalidCoordinates: number;
	duplicateIds: number;
	rejectedSamples: string[];
} {
	const required = config.validate.required ?? [];
	const bbox = readBbox(config.validate.coords?.bbox);
	const requireLocation = config.validate.require_location ?? "none";
	const requiredOk = new Map<string, number>();
	for (const field of required) requiredOk.set(field, 0);
	let accepted = 0;
	let rejected = 0;
	let invalidCoordinates = 0;
	const ids = new Map<string, number>();
	const rejectedSamples: string[] = [];
	const map = config.map as Record<string, unknown>;

	for (let index = 0; index < records.length; index += 1) {
		const record = records[index];
		if (!record) continue;
		const variables = recordVariables(index);
		let missing = false;
		for (const field of required) {
			const value = resolveMappedValue(map, field, record, variables);
			if (!valuePresent(value)) missing = true;
		}

		const latResult = evaluateCoordinate(map["lat"], record, "lat", variables);
		const lonResult = evaluateCoordinate(map["lon"], record, "lon", variables);
		const lat = latResult.value;
		const lon = lonResult.value;
		const hasPoint =
			lat !== null &&
			lon !== null &&
			latResult.invalid === false &&
			lonResult.invalid === false;
		if (!hasPoint && map["lat"] !== undefined && map["lon"] !== undefined) {
			invalidCoordinates += 1;
		}
		if (hasPoint && bbox && !isInsideBbox(lat, lon, bbox)) {
			invalidCoordinates += 1;
		}

		const address = evaluateFieldSpec(map["address_text"], record, variables);
		let locationOk = true;
		if (requireLocation === "point") locationOk = hasPoint;
		if (requireLocation === "address") locationOk = valuePresent(address);
		if (requireLocation === "address_or_point") {
			locationOk = valuePresent(address) || hasPoint;
		}

		const idValue = evaluateExpressionSafe(
			config.records.identity.source_record_id,
			record,
			variables,
		);
		if (idValue !== null && idValue !== undefined && String(idValue) !== "") {
			const key = String(idValue);
			ids.set(key, (ids.get(key) ?? 0) + 1);
		}

		if (missing || !locationOk) {
			rejected += 1;
			if (rejectedSamples.length < 3) {
				const reasons: string[] = [];
				for (const field of required) {
					if (
						!valuePresent(resolveMappedValue(map, field, record, variables))
					) {
						reasons.push(`${field}=null`);
					}
				}
				if (!locationOk) reasons.push(`location=${requireLocation}`);
				rejectedSamples.push(`#${index}: ${reasons.join(", ")}`);
			}
		} else {
			accepted += 1;
			for (const field of required) {
				if (valuePresent(resolveMappedValue(map, field, record, variables))) {
					requiredOk.set(field, (requiredOk.get(field) ?? 0) + 1);
				}
			}
		}
	}

	const coverage: Record<string, number> = {};
	for (const field of required) {
		const count = requiredOk.get(field) ?? 0;
		coverage[field] = accepted === 0 ? 0 : count / accepted;
	}
	let duplicateIds = 0;
	for (const count of ids.values()) {
		if (count > 1) duplicateIds += count - 1;
	}
	return {
		accepted,
		coverage,
		duplicateIds,
		invalidCoordinates,
		rejected,
		rejectedSamples,
	};
}

function evaluateExpressionSafe(
	expression: unknown,
	record: RecordValue,
	variables: Record<string, unknown>,
): unknown {
	try {
		return evaluateFieldSpec(expression, record, variables);
	} catch {
		return null;
	}
}

function statusFor(
	config: SourceConfig,
	outcome: FetchOutcome,
	parse: ParseOutcome,
	validation: ReturnType<typeof computeValidation>,
	issues: SmokeIssue[],
): SmokeStatus {
	if (!outcome.ok) {
		return outcome.errorCode === "missing_secret" ||
			outcome.status === 401 ||
			outcome.status === 403
			? "blocked"
			: "failed";
	}
	if (parse.issues.some((entry) => entry.code === "unsupported_parser")) {
		return "warning";
	}
	const hasError = issues.some((entry) => entry.severity === "error");
	if (hasError) return "failed";
	if (parse.records.length === 0) return "failed";
	const minRecords = config.drift.volume?.min_records ?? 1;
	if (parse.recordsSeen < minRecords) return "failed";
	if (validation.accepted === 0) return "failed";
	const required = config.validate.required ?? [];
	if (required.some((field) => (validation.coverage[field] ?? 0) < 1))
		return "failed";
	const rejectedRatio =
		parse.records.length === 0 ? 0 : validation.rejected / parse.records.length;
	if (rejectedRatio > 0.25) return "failed";
	const maxInvalid = config.drift.quality?.max_coord_invalid_ratio ?? 0.01;
	const invalidRatio =
		parse.records.length === 0
			? 0
			: validation.invalidCoordinates / parse.records.length;
	if (invalidRatio > maxInvalid) return "warning";
	if (rejectedRatio > 0) return "warning";
	const expected = numeric(config.drift.baseline?.record_count);
	if (expected !== null && expected > 0) {
		const delta = Math.abs(parse.recordsSeen - expected) / expected;
		const maxDelta = config.drift.volume?.max_delta_ratio ?? 0.5;
		if (delta > maxDelta) return "warning";
	}
	if (issues.some((entry) => entry.severity === "warning")) return "warning";
	return "ok";
}

function manualOutcome(
	config: SourceConfig,
	outcome: FetchOutcome,
	parse: ParseOutcome,
): SmokeStatus {
	if (!outcome.ok) {
		return outcome.errorCode === "missing_secret" ||
			outcome.status === 401 ||
			outcome.status === 403
			? "blocked"
			: "failed";
	}
	if (outcome.bytes === 0) return "failed";
	const format = asRecord(asRecord(config.parse)["manual"])["format"];
	const contentType = (outcome.contentType ?? "").toLowerCase();
	if (format === "pdf") {
		const signature = decodeText(outcome.body.subarray(0, 5), "utf-8");
		if (!signature.startsWith("%PDF")) {
			parse.issues.push(
				issue(
					"content_type_mismatch",
					"Odpowiedź nie ma sygnatury PDF.",
					"info",
				),
			);
		}
	}
	if (format === "docx" || format === "xlsx") {
		if (outcome.body[0] !== 0x50 || outcome.body[1] !== 0x4b) {
			parse.issues.push(
				issue(
					"content_type_mismatch",
					"Odpowiedź nie ma sygnatury ZIP (DOCX/XLSX).",
					"info",
				),
			);
		}
	}
	if (format === "html" && !/html|xhtml/i.test(contentType)) {
		parse.issues.push(
			issue(
				"content_type_mismatch",
				`Content-Type ${outcome.contentType ?? "brak"} nie wygląda na HTML.`,
				"info",
			),
		);
	}
	return "manual";
}

function inspectPdf(
	config: SourceConfig,
	outcome: FetchOutcome,
): {
	status: SmokeStatus;
	metrics: Record<string, SmokeMetric>;
	issues: SmokeIssue[];
} {
	const latin = new TextDecoder("latin1").decode(outcome.body);
	const magic = latin.startsWith("%PDF-");
	const pages = (latin.match(/\/Type\s*\/Page\b/g) ?? []).length;
	const textLayer =
		/\/Font\b/.test(latin) ||
		/\/ToUnicode\b/.test(latin) ||
		/\bBT\b[\s\S]{0,20000}?\bET\b/.test(latin);
	const pdfConfig = asRecord(asRecord(config.parse)["pdf_table"]);
	const requireTextLayer = pdfConfig["require_text_layer"] !== false;
	const expectedPages =
		typeof pdfConfig["expected_page_count"] === "number"
			? pdfConfig["expected_page_count"]
			: null;
	const issues: SmokeIssue[] = [
		issue(
			"pdf_not_parsed",
			"PDF jest osiągalny; ekstrakcja wierszy wymaga parsera pdf_table, więc smoke nie liczy rekordów.",
			"info",
		),
	];
	let status: SmokeStatus = "manual";
	if (!magic) {
		issues.push(issue("parse_error", "Brak sygnatury %PDF.", "error"));
		status = "failed";
	} else if (pages === 0) {
		issues.push(issue("parse_error", "Brak stron PDF.", "error"));
		status = "failed";
	} else if (requireTextLayer && !textLayer) {
		issues.push(
			issue(
				"pdf_no_text_layer",
				"PDF nie ma wykrytej warstwy tekstowej; konfiguracja zabrania cichego OCR.",
				"error",
			),
		);
		status = "failed";
	} else if (expectedPages !== null && pages !== expectedPages) {
		issues.push(
			issue(
				"pdf_page_drift",
				`PDF ma ${pages} stron, oczekiwano ${expectedPages}.`,
				"warning",
			),
		);
		status = "warning";
	}
	return {
		issues,
		metrics: {
			expectedPages,
			pages,
			textLayer,
		},
		status,
	};
}

async function runOne(
	config: SourceConfig,
	options: SmokeRunOptions,
): Promise<SourceSmokeResult> {
	const startedAt = performance.now();
	const issues: SmokeIssue[] = [];
	const metrics: Record<string, SmokeMetric> = {};
	const parser = config.connector.parser;
	const family = config.connector.family;
	const url = buildUrl(config.fetch.url, config.fetch.query);
	const respectRobots = options.respectRobots ?? true;
	const userAgent = config.fetch.user_agent ?? DEFAULT_USER_AGENT;

	if (
		respectRobots &&
		(parser === "html_table" ||
			parser === "html_list" ||
			family === "google_my_maps_kml")
	) {
		const robots = await robotsAllows(url, userAgent, options);
		if (!robots.allowed) {
			return {
				bytes: 0,
				contentType: null,
				duplicateIds: 0,
				durationMs: Math.round(performance.now() - startedAt),
				expectedRecords: numeric(config.drift.baseline?.record_count),
				family,
				finalUrl: null,
				httpStatus: null,
				invalidCoordinates: 0,
				issues: [
					issue(
						"robots_disallowed",
						robots.reason ?? "robots.txt zabrania pobrania.",
						"error",
					),
				],
				metrics,
				minRecords: config.drift.volume?.min_records ?? 1,
				parser,
				recordsAccepted: 0,
				recordsRejected: 0,
				recordsSeen: 0,
				requiredCoverage: {},
				sourceId: config.source.id,
				sourceName: config.source.name,
				status: "blocked",
				url,
			};
		}
	}

	let outcome = await fetchResource(config, options, { url });
	if (!outcome.ok) {
		issues.push(...fetchFailure(config, outcome));
	}

	let parse: ParseOutcome = {
		issues,
		metrics,
		records: [],
		recordsSeen: 0,
	};
	let pdfStatus: SmokeStatus | null = null;

	if (outcome.ok) {
		const encoding =
			typeof asRecord(config.parse)["encoding"] === "string"
				? String(asRecord(config.parse)["encoding"])
				: "utf-8";
		if (family === "google_my_maps_kml") {
			const pageText = decodeText(outcome.body, encoding);
			const looksLikeKml = /<kml\b/i.test(pageText);
			const kmlUrl = looksLikeKml
				? outcome.finalUrl
				: discoverKmlUrl(outcome.finalUrl, pageText);
			metrics["pageBytes"] = outcome.bytes;
			if (!kmlUrl) {
				issues.push(
					issue(
						"kml_no_mid",
						"Nie znaleziono osadzonego mid= ani bezpośredniego linku KML na stronie.",
						"error",
					),
				);
			} else {
				metrics["kmlUrl"] = kmlUrl;
				if (!looksLikeKml) {
					const kmlOutcome = await fetchResource(config, options, {
						url: kmlUrl,
					});
					if (!kmlOutcome.ok) {
						issues.push(...fetchFailure(config, kmlOutcome));
					} else {
						outcome = kmlOutcome;
						metrics["kmlBytes"] = kmlOutcome.bytes;
						metrics["contentType"] = kmlOutcome.contentType;
					}
				}
				if (outcome.ok) {
					const kmlText = decodeText(outcome.body, encoding);
					const kml = parseKml(kmlText);
					const converted = kmlToRecords(kml);
					issues.push(...converted.issues);
					metrics["placemarks"] = kml.placemarks.length;
					metrics["points"] = kml.pointCount;
					metrics["polygons"] = kml.polygonCount;
					metrics["lines"] = kml.lineCount;
					metrics["pointless"] = kml.pointlessCount;
					metrics["documentName"] = kml.documentName;
					const expectedName = asRecord(asRecord(config.parse)["kml"])[
						"document_name_must_match"
					];
					if (
						typeof expectedName === "string" &&
						!(kml.documentName ?? "").includes(expectedName)
					) {
						issues.push(
							issue(
								"kml_document_name_mismatch",
								`Nazwa dokumentu KML nie zawiera "${expectedName}".`,
								"warning",
							),
						);
					}
					parse = {
						issues,
						metrics,
						records: converted.records,
						recordsSeen: kml.placemarks.length,
					};
				}
			}
		} else {
			const text = decodeText(outcome.body, encoding);
			try {
				if (parser === "csv") {
					parse = parseCsvOutcome(config, text);
				} else if (
					parser === "geojson" ||
					parser === "json" ||
					parser === "jsonapi"
				) {
					const unwrap =
						asRecord(asRecord(config.parse)["json"])["unwrap_string"] === true;
					const root =
						unwrap && typeof JSON.parse(text) === "string"
							? JSON.parse(JSON.parse(text) as string)
							: JSON.parse(text);
					parse = parseJsonOutcome(config, root);
				} else if (parser === "html_table") {
					parse = parseHtmlTableOutcome(config, text);
					if (
						parse.records.length === 0 &&
						/emapa|mapa\s*defibrylator|google\.maps|leaflet|mapbox/i.test(text)
					) {
						parse.issues.push(
							issue(
								"html_may_need_js",
								"Strona wygląda na mapę lub e-mapę ładowaną JavaScriptem.",
								"info",
							),
						);
					}
				} else if (parser === "html_list") {
					parse = parseHtmlListOutcome(config, text);
				} else if (parser === "kml") {
					const kml = parseKml(text);
					const converted = kmlToRecords(kml);
					parse.issues.push(...converted.issues);
					parse.records = converted.records;
					parse.recordsSeen = kml.placemarks.length;
					parse.metrics["placemarks"] = kml.placemarks.length;
					parse.metrics["points"] = kml.pointCount;
					parse.metrics["polygons"] = kml.polygonCount;
					parse.metrics["pointless"] = kml.pointlessCount;
				} else if (parser === "pdf_table") {
					const pdf = inspectPdf(config, outcome);
					pdfStatus = pdf.status;
					parse = {
						issues: [...parse.issues, ...pdf.issues],
						metrics: { ...parse.metrics, ...pdf.metrics },
						records: [],
						recordsSeen: 0,
					};
				} else if (parser === "manual") {
					parse = {
						issues,
						metrics,
						records: [],
						recordsSeen: 0,
					};
				} else {
					parse.issues.push(
						issue(
							"unsupported_parser",
							`Harness nie obsługuje parsera ${parser}.`,
							"warning",
						),
					);
				}
			} catch (cause) {
				parse.issues.push(
					issue(
						"parse_error",
						`Nie udało się sparsować ${parser}: ${
							cause instanceof Error ? cause.message : String(cause)
						}`,
						"error",
					),
				);
			}
		}
	}

	if (outcome.ok) {
		issues.push(...contentIssues(config, outcome));
	}

	const validation =
		parser === "manual" || parser === "pdf_table"
			? {
					accepted: 0,
					coverage: {},
					duplicateIds: 0,
					invalidCoordinates: 0,
					rejected: 0,
					rejectedSamples: [],
				}
			: computeValidation(config, parse.records);
	if (validation.rejectedSamples.length > 0) {
		metrics["rejectedSamples"] = validation.rejectedSamples.join("; ");
	}
	if (
		parse.records.length > 0 &&
		validation.accepted === 0 &&
		!parse.issues.some((entry) => entry.code === "required_fields_missing")
	) {
		parse.issues.push(
			issue(
				"required_fields_missing",
				"Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.",
				"error",
			),
		);
	}
	const required = config.validate.required ?? [];
	for (const field of required) {
		if (parse.records.length > 0 && (validation.coverage[field] ?? 0) < 1) {
			parse.issues.push(
				issue(
					"required_fields_missing",
					`Pokrycie wymaganego pola ${field} wynosi ${(
						(validation.coverage[field] ?? 0) * 100
					).toFixed(1)}%.`,
					"error",
				),
			);
		}
	}

	const expected = numeric(config.drift.baseline?.record_count);
	const minRecords = config.drift.volume?.min_records ?? null;
	if (
		outcome.ok &&
		parse.recordsSeen < (minRecords ?? 1) &&
		parser !== "manual" &&
		parser !== "pdf_table"
	) {
		parse.issues.push(
			issue(
				"below_min_records",
				`Odczytano ${parse.recordsSeen} rekordów, minimum to ${minRecords ?? 1}.`,
				"error",
			),
		);
	}
	if (
		outcome.ok &&
		expected !== null &&
		expected > 0 &&
		parser !== "manual" &&
		parser !== "pdf_table"
	) {
		const delta = Math.abs(parse.recordsSeen - expected) / expected;
		const maxDelta = config.drift.volume?.max_delta_ratio ?? 0.5;
		if (delta > maxDelta) {
			parse.issues.push(
				issue(
					"volume_drift",
					`Odczytano ${parse.recordsSeen} rekordów, baseline ${expected} (delta ${(
						delta * 100
					).toFixed(1)}%).`,
					"warning",
				),
			);
		}
	}
	if (validation.duplicateIds > 0) {
		parse.issues.push(
			issue(
				"duplicate_ids",
				`Wykryto ${validation.duplicateIds} zduplikowanych source_record_id.`,
				"warning",
			),
		);
	}
	if (validation.rejected > 0) {
		const sample =
			validation.rejectedSamples.length > 0
				? ` Próbka: ${validation.rejectedSamples[0]}`
				: "";
		parse.issues.push(
			issue(
				"rejected_records",
				`Odrzucono ${validation.rejected} z ${parse.records.length} rekordów.${sample}`,
				"warning",
			),
		);
	}
	if (validation.invalidCoordinates > 0) {
		parse.issues.push(
			issue(
				"invalid_coordinates",
				`${validation.invalidCoordinates} rekordów ma brakujące lub niepoprawne współrzędne.`,
				"warning",
			),
		);
	}

	const status =
		parser === "manual"
			? manualOutcome(config, outcome, parse)
			: parser === "pdf_table" && pdfStatus !== null
				? pdfStatus
				: statusFor(config, outcome, parse, validation, parse.issues);

	return {
		bytes: outcome.bytes,
		contentType: outcome.contentType,
		duplicateIds: validation.duplicateIds,
		durationMs: Math.round(performance.now() - startedAt),
		expectedRecords: expected,
		family,
		finalUrl: outcome.finalUrl,
		httpStatus: outcome.status || null,
		invalidCoordinates: validation.invalidCoordinates,
		issues: dedupeIssues(parse.issues),
		metrics,
		minRecords,
		parser,
		recordsAccepted: validation.accepted,
		recordsRejected: validation.rejected,
		recordsSeen: parse.recordsSeen,
		requiredCoverage: validation.coverage,
		sourceId: config.source.id,
		sourceName: config.source.name,
		status,
		url,
	};
}

function dedupeIssues(issues: SmokeIssue[]): SmokeIssue[] {
	const byCode = new Map<string, SmokeIssue>();
	for (const entry of issues) {
		const existing = byCode.get(entry.code);
		if (
			!existing ||
			severityRank(entry.severity) > severityRank(existing.severity)
		) {
			byCode.set(entry.code, entry);
		}
	}
	return [...byCode.values()].sort(
		(left, right) => severityRank(right.severity) - severityRank(left.severity),
	);
}

function severityRank(severity: SmokeSeverity): number {
	if (severity === "error") return 2;
	if (severity === "warning") return 1;
	return 0;
}

async function runPool<T, R>(
	items: readonly T[],
	concurrency: number,
	worker: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const runners = Array.from(
		{ length: Math.min(concurrency, items.length) },
		async () => {
			while (true) {
				const index = next;
				next += 1;
				if (index >= items.length) return;
				const item = items[index];
				if (item === undefined) return;
				results[index] = await worker(item);
			}
		},
	);
	await Promise.all(runners);
	return results;
}

export function summarizeResults(
	results: SourceSmokeResult[],
	durationMs: number,
	generatedAt: string,
): SmokeRunReport {
	const totals: Record<SmokeStatus, number> & { total: number } = {
		blocked: 0,
		failed: 0,
		manual: 0,
		ok: 0,
		total: results.length,
		warning: 0,
	};
	const familyMap = new Map<
		string,
		Record<SmokeStatus, number> & { family: string; total: number }
	>();
	for (const result of results) {
		totals[result.status] += 1;
		let family = familyMap.get(result.family);
		if (!family) {
			family = {
				blocked: 0,
				failed: 0,
				family: result.family,
				manual: 0,
				ok: 0,
				total: 0,
				warning: 0,
			};
			familyMap.set(result.family, family);
		}
		family[result.status] += 1;
		family.total += 1;
	}
	return {
		durationMs,
		families: [...familyMap.values()].sort((left, right) =>
			left.family.localeCompare(right.family),
		),
		generatedAt,
		results: [...results].sort((left, right) => {
			const family = left.family.localeCompare(right.family);
			return family !== 0
				? family
				: left.sourceId.localeCompare(right.sourceId, "pl");
		}),
		totals,
	};
}

export async function runSourceSmoke(
	configs: readonly SourceConfig[],
	options: SmokeRunOptions = {},
): Promise<SmokeRunReport> {
	const startedAt = performance.now();
	const generatedAt = (options.now?.() ?? new Date()).toISOString();
	const concurrency = Math.max(1, Math.min(8, options.concurrency ?? 4));
	const results = await runPool(configs, concurrency, async (config) => {
		const result = await runOne(config, options);
		options.onProgress?.(result);
		return result;
	});
	return summarizeResults(
		results,
		Math.round(performance.now() - startedAt),
		generatedAt,
	);
}

export function formatSmokeProgress(result: SourceSmokeResult): string {
	const records =
		result.parser === "manual"
			? "manual"
			: `${result.recordsSeen}/${result.expectedRecords ?? "?"}`;
	return `[${result.status}] ${result.family}/${result.sourceId} records=${records} http=${result.httpStatus ?? "-"}`;
}

export function statusLabel(status: SmokeStatus): string {
	switch (status) {
		case "ok":
			return "OK";
		case "warning":
			return "ostrzeżenie";
		case "blocked":
			return "zablokowane";
		case "failed":
			return "błąd";
		case "manual":
			return "manualne";
	}
}

export function sortIssuesForReport(result: SourceSmokeResult): SmokeIssue[] {
	return [...result.issues].sort(
		(left, right) => severityRank(right.severity) - severityRank(left.severity),
	);
}

export function issueCodeSet(result: SourceSmokeResult): string {
	return result.issues.map((entry) => entry.code).join(", ");
}

export function compactText(value: string, limit = 120): string {
	const normalized = collapseWhitespace(value);
	return normalized.length <= limit
		? normalized
		: `${normalized.slice(0, limit - 1)}…`;
}
