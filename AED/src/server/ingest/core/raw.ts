import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceConfig } from "../config/schema";

export type RawSnapshotMeta = {
	source_id?: string;
	fetched_at?: string;
	final_url?: string;
	http_status?: number;
	content_type?: string;
	bytes?: number;
	sha256?: string;
	config_sha256?: string;
	raw_file?: string;
	file?: string;
	path?: string;
	blocked?: boolean;
	status?: string;
	error?: string;
	blocked_reason?: string;
	placemark_count?: number;
	point_count?: number;
	notes?: string;
	[key: string]: unknown;
};

export type RawSnapshot = {
	sourceId: string;
	config: SourceConfig;
	rawFile: string;
	meta: RawSnapshotMeta;
	body: Uint8Array;
	text: string;
	sha256: string;
	configSha256: string;
};

export class RawSnapshotError extends Error {
	readonly sourceId: string;
	readonly code: "missing" | "blocked" | "hash" | "read";

	constructor(
		sourceId: string,
		code: RawSnapshotError["code"],
		message: string,
	) {
		super(message);
		this.name = "RawSnapshotError";
		this.sourceId = sourceId;
		this.code = code;
	}
}

function sha256(value: Uint8Array | string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(value);
	return hasher.digest("hex");
}

function readMeta(rawDir: string, sourceId: string): RawSnapshotMeta | null {
	const path = join(rawDir, `${sourceId}.meta.json`);
	if (!existsSync(path)) return null;
	return JSON.parse(readFileSync(path, "utf8")) as RawSnapshotMeta;
}

function findRawFile(rawDir: string, sourceId: string, meta: RawSnapshotMeta | null): string {
	const explicit = meta?.raw_file ?? meta?.file ?? meta?.path;
	if (typeof explicit === "string" && explicit.length > 0) {
		if (existsSync(explicit)) return explicit;
		const local = join(rawDir, explicit.split(/[\\/]/).at(-1) ?? explicit);
		if (existsSync(local)) return local;
		return explicit;
	}
	const candidates = readdirSync(rawDir)
		.filter(
			(name) =>
				name.startsWith(`${sourceId}.`) &&
				!name.endsWith(".meta.json") &&
				!name.endsWith(".curlerr") &&
				!name.endsWith(".curlmeta"),
		)
		.sort();
	const raw = candidates[0];
	if (!raw) {
		throw new RawSnapshotError(
			sourceId,
			"missing",
			`Brak surowego pliku dla ${sourceId} w ${rawDir}.`,
		);
	}
	return join(rawDir, raw);
}

export function loadRawSnapshot(
	rawDir: string,
	config: SourceConfig,
): RawSnapshot {
	const sourceId = config.source.id;
	const meta = readMeta(rawDir, sourceId);
	if (meta?.blocked === true || meta?.status === "blocked") {
		throw new RawSnapshotError(
			sourceId,
			"blocked",
			typeof meta.error === "string"
				? meta.error
				: typeof meta.blocked_reason === "string"
					? meta.blocked_reason
					: "Źródło oznaczone jako zablokowane.",
		);
	}
	if (typeof meta?.http_status === "number" && meta.http_status >= 400) {
		throw new RawSnapshotError(
			sourceId,
			"blocked",
			`HTTP ${meta.http_status} w surowym snapshocie.`,
		);
	}

	const rawFile = findRawFile(rawDir, sourceId, meta);
	const body = readFileSync(rawFile);
	const actualSha = sha256(body);
	if (typeof meta?.sha256 === "string" && meta.sha256 !== actualSha) {
		throw new RawSnapshotError(
			sourceId,
			"hash",
			`sha256 nie zgadza się dla ${rawFile}: meta=${meta.sha256}, actual=${actualSha}.`,
		);
	}
	if (typeof meta?.bytes === "number" && meta.bytes !== body.byteLength) {
		throw new RawSnapshotError(
			sourceId,
			"hash",
			`bytes nie zgadza się dla ${rawFile}: meta=${meta.bytes}, actual=${body.byteLength}.`,
		);
	}

	return {
		body,
		config,
		configSha256: sha256(JSON.stringify(config)),
		meta: meta ?? {},
		rawFile,
		sha256: actualSha,
		sourceId,
		text: new TextDecoder("utf-8").decode(body),
	};
}
