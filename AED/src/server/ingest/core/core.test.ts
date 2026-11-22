import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCanonicalAedRecord } from "../canonical";
import { getSourceConfig } from "../config/loader";
import { parseSourceConfig } from "../config/schema";
import { mapSourceRecord } from "./map";
import { parseRawSource } from "./parse";
import { RawSnapshotError, loadRawSnapshot } from "./raw";

function loadConfig(id: string) {
	const config = getSourceConfig(id);
	if (!config) {
		throw new Error(`Brak konfiguracji źródła ${id}.`);
	}
	return config;
}

describe("core parser and mapper", () => {
	test("parses Marki CSV and maps canonical record", () => {
		const config = loadConfig("marki");
		const csv = [
			"Nazwa,Lokalizacja,Adres,Numer Id,Długość geograficzna,Szerokość geograficzna",
			"AED,AED Marki Centrum,Rynek 1,1,21.12,52.30",
		].join("\n");
		const parsed = parseRawSource(config, csv);
		expect(parsed.records).toHaveLength(1);
		const { record } = mapSourceRecord(config, parsed.records[0]!, 0);
		expect(record.source_id).toBe("marki");
		// Slim config has no records.identity and marki does not map
		// source_record_id, so the row-index fallback applies.
		expect(record.source_record_id).toBe("marki:0");
		expect(record.record_id).toBe("marki:marki:0");
		expect(record.name).toBe("AED Marki Centrum");
		expect(record.lat).toBeCloseTo(21.12);
		expect(record.lon).toBeCloseTo(52.3);
		expect(record.location_status).toBe("point");
		expect(record.verification_status).toBe("verified");
		expect(parseCanonicalAedRecord(record)).toBeTruthy();
	});

	test("parses KML placemarks", () => {
		const config = parseSourceConfig({
			source: { id: "kml-demo", name: "KML demo AED" },
			connector: { family: "google_my_maps_kml", parser: "kml" },
			fetch: {
				url: "https://example.com/aed.kml",
				method: "GET",
				timeout_ms: 30000,
			},
			parse: { encoding: "utf-8", kml: { point_only: true } },
			records: { path: "//Placemark" },
			map: {
				name: { field: "name" },
				lat: {
					coord: {
						format: "kml",
						from: "coordinates",
						on_invalid: "reject",
						pick: "lat",
						precision_m: 15,
					},
				},
				lon: {
					coord: {
						format: "kml",
						from: "coordinates",
						on_invalid: "reject",
						pick: "lon",
						precision_m: 15,
					},
				},
			},
			validate: { required: ["lat", "lon"] },
		});
		const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<Placemark><name>AED 1</name><Point><coordinates>15.50,51.93,0</coordinates></Point></Placemark>
<Placemark><name>AED 2</name><Point><coordinates>15.51,51.94,0</coordinates></Point></Placemark>
</Document></kml>`;
		const parsed = parseRawSource(config, kml);
		expect(parsed.records).toHaveLength(2);
		expect(parsed.records[0]?.["lat"]).toBeCloseTo(51.93);
		expect(parsed.records[0]?.["lon"]).toBeCloseTo(15.5);
		expect(parsed.seen).toBe(2);
	});

	test("rejects raw snapshot with wrong sha256", () => {
		const dir = mkdtempSync(join(tmpdir(), "aed-core-"));
		writeFileSync(join(dir, "marki.csv"), "a,b\n1,2\n");
		writeFileSync(
			join(dir, "marki.meta.json"),
			JSON.stringify({ sha256: "deadbeef", bytes: 8 }),
		);
		expect(() => loadRawSnapshot(dir, loadConfig("marki"))).toThrow(
			RawSnapshotError,
		);
	});

	test("marks registry rows as verified by the public body", () => {
		const config = loadConfig("marki");
		const csv = [
			"Nazwa,Lokalizacja,Adres,Numer Id,Długość geograficzna,Szerokość geograficzna",
			"AED,AED Marki Centrum,Rynek 1,1,21.12,52.30",
		].join("\n");
		const parsed = parseRawSource(config, csv);
		const { record } = mapSourceRecord(config, parsed.records[0]!, 0);
		expect(record.verification_status).toBe("verified");
		expect(record.verified_by).toBe("Urząd Miasta Marki");
		expect(record.verified_by_kind).toBe("public_body");
		expect(record.verified_at).toBe("2025-07-10");
	});

	test("marks OSM rows with check_date as community-verified", () => {
		const config = loadConfig("openaedmap");
		const row = {
			"@osm_id": "node/1",
			check_date: "2024-03-01",
			operator: "PTTK",
			lat: 52.23,
			lon: 21.01,
		};
		const { record } = mapSourceRecord(config, row, 0);
		expect(record.verification_status).toBe("verified");
		expect(record.verified_by).toBe("PTTK");
		expect(record.verified_by_kind).toBe("community");
		expect(record.verified_at).toBe("2024-03-01");
	});

	test("leaves OSM rows without check_date unverified", () => {
		const config = loadConfig("openaedmap");
		const row = { "@osm_id": "node/2", lat: 52.23, lon: 21.01 };
		const { record } = mapSourceRecord(config, row, 0);
		expect(record.verification_status).toBe("unverified");
		expect(record.verified_by).toBeNull();
		expect(record.verified_at).toBeNull();
	});

	test("maps sqlite connection rows with null source_url fallback", () => {
		const config = parseSourceConfig({
			source: { id: "sqlite-demo", name: "SQLite demo AED" },
			connector: { family: "sqlite_db", parser: "json" },
			connection: {
				kind: "sqlite",
				path: ".data/aed.db",
				query: "SELECT * FROM aed",
			},
			parse: {},
			records: { path: "$" },
			map: {
				name: { field: "name" },
				lat: { field: "lat" },
				lon: { field: "lon" },
			},
			validate: {},
		});
		const parsed = parseRawSource(
			config,
			JSON.stringify([{ id: 7, lat: 52.2, lon: 21.0, name: "AED Rynek" }]),
		);
		expect(parsed.records).toHaveLength(1);
		const { record } = mapSourceRecord(config, parsed.records[0]!, 0);
		expect(record.source_id).toBe("sqlite-demo");
		expect(record.name).toBe("AED Rynek");
		expect(record.lat).toBeCloseTo(52.2);
		expect(record.lon).toBeCloseTo(21.0);
		// Connection sources have no fetch.url, so source_url falls back to null.
		expect(record.source_url).toBeNull();
		expect(parseCanonicalAedRecord(record)).toBeTruthy();
	});
});
