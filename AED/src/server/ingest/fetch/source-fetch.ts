import { mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { SourceConfig } from "../config/schema";
import { resolveJsonPath } from "../parsers";

/**
 * Fetches one declarative source and writes a raw-first snapshot:
 *
 *   <rawDir>/<source.id>.<ext>
 *   <rawDir>/<source.id>.meta.json
 *
 * The body is never reshaped for the parser. For paginated sources the pages
 * are merged into one JSON document at `records.path`, so `core/build.ts` keeps
 * working from a single snapshot file. Individual pages are kept as
 * `<source.id>.page-<n>.<ext>` when more than one page was fetched.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_RETRY_BACKOFF_MS = 500;
const MAX_REQUESTS_PER_SOURCE = 1_000;
const DEFAULT_USER_AGENT =
	"AED-PL-ingest/0.1 (+https://example.org/aed; contact: data@example.org)";

type Env = Record<string, string | undefined>;

export type FetchLike = (
	input: string,
	init?: RequestInit,
) => Promise<Response>;

export type SourceFetchStatus = "fetched" | "blocked" | "error" | "skipped";

export type SourceFetchMeta = {
	source_id: string;
	fetched_at: string;
	final_url: string | null;
	http_status: number | null;
	content_type: string | null;
	bytes: number;
	sha256: string | null;
	config_sha256: string | null;
	raw_file: string | null;
	record_count?: number | null;
	blocked: boolean;
	status: SourceFetchStatus;
	error?: string;
	method?: string;
	request_url?: string;
	pages?: number;
	page_files?: string[];
	http_statuses?: number[];
};

export type SourceFetchResult = {
	sourceId: string;
	status: SourceFetchStatus;
	ok: boolean;
	blocked: boolean;
	rawFile: string | null;
	metaFile: string;
	meta: SourceFetchMeta | null;
	error?: string;
};

export type SourceFetchOptions = {
	rawDir: string;
	/** Fetch disabled sources too. Defaults to false. */
	includeDisabled?: boolean;
	/** Sha256 of the per-source config JSON, recorded in meta when provided. */
	configSha256?: string;
	/** Environment used for auth secrets. Defaults to process.env. */
	env?: Env;
	fetchImpl?: FetchLike;
	now?: () => Date;
};

type RequestSpec = {
	url: string;
	method: "GET" | "POST";
	headers: Record<string, string>;
	body: string | undefined;
};

type ResponseSpec = {
	body: Uint8Array;
	status: number;
	contentType: string | null;
	finalUrl: string;
};

class FetchProblem extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "FetchProblem";
		this.code = code;
	}
}

function sha256Hex(value: Uint8Array | string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(value);
	return hasher.digest("hex");
}

function asExtension(config: SourceConfig, contentType: string | null): string {
	const parser = config.connector.parser;
	switch (parser) {
		case "csv":
			return "csv";
		case "xlsx":
			return "xlsx";
		case "json":
		case "jsonapi":
			return "json";
		case "geojson":
			return "geojson";
		case "kml":
			return "kml";
		case "html_list":
		case "html_table":
			return "html";
		case "pdf_table":
			return "pdf";
		default:
			break;
	}
	const type = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
	if (type.includes("json")) return "json";
	if (type.includes("csv")) return "csv";
	if (type.includes("html")) return "html";
	if (type.includes("kml") || type.includes("xml")) return "kml";
	if (type.includes("pdf")) return "pdf";
	if (type.includes("spreadsheet") || type.includes("excel")) return "xlsx";
	const urlExtension = extname(new URL(config.fetch.url).pathname)
		.replace(/^\./, "")
		.toLowerCase();
	return urlExtension || "bin";
}

