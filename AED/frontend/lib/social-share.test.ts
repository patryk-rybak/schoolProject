import { describe, expect, test } from "bun:test";

import {
	buildFacebookPostText,
	FACEBOOK_SHARE_URL,
	SHARE_PAGE_URL,
} from "./social-share";

describe("social share", () => {
	test("keeps the landing page URL in sync", () => {
		expect(SHARE_PAGE_URL).toBe(
			"https://patryk-rybak.github.io/schoolProject/share.html",
		);
		expect(FACEBOOK_SHARE_URL).toContain(encodeURIComponent(SHARE_PAGE_URL));
	});

	test("includes the saved AED name in the post text", () => {
		const text = buildFacebookPostText("  AED — Dworzec Główny  ");

		expect(text).toContain("Nowy punkt na mapie AED: „AED — Dworzec Główny”.");
		expect(text).toContain("#raziMYdobrem");
		expect(text).not.toContain("  AED");
	});

	test("falls back to a generic message without a name", () => {
		expect(buildFacebookPostText("  ")).toContain("Nowy punkt na mapie AED.");
	});
});
