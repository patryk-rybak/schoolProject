import { getCombinedAedDevice } from "#backend/store/aed-store.ts";
import type { CombinedAedDevice } from "#backend/store/schema.ts";

/**
 * Explicit JSON-safe shape for the canonical record. Keeping this
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

function parseAttributes(raw: string | null): Record<string, unknown> {
	if (raw === null) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		return typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function attributeText(
	attributes: Record<string, unknown>,
	key: string,
): string | null {
	const value = attributes[key];
	return typeof value === "string" && value !== "" ? value : null;
}

/** Builds a flat, JSON-safe canonical detail object from a combined store row. */
function toCanonicalDetail(row: CombinedAedDevice): CanonicalDetail {
	return {
		version: row.version,
		record_id: row.recordId,
		source_id: row.sourceId,
		source_record_id: row.sourceRecordId,
		source_url: row.sourceUrl,
		name: row.name,
		description: row.description,
		note: row.note,
		facility_type: row.facilityType,
		device_type: row.deviceType,
		access_type: row.accessType,
		status: row.status,
		verification_status: row.verificationStatus,
		verified_by: row.verifiedBy,
		verified_by_kind: row.verifiedByKind,
		verified_at: row.verifiedAt,
		confidence: row.confidence,
		lat: row.lat,
		lon: row.lon,
		coord_precision_m: row.coordPrecisionM,
		location_status: row.locationStatus,
		geom_source: row.geomSource,
		address_text: row.addressText,
		address_kind: row.addressKind,
		address_source: row.addressSource,
		address_confidence: row.addressConfidence,
		geocode_provider: row.geocodeProvider,
		geocode_version: row.geocodeVersion,
		geocode_confidence: row.geocodeConfidence,
		geocoded_at: row.geocodedAt,
		geocode_input_sha256: row.geocodeInputSha256,
		geocode_note: row.geocodeNote,
		claim_status: row.claimStatus,
		claimed_by: row.claimedBy,
		claimed_at: row.claimedAt,
		claim_note: row.claimNote,
		field_provenance: row.fieldProvenance,
		attributes: row.attributes,
	};
}

export function getAedDetail(id: number): AedDetail | null {
	const row = getCombinedAedDevice(id);
	if (!row) {
		return null;
	}

	const attributes = parseAttributes(row.attributes);
	const street = attributeText(attributes, "street");
	const houseNumber = attributeText(attributes, "house_number");
	const attributeAddress = [street, houseNumber].filter(Boolean).join(" ");
	const address =
		row.addressText ??
		(attributeAddress.length > 0
			? attributeAddress
			: attributeText(attributes, "address_text"));

	return {
		id: row.id,
		name: row.name ?? `AED (${row.sourceId})`,
		latitude: row.lat,
		longitude: row.lon,
		address,
		city: attributeText(attributes, "city"),
		access: row.accessType,
		status: row.status,
		source: row.sourceId,
		verificationStatus: row.verificationStatus,
		verifiedBy: row.verifiedBy,
		verifiedAt: row.verifiedAt,
		canonical: toCanonicalDetail(row),
	};
}
