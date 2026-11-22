import { utils, write } from "xlsx";

import type { FeedRecord } from "./types";

export const XLSX_CONTENT_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const AED_XLSX_SHEET_NAME = "AED";

const SOURCE_URL_COLUMN_WIDTH = 40;
const DEFAULT_COLUMN_WIDTH = 22;

/**
 * Column order shared with CSV and GeoJSON property names.
 *
 * Legacy names are kept first in each alias pair so existing consumers can
 * keep using them; the Polish names are the canonical schema names from the
 * competition workbook.
 */
const COLUMNS = [
	["id", (record: FeedRecord) => record.id],
	["id_uuid", (record: FeedRecord) => record.uuid],
	["name", (record: FeedRecord) => record.name],
	["nazwa_obiektu", (record: FeedRecord) => record.name],
	["lat", (record: FeedRecord) => record.lat],
	["szerokosc_geo", (record: FeedRecord) => record.lat],
	["lon", (record: FeedRecord) => record.lon],
	["dlugosc_geo", (record: FeedRecord) => record.lon],
	["city", (record: FeedRecord) => record.city],
	["miejscowosc", (record: FeedRecord) => record.city],
	["access", (record: FeedRecord) => record.access],
	["typ_dostepnosci", (record: FeedRecord) => record.access],
	["status", (record: FeedRecord) => record.status],
	["verification_status", (record: FeedRecord) => record.verificationStatus],
	["status_weryfikacji", (record: FeedRecord) => record.verificationStatus],
	["verified_by", (record: FeedRecord) => record.verifiedBy],
	["verified_by_kind", (record: FeedRecord) => record.verifiedByKind],
	["verified_at", (record: FeedRecord) => record.verifiedAt],
	["record_id", (record: FeedRecord) => record.recordId ?? null],
	["source_id", (record: FeedRecord) => record.sourceId],
	["zrodlo_danych", (record: FeedRecord) => record.sourceId],
	["source_record_id", (record: FeedRecord) => record.sourceRecordId ?? null],
	["source_url", (record: FeedRecord) => record.sourceUrl ?? null],
	["location_status", (record: FeedRecord) => record.locationStatus ?? null],
	["geom_source", (record: FeedRecord) => record.geomSource ?? null],
	["data_utworzenia", (record: FeedRecord) => record.createdAt],
	["data_aktualizacji", (record: FeedRecord) => record.updatedAt],
] as const;

/** XLSX workbook with one AED per row, using the shared export columns. */
export function buildXlsx(records: readonly FeedRecord[]): ArrayBuffer {
	const workbook = utils.book_new();
	const rows: (string | number | null)[][] = [
		COLUMNS.map(([name]) => name),
		...records.map((record) => COLUMNS.map(([, read]) => read(record))),
	];
	const sheet = utils.aoa_to_sheet(rows);
	sheet["!cols"] = COLUMNS.map(([name]) => ({
		wch: name === "source_url" ? SOURCE_URL_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH,
	}));
	utils.book_append_sheet(workbook, sheet, AED_XLSX_SHEET_NAME);
	return write(workbook, { bookType: "xlsx", type: "array" });
}
