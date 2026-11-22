import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { S3Client, SQL } from "bun";
import type {
	Connection,
	S3Connection,
	SourceConfig,
} from "../config/schema";
import { parseXlsx, resolveJsonPath } from "../parsers";
import type {
	SourceFetchMeta,
	SourceFetchOptions,
	SourceFetchResult,
	SourceFetchStatus,
} from "./source-fetch";

/**
 * Fetches non-HTTP sources (sqlite_db, postgres_db, s3_object) and writes the
 * same raw-first snapshot as `fetchSource`:
 *
 *   <rawDir>/<source.id>.<ext>
 *   <rawDir>/<source.id>.meta.json
 *
 * DB connectors serialize the SELECT result rows to a JSON array snapshot
 * (`records.path` is "$"); S3 objects are written byte-for-byte unchanged.
 * Errors are reported as status "error" with a Polish message, never thrown.
 */

type Env = Record<string, string | undefined>;

const EXTENSIONS = {
	csv: "csv",
	xlsx: "xlsx",
	json: "json",
	geojson: "geojson",
} as const;

type NonHttpParser = keyof typeof EXTENSIONS;

class FetchProblem extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FetchProblem";
	}
}

function sha256Hex(value: Uint8Array | string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(value);
	return hasher.digest("hex");
}

/** Strips credentials before a connection URL is recorded in metadata. */
function redactUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.username !== "" || parsed.password !== "") {
			parsed.username = "";
			parsed.password = "";
		}
		return parsed.toString();
	} catch {
		return url;
	}
}

function describeLocation(connection: Connection, env: Env): string {
	switch (connection.kind) {
		case "sqlite":
			return `sqlite:${connection.path}`;
		case "postgres":
			return connection.url !== undefined
				? redactUrl(connection.url)
				: `env:${connection.env ?? "?"}${env[connection.env ?? ""] !== undefined ? "" : " (brak)"}`;
		case "s3": {
			const endpoint = connection.endpoint ?? "https://s3.amazonaws.com";
			return `s3://${connection.bucket}/${connection.key} @ ${endpoint}`;
		}
	}
}

