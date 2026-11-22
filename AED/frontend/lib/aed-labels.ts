/**
 * Shared Polish display labels for canonical AED field values.
 * Used by the detail panel and (to be) the map popup so both render the
 * same wording for access and status codes.
 */

export const ACCESS_LABELS: Record<string, string> = {
	always: "Dostępne cały czas",
	business_hours: "Dostępne w godzinach pracy",
	restricted: "Dostęp ograniczony",
	unknown: "Dostępność nieznana",
};

export const STATUS_LABELS: Record<string, string> = {
	operational: "Sprawny",
	out_of_service: "Niesprawny",
	unknown: "Stan nieznany",
};

/** Renders an untrusted JSON primitive as display text; objects become "". */
export function displayValue(value: unknown): string {
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (typeof value === "string") {
		return value.trim();
	}
	return "";
}

/** Maps a coded value through a label table, falling back to the raw key. */
export function labelFor(
	value: unknown,
	labels: Record<string, string>,
): string {
	const key = displayValue(value);
	return key === "" ? "Niepodano" : (labels[key] ?? key);
}
