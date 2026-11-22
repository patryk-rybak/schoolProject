import type { FeedRecord } from "./types";

export const POINTS_CONTENT_TYPE = "application/geo+json; charset=utf-8";

/**
 * Compact GeoJSON FeatureCollection for the interactive map.
 *
 * The harvester keeps using `/data/aed.geojson` with its stable, verbose
 * property contract. This payload carries only the fields the map source and
 * popup need, with no duplicate lat/lon in properties and no null-valued keys.
 */
export function buildPointsGeoJson(records: readonly FeedRecord[]): string {
	const features = records.map((record) => {
		const properties: Record<string, string | number> = {
			id: record.id,
			source_id: record.sourceId,
			name: record.name,
		};
		if (record.city !== null) {
			const key = "city";
			properties[key] = record.city;
		}
		if (record.address !== null && record.address !== undefined) {
			const key = "address";
			properties[key] = record.address;
		}
		if (record.description) {
			const key = "description";
			properties[key] = record.description;
		}
		for (const [key, value] of [
			["access", record.access],
			["status", record.status],
			["verification_status", record.verificationStatus],
		] as const) {
			properties[key] = value;
		}
		if (record.sourceUrl) {
			const key = "source_url";
			properties[key] = record.sourceUrl;
		}
		return {
			type: "Feature",
			geometry: {
				type: "Point",
				coordinates: [record.lon, record.lat],
			},
			properties,
		};
	});

	return `${JSON.stringify({ type: "FeatureCollection", features })}\n`;
}
