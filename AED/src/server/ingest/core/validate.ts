import type { CanonicalAedRecord } from "../canonical";
import type { SourceConfig } from "../config/schema";

/**
 * Minimal per-source validation: required-field presence and lat/lon range
 * sanity only. Data quality, deduplication and publish gating happen later on
 * the aggregated common-schema dataframe, not here.
 */

export type ValidationAction = "accept" | "reject";

export type ValidationResult = {
	action: ValidationAction;
	record: CanonicalAedRecord;
	reason: string | null;
};

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

export function validateCanonicalRecord(
	config: SourceConfig,
	record: CanonicalAedRecord,
): ValidationResult {
	const validate = config.validate ?? {};

	const missing = (validate.required ?? []).filter((field) =>
		isMissing((record as unknown as Record<string, unknown>)[field]),
	);
	if (missing.length > 0) {
		return {
			action: "reject",
			reason: `wymagane pola: ${missing.join(", ")}`,
			record,
		};
	}

	const hasLat = record.lat !== null;
	const hasLon = record.lon !== null;
	if (hasLat !== hasLon) {
		return {
			action: "reject",
			reason: "lat i lon muszą występować razem (albo oba null).",
			record,
		};
	}
	if (hasLat && hasLon) {
		if (
			!Number.isFinite(record.lat) ||
			record.lat! < -90 ||
			record.lat! > 90 ||
			!Number.isFinite(record.lon) ||
			record.lon! < -180 ||
			record.lon! > 180
		) {
			return {
				action: "reject",
				reason: `współrzędne poza zakresem: ${record.lat},${record.lon}`,
				record,
			};
		}
		const bbox = validate.coords?.bbox;
		if (bbox !== undefined && outsideBbox(record, bbox)) {
			return {
				action: "reject",
				reason: `bbox: ${record.lat},${record.lon} poza ${bbox.join(",")}`,
				record,
			};
		}
	}

	return { action: "accept", reason: null, record };
}
