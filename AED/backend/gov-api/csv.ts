import type { FeedRecord } from "./types";

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

const HEADER = [
	"id",
	"nazwa_obiektu",
	"szerokosc_geo",
	"dlugosc_geo",
	"miejscowosc",
	"typ_dostepnosci",
	"status_sprawnosci",
	"status_weryfikacji",
	"zweryfikowane_przez",
	"typ_weryfikatora",
	"data_weryfikacji",
	"identyfikator_kanoniczny",
	"zrodlo_danych",
	"identyfikator_w_zrodle",
	"url_zrodla",
	"status_lokalizacji",
	"zrodlo_geometrii",
	"data_utworzenia",
	"data_aktualizacji",
] as const;
const NEEDS_QUOTING = /[",\n\r]/u;

/** Minimal, machine-readable CSV: one AED per row, UTF-8, comma separated. */
export function buildCsv(records: readonly FeedRecord[]): string {
	const lines = [HEADER.join(",")];
	for (const record of records) {
		lines.push(
			[
				csvField(record.uuid),
				csvField(record.name),
				String(record.lat),
				String(record.lon),
				csvField(record.city ?? ""),
				csvField(record.access),
				csvField(record.status),
				csvField(record.verificationStatus),
				csvField(record.verifiedBy ?? ""),
				csvField(record.verifiedByKind ?? ""),
				csvField(record.verifiedAt ?? ""),
				csvField(record.recordId ?? ""),
				csvField(record.sourceId),
				csvField(record.sourceRecordId ?? ""),
				csvField(record.sourceUrl ?? ""),
				csvField(record.locationStatus ?? ""),
				csvField(record.geomSource ?? ""),
				csvField(record.createdAt),
				csvField(record.updatedAt),
			].join(","),
		);
	}
	return `${lines.join("\n")}\n`;
}

/** RFC 4180 quoting: only when the value contains a delimiter, quote or newline. */
function csvField(value: string): string {
	if (!NEEDS_QUOTING.test(value)) {
		return value;
	}
	return `"${value.replaceAll('"', '""')}"`;
}
