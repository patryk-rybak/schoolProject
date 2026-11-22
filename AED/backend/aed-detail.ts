import { getAedDevice } from "#backend/store/aed-store.ts";

/**
 * Explicit JSON-safe shape for the optional canonical record. Keeping this
 * structural instead of reusing zod's inferred type avoids interface types
 * that TanStack Start's server-function serializer cannot validate.
 *
 * Primitive fields stay as primitives; nested objects (`attributes`,
 * `field_provenance`) are preserved as JSON strings so the UI can render them
 * without losing data.
 */
export interface CanonicalDetail {
	readonly [key: string]: string | number | boolean | null;
}

/**
 * Public shape of one AED detail. The map's GeoJSON only carries the fields
 * needed for the popup; the full canonical record is read from the store on
 * the detail page, so optional fields are omitted when absent.
 */
export interface AedDetail {
	readonly id: number;
	readonly name: string;
	readonly latitude: number;
	readonly longitude: number;
	readonly address: string | null;
	readonly city: string | null;
	readonly access: string;
	readonly status: string;
	readonly source: string;
	readonly verificationStatus: string;
	readonly verifiedBy: string | null;
	readonly verifiedAt: string | null;
	readonly canonical: CanonicalDetail | null;
}

/** Reads canonical JSON into a flat, JSON-safe detail object. */
function toCanonicalDetail(parsed: unknown): CanonicalDetail {
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		return {};
	}
	const detail: Record<string, string | number | boolean | null> = {};
	for (const [key, value] of Object.entries(
		parsed as Record<string, unknown>,
	)) {
		if (value === null) {
			detail[key] = null;
		} else if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			detail[key] = value;
		} else {
			// Preserve nested objects/arrays as JSON text so no data is lost.
			try {
				detail[key] = JSON.stringify(value);
			} catch {
				detail[key] = null;
			}
		}
	}
	return detail;
}

export function getAedDetail(id: number): AedDetail | null {
	const row = getAedDevice(id);
	if (!row) {
		return null;
	}

	let canonical: CanonicalDetail | null = null;
	if (row.canonical !== null) {
		try {
			canonical = toCanonicalDetail(JSON.parse(row.canonical));
		} catch {
			canonical = null;
		}
	}

	return {
		id: row.id,
		name: row.name,
		latitude: row.lat,
		longitude: row.lon,
		address: row.address,
		city: row.city,
		access: row.access,
		status: row.status,
		source: row.source,
		verificationStatus: row.verificationStatus,
		verifiedBy: row.verifiedBy,
		verifiedAt: row.verifiedAt,
		canonical,
	};
}
