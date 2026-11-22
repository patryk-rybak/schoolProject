import { describe, expect, test } from "bun:test";

import { toAedMapPoint } from "./poland-map.tsx";

const mapSource = await Bun.file(
	new URL("./poland-map.tsx", import.meta.url),
).text();

const aedSourcePattern =
	/map\.addSource\(\s*"aed"\s*,\s*\{[\s\S]*?type:\s*"geojson"[\s\S]*?data:\s*`\$\{globalThis\.location\.origin\}\/data\/aed\.points\.geojson/u;
const aedPointsLayerPattern =
	/map\.addLayer\(\s*\{[\s\S]*?id:\s*"aed-points"[\s\S]*?type:\s*"circle"[\s\S]*?source:\s*"aed"[\s\S]*?"circle-radius"[\s\S]*?"circle-color":\s*\[\s*"case"\s*,\s*\["==",\s*\["get",\s*"verification_status"\],\s*"verified"\],\s*VERIFIED_COLOR,\s*UNVERIFIED_COLOR,\s*\]/u;

function functionBody(name: string): string {
	const marker = `function ${name}(`;
	const start = mapSource.indexOf(marker);
	if (start === -1) {
		throw new Error(`missing ${name} in poland-map.tsx`);
	}
	const bodyStart = mapSource.indexOf("): void {", start);
	if (bodyStart === -1) {
		throw new Error(`missing ${name} body in poland-map.tsx`);
	}
	const brace = mapSource.indexOf("{", bodyStart);
	if (brace === -1) {
		throw new Error(`missing ${name} body brace in poland-map.tsx`);
	}
	let depth = 0;
	for (let index = brace; index < mapSource.length; index += 1) {
		if (mapSource[index] === "{") {
			depth += 1;
		}
		if (mapSource[index] === "}") {
			depth -= 1;
			if (depth === 0) {
				return mapSource.slice(brace + 1, index);
			}
		}
	}
	throw new Error(`unterminated ${name} body in poland-map.tsx`);
}

describe("toAedMapPoint", () => {
	test("maps compact points GeoJSON properties into the popup model", () => {
		const point = toAedMapPoint({
			id: 95_904,
			source_id: "belchatow",
			name: "AED w urzędzie",
			city: "Bełchatów",
			address: "ul. Kościuszki 1, 97-400 Bełchatów",
			description: "Na ścianie remizy strażackiej.",
			access: "always",
			status: "operational",
			verification_status: "verified",
			source_url: "https://belchatow.pl/mapa-defibrylatorow-aed/",
		});

		expect(point).toEqual({
			id: 95_904,
			name: "AED w urzędzie",
			city: "Bełchatów",
			address: "ul. Kościuszki 1, 97-400 Bełchatów",
			description: "Na ścianie remizy strażackiej.",
			access: "always",
			status: "operational",
			source: "belchatow",
			verificationStatus: "verified",
			sourceUrl: "https://belchatow.pl/mapa-defibrylatorow-aed/",
		});
	});

	test("handles the minimal payload without optional keys", () => {
		// buildPointsGeoJson omits null-valued keys (city, address, description,
		// source_url).
		const point = toAedMapPoint({
			id: 76_415,
			source_id: "krosno",
			name: "Zespół Krytych Pływalni",
			access: "unknown",
			status: "unknown",
			verification_status: "unverified",
		});

		expect(point?.id).toBe(76_415);
		expect(point?.city).toBeNull();
		expect(point?.address).toBeNull();
		expect(point?.description).toBeNull();
		expect(point?.sourceUrl).toBeNull();
		expect(point?.verificationStatus).toBe("unverified");
	});

	test("applies defaults for missing enums and source", () => {
		const point = toAedMapPoint({ name: "AED bez metadanych" });

		expect(point?.id).toBeNull();
		expect(point?.access).toBe("unknown");
		expect(point?.status).toBe("unknown");
		expect(point?.source).toBe("Niepodano");
		expect(point?.verificationStatus).toBe("unverified");
	});

	test("accepts string ids and falls back to null for non-numeric ids", () => {
		expect(toAedMapPoint({ id: "123", name: "AED" })?.id).toBe(123);
		expect(toAedMapPoint({ id: "abc", name: "AED" })?.id).toBeNull();
		expect(toAedMapPoint({ id: 12.5, name: "AED" })?.id).toBeNull();
	});

	test("rejects empty properties without id or name", () => {
		expect(toAedMapPoint(null)).toBeNull();
		expect(toAedMapPoint({ id: null, name: "" })).toBeNull();
	});

	test("ignores verbose legacy keys absent from the points payload", () => {
		const point = toAedMapPoint({
			nazwa_obiektu: "AED w obiekcie publicznym",
			miejscowosc: "Krosno",
			zrodlo_danych: "krosno",
			record_id: "krosno:1",
		});

		expect(point).toBeNull();
	});
});

describe("AED map source and circle layer", () => {
	test("loads the compact points GeoJSON URL as the aed source", () => {
		const body = functionBody("addAedPoints");
		const source = body.match(aedSourcePattern);

		expect(source?.[0]).toBeDefined();
	});

	test("defines an aed-points circle layer colored by verification status", () => {
		const body = functionBody("addAedPoints");
		const layer = body.match(aedPointsLayerPattern);

		expect(layer?.[0]).toBeDefined();
		expect(mapSource).toContain('export const VERIFIED_COLOR = "#16a34a"');
		expect(mapSource).toContain('export const UNVERIFIED_COLOR = "#9ca3af"');
	});
});