function baseMeta(
	config: SourceConfig,
	options: SourceFetchOptions,
	status: SourceFetchStatus,
	finalUrl: string | null,
): SourceFetchMeta {
	return {
		blocked: status === "blocked",
		bytes: 0,
		config_sha256: options.configSha256 ?? null,
		content_type: null,
		fetched_at: (options.now?.() ?? new Date()).toISOString(),
		final_url: finalUrl,
		http_status: null,
		raw_file: null,
		sha256: null,
		source_id: config.source.id,
		status,
	};
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

function rowsToJson(rows: readonly unknown[]): Uint8Array {
	return new TextEncoder().encode(`${JSON.stringify(rows, null, 2)}\n`);
}

function fetchSqliteRows(connection: Extract<Connection, { kind: "sqlite" }>): unknown[] {
	let db: Database;
	try {
		db = new Database(connection.path, { readonly: true });
	} catch (cause) {
		throw new FetchProblem(
			`Nie można otworzyć bazy SQLite ${connection.path}: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
	}
	try {
		return db.query(connection.query).all();
	} catch (cause) {
		throw new FetchProblem(
			`Zapytanie SQLite nie powiodło się: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
	} finally {
		db.close();
	}
}

async function fetchPostgresRows(
	connection: Extract<Connection, { kind: "postgres" }>,
	env: Env,
): Promise<unknown[]> {
	const url =
		connection.url ??
		(connection.env !== undefined ? env[connection.env] : undefined);
	if (url === undefined || url.trim() === "") {
		throw new FetchProblem(
			`Brak zmiennej środowiskowej ${connection.env ?? "(env)"} z adresem URL PostgreSQL.`,
		);
	}
	const sql = new SQL(url);
	try {
		const rows = await sql.unsafe<Record<string, unknown>[]>(connection.query);
		return Array.from(rows);
	} catch (cause) {
		throw new FetchProblem(
			`Zapytanie PostgreSQL nie powiodło się: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
	} finally {
		await sql.end().catch(() => undefined);
	}
}

function s3Credentials(
	connection: S3Connection,
	env: Env,
): { accessKeyId: string; secretAccessKey: string; sessionToken?: string } | null {
	const configured =
		connection.access_key_id !== undefined ||
		connection.secret_access_key !== undefined ||
		connection.access_key_id_env !== undefined ||
		connection.secret_access_key_env !== undefined;
	if (!configured) {
		// No credentials configured: public object or ambient credentials
		// resolved by Bun itself (env/instance profile).
		return null;
	}
	const accessKeyId =
		connection.access_key_id ??
		(connection.access_key_id_env !== undefined
			? env[connection.access_key_id_env]
			: undefined);
	const secretAccessKey =
		connection.secret_access_key ??
		(connection.secret_access_key_env !== undefined
			? env[connection.secret_access_key_env]
			: undefined);
	if (accessKeyId === undefined || secretAccessKey === undefined) {
		const missing =
			accessKeyId === undefined
				? (connection.access_key_id_env ?? "access_key_id")
				: (connection.secret_access_key_env ?? "secret_access_key");
		throw new FetchProblem(`Brak poświadczenia S3: ${missing}.`);
	}
	const sessionToken =
		connection.session_token ??
		(connection.session_token_env !== undefined
			? env[connection.session_token_env]
			: undefined);
	return {
		accessKeyId,
		secretAccessKey,
		...(sessionToken !== undefined ? { sessionToken } : {}),
	};
}

async function fetchS3Object(
	connection: S3Connection,
	env: Env,
): Promise<Uint8Array> {
	const credentials = s3Credentials(connection, env);
	const client = new S3Client({
		bucket: connection.bucket,
		region: connection.region ?? "us-east-1",
		...(connection.endpoint !== undefined
			? { endpoint: connection.endpoint }
			: {}),
		...(credentials ?? {}),
	});
	try {
		const buffer = await client.file(connection.key).arrayBuffer();
		return new Uint8Array(buffer);
	} catch (cause) {
		throw new FetchProblem(
			`Nie można pobrać obiektu S3 s3://${connection.bucket}/${connection.key}: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
	}
}

function countRecords(
	parser: NonHttpParser,
	config: SourceConfig,
	body: Uint8Array,
): number | null {
	try {
		if (parser === "xlsx") {
			return parseXlsx(body).records.length;
		}
		const text = new TextDecoder("utf-8").decode(body);
		if (parser === "csv") {
			const lines = text
				.replace(/^\uFEFF/, "")
				.split(/\r?\n/)
				.filter((line) => line.trim() !== "");
			const csv = (
				config.parse as { csv?: { header?: boolean; skip_rows?: number } }
			).csv;
			const skipRows = csv?.skip_rows ?? 0;
			const headerRows = csv?.header === false ? 0 : 1;
			return Math.max(0, lines.length - skipRows - headerRows);
		}
		const root: unknown = JSON.parse(text);
		if (parser === "geojson") {
			const features = resolveJsonPath(root, "$.features");
			if (Array.isArray(features)) return features.length;
			if (Array.isArray(root)) return root.length;
			return null;
		}
		const selected = resolveJsonPath(root, config.records.path);
		if (Array.isArray(selected)) return selected.length;
		if (selected !== null && typeof selected === "object") return 1;
		return 0;
	} catch {
		return null;
	}
}

export async function fetchNonHttpSource(
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

	if (!("connection" in config)) {
		const message = `Źródło ${sourceId} nie ma sekcji connection dla konektora ${config.connector.family}.`;
		mkdirSync(options.rawDir, { recursive: true });
		const meta: SourceFetchMeta = {
			...baseMeta(config, options, "error", null),
			error: message,
		};
		return {
			blocked: false,
			error: message,
			meta,
			metaFile: writeMeta(options.rawDir, sourceId, meta),
			ok: false,
			rawFile: null,
			sourceId,
			status: "error",
		};
	}
	const connection = config.connection;
	const parser = config.connector.parser as NonHttpParser;
	const env = options.env ?? process.env;
	const location = describeLocation(connection, env);

	mkdirSync(options.rawDir, { recursive: true });

	let body: Uint8Array;
	try {
		switch (connection.kind) {
			case "sqlite":
				body = rowsToJson(fetchSqliteRows(connection));
				break;
			case "postgres":
				body = rowsToJson(await fetchPostgresRows(connection, env));
				break;
			case "s3":
				body = await fetchS3Object(connection, env);
				break;
		}
	} catch (cause) {
		const message =
			cause instanceof Error ? cause.message : String(cause);
		const meta: SourceFetchMeta = {
			...baseMeta(config, options, "error", location),
			error: message,
		};
		return {
			blocked: false,
			error: message,
			meta,
			metaFile: writeMeta(options.rawDir, sourceId, meta),
			ok: false,
			rawFile: null,
			sourceId,
			status: "error",
		};
	}

	const extension = EXTENSIONS[parser];
	const rawName = `${sourceId}.${extension}`;
	const rawFile = join(options.rawDir, rawName);
	writeFileSync(rawFile, body);

	const recordCount = countRecords(parser, config, body);
	const meta: SourceFetchMeta = {
		...baseMeta(config, options, "fetched", location),
		bytes: body.byteLength,
		raw_file: rawName,
		sha256: sha256Hex(body),
		...(recordCount !== null ? { record_count: recordCount } : {}),
	};
	return {
		blocked: false,
		meta,
		metaFile: writeMeta(options.rawDir, sourceId, meta),
		ok: true,
		rawFile: basename(rawFile),
		sourceId,
		status: "fetched",
	};
}