function authFromConfig(
	config: SourceConfig,
	env: Env,
): { headers: Record<string, string>; missing: string | null } {
	const auth = config.fetch.auth;
	if (auth === undefined || auth.type === "none") {
		return { headers: {}, missing: null };
	}
	if (auth.type === "bearer") {
		const secret = env[auth.env];
		if (!secret) return { headers: {}, missing: auth.env };
		return { headers: { Authorization: `Bearer ${secret}` }, missing: null };
	}
	if (auth.type === "header") {
		const secret = env[auth.env];
		if (!secret) return { headers: {}, missing: auth.env };
		return {
			headers: { [auth.header]: `${auth.prefix ?? ""}${secret}` },
			missing: null,
		};
	}
	// basic
	const encoded = auth.env ? env[auth.env] : undefined;
	if (encoded) {
		return { headers: { Authorization: `Basic ${encoded}` }, missing: null };
	}
	const user = auth.user_env ? env[auth.user_env] : undefined;
	const password = auth.password_env ? env[auth.password_env] : undefined;
	if (user && password) {
		return {
			headers: {
				Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
			},
			missing: null,
		};
	}
	return {
		headers: {},
		missing: auth.password_env ?? auth.user_env ?? auth.env ?? "BASIC_AUTH",
	};
}

function buildHeaders(
	config: SourceConfig,
	authHeaders: Record<string, string>,
): Record<string, string> {
	const headers: Record<string, string> = {
		"User-Agent": config.fetch.user_agent ?? DEFAULT_USER_AGENT,
		Accept: "*/*",
		...(config.fetch.headers ?? {}),
		...authHeaders,
	};
	if (
		config.fetch.method === "POST" &&
		config.fetch.body !== undefined &&
		!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
	) {
		headers["Content-Type"] = "application/json";
	}
	return headers;
}

function buildBody(config: SourceConfig): string | undefined {
	if (config.fetch.method !== "POST" || config.fetch.body === undefined) {
		return undefined;
	}
	return JSON.stringify(config.fetch.body);
}

function buildUrl(
	config: SourceConfig,
	params: Record<string, string | number> = {},
): string {
	const url = new URL(config.fetch.url);
	for (const [key, value] of Object.entries(config.fetch.query ?? {})) {
		url.searchParams.set(key, String(value));
	}
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, String(value));
	}
	return url.toString();
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function readBodyLimited(
	response: Response,
	maxBytes: number,
): Promise<Uint8Array> {
	if (response.body === null) {
		const body = new Uint8Array(await response.arrayBuffer());
		if (body.byteLength > maxBytes) {
			throw new FetchProblem(
				"max_bytes",
				`Odpowiedź przekracza max_bytes=${maxBytes}.`,
			);
		}
		return body;
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value === undefined) continue;
			total += value.byteLength;
			if (total > maxBytes) {
				await reader.cancel();
				throw new FetchProblem(
					"max_bytes",
					`Odpowiedź przekracza max_bytes=${maxBytes}.`,
				);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const body = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body;
}

type RequestOptions = {
	fetchImpl: FetchLike;
	timeoutMs: number;
	maxBytes: number;
	maxRedirects: number;
};

function isRedirect(status: number): boolean {
	return (
		status === 301 ||
		status === 302 ||
		status === 303 ||
		status === 307 ||
		status === 308
	);
}

async function requestOnce(
	spec: RequestSpec,
	options: RequestOptions,
): Promise<ResponseSpec> {
	let current = spec;
	let redirects = 0;
	for (;;) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), options.timeoutMs);
		try {
			const response = await options.fetchImpl(current.url, {
				...(current.body !== undefined ? { body: current.body } : {}),
				headers: current.headers,
				method: current.method,
				redirect: "manual",
				signal: controller.signal,
			});
			const location = response.headers.get("location");
			if (isRedirect(response.status) && location !== null) {
				if (redirects >= options.maxRedirects) {
					throw new FetchProblem(
						"max_redirects",
						`Przekroczono max_redirects=${options.maxRedirects}.`,
					);
				}
				redirects += 1;
				const nextUrl = new URL(location, current.url).toString();
				const switchToGet =
					response.status === 303 ||
					((response.status === 301 || response.status === 302) &&
						current.method === "POST");
				current = {
					body: switchToGet ? undefined : current.body,
					headers: current.headers,
					method: switchToGet ? "GET" : current.method,
					url: nextUrl,
				};
				continue;
			}
			const body = await readBodyLimited(response, options.maxBytes);
			return {
				body,
				contentType: response.headers.get("content-type"),
				finalUrl: response.url || current.url,
				status: response.status,
			};
		} catch (cause) {
			if (cause instanceof FetchProblem) throw cause;
			const aborted =
				cause instanceof Error &&
				(cause.name === "AbortError" || cause.name === "TimeoutError");
			throw new FetchProblem(
				aborted ? "timeout" : "network_error",
				aborted
					? `Przekroczono limit ${options.timeoutMs} ms.`
					: cause instanceof Error
						? cause.message
						: String(cause),
			);
		} finally {
			clearTimeout(timer);
		}
	}
}

