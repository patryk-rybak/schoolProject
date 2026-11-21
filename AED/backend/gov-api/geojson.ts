import type { FeedRecord } from "./types";

export const GEOJSON_CONTENT_TYPE = "application/geo+json; charset=utf-8";

/**
 * GeoJSON `FeatureCollection`, one point per AED.
 *
 * GeoJSON coordinates are `[longitude, latitude]` (RFC 7946) — the opposite
 * order of the CSV columns, which is a common source of misplaced markers.
 */
export function buildGeoJson(records: readonly FeedRecord[]): string {
	const collection = {
		type: "FeatureCollection",
		features: records.map((record) => ({
			type: "Feature",
			geometry: {
				type: "Point",
				coordinates: [record.lon, record.lat],
			},
			properties: {
				id: record.id,
				name: record.name,
				city: record.city,
				access: record.access,
				status: record.status,
			},
		})),
	};

	return `${JSON.stringify(collection, null, 2)}\n`;
}
