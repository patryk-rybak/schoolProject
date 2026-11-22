import { describe, expect, test } from "bun:test";

import { read, utils } from "xlsx";

import { buildCsv } from "./csv";
import { buildFeed } from "./feed";
import { buildGeoJson } from "./geojson";
import type { FeedRecord } from "./types";
import { buildXlsx } from "./xlsx";
import { escapeXml } from "./xml";

const MD5_PATTERN = /^[0-9a-f]{32}$/u;

const records: readonly FeedRecord[] = [
	{
		id: 1,
		sourceId: "krosno",
		name: 'AED — Dworzec & "test" <Centralny>',
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

const meta = {
	baseUrl: "https://aed.example.org",
	updatedAt: new Date("2026-11-21T06:00:00.000Z"),
	recordCount: records.length,
};

describe("dane.gov.pl feed", () => {
	test("uses the 1.13 namespace and stable identifiers", () => {
		const { xml } = buildFeed(records, meta);

		expect(xml).toContain('xmlns:ns2="urn:otwarte-dane:harvester:1.13"');
		expect(xml).toContain("<extIdent>aed-pl-open</extIdent>");
		expect(xml).toContain("<extIdent>aed-pl-open-csv</extIdent>");
		expect(xml).toContain("<extIdent>aed-pl-open-geojson</extIdent>");
	});

	test("links both resources over https and asks for local mirroring", () => {
		const { xml } = buildFeed(records, meta);

		expect(xml).toContain("<url>https://aed.example.org/data/aed.csv</url>");
		expect(xml).toContain(
			"<url>https://aed.example.org/data/aed.geojson</url>",
		);
		expect(xml.match(/<availability>local<\/availability>/gu)).toHaveLength(2);
	});

	test("md5 matches the exact bytes of the xml", () => {
		const artifact = buildFeed(records, meta);
		const expected = new Bun.CryptoHasher("md5")
			.update(artifact.xml)
			.digest("hex");

		expect(artifact.md5).toBe(expected);
		expect(artifact.md5).toMatch(MD5_PATTERN);
	});

	test("escapes XML special characters", () => {
		expect(escapeXml("a & b < c > d \"e\" 'f'")).toBe(
			"a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;",
		);
	});

	test("validates against the official dane.gov.pl XSD", async () => {
		const xmllint = Bun.which("xmllint");
		if (!xmllint) {
			Bun.stdout.write(
				"xmllint not found — skipping XSD validation (install libxml2-utils)\n",
			);
			return;
		}

		const artifact = buildFeed(records, meta);
		// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
		const xmlPath = `${Bun.env["TMPDIR"] ?? "/tmp"}/aed-feed-${crypto.randomUUID()}.xml`;
		const xsdPath = new URL(
			"./xsd/xml_import_otwarte_dane_1_13.xsd",
			import.meta.url,
		).pathname;

		await Bun.write(xmlPath, artifact.xml);
		const result = Bun.spawnSync([
			xmllint,
			"--noout",
			"--schema",
			xsdPath,
			xmlPath,
		]);
		Bun.spawnSync(["rm", "-f", xmlPath]);

		expect(result.stderr.toString()).not.toContain("fails to validate");
		expect(result.exitCode).toBe(0);
	});
});

describe("published resources", () => {
	test("CSV has the documented header and RFC 4180 quoting", () => {
		const csv = buildCsv(records);
		const lines = csv.trimEnd().split("\n");

		expect(lines[0]).toBe(
			"id,nazwa_obiektu,szerokosc_geo,dlugosc_geo,miejscowosc,typ_dostepnosci,status_sprawnosci,status_weryfikacji,zweryfikowane_przez,typ_weryfikatora,data_weryfikacji,identyfikator_kanoniczny,zrodlo_danych,identyfikator_w_zrodle,url_zrodla,status_lokalizacji,zrodlo_geometrii,data_utworzenia,data_aktualizacji",
		);
		expect(lines[1]).toContain('"AED — Dworzec & ""test"" <Centralny>"');
		expect(lines[1]).toContain(records[0]?.uuid ?? "");
		expect(lines[1]).toContain(
			"52.2285,21.0031,Warszawa,always,operational,verified",
		);
		expect(lines[1]).toContain(
			"krosno:abc,krosno,krosno:12,https://example.org/wykaz,point,source",
		);
		expect(lines[1]).toContain(
			"2026-06-01T08:00:00.000Z,2026-11-22T10:00:00.000Z",
		);
		expect(lines[2]).toContain("Kraków");
	});

	test("GeoJSON uses [longitude, latitude] coordinates", () => {
		const [warsaw] = records;
		if (!warsaw) {
			throw new Error("fixture is missing the first record");
		}

		const geojson = JSON.parse(buildGeoJson(records)) as {
			type: string;
			features: {
				geometry: { coordinates: [number, number] };
				properties: Record<string, unknown>;
			}[];
		};

		expect(geojson.type).toBe("FeatureCollection");
		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.geometry.coordinates).toEqual([
			warsaw.lon,
			warsaw.lat,
		]);
		expect(geojson.features[0]?.properties).toMatchObject({
			id: warsaw.uuid,
			nazwa_obiektu: warsaw.name,
			szerokosc_geo: warsaw.lat,
			dlugosc_geo: warsaw.lon,
			miejscowosc: warsaw.city,
			typ_dostepnosci: warsaw.access,
			status_sprawnosci: warsaw.status,
			status_weryfikacji: warsaw.verificationStatus,
			zweryfikowane_przez: warsaw.verifiedBy,
			typ_weryfikatora: warsaw.verifiedByKind,
			data_weryfikacji: warsaw.verifiedAt,
			identyfikator_kanoniczny: warsaw.recordId,
			zrodlo_danych: warsaw.sourceId,
			identyfikator_w_zrodle: warsaw.sourceRecordId,
			url_zrodla: warsaw.sourceUrl,
			status_lokalizacji: warsaw.locationStatus,
			zrodlo_geometrii: warsaw.geomSource,
			data_utworzenia: warsaw.createdAt,
			data_aktualizacji: warsaw.updatedAt,
		});
		expect(geojson.features[0]?.properties).not.toHaveProperty("id_uuid");
		expect(geojson.features[0]?.properties).not.toHaveProperty("name");
		expect(geojson.features[0]?.properties).not.toHaveProperty("lat");
		expect(geojson.features[0]?.properties).not.toHaveProperty("lon");
		expect(geojson.features[0]?.properties).not.toHaveProperty("city");
		expect(geojson.features[0]?.properties).not.toHaveProperty("access");
		expect(geojson.features[0]?.properties).not.toHaveProperty(
			"verification_status",
		);
	});

	test("XLSX uses the same canonical and Polish columns as CSV", () => {
		const workbook = read(buildXlsx(records), { type: "array" });
		// biome-ignore lint/complexity/useLiteralKeys: XLSX workbook sheets come from an index signature.
		const sheet = workbook.Sheets["AED"];
		if (!sheet) {
			throw new Error("XLSX workbook is missing the AED sheet");
		}
		const [header] = utils.sheet_to_json<string[]>(sheet, { header: 1 });

		expect(header).toEqual([
			"id",
			"nazwa_obiektu",
			"szerokosc_geo",
			"dlugosc_geo",
			"miejscowosc",
			"typ_dostepnosci",
			"status_sprawnosci",
			"status_weryfikacji",
			"zweryfikowane_przez",
			"typ_weryfikatora",
			"data_weryfikacji",
			"identyfikator_kanoniczny",
			"zrodlo_danych",
			"identyfikator_w_zrodle",
			"url_zrodla",
			"status_lokalizacji",
			"zrodlo_geometrii",
			"data_utworzenia",
			"data_aktualizacji",
		]);
	});
});
