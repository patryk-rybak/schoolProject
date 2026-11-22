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
				id_uuid: record.uuid,
				source_id: record.sourceId,
				name: record.name,
				nazwa_obiektu: record.name,
				city: record.city,
				miejscowosc: record.city,
				szerokosc_geo: record.lat,
				dlugosc_geo: record.lon,
				access: record.access,
				typ_dostepnosci: record.access,
				status: record.status,
				verification_status: record.verificationStatus,
				status_weryfikacji: record.verificationStatus,
				verified_by: record.verifiedBy,
				verified_by_kind: record.verifiedByKind,
				verified_at: record.verifiedAt,
				record_id: record.recordId ?? null,
				zrodlo_danych: record.sourceId,
				source_record_id: record.sourceRecordId ?? null,
				source_url: record.sourceUrl ?? null,
				location_status: record.locationStatus ?? null,
				geom_source: record.geomSource ?? null,
				data_utworzenia: record.createdAt,
				data_aktualizacji: record.updatedAt,
			},
		})),
	};

	return `${JSON.stringify(collection)}\n`;
}
