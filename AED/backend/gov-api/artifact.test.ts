import { describe, expect, test } from "bun:test";
import { gunzipSync } from "bun";
import { read, utils } from "xlsx";

import { buildGeoJson } from "./geojson";
import type { FeedRecord } from "./types";
import { buildXlsx } from "./xlsx";

const artifactSource = await Bun.file(
	new URL("./artifact.ts", import.meta.url),
).text();

const records: readonly FeedRecord[] = [
	{
		id: 1,
		sourceId: "krosno",
		name: 'AED — Obiekt & "test" <publiczny>',
		lat: 52.2285,
		lon: 21.0031,
		city: "Warszawa",
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
		city: "Kraków",
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

describe("export artifacts", () => {
	test("GeoJSON is compact and has no obligation tier field", () => {
		const geojson = buildGeoJson(records);
		const firstLine = geojson.split("\n", 1)[0] ?? "";

		expect(geojson.endsWith("\n")).toBe(true);
		expect(firstLine.length).toBeGreaterThan(100);
		expect(geojson).not.toContain("obligation_tier");
		expect(geojson).not.toContain("rekomendacja");
	});

	test("gzip round-trips the exact GeoJSON payload", () => {
		const body = buildGeoJson(records);
		const zipped = Bun.gzipSync(new TextEncoder().encode(body));

		expect(new TextDecoder().decode(gunzipSync(zipped))).toBe(body);
		expect(zipped.byteLength).toBeLessThan(
			new TextEncoder().encode(body).byteLength,
		);
	});

	test("XLSX workbook contains one row per record", () => {
		const workbook = read(buildXlsx(records), { type: "array" });
		const sheetKey = "AED";
		const sheet = workbook.Sheets[sheetKey];
		if (!sheet) {
			throw new Error("XLSX workbook is missing the AED sheet");
		}
		const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

		expect(rows).toHaveLength(records.length + 1);
		expect(rows[1]).toContain(records[0]?.id);
		expect(rows[2]).toContain(records[1]?.uuid);
	});

	test("XLSX bytes produce a non-empty HTTP Response", async () => {
		const bytes = new Uint8Array(buildXlsx(records));
		const response = new Response(bytes.buffer as ArrayBuffer);

		expect((await response.arrayBuffer()).byteLength).toBe(bytes.byteLength);
		expect(bytes.byteLength).toBeGreaterThan(0);
	});
});

describe("published row filtering", () => {
	test("exports filter to geolocated point/geocoded rows", () => {
		expect(artifactSource).toContain("PUBLISHED_LOCATION_STATUSES");
		expect(artifactSource).toContain('["point", "geocoded"] as const');
		expect(artifactSource).toMatch(
			/function isPublishedRow[\s\S]*?row\.lat !== null[\s\S]*?row\.lon !== null[\s\S]*?PUBLISHED_LOCATION_STATUSES\.some/u,
		);
		expect(artifactSource).toMatch(
			/listCombinedAedDevices\(\)\.filter\(isPublishedRow\)/u,
		);
	});

	test("published GeoJSON rows expose location_status and geom_source", () => {
		const [published] = records;
		if (!published) {
			throw new Error("fixture is missing the published record");
		}
		const collection = JSON.parse(buildGeoJson([published])) as {
			features: { properties: Record<string, unknown> }[];
		};

		expect(collection.features[0]?.properties["location_status"]).toBe(
			published.locationStatus,
		);
		expect(collection.features[0]?.properties["geom_source"]).toBe(
			published.geomSource,
		);
	});
});
