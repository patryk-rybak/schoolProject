import { listCombinedAedDevices } from "#backend/store/aed-store.ts";
import type { CombinedAedDevice } from "#backend/store/schema.ts";

import { buildCsv } from "./csv";
import { buildFeed } from "./feed";
import { buildGeoJson } from "./geojson";
import { buildPointsGeoJson } from "./points";
import { stablePublicUuid } from "./public-id";
import type { FeedArtifact, FeedRecord } from "./types";
import { buildXlsx } from "./xlsx";

/**
 * Base URL used inside the feed for resource links. Must be https: the
 * dane.gov.pl XSD accepts only `https://` resource URLs.
 */
const DEFAULT_PUBLIC_BASE_URL = "https://localhost:3443";
const TRAILING_SLASHES = /\/+$/u;
const PUBLISHED_LOCATION_STATUSES = ["point", "geocoded"] as const;

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

function isPublishedRow(row: CombinedAedDevice): boolean {
	return (
		row.lat !== null &&
		row.lon !== null &&
		PUBLISHED_LOCATION_STATUSES.some((status) => status === row.locationStatus)
	);
}

let exportCache: {
	readonly key: string;
	readonly snapshot: ExportSnapshot;
} | null = null;

/**
 * Read all rows once per snapshot, build each artifact lazily on first use,
 * and keep the results until the ordered row content changes.
 *
 * Hashing the exported row tuples catches in-place edits within the same
 * second; a cheap count/max signal would miss them.
 *
 * Artifact builders run behind memoized getters so hitting one endpoint
 * (e.g. the tiny harvester feed) never pays for the XLSX zip or the full
 * GeoJSON serialization.
 */
export function getExportSnapshot(): ExportSnapshot {
	const rows = listCombinedAedDevices().filter(isPublishedRow);
	const key = snapshotKey(rows);
	if (exportCache !== null && exportCache.key === key) {
		return exportCache.snapshot;
	}

	const records = rows.map(toFeedRecord);
	const latest = rows.reduce<Date | null>(
		(acc, row) => (acc === null || row.updatedAt > acc ? row.updatedAt : acc),
		null,
	);
	const latestMs = latest?.getTime() ?? Date.now();
	const snapshot = {
		key,
		latest: latestMs,
	} as ExportSnapshot;
	defineLazy(snapshot, "csv", () => buildCsv(records));
	defineLazy(snapshot, "geojson", () => buildGeoJson(records));
	defineLazy(snapshot, "points", () => buildPointsGeoJson(records));
	defineLazy(snapshot, "xlsx", () => buildXlsx(records));
	defineLazy(snapshot, "feed", () =>
		buildFeed(records, {
			baseUrl: publicBaseUrl(),
			updatedAt: latest ?? new Date(latestMs),
			recordCount: records.length,
		}),
	);
	exportCache = { key, snapshot };
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
function snapshotKey(rows: readonly CombinedAedDevice[]): string {
	const hash = new Bun.CryptoHasher("sha256");
	for (const row of rows) {
		hash.update(
			`${row.id}\u0000${row.updatedAt.getTime()}\u0000${row.recordId}\u0000${row.sourceId}\u0000${row.sourceRecordId}\u0000${row.sourceUrl ?? ""}\u0000${row.name ?? ""}\u0000${row.description ?? ""}\u0000${row.lat}\u0000${row.lon}\u0000${row.addressText ?? ""}\u0000${row.attributes ?? ""}\u0000${row.accessType}\u0000${row.status}\u0000${row.verificationStatus}\u0000${row.verifiedBy ?? ""}\u0000${row.verifiedByKind ?? ""}\u0000${row.verifiedAt ?? ""}\u0000${row.locationStatus}\u0000${row.geomSource}\u0001`,
		);
	}
	return `${rows.length}:${hash.digest("hex")}`;
}

function attributesOf(row: CombinedAedDevice): Record<string, unknown> {
	if (row.attributes === null) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(row.attributes);
		return typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function attributeText(
	attributes: Record<string, unknown>,
	key: string,
): string | null {
	const value = attributes[key];
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

function nonEmptyText(value: string | null): string | null {
	if (value === null) {
		return null;
	}
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

function toFeedRecord(row: CombinedAedDevice): FeedRecord {
	const attributes = attributesOf(row);
	return {
		id: row.id,
		sourceId: row.sourceId,
		name: nonEmptyText(row.name) ?? `AED (${row.sourceId})`,
		lat: row.lat,
		lon: row.lon,
		city: attributeText(attributes, "city"),
		address: nonEmptyText(row.addressText),
		description: nonEmptyText(row.description),
		access: row.accessType,
		status: row.status,
		verificationStatus: row.verificationStatus,
		verifiedBy: row.verifiedBy,
		verifiedByKind: row.verifiedByKind,
		verifiedAt: row.verifiedAt,
		uuid: stablePublicUuid(row.sourceId, row.recordId),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		recordId: row.recordId,
		sourceRecordId: row.sourceRecordId,
		sourceUrl: nonEmptyText(row.sourceUrl),
		locationStatus: row.locationStatus,
		geomSource: row.geomSource,
	};
}
