import { describe, expect, test } from "bun:test";
import { canonicalToRow } from "../store/aed-store.ts";
import { geocodeAddress, reverseGeocode } from "./geocode.ts";
import {
	buildManualRecord,
	MANUAL_SOURCE_ID,
	ManualRecordError,
} from "./manual-record.ts";

const TEST_LAT = 52.2297;
const TEST_LON = 21.0122;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const baseValues = {
	name: "AED Dworzec Główny",
	lat: String(TEST_LAT),
	lon: String(TEST_LON),
	address_text: "Al. Jerozolimskie 54, Warszawa",
	city: "Warszawa",
	street: "Aleje Jerozolimskie",
	house_number: "54",
	access_type: "always",
	status: "operational",
	is_24_7: true,
	indoor: "tak",
	opening_hours: "24/7",
};

describe("buildManualRecord", () => {
	test("buduje rekord kanoniczny z punktem", () => {
		const record = buildManualRecord({ values: baseValues });
		expect(record.source_id).toBe(MANUAL_SOURCE_ID);
		expect(record.location_status).toBe("point");
		expect(record.geom_source).toBe("survey");
		expect(record.lat).toBeCloseTo(TEST_LAT);
		expect(record.lon).toBeCloseTo(TEST_LON);
		// biome-ignore lint/complexity/useLiteralKeys: attributes use an index signature.
		expect(record.attributes?.["city"]).toBe("Warszawa");
		// biome-ignore lint/complexity/useLiteralKeys: attributes use an index signature.
		expect(record.attributes?.["is_24_7"]).toBe(true);
		// biome-ignore lint/complexity/useLiteralKeys: attributes use an index signature.
		expect(record.attributes?.["indoor"]).toBe(true);
		// biome-ignore lint/complexity/useLiteralKeys: provenance uses an index signature.
		expect(record.field_provenance?.["name"]).toBe(MANUAL_SOURCE_ID);
	});

	test("oznacza rekord geokodowany metadanymi", () => {
		const record = buildManualRecord({
			values: baseValues,
			geocode: {
				provider: "nominatim",
				displayName: "Dworzec Centralny, Warszawa",
				input: "Al. Jerozolimskie 54, Warszawa",
				confidence: 0.9,
			},
		});
		expect(record.location_status).toBe("geocoded");
		expect(record.geom_source).toBe("geocode");
		expect(record.geocode_provider).toBe("nominatim");
		expect(record.geocode_input_sha256).toMatch(SHA256_PATTERN);
	});

	test("odrzuca brak nazwy i punktu", () => {
		expect(() =>
			buildManualRecord({ values: { address_text: "Warszawa" } }),
		).toThrow(ManualRecordError);
		try {
			buildManualRecord({ values: { address_text: "Warszawa" } });
		} catch (error) {
			const { issues } = error as ManualRecordError;
			expect(issues.map((issue) => issue.field)).toContain("name");
			expect(issues.map((issue) => issue.field)).toContain("lat");
		}
	});

	test("odrzuca współrzędne poza zakresem i samotną oś", () => {
		expect(() =>
			buildManualRecord({ values: { ...baseValues, lat: "95" } }),
		).toThrow(ManualRecordError);
		expect(() =>
			buildManualRecord({ values: { ...baseValues, lon: "" } }),
		).toThrow(ManualRecordError);
	});

	test("wymaga typu dostępu i domyślnie oznacza pola opcjonalne", () => {
		try {
			buildManualRecord({
				values: { name: "AED", lat: String(TEST_LAT), lon: String(TEST_LON) },
			});
			expect.unreachable();
		} catch (error) {
			const { issues } = error as ManualRecordError;
			expect(issues.map((issue) => issue.field)).toContain("access_type");
		}
		const record = buildManualRecord({
			values: {
				name: "AED",
				lat: String(TEST_LAT),
				lon: String(TEST_LON),
				access_type: "always",
			},
		});
		expect(record.status).toBe("unknown");
		expect(record.verification_status).toBe("unverified");
	});

	test("canonicalToRow zachowuje pełny rekord JSON", () => {
		const record = buildManualRecord({ values: baseValues });
		const row = canonicalToRow(record);
		expect(row.source).toBe(MANUAL_SOURCE_ID);
		expect(row.city).toBe("Warszawa");
		expect(row.address).toBe("Al. Jerozolimskie 54, Warszawa");
		expect(JSON.parse(row.canonical ?? "{}")).toMatchObject({
			record_id: record.record_id,
			version: 1,
		});
	});
});

describe("geocodeAddress", () => {
	test("mapuje odpowiedzi Nominatim na kandydatów", async () => {
		const result = await geocodeAddress("Al. Jerozolimskie 54, Warszawa", {
			fetchImpl: async () =>
				new Response(
					JSON.stringify([
						{
							lat: "52.228",
							lon: "21.003",
							display_name: "Dworzec Centralny, Warszawa",
							place_rank: 30,
						},
					]),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
		});
		expect(result.provider).toBe("nominatim");
		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0]?.lat).toBeCloseTo(52.228);
		expect(result.candidates[0]?.confidence).toBeGreaterThan(0.8);
	});

	test("zgłasza błąd HTTP po polsku", async () => {
		await expect(
			geocodeAddress("Warszawa", {
				fetchImpl: async () => new Response("no", { status: 429 }),
			}),
		).rejects.toThrow("HTTP 429");
	});
});

describe("reverseGeocode", () => {
	test("mapuje dane administracyjne z Nominatim", async () => {
		const result = await reverseGeocode(TEST_LAT, TEST_LON, {
			fetchImpl: async () =>
				new Response(
					JSON.stringify({
						address: {
							postcode: "00-024",
							state: "mazowieckie",
							county: "Warszawa",
							city: "Warszawa",
							road: "Aleje Jerozolimskie",
							house_number: "54",
						},
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
		});
		expect(result.provider).toBe("nominatim");
		expect(result.parts.postcode).toBe("00-024");
		expect(result.parts.voivodeship).toBe("mazowieckie");
		expect(result.parts.houseNumber).toBe("54");
	});
});
