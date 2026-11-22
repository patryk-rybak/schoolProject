import type { FeedRecord } from "./types";

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

const HEADER = [
	"id",
	"id_uuid",
	"name",
	"nazwa_obiektu",
	"lat",
	"szerokosc_geo",
	"lon",
	"dlugosc_geo",
	"city",
	"miejscowosc",
	"access",
	"typ_dostepnosci",
	"status",
	"verification_status",
	"status_weryfikacji",
	"verified_by",
	"verified_by_kind",
	"verified_at",
	"record_id",
	"source_id",
	"zrodlo_danych",
	"source_record_id",
	"source_url",
	"location_status",
	"geom_source",
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
				String(record.id),
				csvField(record.uuid),
				csvField(record.name),
				csvField(record.name),
				String(record.lat),
				String(record.lat),
				String(record.lon),
				String(record.lon),
				csvField(record.city ?? ""),
				csvField(record.city ?? ""),
				csvField(record.access),
				csvField(record.access),
				csvField(record.status),
				csvField(record.verificationStatus),
				csvField(record.verificationStatus),
				csvField(record.verifiedBy ?? ""),
				csvField(record.verifiedByKind ?? ""),
				csvField(record.verifiedAt ?? ""),
				csvField(record.recordId ?? ""),
				csvField(record.sourceId),
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
