import { db } from "#backend/store/index.ts";
import { type AedDevice, aedDevices } from "#backend/store/schema.ts";

import { buildCsv } from "./csv";
import { buildFeed } from "./feed";
import { buildGeoJson } from "./geojson";
import { buildPointsGeoJson } from "./points";
import type { FeedArtifact, FeedRecord } from "./types";
import { buildXlsx } from "./xlsx";

/**
 * Base URL used inside the feed for resource links. Must be https: the
 * dane.gov.pl XSD accepts only `https://` resource URLs.
 */
const DEFAULT_PUBLIC_BASE_URL = "https://localhost:3443";
const TRAILING_SLASHES = /\/+$/u;

export function publicBaseUrl(): string {
	// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
	const raw = Bun.env["PUBLIC_BASE_URL"] ?? DEFAULT_PUBLIC_BASE_URL;
	const base = raw.replace(TRAILING_SLASHES, "");
	if (!base.startsWith("https://")) {
		throw new Error(
			`PUBLIC_BASE_URL must start with https:// (got: ${raw}). ` +
				"Run `bun run dev:tls` and use its address, e.g. https://172.18.18.1:3443",
		);
	}
	return base;
}

/** Every artifact built from a single SQLite snapshot. */
export interface ExportSnapshot {
	/** Identity of the snapshot; changes whenever exported rows change. */
	readonly key: string;
	readonly latest: number;
	readonly csv: string;
	readonly geojson: string;
	readonly points: string;
	readonly xlsx: ArrayBuffer;
	readonly feed: FeedArtifact;
}

let exportCache: ExportSnapshot | null = null;

/**
 * Read all rows once per snapshot, build each artifact lazily on first use,
 * and keep the results until the ordered row content changes.
 *
 * Hashing the exported row tuples catches in-place edits within the same
 * second; a cheap count/max signal would miss them. Cache misses are rare
 * because exports are append-heavy and served from the same process.
 *
 * Artifact builders run behind memoized getters so hitting one endpoint
 * (e.g. the tiny harvester feed) never pays for the XLSX zip or the full
 * GeoJSON serialization.
 */
export function getExportSnapshot(): ExportSnapshot {
	if (exportCache !== null) {
		return exportCache;
	}

	const rows = db.select().from(aedDevices).orderBy(aedDevices.id).all();
	const records = rows.map(toFeedRecord);
	const latest = rows.reduce<Date | null>(
		(acc, row) => (acc === null || row.updatedAt > acc ? row.updatedAt : acc),
		null,
	);
	const latestMs = latest?.getTime() ?? Date.now();
	const snapshot = {
		key: snapshotKey(rows),
		latest: latestMs,
	} as ExportSnapshot;
	defineLazy(snapshot, "csv", () => buildCsv(records));
	defineLazy(snapshot, "geojson", () => buildGeoJson(records));
	defineLazy(snapshot, "points", () =>
		// Description lives only in the canonical JSON; parse it lazily here so
		// the harvester artifacts never pay for 19k JSON.parse calls. The
		// verbose /data/aed.geojson contract stays unchanged.
		buildPointsGeoJson(
			rows.map((row, index) => {
				const record = records[index];
				if (record === undefined) {
					throw new Error("Feed record missing for row");
				}
				const description = canonicalDescription(row.canonical);
				return description === null ? record : { ...record, description };
			}),
		),
	);
	defineLazy(snapshot, "xlsx", () => buildXlsx(records));
	defineLazy(snapshot, "feed", () =>
		buildFeed(records, {
			baseUrl: publicBaseUrl(),
			updatedAt: latest ?? new Date(latestMs),
			recordCount: records.length,
		}),
	);
	exportCache = snapshot;
	return snapshot;
}

/**
 * Define an enumerable getter that builds the artifact on first read and
 * then replaces itself with the plain value, so later reads are direct
 * property accesses and the snapshot keeps its plain-object shape.
 */
function defineLazy<K extends keyof ExportSnapshot>(
	snapshot: ExportSnapshot,
	key: K,
	build: () => ExportSnapshot[K],
): void {
	Object.defineProperty(snapshot, key, {
		configurable: true,
		enumerable: true,
		get(): ExportSnapshot[K] {
			const value = build();
			Object.defineProperty(snapshot, key, {
				configurable: true,
				enumerable: true,
				value,
				writable: false,
			});
			return value;
		},
	});
}

export function getFeedArtifact(): FeedArtifact {
	return getExportSnapshot().feed;
}

export function getCsv(): string {
	return getExportSnapshot().csv;
}

export function getGeoJson(): string {
	return getExportSnapshot().geojson;
}

export function getPointsGeoJson(): string {
	return getExportSnapshot().points;
}

export function getXlsx(): ArrayBuffer {
	return getExportSnapshot().xlsx;
}

