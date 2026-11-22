import type { CanonicalAedRecord, VerifierKind } from "../canonical";
import { VERIFIER_KINDS, parseCanonicalAedRecord } from "../canonical";
import {
	CANONICAL_FIELDS,
	type SourceConfig,
} from "../config/schema";
import {
	type RecordValue,
	evaluateCoordinate,
	evaluateFieldSpec,
} from "../parsers";

const NUMBER_FIELDS = new Set([
	"confidence",
	"coord_precision_m",
	"address_confidence",
	"geocode_confidence",
]);

const BOOLEAN_FIELDS = new Set([
	"indoor",
	"is_24_7",
	"requires_dispatcher",
	"fee",
	"wheelchair_access",
	"is_public",
]);

const DATE_FIELDS = new Set([
	"installed_at",
	"battery_expiry",
	"pads_expiry",
	"last_inspection_at",
	"next_inspection_at",
	"last_verified_at",
	"last_seen_at",
	"source_updated_at",
	"geocoded_at",
]);

const BASE_KEYS = new Set([
	"id",
	"record_id",
	"source_id",
	"source_record_id",
	"source_url",
	"name",
	"description",
	"facility_type",
	"access_type",
	"status",
	"verification_status",
	"verified_by",
	"verified_by_kind",
	"verified_at",
	"confidence",
	"lat",
	"lon",
	"coord_precision_m",
	"location_status",
	"geom_source",
	"address_text",
]);

function toText(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		const parts = value.map(toText).filter((entry): entry is string => entry !== null);
		return parts.length > 0 ? parts.join(", ") : null;
	}
	if (typeof value === "object") {
		try {
			return JSON.stringify(value);
		} catch {
			return null;
		}
	}
	return null;
}

function toNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value.replace(",", "."));
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function toBoolean(value: unknown): boolean | null {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (["true", "1", "yes", "tak", "y", "public", "publiczny"].includes(normalized)) {
			return true;
		}
		if (["false", "0", "no", "nie", "n", "private", "prywatny"].includes(normalized)) {
			return false;
		}
	}
	return null;
}

function asRecord(value: unknown): RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as RecordValue)
		: {};
}

function inferAddressKind(values: Record<string, unknown>): string {
	if (toText(values["house_number"]) !== null) return "building";
	if (toText(values["street"]) !== null) return "street";
	if (toText(values["postcode"]) !== null) return "street";
	if (toText(values["city"]) !== null) return "locality";
	if (toText(values["name"]) !== null) return "object_only";
	return "none";
}

function toVerifierKind(value: unknown): VerifierKind | null {
	const text = toText(value);
	if (text === null) return null;
	return (VERIFIER_KINDS as readonly string[]).includes(text)
		? (text as VerifierKind)
		: "unknown";
}

export type MappedRecord = {
	record: CanonicalAedRecord;
	index: number;
};

/** Plain attribution string, when the (slim) config trivially provides one. */
export function sourceAttribution(config: SourceConfig): string | null {
	const source = config.source as { attribution?: unknown; name?: unknown };
	if (typeof source.attribution === "string" && source.attribution.trim()) {
		return source.attribution.trim();
	}
	if (typeof source.name === "string" && source.name.trim()) {
		return source.name.trim();
	}
	return null;
}

