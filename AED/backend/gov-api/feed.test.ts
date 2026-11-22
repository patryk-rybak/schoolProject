import { describe, expect, test } from "bun:test";

import { buildCsv } from "./csv";
import { buildFeed } from "./feed";
import { buildGeoJson } from "./geojson";
import type { FeedRecord } from "./types";
import { escapeXml } from "./xml";

const MD5_PATTERN = /^[0-9a-f]{32}$/u;

const records: readonly FeedRecord[] = [
	{
		id: "source:1",
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
	},
	{
		id: "source:2",
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
	},
];

const meta = {
	baseUrl: "https://aed.example.org",
	updatedAt: new Date("2026-11-21T06:00:00.000Z"),
	recordCount: records.length,
};

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: one suite groups the feed contract assertions.
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
			"id,name,lat,lon,city,access,status,verification_status,verified_by,verified_by_kind,verified_at",
		);
		expect(lines[1]).toContain('"AED — Dworzec & ""test"" <Centralny>"');
		expect(lines[2]).toContain("Kraków");
	});

	test("GeoJSON uses [longitude, latitude] coordinates", () => {
		const [warsaw] = records;
		if (!warsaw) {
			throw new Error("fixture is missing the first record");
		}

		const geojson = JSON.parse(buildGeoJson(records)) as {
			type: string;
			features: { geometry: { coordinates: [number, number] } }[];
		};

		expect(geojson.type).toBe("FeatureCollection");
		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.geometry.coordinates).toEqual([
			warsaw.lon,
			warsaw.lat,
		]);
	});
});
