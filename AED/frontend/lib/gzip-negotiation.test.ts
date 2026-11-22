import { describe, expect, test } from "bun:test";
import { acceptEncodingAllowsGzip } from "./gzip-negotiation";

describe("gzip negotiation", () => {
	test("matches plain gzip and quality values", () => {
		expect(acceptEncodingAllowsGzip("gzip")).toBe(true);
		expect(acceptEncodingAllowsGzip("br, gzip;q=0.5")).toBe(true);
		expect(acceptEncodingAllowsGzip("GZIP, deflate")).toBe(true);
	});

	test("rejects absent, identity-only and zero-quality gzip", () => {
		expect(acceptEncodingAllowsGzip(null)).toBe(false);
		expect(acceptEncodingAllowsGzip("identity")).toBe(false);
		expect(acceptEncodingAllowsGzip("gzip;q=0")).toBe(false);
		expect(acceptEncodingAllowsGzip("xgzip, gzip;q=0.0")).toBe(false);
	});
});
