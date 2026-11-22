import {
	type CanonicalAedRecord,
	parseCanonicalAedRecord,
} from "../../src/server/ingest/canonical.ts";
import type { CanonicalField } from "../../src/server/ingest/config/schema.ts";
import { addUserAedDevice } from "../store/aed-store.ts";
import type { AedDevice } from "../store/schema.ts";

/**
 * Row-by-row manual entry ("manual" connector family).
 *
 * The form fills the full canonical field set from
 * `src/server/ingest/config/schema.ts` (CANONICAL_FIELDS). Values arrive as
 * strings/booleans from the form; this module coerces them with the same
 * field semantics as the ingest mapper (core/map.ts), builds a canonical
 * record and stores it with source_id "manual".
 *
 * Every manual record is signed by the authenticated account that submitted
 * it: `createdById` is taken from the session (never from the form), stored in
 * `created_by_id`, and copied to the verification fields. This is the only
 * path that can create verified records.
 *
 * Coordinates come either from the map picker / typed lat+lon
 * (location_status=point) or from address geocoding
 * (location_status=geocoded, see geocode.ts). Address-only submissions
 * without a point are rejected because the store requires lat/lon.
 */

export const MANUAL_SOURCE_ID = "manual";

const NUMBER_FIELDS = new Set<CanonicalField>([
	"coord_precision_m",
	"confidence",
	"address_confidence",
]);

const BOOLEAN_FIELDS = new Set<CanonicalField>([
	"indoor",
	"is_24_7",
	"requires_dispatcher",
	"fee",
	"wheelchair_access",
	"is_public",
]);

/** Fields the form never edits: identity, provenance and geocode bookkeeping. */
const SYSTEM_FIELDS = new Set<CanonicalField>([
	"public_code",
	"source_record_id",
	"source_url",
	"address_kind",
	"address_source",
	"address_confidence",
	"location_status",
	"geom_source",
	"verification_status",
	"verified_by",
	"verified_by_kind",
	"verified_at",
]);

export type ManualFormValues = Partial<
	Record<CanonicalField, string | boolean | null>
>;

export interface GeocodeInfo {
	provider: string;
	displayName: string;
	input: string;
	confidence: number | null;
}

export interface ManualFieldError {
	field: string;
	message: string;
}

export class ManualRecordError extends Error {
	readonly issues: readonly ManualFieldError[];

	constructor(issues: readonly ManualFieldError[]) {
		super(issues.map((issue) => `${issue.field}: ${issue.message}`).join("; "));
		this.name = "ManualRecordError";
		this.issues = issues;
	}
}

function text(value: string | boolean | null | undefined): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: string | null): number | null {
	if (value === null) {
		return null;
	}
	const parsed = Number.parseFloat(value.replace(",", "."));
	return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: string | boolean | null | undefined): boolean | null {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value !== "string") {
		return null;
	}
	const normalized = value.trim().toLowerCase();
	if (["true", "1", "tak", "yes"].includes(normalized)) {
		return true;
	}
	if (["false", "0", "nie", "no"].includes(normalized)) {
		return false;
	}
	return null;
}

export interface ManualRecordInput {
	values: ManualFormValues;
	/** Signed-in account id from the server session; never from the form. */
	createdById: string;
	/** Set when lat/lon were resolved from the address instead of picked. */
	geocode?: GeocodeInfo | null;
	/** Stable id for repeated submissions of the same device (upsert key). */
	recordKey?: string | null;
}

function sha256Hex(value: string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(value);
	return hasher.digest("hex");
}