export function mapSourceRecord(
	config: SourceConfig,
	row: RecordValue,
	index: number,
): MappedRecord {
	const variables = {
		row_index: index,
		source_id: config.source.id,
	};
	const map = config.map as Record<string, unknown>;
	const values: Record<string, unknown> = {};
	const provenance: Record<string, string> = {};

	for (const field of CANONICAL_FIELDS) {
		const spec = map[field];
		if (spec === undefined) continue;
		const value =
			field === "lat" || field === "lon"
				? (() => {
						const result = evaluateCoordinate(spec, row, field, variables);
						return result.invalid ? null : result.value;
					})()
				: evaluateFieldSpec(spec, row, variables);
		values[field] = value;
		if (value !== null && value !== undefined && value !== "") {
			provenance[field] = config.source.id;
		}
	}

	// Slim configs have no records.identity: use the mapped source_record_id
	// column when present, otherwise fall back to the row index.
	const sourceRecordId =
		toText(values["source_record_id"]) ?? `${config.source.id}:${index}`;
	const name =
		toText(values["name"]) ??
		toText(row["Nazwa"]) ??
		toText(row["name"]);
	const lat = toNumber(values["lat"]);
	const lon = toNumber(values["lon"]);
	const addressText = toText(values["address_text"]);
	const locationStatus =
		lat !== null && lon !== null
			? "point"
			: addressText !== null
				? "address_only"
				: "unresolved";
	const sourceUrl =
		toText(values["source_url"]) ??
		("fetch" in config ? config.fetch.url : null);

	// Verification: who confirmed the point (email / company / organization)
	// and when. A mapped verification_status wins; otherwise the point counts
	// as verified when the source provides a verifier or a verification date.
	const verifiedBy = toText(values["verified_by"]);
	const verifiedAt =
		toText(values["verified_at"]) ?? toText(values["last_verified_at"]);
	const verificationStatus =
		toText(values["verification_status"]) ??
		(verifiedBy !== null || verifiedAt !== null ? "verified" : "unverified");

	const attributes: Record<string, unknown> = {};
	for (const field of CANONICAL_FIELDS) {
		if (BASE_KEYS.has(field)) continue;
		const value = values[field];
		if (value === null || value === undefined) continue;
		attributes[field] =
			NUMBER_FIELDS.has(field)
				? toNumber(value)
				: BOOLEAN_FIELDS.has(field)
					? toBoolean(value)
					: DATE_FIELDS.has(field)
						? toText(value)
						: toText(value) ?? value;
	}
	if (name === null) {
		attributes["name_missing"] = true;
	}

	const record = parseCanonicalAedRecord({
		version: 1,
		record_id: `${config.source.id}:${sourceRecordId}`,
		source_id: config.source.id,
		source_record_id: sourceRecordId,
		source_url: sourceUrl,
		name,
		description: toText(values["description"]),
		note: toText(values["note"]),
		facility_type: toText(values["facility_type"]) ?? "unknown",
		device_type: toText(values["device_type"]) ?? "public_aed",
		access_type: toText(values["access_type"]) ?? "unknown",
		status: toText(values["status"]) ?? "unknown",
		verification_status: verificationStatus,
		verified_by: verifiedBy,
		verified_by_kind: toVerifierKind(values["verified_by_kind"]),
		verified_at: verifiedAt,
		confidence: toNumber(values["confidence"]) ?? 0.5,
		lat,
		lon,
		coord_precision_m: toNumber(values["coord_precision_m"]),
		location_status: locationStatus,
		geom_source: locationStatus === "point" ? "source" : "none",
		address_text: addressText,
		address_kind: inferAddressKind({
			...values,
			name,
		}),
		address_source: "source",
		address_confidence: null,
		geocode_provider: null,
		geocode_version: null,
		geocode_confidence: null,
		geocoded_at: null,
		geocode_input_sha256: null,
		geocode_note: null,
		claim_status: "unclaimed",
		claimed_by: null,
		claimed_at: null,
		claim_note: null,
		field_provenance: provenance,
		attributes,
	});

	return { index, record };
}

export function mapSourceRecords(
	config: SourceConfig,
	rows: RecordValue[],
): { mapped: MappedRecord[]; rejected: Array<{ index: number; error: string }> } {
	const mapped: MappedRecord[] = [];
	const rejected: Array<{ index: number; error: string }> = [];
	for (const [index, row] of rows.entries()) {
		try {
			mapped.push(mapSourceRecord(config, row, index));
		} catch (error) {
			rejected.push({
				error: error instanceof Error ? error.message : String(error),
				index,
			});
		}
	}
	return { mapped, rejected };
}

export function recordAttributes(record: CanonicalAedRecord): RecordValue {
	return asRecord(record.attributes);
}