function shouldRetry(spec: ResponseSpec): boolean {
	return spec.status === 429 || spec.status >= 500;
}

async function requestWithRetries(
	spec: RequestSpec,
	config: SourceConfig,
	options: RequestOptions,
): Promise<ResponseSpec> {
	const retries = config.fetch.retries;
	const attempts = Math.min(5, Math.max(0, retries?.max ?? 0)) + 1;
	const backoff = retries?.backoff_ms ?? DEFAULT_RETRY_BACKOFF_MS;
	let last: ResponseSpec | null = null;
	let lastProblem: FetchProblem | null = null;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			const response = await requestOnce(spec, options);
			if (!shouldRetry(response)) return response;
			last = response;
		} catch (cause) {
			if (!(cause instanceof FetchProblem)) throw cause;
			lastProblem = cause;
			if (cause.code === "max_bytes" || cause.code === "max_redirects") {
				throw cause;
			}
		}
		if (attempt + 1 < attempts) {
			await sleep(backoff * (attempt + 1));
		}
	}
	if (last !== null) return last;
	throw (
		lastProblem ??
		new FetchProblem("network_error", "Nieznany błąd pobierania.")
	);
}

function countJsonRecords(config: SourceConfig, root: unknown): number | null {
	try {
		const selected = resolveJsonPath(root, config.records.path);
		if (Array.isArray(selected)) return selected.length;
		if (selected !== null && typeof selected === "object") return 1;
		return 0;
	} catch {
		return null;
	}
}

function parseJson(body: Uint8Array): unknown {
	try {
		return JSON.parse(new TextDecoder("utf-8").decode(body)) as unknown;
	} catch {
		return undefined;
	}
}

