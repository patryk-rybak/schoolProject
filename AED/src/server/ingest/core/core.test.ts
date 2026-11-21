import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCanonicalAedRecord } from "../canonical";
import { sourceConfigSchema } from "../config/schema";
import { mapSourceRecord } from "./map";
import { parseRawSource } from "./parse";
import { RawSnapshotError, loadRawSnapshot } from "./raw";

function loadConfig(id: string) {
	const raw = JSON.parse(
		readFileSync(
			join(process.cwd(), "backend/ingest/sources", `${id}.json`),
			"utf8",
		),
	) as unknown;
	return sourceConfigSchema.parse(raw);
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
		expect(record.source_record_id).toBe("marki:1");
		expect(record.record_id).toBe("marki:marki:1");
		expect(record.name).toBe("AED Marki Centrum");
		expect(record.lat).toBeCloseTo(21.12);
		expect(record.lon).toBeCloseTo(52.3);
		expect(record.location_status).toBe("point");
		expect(record.publish_state).toBe("published");
		expect(record.verification_status).toBe("unverified");
		expect(parseCanonicalAedRecord(record)).toBeTruthy();
	});

	test("parses KML placemarks", () => {
		const config = loadConfig("zielona-gora");
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
});
