import type { FeedRecord } from "./types";

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

const HEADER = [
	"id",
	"name",
	"lat",
	"lon",
	"city",
	"access",
	"status",
] as const;
const NEEDS_QUOTING = /[",\n\r]/u;

/** Minimal, machine-readable CSV: one AED per row, UTF-8, comma separated. */
export function buildCsv(records: readonly FeedRecord[]): string {
	const lines = [HEADER.join(",")];
	for (const record of records) {
		lines.push(
			[
				String(record.id),
				csvField(record.name),
				String(record.lat),
				String(record.lon),
				csvField(record.city ?? ""),
				csvField(record.access),
				csvField(record.status),
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