/** Builds and validates the canonical record for a manual form submission. */
export function buildManualRecord(
	input: ManualRecordInput,
): CanonicalAedRecord {
	const { values, geocode } = input;
	const issues: ManualFieldError[] = [];

	const name = text(values.name);
	if (name === null) {
		issues.push({ field: "name", message: "Nazwa jest wymagana." });
	}

	const latRaw = text(values.lat);
	const lonRaw = text(values.lon);
	const lat = toNumber(latRaw);
	const lon = toNumber(lonRaw);
	if ((latRaw === null) !== (lonRaw === null)) {
		issues.push({
			field: "lat",
			message: "Podaj obie współrzędne albo żadną.",
		});
	}
	if (latRaw !== null && lat === null) {
		issues.push({ field: "lat", message: "Szerokość musi być liczbą." });
	}
	if (lonRaw !== null && lon === null) {
		issues.push({ field: "lon", message: "Długość musi być liczbą." });
	}
	if (lat !== null && (lat < -90 || lat > 90)) {
		issues.push({ field: "lat", message: "Szerokość poza zakresem -90..90." });
	}
	if (lon !== null && (lon < -180 || lon > 180)) {
		issues.push({ field: "lon", message: "Długość poza zakresem -180..180." });
	}

	const addressText = text(values.address_text);
	const hasPoint = lat !== null && lon !== null;
	if (!hasPoint) {
		issues.push({
			field: "lat",
			message:
				"Wybierz punkt na mapie, wpisz współrzędne albo wyznacz je z adresu.",
		});
	}
	if (input.createdById.trim() === "") {
		issues.push({
			field: "record",
			message: "Brak zalogowanego użytkownika.",
		});
	}

	for (const field of NUMBER_FIELDS) {
		if (SYSTEM_FIELDS.has(field)) {
			continue;
		}
		const raw = text(values[field]);
		if (raw !== null && toNumber(raw) === null) {
			issues.push({ field, message: "Wartość musi być liczbą." });
		}
	}

	if (issues.length > 0) {
		throw new ManualRecordError(issues);
	}

	const attributes: Record<string, unknown> = {};
	const provenance: Record<string, string> = {};
	const setBase = (field: CanonicalField, value: unknown): unknown => {
		if (value !== null && value !== undefined && value !== "") {
			provenance[field] = MANUAL_SOURCE_ID;
		}
		return value;
	};

	const base: Record<string, unknown> = {
		name: setBase("name", name),
		description: setBase("description", text(values.description)),
		note: setBase("note", text(values.note)),
		facility_type: setBase("facility_type", text(values.facility_type)),
		device_type: setBase("device_type", text(values.device_type)),
		access_type: setBase("access_type", text(values.access_type)),
		status: setBase("status", text(values.status)),
		confidence: setBase("confidence", toNumber(text(values.confidence))),
		coord_precision_m: setBase(
			"coord_precision_m",
			toNumber(text(values.coord_precision_m)),
		),
		address_text: setBase("address_text", addressText),
	};

	const baseKeys = new Set(Object.keys(base));
	for (const [field, raw] of Object.entries(values) as [
		CanonicalField,
		string | boolean | null,
	][]) {
		if (baseKeys.has(field) || SYSTEM_FIELDS.has(field)) {
			continue;
		}
		if (field === "lat" || field === "lon") {
			continue;
		}
		const value = BOOLEAN_FIELDS.has(field)
			? toBoolean(raw)
			: NUMBER_FIELDS.has(field)
				? toNumber(text(raw))
				: text(raw);
		if (value === null) {
			continue;
		}
		attributes[field] = value;
		provenance[field] = MANUAL_SOURCE_ID;
	}

	const recordKey =
		text(input.recordKey ?? null) ??
		sha256Hex(`${name ?? ""}|${lat}|${lon}|${addressText ?? ""}`).slice(0, 16);
	const isGeocoded = hasPoint && geocode !== null && geocode !== undefined;
	const createdAt = new Date().toISOString();

	try {
		return parseCanonicalAedRecord({
			version: 1,
			// Random id: the same device may be entered by different accounts and
			// duplicates are resolved later from the combined view.
			record_id: `user:${crypto.randomUUID()}`,
			source_id: MANUAL_SOURCE_ID,
			source_record_id: recordKey,
			source_url: null,
			...base,
			verification_status: "verified",
			verified_by: input.createdById,
			verified_by_kind: "person",
			verified_at: createdAt,
			lat,
			lon,
			location_status: isGeocoded ? "geocoded" : "point",
			// "survey": punkt wskazany ręcznie (mapa lub wpisane współrzędne);
			// "source" jest zarezerwowane dla geometrii ze źródła danych.
			geom_source: isGeocoded ? "geocode" : "survey",
			address_kind: addressText !== null ? "building" : "none",
			address_source: "source",
			address_confidence: null,
			geocode_provider: isGeocoded ? geocode.provider : null,
			geocode_version: null,
			geocode_confidence: isGeocoded ? geocode.confidence : null,
			geocoded_at: isGeocoded ? new Date().toISOString() : null,
			geocode_input_sha256: isGeocoded ? sha256Hex(geocode.input) : null,
			geocode_note: isGeocoded ? geocode.displayName : null,
			claim_status: "unclaimed",
			field_provenance: provenance,
			attributes,
		});
	} catch (error) {
		throw new ManualRecordError([
			{
				field: "record",
				message: error instanceof Error ? error.message : String(error),
			},
		]);
	}
}

/** Validates and stores one manual AED record; returns the stored row. */
export function saveManualRecord(input: ManualRecordInput): AedDevice {
	const record = buildManualRecord(input);
	return addUserAedDevice(record, input.createdById);
}
