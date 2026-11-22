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
 * The public export uses Polish canonical names only. `id` is the stable UUID;
 * the numeric database id is internal to the map and is not exported.
 */
const COLUMNS = [
	["id", (record: FeedRecord) => record.uuid],
	["nazwa_obiektu", (record: FeedRecord) => record.name],
	["szerokosc_geo", (record: FeedRecord) => record.lat],
	["dlugosc_geo", (record: FeedRecord) => record.lon],
	["miejscowosc", (record: FeedRecord) => record.city],
	["typ_dostepnosci", (record: FeedRecord) => record.access],
	["status_sprawnosci", (record: FeedRecord) => record.status],
	["status_weryfikacji", (record: FeedRecord) => record.verificationStatus],
	["zweryfikowane_przez", (record: FeedRecord) => record.verifiedBy],
	["typ_weryfikatora", (record: FeedRecord) => record.verifiedByKind],
	["data_weryfikacji", (record: FeedRecord) => record.verifiedAt],
	["identyfikator_kanoniczny", (record: FeedRecord) => record.recordId ?? null],
	["zrodlo_danych", (record: FeedRecord) => record.sourceId],
	[
		"identyfikator_w_zrodle",
		(record: FeedRecord) => record.sourceRecordId ?? null,
	],
	["url_zrodla", (record: FeedRecord) => record.sourceUrl ?? null],
	["status_lokalizacji", (record: FeedRecord) => record.locationStatus ?? null],
	["zrodlo_geometrii", (record: FeedRecord) => record.geomSource ?? null],
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
		wch: name === "url_zrodla" ? SOURCE_URL_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH,
	}));
	utils.book_append_sheet(workbook, sheet, AED_XLSX_SHEET_NAME);
	return write(workbook, { bookType: "xlsx", type: "array" });
}
