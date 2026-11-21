import { describe, expect, test } from "bun:test";
import {
	decodeHtmlEntities,
	decodeText,
	evaluateCoordinate,
	evaluateExpression,
	flattenGeoJsonFeature,
	parseCsv,
	parseHtmlList,
	parseHtmlTables,
	parseKml,
	readField,
	resolveJsonPath,
} from "./parsers";

describe("csv parser", () => {
	test("repairs Marki double-quoted rows", () => {
		const source = [
			'"Długość geograficzna,Szerokość geograficzna, Nazwa, Lokalizacja, Adres, Numer Id"',
			'"52.326697, 21.107557,""Defibrylator"",""Urząd Miasta Marki "",""Al. Piłsudskiego 95, 05-270 Marki"",""1"""',
			'"21.720344,49.718809,""Defibrylator"",""Szkoła Podstawowa nr 5 "",""ul. Wesoła 5, 05-270 Marki"",""7"""',
		].join("\r\n");
		const result = parseCsv(source, {
			emptyAsNull: true,
			repairDoubleQuotes: true,
			trimHeaders: true,
			unwrapOuterQuotes: true,
		});
		expect(result.headers).toEqual([
			"Długość geograficzna",
			"Szerokość geograficzna",
			"Nazwa",
			"Lokalizacja",
			"Adres",
			"Numer Id",
		]);
		expect(result.rows).toHaveLength(2);
		expect(result.records[1]?.["Numer Id"]).toBe("7");
		expect(result.records[0]?.["Lokalizacja"]).toBe("Urząd Miasta Marki");
	});

	test("strips BOM and header padding", () => {
		const source =
			"\uFEFFDługość geograficzna, Szerokość geograficzna, Nazwa\r\n21.7,49.7,Defibrylator\r\n";
		const result = parseCsv(source, { trimHeaders: true });
		expect(result.headers).toEqual([
			"Długość geograficzna",
			"Szerokość geograficzna",
			"Nazwa",
		]);
		expect(result.records).toHaveLength(1);
		expect(result.records[0]?.["Nazwa"]).toBe("Defibrylator");
	});

	test("decodes utf-8-sig bytes regardless of BOM presence", () => {
		const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62]);
		expect(decodeText(bytes, "utf-8-sig")).toBe("a,b");
	});
});

describe("html table parser", () => {
	const html = `
		<html><body>
		<table class="contact"><tr><td>Telefon</td><td>123</td></tr></table>
		<table id="aed">
			<tr><th>Lp.</th><th>Nazwa</th><th>Adres</th></tr>
			<tr><td>1</td><td>AED Rynek</td><td>Rynek 1</td></tr>
			<tr><td>2</td><td>AED Szkoła</td><td>Szkolna 2</td></tr>
		</table>
		</body></html>`;

	test("selects by id and counts data rows after the header", () => {
		const result = parseHtmlTables(html, { select: "table#aed" });
		expect(result.tableCount).toBe(1);
		expect(result.headers).toEqual(["Lp.", "Nazwa", "Adres"]);
		expect(result.records).toHaveLength(2);
		expect(result.records[0]?.["Nazwa"]).toBe("AED Rynek");
	});

	test("table_index picks the configured table", () => {
		const result = parseHtmlTables(html, { tableIndex: 1 });
		expect(result.tableCount).toBe(2);
		expect(result.records).toHaveLength(2);
	});

	test("require_headers filters non-AED tables", () => {
		const result = parseHtmlTables(html, {
			requireHeaders: ["Nazwa", "Adres"],
			tableIndex: 0,
		});
		expect(result.matchedTables).toBe(0);
		expect(result.records).toHaveLength(0);
	});

	test("key_value orientation builds one record per table", () => {
		const table = `<table>
			<tr><td>Nazwa</td><td>Remiza OSP</td></tr>
			<tr><td>Adres</td><td>Strażacka 1</td></tr>
		</table>`;
		const result = parseHtmlTables(table, {
			orientation: "key_value",
			requireKeys: ["Nazwa", "Adres"],
		});
		expect(result.records).toHaveLength(1);
		expect(result.records[0]?.["Nazwa"]).toBe("Remiza OSP");
		expect(result.records[0]?.["Adres"]).toBe("Strażacka 1");
	});

	test("decodes entities and NBSP in cells", () => {
		const table = `<table><tr><th>Nazwa</th></tr><tr><td>A&amp;B&nbsp;Sp. z o.o.</td></tr></table>`;
		const result = parseHtmlTables(table);
		expect(result.records[0]?.["Nazwa"]).toBe("A&B Sp. z o.o.");
		expect(decodeHtmlEntities("&#261;")).toBe("ą");
	});
});