/** Identity that changes on insertion, deletion and in-place row edits. */
function snapshotKey(rows: readonly AedDevice[]): string {
	const hash = new Bun.CryptoHasher("sha256");
	for (const row of rows) {
		hash.update(
			`${row.id}\u0000${row.updatedAt.getTime()}\u0000${row.source}\u0000${row.canonical ?? ""}\u0000${row.name}\u0000${row.lat}\u0000${row.lon}\u0000${row.city ?? ""}\u0000${row.access}\u0000${row.status}\u0000${row.verificationStatus}\u0000${row.verifiedBy ?? ""}\u0000${row.verifiedByKind ?? ""}\u0000${row.verifiedAt ?? ""}\u0001`,
		);
	}
	return `${rows.length}:${hash.digest("hex")}`;
}

function toFeedRecord(row: AedDevice): FeedRecord {
	return {
		id: row.id,
		sourceId: row.source,
		name: row.name,
		lat: row.lat,
		lon: row.lon,
		city: row.city,
		address: row.address,
		access: row.access,
		status: row.status,
		verificationStatus: row.verificationStatus,
		verifiedBy: row.verifiedBy,
		verifiedByKind: row.verifiedByKind,
		verifiedAt: row.verifiedAt,
		uuid: stableUuid(row),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		...canonicalExportFields(row.canonical),
	};
}

/**
 * Deterministic UUID for rows without a native UUID column.
 *
 * The integer primary key is stable for a row's lifetime, but the public
 * contract needs a UUID-shaped identifier; hashing the `source:id` pair keeps
 * repeated exports of the same snapshot byte-identical.
 */
function stableUuid(row: AedDevice): string {
	const hash = new Bun.CryptoHasher("sha256")
		.update(`${row.source}:${row.id}`)
		.digest("hex");
	// Keep a valid UUID v4 shape while preserving deterministic bits.
	const variant = (
		(Number.parseInt(hash.charAt(UUID_VARIANT_INDEX), 16) % UUID_NIBBLE_COUNT) +
		UUID_VARIANT_BASE
	).toString(16);
	const version = (
		(Number.parseInt(hash.charAt(UUID_VERSION_INDEX), 16) % UUID_NIBBLE_COUNT) +
		UUID_VERSION_BASE
	).toString(16);
	return [
		hash.slice(UUID_GROUP_STARTS[0], UUID_GROUP_STARTS[1]),
		hash.slice(UUID_GROUP_STARTS[1], UUID_GROUP_STARTS[2]),
		`${version}${hash.slice(UUID_GROUP_STARTS[2] + 1, UUID_GROUP_STARTS[3])}`,
		`${variant}${hash.slice(UUID_GROUP_STARTS[3] + 1, UUID_GROUP_STARTS[4])}`,
		hash.slice(UUID_GROUP_STARTS[4]),
	].join("-");
}

const UUID_VARIANT_INDEX = 12;
const UUID_VERSION_INDEX = 16;
const UUID_NIBBLE_COUNT = 4;
const UUID_VARIANT_BASE = 8;
const UUID_VERSION_BASE = 4;
const UUID_GROUP_STARTS = [0, 8, 12, 16, 24] as const;

interface CanonicalExportFields {
	readonly recordId: string | null;
	readonly sourceRecordId: string | null;
	readonly sourceUrl: string | null;
	readonly locationStatus: string | null;
	readonly geomSource: string | null;
}

/** Reads provenance from the optional canonical JSON without trusting its shape. */
function canonicalExportFields(raw: string | null): CanonicalExportFields {
	const empty: CanonicalExportFields = {
		recordId: null,
		sourceRecordId: null,
		sourceUrl: null,
		locationStatus: null,
		geomSource: null,
	};
	if (raw === null) {
		return empty;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return empty;
	}
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		return empty;
	}
	const canonical = parsed as Record<string, unknown>;
	return {
		// biome-ignore lint/complexity/useLiteralKeys: exported types require index-signature keys in bracket notation.
		recordId: readText(canonical["record_id"]),
		// biome-ignore lint/complexity/useLiteralKeys: exported types require index-signature keys in bracket notation.
		sourceRecordId: readText(canonical["source_record_id"]),
		// biome-ignore lint/complexity/useLiteralKeys: exported types require index-signature keys in bracket notation.
		sourceUrl: readText(canonical["source_url"]),
		// biome-ignore lint/complexity/useLiteralKeys: exported types require index-signature keys in bracket notation.
		locationStatus: readText(canonical["location_status"]),
		// biome-ignore lint/complexity/useLiteralKeys: exported types require index-signature keys in bracket notation.
		geomSource: readText(canonical["geom_source"]),
	};
}

function readText(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const text = value.trim();
	return text === "" ? null : text;
}

/** Reads the location description from canonical JSON without trusting it. */
function canonicalDescription(raw: string | null): string | null {
	if (raw === null) {
		return null;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		return null;
	}
	// biome-ignore lint/complexity/useLiteralKeys: index-signature keys need bracket access.
	return readText((parsed as Record<string, unknown>)["description"]);
}
