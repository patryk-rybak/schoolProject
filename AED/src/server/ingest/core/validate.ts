import type { CanonicalAedRecord } from "../canonical";
import type { SourceConfig } from "../config/schema";

export type ValidationAction = "accept" | "quarantine" | "reject";

export type ValidationResult = {
	action: ValidationAction;
	record: CanonicalAedRecord;
	reason: string | null;
};

function withAttributes(
	record: CanonicalAedRecord,
	patch: Record<string, unknown>,
): void {
	record.attributes = {
		...(record.attributes ?? {}),
		...patch,
	};
}

function isMissing(value: unknown): boolean {
	return (
		value === null ||
		value === undefined ||
		(typeof value === "string" && value.trim().length === 0)
	);
}

function outsideBbox(
	record: CanonicalAedRecord,
	bbox: [number, number, number, number],
): boolean {
	if (record.lat === null || record.lon === null) return false;
	const [minLon, minLat, maxLon, maxLat] = bbox;
	return (
		record.lon < minLon ||
		record.lon > maxLon ||
		record.lat < minLat ||
		record.lat > maxLat
	);
}

function quarantine(
	record: CanonicalAedRecord,
	reason: string,
	locationStatus: CanonicalAedRecord["location_status"] = "conflict",
): ValidationResult {
	record.publish_state = "quarantined";
	record.location_status = locationStatus;
	record.geom_source = "none";
	record.lat = null;
	record.lon = null;
	if (record.field_provenance !== undefined) {
		delete record.field_provenance["lat"];
		delete record.field_provenance["lon"];
	}
	withAttributes(record, {
		validation_error: reason,
		validation_action: "quarantine",
	});
	return { action: "quarantine", reason, record };
}

export function validateCanonicalRecord(
	config: SourceConfig,
	record: CanonicalAedRecord,
): ValidationResult {
	const validate = config.validate;

	if (
		validate.coords?.bbox !== undefined &&
		record.lat !== null &&
		record.lon !== null &&
		outsideBbox(record, validate.coords.bbox)
	) {
		const reason = `bbox: ${record.lat},${record.lon} poza ${validate.coords.bbox.join(",")}`;
		const action = validate.coords.on_invalid ?? validate.on_error ?? "review";
		if (action === "reject") {
			return { action: "reject", reason, record };
		}
		const sourceLat = record.lat;
		const sourceLon = record.lon;
		const result =
			action === "null"
				? quarantine(
						record,
						reason,
						record.address_text !== null ? "address_only" : "unresolved",
					)
				: quarantine(record, reason, "conflict");
		withAttributes(result.record, {
			source_lat: sourceLat,
			source_lon: sourceLon,
		});
		return result;
	}

	const missing = (validate.required ?? []).filter((field) =>
		isMissing((record as Record<string, unknown>)[field]),
	);
	if (missing.length > 0) {
		const reason = `wymagane pola: ${missing.join(", ")}`;
		if ((validate.on_error ?? "review") === "reject") {
			return { action: "reject", reason, record };
		}
		return quarantine(record, reason, record.address_text ? "address_only" : "unresolved");
	}

	const requireLocation = validate.require_location;
	if (requireLocation !== undefined && requireLocation !== "none") {
		const hasPoint =
			(record.location_status === "point" ||
				record.location_status === "geocoded") &&
			record.lat !== null &&
			record.lon !== null;
		const hasAddress = record.address_text !== null;
		const ok =
			requireLocation === "point"
				? hasPoint
				: requireLocation === "address"
					? hasAddress
					: hasPoint || hasAddress;
		if (!ok) {
			const reason = `wymagana lokalizacja: ${requireLocation}`;
			if ((validate.on_error ?? "review") === "reject") {
				return { action: "reject", reason, record };
			}
			return quarantine(record, reason, hasAddress ? "address_only" : "unresolved");
		}
	}

	return { action: "accept", reason: null, record };
}
