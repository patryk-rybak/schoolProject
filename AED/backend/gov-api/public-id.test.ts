import { describe, expect, test } from "bun:test";

import { stablePublicUuid } from "./public-id";

const UUID_V4_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

describe("stablePublicUuid", () => {
	test("produces a valid, deterministic UUID v4 shape", () => {
		const first = stablePublicUuid("krosno", "krosno:abc");
		const second = stablePublicUuid("krosno", "krosno:abc");

		expect(first).toBe(second);
		expect(first).toMatch(UUID_V4_PATTERN);
	});

	test("different records produce different identifiers", () => {
		expect(stablePublicUuid("krosno", "krosno:abc")).not.toBe(
			stablePublicUuid("krosno", "krosno:def"),
		);
		expect(stablePublicUuid("marki", "marki:1")).not.toBe(
			stablePublicUuid("warszawa", "warszawa:1"),
		);
	});
});
