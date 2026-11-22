import { describe, expect, test } from "bun:test";
import { gzipSync } from "bun";

import { buildPointsGeoJson } from "./points";
import type { FeedRecord } from "./types";

const records: readonly FeedRecord[] = [
	{
		id: 1,
		sourceId: "krosno",
		name: 'AED — Dworzec & "test" <Centralny>',
		lat: 52.2285,
		lon: 21.0031,
		city: "Warszawa",
		address: "ul. Marszałkowska 10",
		description: "Na ścianie remizy strażackiej.",
		access: "always",
		status: "operational",
		verificationStatus: "verified",
		verifiedBy: "Urząd Miasta Stołecznego Warszawy",
		verifiedByKind: "public_body",
		verifiedAt: "2026-06-01",
		uuid: "2f8a6c34-3f2b-4b3e-9a11-7c9d1e0f4a55",
		createdAt: "2026-06-01T08:00:00.000Z",
		updatedAt: "2026-11-22T10:00:00.000Z",
		recordId: "krosno:abc",
		sourceRecordId: "krosno:12",
		sourceUrl: "https://example.org/wykaz",
		locationStatus: "point",
		geomSource: "source",
	},
	{
		id: 2,
		sourceId: "manual",
		name: "AED — Galeria Krakowska",
		lat: 50.0682,
		lon: 19.9476,
		city: null,
		access: "business_hours",
		status: "unknown",
		verificationStatus: "unverified",
		verifiedBy: null,
		verifiedByKind: null,
		verifiedAt: null,
		uuid: "bd40c1d9-a17a-4a74-9d9d-1c9d52a4c3b1",
		createdAt: "2026-06-02T08:00:00.000Z",
		updatedAt: "2026-06-03T08:00:00.000Z",
	},
];

interface PointFeature {
	readonly type: string;
	readonly geometry: {
		readonly type: string;
		readonly coordinates: readonly [number, number];
	};
	readonly properties: Record<string, unknown>;
}

describe("compact AED points", () => {
	test("returns one minimal point per record with [lon, lat] coordinates", () => {
		const payload = buildPointsGeoJson(records);
		const collection = JSON.parse(payload) as {
			type: string;
			features: PointFeature[];
		};

		expect(collection.type).toBe("FeatureCollection");
		expect(collection.features).toHaveLength(records.length);
		expect(collection.features[0]?.geometry).toEqual({
			type: "Point",
			coordinates: [21.0031, 52.2285],
		});
		expect(collection.features[0]?.properties).toEqual({
			id: 1,
			source_id: "krosno",
			name: 'AED — Dworzec & "test" <Centralny>',
			city: "Warszawa",
			address: "ul. Marszałkowska 10",
			description: "Na ścianie remizy strażackiej.",
			access: "always",
			status: "operational",
			verification_status: "verified",
			source_url: "https://example.org/wykaz",
		});
		expect(collection.features[1]?.properties).toEqual({
			id: 2,
			source_id: "manual",
			name: "AED — Galeria Krakowska",
			access: "business_hours",
			status: "unknown",
			verification_status: "unverified",
		});
	});

	test("payload is compact and omits verbose harvester fields", () => {
		const points = buildPointsGeoJson(records);
		const canonical = `${JSON.stringify(records)}\n`;

		expect(points).not.toContain("\n ");
		expect(points.length).toBeLessThan(canonical.length);
		expect(points).not.toContain("nazwa_obiektu");
		expect(points).not.toContain("szerokosc_geo");
		expect(points).not.toContain("verified_at");
		expect(points).not.toContain("obligation_tier");
		expect(
			gzipSync(new TextEncoder().encode(points)).byteLength,
		).toBeGreaterThan(0);
	});
});
