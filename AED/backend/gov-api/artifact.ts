import { db } from "#backend/store/index.ts";
import { aedDevices, type AedDevice } from "#backend/store/schema.ts";

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

export function getFeedArtifact(): FeedArtifact {
	const rows = db.select().from(aedDevices).orderBy(aedDevices.id).all();

	const latest = rows.reduce<Date | null>(
		(acc, row) => (acc === null || row.updatedAt > acc ? row.updatedAt : acc),
		null,
	);

	const key = `${rows.length}:${latest?.getTime() ?? "empty"}`;
	if (cache !== null && cache.key === key) {
		return cache.artifact;
	}

	const artifact = buildFeed(rows.map(toFeedRecord), {
		baseUrl: publicBaseUrl(),
		updatedAt: latest ?? new Date(),
		recordCount: rows.length,
	});

	cache = { key, artifact };
	return artifact;
}

export function getCsv(): string {
	return buildCsv(readRecords());
}

export function getGeoJson(): string {
	return buildGeoJson(readRecords());
}

/** Cached so `/feed.xml` and `/feed.md5` always serve the same bytes. */
let cache: { readonly key: string; readonly artifact: FeedArtifact } | null =
	null;

function readRecords(): FeedRecord[] {
	return db
		.select()
		.from(aedDevices)
		.orderBy(aedDevices.id)
		.all()
		.map(toFeedRecord);
}

function toFeedRecord(row: AedDevice): FeedRecord {
	return {
		id: row.id,
		sourceId: row.source,
		name: row.name,
		lat: row.lat,
		lon: row.lon,
		city: row.city,
		access: row.access,
		status: row.status,
		verificationStatus: row.verificationStatus,
		verifiedBy: row.verifiedBy,
		verifiedByKind: row.verifiedByKind,
		verifiedAt: row.verifiedAt,
		...canonicalExportFields(row.canonical),
	};
}

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
		recordId: readText(canonical["record_id"]),
		sourceRecordId: readText(canonical["source_record_id"]),
		sourceUrl: readText(canonical["source_url"]),
		locationStatus: readText(canonical["location_status"]),
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