describe("kml parser", () => {
	const kml = `<?xml version="1.0" encoding="UTF-8"?>
	<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
		<name>Mapa AED</name>
		<Placemark><name>Rynek</name><Point><coordinates>19.94,49.62,0</coordinates></Point></Placemark>
		<Placemark><name>Szkoła</name><Point><coordinates>19.95,49.63</coordinates></Point></Placemark>
		<Placemark><name>Osiedle</name><Polygon><outerBoundaryIs><LinearRing><coordinates>19.9,49.6 19.91,49.6 19.91,49.61</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
		<Placemark><name>Bez geometrii</name></Placemark>
	</Document></kml>`;

	test("counts geometry types and reads lon,lat pairs", () => {
		const result = parseKml(kml);
		expect(result.documentName).toBe("Mapa AED");
		expect(result.placemarks).toHaveLength(4);
		expect(result.pointCount).toBe(2);
		expect(result.polygonCount).toBe(1);
		expect(result.pointlessCount).toBe(1);
		expect(result.placemarks[0]?.coordinates[0]).toEqual([19.94, 49.62]);
		expect(result.placemarks[0]?.name).toBe("Rynek");
	});
});

describe("html list parser", () => {
	const html = `
		<div id="jm-maincontent">
			<div class="article"><p>Nagłówek</p></div>
			<div class="article"><ul class="wp-block-list">
				<li>Gminny Ośrodek – Rynek 1</li>
				<li>Biblioteka – Szkolna 2</li>
			</ul></div>
		</div>`;

	test("supports descendant selectors and record filter", () => {
		const result = parseHtmlList(html, {
			fields: {
				name: { group: 1, regex: "^(.*?)\\s+–\\s+" },
			},
			recordRegex: "^(Gminny|Biblioteka)",
			select: "ul.wp-block-list li",
		});
		expect(result.candidates).toBe(2);
		expect(result.matched).toBe(2);
		expect(result.records[0]?.["name"]).toBe("Gminny Ośrodek");
	});

	test("supports comma-separated selectors and empty item separator", () => {
		const source = `
			<div class="pe-article-content">
				<p class="wp-block-paragraph">Ośrodek – 16.2528<span>21</span>)</p>
				<ul><li>Szkoła – 16.2, 51.2</li></ul>
			</div>`;
		const result = parseHtmlList(source, {
			itemTextSeparator: "",
			select:
				"div.pe-article-content li, div.pe-article-content p.wp-block-paragraph",
		});
		expect(result.candidates).toBe(2);
		expect(result.records[0]?.["text"]).toContain("16.252821");
	});
});

describe("mapping DSL subset", () => {
	test("template placeholders allow spaces and row_index", () => {
		expect(
			evaluateExpression(
				{ template: "krosno:{Numer Id}" },
				{ "Numer Id": "7" },
			),
		).toBe("krosno:7");
		expect(
			evaluateExpression(
				{ template: "marki:{row_index}" },
				{},
				{ row_index: 3 },
			),
		).toBe("marki:3");
	});

	test("field paths support dots, JSON Pointer and array indexes", () => {
		const record = {
			properties: { location_city: "Warszawa" },
			gallery: [{ url: "https://example.test/a.jpg" }],
		};
		expect(readField(record, "properties.location_city")).toBe("Warszawa");
		expect(readField(record, "/properties/location_city")).toBe("Warszawa");
		expect(readField(record, "gallery[0].url")).toBe(
			"https://example.test/a.jpg",
		);
		expect(resolveJsonPath({ rows: [1, 2] }, "/rows")).toEqual([1, 2]);
	});

	test("GeoJSON feature flattens properties over geometry", () => {
		const flat = flattenGeoJsonFeature({
			geometry: { coordinates: [19.5, 49.5], type: "Point" },
			properties: { "addr:city": "Kraków" },
			type: "Feature",
		});
		expect(flat["addr:city"]).toBe("Kraków");
		expect(flat["geometry"]).toEqual({
			coordinates: [19.5, 49.5],
			type: "Point",
		});
	});

	test("coordinate specs read GeoJSON geometry and KML coordinate pairs", () => {
		const geo = {
			geometry: { coordinates: [19.5, 49.5], type: "Point" },
		};
		expect(
			evaluateCoordinate(
				{ coord: { format: "geojson", from: "geometry", pick: "lat" } },
				geo,
				"lat",
			).value,
		).toBe(49.5);
		expect(
			evaluateCoordinate(
				{ coord: { format: "geojson", from: "geometry", pick: "lon" } },
				geo,
				"lon",
			).value,
		).toBe(19.5);

		const kml = { coordinates: [19.94, 49.62] };
		expect(
			evaluateCoordinate(
				{ coord: { format: "kml", from: "coordinates", pick: "lat" } },
				kml,
				"lat",
			).value,
		).toBe(49.62);
	});

	test("warszawa nested coordinates unwrap one level", () => {
		const record = {
			geometry: { coordinates: [[21.0, 52.2]], type: "Point" },
		};
		expect(
			evaluateCoordinate(
				{
					coord: {
						format: "geojson",
						from: "geometry",
						unwrap_single: true,
					},
				},
				record,
				"lat",
			).value,
		).toBe(52.2);
	});
});
