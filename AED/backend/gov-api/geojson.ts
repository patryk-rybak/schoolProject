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
				id: record.uuid,
				nazwa_obiektu: record.name,
				szerokosc_geo: record.lat,
				dlugosc_geo: record.lon,
				miejscowosc: record.city,
				typ_dostepnosci: record.access,
				status_sprawnosci: record.status,
				status_weryfikacji: record.verificationStatus,
				zweryfikowane_przez: record.verifiedBy,
				typ_weryfikatora: record.verifiedByKind,
				data_weryfikacji: record.verifiedAt,
				identyfikator_kanoniczny: record.recordId ?? null,
				zrodlo_danych: record.sourceId,
				identyfikator_w_zrodle: record.sourceRecordId ?? null,
				url_zrodla: record.sourceUrl ?? null,
				status_lokalizacji: record.locationStatus ?? null,
				zrodlo_geometrii: record.geomSource ?? null,
				data_utworzenia: record.createdAt,
				data_aktualizacji: record.updatedAt,
			},
		})),
	};

	return `${JSON.stringify(collection)}\n`;
}
