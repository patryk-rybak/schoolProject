import { listCombinedAedDevices } from "#backend/store/aed-store.ts";
import type { CombinedAedDevice } from "#backend/store/schema.ts";

import { buildCsv } from "./csv";
import { buildFeed } from "./feed";
import { buildGeoJson } from "./geojson";
import type { FeedArtifact, FeedRecord } from "./types";

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

function isPublishedRow(row: CombinedAedDevice): boolean {
	return (
		row.lat !== null &&
		row.lon !== null &&
		PUBLISHED_LOCATION_STATUSES.some((status) => status === row.locationStatus)
	);
}

/**
 * Rows published to dane.gov.pl: the combined read model restricted to
 * geolocated records. `created_by_id` and `origin` stay internal.
 */
function publishedRows(): FeedRecord[] {
	return listCombinedAedDevices().filter(isPublishedRow).map(toFeedRecord);
}

export function getFeedArtifact(): FeedArtifact {
	const rows = listCombinedAedDevices();
	const records = rows.filter(isPublishedRow).map(toFeedRecord);

	const latest = rows.reduce<Date | null>(
		(acc, row) => (acc === null || row.updatedAt > acc ? row.updatedAt : acc),
		null,
	);

	const key = `${records.length}:${latest?.getTime() ?? "empty"}`;
	if (cache !== null && cache.key === key) {
		return cache.artifact;
	}

	const artifact = buildFeed(records, {
		baseUrl: publicBaseUrl(),
		updatedAt: latest ?? new Date(),
		recordCount: records.length,
	});

	cache = { key, artifact };
	return artifact;
}

export function getCsv(): string {
	return buildCsv(publishedRows());
}

export function getGeoJson(): string {
	return buildGeoJson(publishedRows());
}

/** Cached so `/feed.xml` and `/feed.md5` always serve the same bytes. */
let cache: { readonly key: string; readonly artifact: FeedArtifact } | null =
	null;

function attributesOf(row: CombinedAedDevice): Record<string, unknown> {
	if (row.attributes === null) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(row.attributes);
		return typeof parsed === "object" && parsed !== null
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
	return typeof value === "string" && value !== "" ? value : null;
}

function toFeedRecord(row: CombinedAedDevice): FeedRecord {
	const attributes = attributesOf(row);
	return {
		id: row.recordId,
		name: row.name ?? `AED (${row.sourceId})`,
		lat: row.lat,
		lon: row.lon,
		city: attributeText(attributes, "city"),
		access: row.accessType,
		status: row.status,
		verificationStatus: row.verificationStatus,
		verifiedBy: row.verifiedBy,
		verifiedByKind: row.verifiedByKind,
		verifiedAt: row.verifiedAt,
	};
}