function readNumericPath(root: unknown, path: string | undefined): number | null {
	if (path === undefined) return null;
	try {
		const value = resolveJsonPath(root, path);
		return typeof value === "number" && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

function decode(body: Uint8Array): string {
	return new TextDecoder("utf-8").decode(body);
}

function countRecordsCheap(
	config: SourceConfig,
	body: Uint8Array,
): number | null {
	const parser = config.connector.parser;
	if (parser === "csv" || parser === "xlsx") {
		if (parser === "xlsx") return null;
		const lines = decode(body)
			.replace(/^\uFEFF/, "")
			.split(/\r?\n/)
			.filter((line) => line.trim() !== "");
		const csv = (
			config.parse as {
				csv?: { header?: boolean; skip_rows?: number };
			}
		).csv;
		const skipRows = csv?.skip_rows ?? 0;
		const headerRows = csv?.header === false ? 0 : 1;
		return Math.max(0, lines.length - skipRows - headerRows);
	}
	if (parser === "kml") {
		const matches = decode(body).match(/<Placemark\b/gi);
		return matches?.length ?? 0;
	}
	if (parser === "json" || parser === "jsonapi" || parser === "geojson") {
		const root = parseJson(body);
		if (root === undefined) return null;
		if (parser === "geojson") {
			const features = resolveJsonPath(root, "$.features");
			if (Array.isArray(features)) return features.length;
			if (Array.isArray(root)) return root.length;
			return null;
		}
		return countJsonRecords(config, root);
	}
	return null;
}

function pathSegments(path: string): string[] {
	if (path === "$" || path === "") return [];
	if (path.startsWith("/")) {
		return path
			.slice(1)
			.split("/")
			.filter(Boolean)
			.map((segment) =>
				segment.replaceAll("~1", "/").replaceAll("~0", "~"),
			);
	}
	return path
		.replace(/^\$\.?/, "")
		.split(".")
		.filter(Boolean);
}

function setAtPath(root: unknown, path: string, value: unknown): void {
	const segments = pathSegments(path);
	if (segments.length === 0 || root === null || typeof root !== "object") {
		return;
	}
	let current = root as Record<string, unknown>;
	for (const segment of segments.slice(0, -1)) {
		const next = current[segment];
		if (next === null || typeof next !== "object") return;
		current = next as Record<string, unknown>;
	}
	const last = segments.at(-1);
	if (last !== undefined) current[last] = value;
}

function mergeJsonPages(
	config: SourceConfig,
	pages: Uint8Array[],
): Uint8Array {
	const roots = pages.map(parseJson);
	if (roots.some((root) => root === undefined)) {
		throw new FetchProblem(
			"pagination",
			"Nie można scalić stron: odpowiedź nie jest poprawnym JSON-em.",
		);
	}
	const path = config.records.path;
	if (path === "$" || path === "") {
		if (roots.every((root) => Array.isArray(root))) {
			return new TextEncoder().encode(
				JSON.stringify(roots.flatMap((root) => root as unknown[])),
			);
		}
		return new TextEncoder().encode(JSON.stringify({ pages: roots }));
	}
	const merged = structuredClone(roots[0]);
	const combined: unknown[] = [];
	for (const root of roots) {
		const selected = resolveJsonPath(root, path);
		if (Array.isArray(selected)) combined.push(...selected);
		else if (selected !== null && selected !== undefined) combined.push(selected);
	}
	setAtPath(merged, path, combined);
	return new TextEncoder().encode(JSON.stringify(merged));
}

function mergeTextPages(
	config: SourceConfig,
	pages: Uint8Array[],
): Uint8Array {
	const parser = config.connector.parser;
	if (parser === "csv") {
		const lines: string[] = [];
		for (const [index, page] of pages.entries()) {
			const pageLines = decode(page)
				.replace(/^\uFEFF/, "")
				.replace(/\r?\n$/, "")
				.split(/\r?\n/);
			if (index === 0) lines.push(...pageLines);
			else lines.push(...pageLines.slice(1));
		}
		return new TextEncoder().encode(`${lines.join("\n")}\n`);
	}
	return new TextEncoder().encode(
		pages.map((page) => decode(page).replace(/\s+$/, "")).join("\n"),
	);
}

function mergePages(
	config: SourceConfig,
	pages: Uint8Array[],
): Uint8Array {
	if (pages.length === 1) return pages[0]!;
	const parser = config.connector.parser;
	if (parser === "json" || parser === "jsonapi" || parser === "geojson") {
		return mergeJsonPages(config, pages);
	}
	return mergeTextPages(config, pages);
}

function writeMeta(
	rawDir: string,
	sourceId: string,
	meta: SourceFetchMeta,
): string {
	const metaFile = join(rawDir, `${sourceId}.meta.json`);
	writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
	return metaFile;
}

function baseMeta(
	config: SourceConfig,
	options: SourceFetchOptions,
	status: SourceFetchStatus,
): SourceFetchMeta {
	return {
		blocked: status === "blocked",
		bytes: 0,
		config_sha256: options.configSha256 ?? null,
		content_type: null,
		fetched_at: (options.now?.() ?? new Date()).toISOString(),
		final_url: config.fetch.url,
		http_status: null,
		raw_file: null,
		sha256: null,
		source_id: config.source.id,
		status,
	};
}

export async function fetchSource(
	config: SourceConfig,
	options: SourceFetchOptions,
): Promise<SourceFetchResult> {
	const sourceId = config.source.id;
	const metaFile = join(options.rawDir, `${sourceId}.meta.json`);
	if (config.source.enabled === false && options.includeDisabled !== true) {
		return {
			blocked: false,
			meta: null,
			metaFile,
			ok: true,
			rawFile: null,
			sourceId,
			status: "skipped",
		};
	}

	mkdirSync(options.rawDir, { recursive: true });

	const auth = authFromConfig(config, options.env ?? process.env);
	if (auth.missing !== null) {
		const error = `Brak zmiennej środowiskowej ${auth.missing}.`;
		const meta: SourceFetchMeta = {
			...baseMeta(config, options, "blocked"),
			error,
			method: config.fetch.method ?? "GET",
			request_url: config.fetch.url,
		};
		return {
			blocked: true,
			error,
			meta,
			metaFile: writeMeta(options.rawDir, sourceId, meta),
			ok: false,
			rawFile: null,
			sourceId,
			status: "blocked",
		};
	}

	const pagination = config.fetch.pagination ?? { type: "none" as const };
	if (
		pagination.type !== "none" &&
		pagination.type !== "page" &&
		pagination.type !== "offset"
	) {
		const error = `Nieobsługiwany typ paginacji: ${pagination.type}.`;
		const meta: SourceFetchMeta = {
			...baseMeta(config, options, "error"),
			error,
			method: config.fetch.method ?? "GET",
			request_url: config.fetch.url,
		};
		return {
			blocked: false,
			error,
			meta,
			metaFile: writeMeta(options.rawDir, sourceId, meta),
			ok: false,
			rawFile: null,
			sourceId,
			status: "error",
		};
	}

	const headers = buildHeaders(config, auth.headers);
	const body = buildBody(config);
	const method = config.fetch.method ?? "GET";
	const requestOptions: RequestOptions = {
		fetchImpl: options.fetchImpl ?? fetch,
		maxBytes: config.fetch.max_bytes ?? DEFAULT_MAX_BYTES,
		maxRedirects: config.fetch.max_redirects ?? DEFAULT_MAX_REDIRECTS,
		timeoutMs: config.fetch.timeout_ms ?? DEFAULT_TIMEOUT_MS,
	};
	const requestsPerMinute = config.fetch.rate_limit?.requests_per_minute;
	const spacingMs =
		requestsPerMinute !== undefined && requestsPerMinute > 0
			? Math.ceil(60_000 / requestsPerMinute)
			: 0;
	let lastRequestAt = 0;

	const pages: Uint8Array[] = [];
	const statuses: number[] = [];
	let finalUrl = config.fetch.url;
	let contentType: string | null = null;
	let total = 0;
	let requestCount = 0;

	try {
		const runRequest = async (
			params: Record<string, string | number> = {},
		): Promise<ResponseSpec> => {
			if (spacingMs > 0 && lastRequestAt > 0) {
				const wait = spacingMs - (Date.now() - lastRequestAt);
				if (wait > 0) await sleep(wait);
			}
			lastRequestAt = Date.now();
			requestCount += 1;
			if (requestCount > MAX_REQUESTS_PER_SOURCE) {
				throw new FetchProblem(
					"pagination",
					`Przekroczono limit ${MAX_REQUESTS_PER_SOURCE} żądań dla źródła.`,
				);
			}
			const response = await requestWithRetries(
				{
					body,
					headers,
					method,
					url: buildUrl(config, params),
				},
				config,
				requestOptions,
			);
			if (response.status < 200 || response.status >= 300) {
				throw new FetchProblem(
					"http_status",
					`HTTP ${response.status} dla ${response.finalUrl}.`,
				);
			}
			return response;
		};

		if (pagination.type === "none") {
			const response = await runRequest();
			pages.push(response.body);
			statuses.push(response.status);
			finalUrl = response.finalUrl;
			contentType = response.contentType;
		} else if (pagination.type === "page") {
			let page = pagination.start_page ?? 1;
			const pageSize = pagination.page_size;
			for (;;) {
				const response = await runRequest({
					[pagination.page_param]: page,
					[pagination.limit_param]: pageSize,
				});
				pages.push(response.body);
				statuses.push(response.status);
				finalUrl = response.finalUrl;
				contentType = response.contentType;
				const root = parseJson(response.body);
				const count =
					root === undefined
						? null
						: countJsonRecords(config, root);
				if (count !== null) total += count;
				const reportedTotal = readNumericPath(
					root,
					pagination.total_path,
				);
				if (
					reportedTotal !== null &&
					reportedTotal > 0 &&
					total >= reportedTotal
				) {
					break;
				}
				if (count !== null && count < pageSize) break;
				if (root === undefined && response.body.byteLength === 0) break;
				page += 1;
				if (page - (pagination.start_page ?? 1) >= MAX_REQUESTS_PER_SOURCE) {
					throw new FetchProblem(
						"pagination",
						`Przekroczono limit ${MAX_REQUESTS_PER_SOURCE} stron.`,
					);
				}
			}
		} else {
			let offset = pagination.start_offset ?? 0;
			const pageSize = pagination.page_size;
			for (;;) {
				const response = await runRequest({
					[pagination.offset_param]: offset,
					[pagination.limit_param]: pageSize,
				});
				pages.push(response.body);
				statuses.push(response.status);
				finalUrl = response.finalUrl;
				contentType = response.contentType;
				const root = parseJson(response.body);
				const count =
					root === undefined
						? null
						: countJsonRecords(config, root);
				if (count !== null) total += count;
				const reportedTotal = readNumericPath(
					root,
					pagination.total_path,
				);
				if (
					reportedTotal !== null &&
					reportedTotal > 0 &&
					total >= reportedTotal
				) {
					break;
				}
				if (count !== null && count < pageSize) break;
				if (root === undefined && response.body.byteLength === 0) break;
				offset += pageSize;
				if (offset >= MAX_REQUESTS_PER_SOURCE * pageSize) {
					throw new FetchProblem(
						"pagination",
						`Przekroczono limit ${MAX_REQUESTS_PER_SOURCE} stron.`,
					);
				}
			}
		}
	} catch (cause) {
		const problem =
			cause instanceof FetchProblem
				? cause
				: new FetchProblem(
						"network_error",
						cause instanceof Error ? cause.message : String(cause),
					);
		const meta: SourceFetchMeta = {
			...baseMeta(config, options, "error"),
			error: problem.message,
			method,
			request_url: config.fetch.url,
		};
		return {
			blocked: false,
			error: problem.message,
			meta,
			metaFile: writeMeta(options.rawDir, sourceId, meta),
			ok: false,
			rawFile: null,
			sourceId,
			status: "error",
		};
	}

	const merged = mergePages(config, pages);
	const extension = asExtension(config, contentType);
	const rawName = `${sourceId}.${extension}`;
	const rawFile = join(options.rawDir, rawName);
	writeFileSync(rawFile, merged);

	const pageFiles: string[] = [];
	if (pages.length > 1) {
		for (const [index, page] of pages.entries()) {
			const pageName = `${sourceId}.page-${index + 1}.${extension}`;
			writeFileSync(join(options.rawDir, pageName), page);
			pageFiles.push(pageName);
		}
	}

	const recordCount = countRecordsCheap(config, merged);
	const meta: SourceFetchMeta = {
		...baseMeta(config, options, "fetched"),
		bytes: merged.byteLength,
		content_type: contentType,
		final_url: finalUrl,
		http_status: statuses.at(-1) ?? null,
		method,
		raw_file: rawName,
		request_url: config.fetch.url,
		sha256: sha256Hex(merged),
		...(recordCount !== null ? { record_count: recordCount } : {}),
		...(pages.length > 1
			? {
					http_statuses: statuses,
					page_files: pageFiles,
					pages: pages.length,
				}
			: {}),
	};
	const writtenMeta = writeMeta(options.rawDir, sourceId, meta);
	return {
		blocked: false,
		meta,
		metaFile: writtenMeta,
		ok: true,
		rawFile: basename(rawFile),
		sourceId,
		status: "fetched",
	};
}

export async function fetchSources(
	configs: readonly SourceConfig[],
	options: SourceFetchOptions,
): Promise<SourceFetchResult[]> {
	const results: SourceFetchResult[] = [];
	for (const config of configs) {
		results.push(await fetchSource(config, options));
	}
	return results;
}
