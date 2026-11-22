import type { CanonicalAedRecord } from "../../src/server/ingest/canonical.ts";
import type { NewAedDevice, NewAedSourceDevice } from "./schema.ts";

/**
 * Pure mapping from a canonical record to a physical table row.
 *
 * Kept separate from `aed-store.ts` so tests can use the mapping without
 * opening a database connection. No module here touches `db`.
 */

export const USER_ORIGIN = "user";
export const SOURCE_ORIGIN = "source";
export const SEED_ORIGIN = "seed";

export type SourceOrigin = typeof SOURCE_ORIGIN | typeof SEED_ORIGIN;

interface CanonicalColumns {
	recordId: string;
	sourceId: string;
	sourceRecordId: string;
	sourceUrl: string | null;
	version: number;
	name: string | null;
	description: string | null;
	note: string | null;
	facilityType: string | null;
	deviceType: string | null;
	accessType: string;
	status: string;
	confidence: number | null;
	lat: number;
	lon: number;
	coordPrecisionM: number | null;
	locationStatus: string;
	geomSource: string;
	addressText: string | null;
	addressKind: string;
	addressSource: string;
	addressConfidence: number | null;
	geocodeProvider: string | null;
	geocodeVersion: string | null;
	geocodeConfidence: number | null;
	geocodedAt: string | null;
	geocodeInputSha256: string | null;
	geocodeNote: string | null;
	claimStatus: string;
	claimedBy: string | null;
	claimedAt: string | null;
	claimNote: string | null;
	fieldProvenance: string | null;
	attributes: string | null;
}

function jsonOrNull(value: Record<string, unknown> | undefined): string | null {
	return value === undefined ? null : JSON.stringify(value);
}

/**
 * Checks the mandatory-coordinate invariant and maps the canonical record to
 * shared store columns. Address-only/unresolved/conflict records are rejected
 * because this project only stores geolocated AEDs.
 */
function canonicalColumns(record: CanonicalAedRecord): CanonicalColumns {
	if (record.lat === null || record.lon === null) {
		throw new Error(
			`Rekord ${record.record_id} nie ma współrzędnych i nie może trafić do bazy.`,
		);
	}
	if (
		record.location_status !== "point" &&
		record.location_status !== "geocoded"
	) {
		throw new Error(
			`Rekord ${record.record_id} ma location_status=${record.location_status}; zapisujemy tylko point/geocoded.`,
		);
	}
	return {
		recordId: record.record_id,
		sourceId: record.source_id,
		sourceRecordId: record.source_record_id,
		sourceUrl: record.source_url,
		version: record.version,
		name: record.name,
		description: record.description,
		note: record.note,
		facilityType: record.facility_type,
		deviceType: record.device_type,
		accessType: record.access_type ?? "unknown",
		status: record.status ?? "unknown",
		confidence: record.confidence,
		lat: record.lat,
		lon: record.lon,
		coordPrecisionM: record.coord_precision_m,
		locationStatus: record.location_status,
		geomSource: record.geom_source,
		addressText: record.address_text,
		addressKind: record.address_kind,
		addressSource: record.address_source,
		addressConfidence: record.address_confidence,
		geocodeProvider: record.geocode_provider,
		geocodeVersion: record.geocode_version,
		geocodeConfidence: record.geocode_confidence,
		geocodedAt: record.geocoded_at,
		geocodeInputSha256: record.geocode_input_sha256,
		geocodeNote: record.geocode_note,
		claimStatus: record.claim_status,
		claimedBy: record.claimed_by,
		claimedAt: record.claimed_at,
		claimNote: record.claim_note,
		fieldProvenance: jsonOrNull(record.field_provenance),
		attributes: jsonOrNull(record.attributes),
	};
}

/**
 * Row for the user table. The author and verifier are always the same account:
 * adding a device through the authenticated form is the only verification
 * path, so verification fields are forced here instead of trusted from input.
 */
export function canonicalToUserRow(
	record: CanonicalAedRecord,
	createdById: string,
): NewAedDevice {
	if (createdById.trim() === "") {
		throw new Error("canonicalToUserRow: createdById jest wymagane.");
	}
	return {
		...canonicalColumns(record),
		verificationStatus: "verified",
		verifiedBy: createdById,
		verifiedByKind: "person",
		verifiedAt: record.verified_at ?? new Date().toISOString(),
		origin: USER_ORIGIN,
		createdById,
	};
}

/**
 * Row for the external-source table. Imported records are always unverified
 * and never linked to an account, even if the upstream payload claims
 * otherwise.
 */
export function canonicalToSourceRow(
	record: CanonicalAedRecord,
	origin: SourceOrigin = SOURCE_ORIGIN,
): NewAedSourceDevice {
	return {
		...canonicalColumns(record),
		verificationStatus: "unverified",
		verifiedBy: null,
		verifiedByKind: null,
		verifiedAt: null,
		origin,
	};
}
