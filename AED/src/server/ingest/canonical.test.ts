import { describe, expect, test } from "bun:test";
import {
	type CanonicalAedRecordInput,
	canonicalAedRecordSchema,
	isMappable,
	parseCanonicalAedRecord,
} from "./canonical";

function pointRecord(): CanonicalAedRecordInput {
	return {
		version: 1,
		record_id: "openaedmap:node/123",
		source_id: "openaedmap",
		source_record_id: "node/123",
		source_url: "https://www.openstreetmap.org/node/123",
		name: "AED przy dworcu",
		description: null,
		note: null,
		facility_type: "station",
		device_type: "public_aed",
		access_type: "public",
		status: "unknown",
		verification_status: "unverified",
		confidence: 0.55,
		lat: 52.23,
		lon: 21.01,
		coord_precision_m: 15,
		location_status: "point",
		geom_source: "source",
		address_text: "ul. Przykładowa 1, Warszawa",
		address_kind: "building",
		address_source: "source",
		address_confidence: null,
		geocode_provider: null,
		geocode_version: null,
		geocode_confidence: null,
		geocoded_at: null,
		geocode_input_sha256: null,
		geocode_note: null,
	};
}

describe("canonical AED record", () => {
	test("accepts a source point", () => {
		const record = parseCanonicalAedRecord(pointRecord());
		expect(record.location_status).toBe("point");
		expect(record.address_kind).toBe("building");
		expect(record.claim_status).toBe("unclaimed");
		expect(isMappable(record)).toBe(true);
	});

	test("accepts an address-only record without coordinates", () => {
		const record = parseCanonicalAedRecord({
			...pointRecord(),
			lat: null,
			lon: null,
			coord_precision_m: null,
			location_status: "address_only",
			geom_source: "none",
			address_text: "ul. Przykładowa 1, Warszawa",
			address_kind: "building",
			address_source: "source",
		});
		expect(record.location_status).toBe("address_only");
		expect(isMappable(record)).toBe(false);
	});

	test("accepts a GUGiK UUG geocoded record", () => {
		const record = parseCanonicalAedRecord({
			...pointRecord(),
			location_status: "geocoded",
			geom_source: "geocode",
			geocode_provider: "gugik-uug",
			geocode_version: "uug-2026-11",
			geocode_confidence: 0.91,
			geocoded_at: "2026-11-21T20:00:00Z",
			geocode_input_sha256:
				"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		});
		expect(record.geocode_provider).toBe("gugik-uug");
		expect(isMappable(record)).toBe(true);
	});

	test("rejects address_only with a point", () => {
		const result = canonicalAedRecordSchema.safeParse({
			...pointRecord(),
			location_status: "address_only",
			geom_source: "none",
		});
		expect(result.success).toBe(false);
	});

	test("rejects point without lat/lon", () => {
		const result = canonicalAedRecordSchema.safeParse({
			...pointRecord(),
			lat: null,
		});
		expect(result.success).toBe(false);
	});

	test("rejects geocoded without provider", () => {
		const result = canonicalAedRecordSchema.safeParse({
			...pointRecord(),
			location_status: "geocoded",
			geom_source: "geocode",
		});
		expect(result.success).toBe(false);
	});

	test("rejects an invalid geocode hash", () => {
		const result = canonicalAedRecordSchema.safeParse({
			...pointRecord(),
			geocode_input_sha256: "not-a-sha256",
		});
		expect(result.success).toBe(false);
	});
});
