import { describe, expect, test } from "bun:test";

import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
	test("allows the map and login pages", () => {
		expect(isPublicPath("/")).toBe(true);
		expect(isPublicPath("/logowanie")).toBe(true);
		expect(isPublicPath("/logowanie/")).toBe(true);
	});

	test("allows the machine endpoints used by the map and harvester", () => {
		expect(isPublicPath("/api/pmtiles")).toBe(true);
		expect(isPublicPath("/api/auth/sign-in/username")).toBe(true);
		expect(isPublicPath("/api/other")).toBe(false);
		expect(isPublicPath("/data/aed.geojson")).toBe(true);
		expect(isPublicPath("/data/aed.csv")).toBe(true);
		expect(isPublicPath("/harvester/feed.xml")).toBe(true);
		expect(isPublicPath("/harvester/feed.md5")).toBe(true);
	});

	test("protects every other page", () => {
		expect(isPublicPath("/dodaj-aed")).toBe(false);
		expect(isPublicPath("/moje-aed")).toBe(false);
		expect(isPublicPath("/zrodla")).toBe(false);
		expect(isPublicPath("/zrodla/")).toBe(false);
		expect(isPublicPath("/zrodla/nowe")).toBe(false);
		expect(isPublicPath("/unknown")).toBe(false);
	});
});
