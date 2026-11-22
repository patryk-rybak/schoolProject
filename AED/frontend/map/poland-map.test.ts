import { describe, expect, test } from "bun:test";

import { toAedMapPoint } from "./poland-map.tsx";

describe("toAedMapPoint", () => {
	test("maps compact points GeoJSON properties into the popup model", () => {
		const point = toAedMapPoint({
			id: 95_904,
			source_id: "belchatow",
			name: "AED w urzędzie",
			city: "Bełchatów",
			address: "ul. Kościuszki 1, 97-400 Bełchatów",
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
			access: "always",
			status: "operational",
			source: "belchatow",
			verificationStatus: "verified",
			sourceUrl: "https://belchatow.pl/mapa-defibrylatorow-aed/",
		});
	});

	test("handles the minimal payload without optional keys", () => {
		// buildPointsGeoJson omits null-valued keys (city, address, source_url).
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
