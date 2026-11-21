import { z } from "zod";

/**
 * Canonical AED record shared by every source, regardless of whether the
 * source publishes a point, an address, or only an object name.
 *
 * The config `map` section produces these fields. A source connector must not
 * invent a second record shape: address-only rows are first-class canonical
 * records with `lat`/`lon` set to null and `location_status=address_only`.
 */

export const LOCATION_STATUSES = [
	"point",
	"geocoded",
	"address_only",
	"unresolved",
	"conflict",
] as const;

export const GEOM_SOURCES = [
	"source",
	"geocode",
	"registry",
	"survey",
	"derived",
	"none",
] as const;

export const ADDRESS_KINDS = [
	"building",
	"street",
	"locality",
	"object_only",
	"none",
] as const;

export const ADDRESS_SOURCES = [
	"source",
	"registry",
	"geocode",
	"derived",
] as const;

export const PUBLISH_STATES = ["published", "quarantined", "archived"] as const;

export type LocationStatus = (typeof LOCATION_STATUSES)[number];
export type GeomSource = (typeof GEOM_SOURCES)[number];
export type AddressKind = (typeof ADDRESS_KINDS)[number];
export type AddressSource = (typeof ADDRESS_SOURCES)[number];
export type PublishState = (typeof PUBLISH_STATES)[number];

const nullableText = z.string().nullable();
const nullableConfidence = z.number().min(0).max(1).nullable();

export const canonicalAedRecordSchema = z
	.strictObject({
		version: z.literal(1),
		record_id: z.string().min(1),
		source_id: z.string().min(1),
		source_record_id: z.string().min(1),
		source_url: z.url().nullable(),
		name: z.string().min(1).nullable(),
		description: nullableText,
		note: nullableText,
		facility_type: nullableText,
		device_type: nullableText,
		access_type: nullableText,
		status: nullableText,
		verification_status: nullableText,
		confidence: nullableConfidence,
		lat: z.number().min(-90).max(90).nullable(),
		lon: z.number().min(-180).max(180).nullable(),
		coord_precision_m: z.number().min(0).nullable(),
		location_status: z.enum(LOCATION_STATUSES),
		geom_source: z.enum(GEOM_SOURCES),
		address_text: nullableText,
		address_kind: z.enum(ADDRESS_KINDS).default("none"),
		address_source: z.enum(ADDRESS_SOURCES).default("source"),
		address_confidence: nullableConfidence,
		geocode_provider: nullableText,
		geocode_version: nullableText,
		geocode_confidence: nullableConfidence,
		geocoded_at: nullableText,
		geocode_input_sha256: z
			.string()
			.regex(/^[0-9a-f]{64}$/)
			.nullable(),
		geocode_note: nullableText,
		publish_state: z.enum(PUBLISH_STATES).default("quarantined"),
		field_provenance: z.record(z.string(), z.string()).optional(),
	})
	.superRefine((record, ctx) => {
		const hasPoint = record.lat !== null && record.lon !== null;
		if (
			(record.location_status === "point" ||
				record.location_status === "geocoded") &&
			!hasPoint
		) {
			ctx.addIssue({
				code: "custom",
				path: ["lat"],
				message:
					"location_status=point/geocoded wymaga jednocześnie lat i lon.",
			});
		}
		if (
			(record.location_status === "address_only" ||
				record.location_status === "unresolved" ||
				record.location_status === "conflict") &&
			hasPoint
		) {
			ctx.addIssue({
				code: "custom",
				path: ["location_status"],
				message:
					"location_status=address_only/unresolved/conflict nie może mieć punktu; użyj point/geocoded albo wyczyść lat/lon.",
			});
		}
		if (record.location_status === "address_only" && !record.address_text) {
			ctx.addIssue({
				code: "custom",
				path: ["address_text"],
				message: "location_status=address_only wymaga address_text.",
			});
		}
		if (
			record.geom_source === "geocode" &&
			record.location_status !== "geocoded"
		) {
			ctx.addIssue({
				code: "custom",
				path: ["geom_source"],
				message: "geom_source=geocode wymaga location_status=geocoded.",
			});
		}
		if (record.location_status === "geocoded" && !record.geocode_provider) {
			ctx.addIssue({
				code: "custom",
				path: ["geocode_provider"],
				message: "location_status=geocoded wymaga geocode_provider.",
			});
		}
	});

export type CanonicalAedRecord = z.output<typeof canonicalAedRecordSchema>;
export type CanonicalAedRecordInput = z.input<typeof canonicalAedRecordSchema>;

export function parseCanonicalAedRecord(input: unknown): CanonicalAedRecord {
	return canonicalAedRecordSchema.parse(input);
}

export function isMappable(record: CanonicalAedRecord): boolean {
	return (
		(record.location_status === "point" ||
			record.location_status === "geocoded") &&
		record.lat !== null &&
		record.lon !== null
	);
}
