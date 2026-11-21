import { afterEach, describe, expect, test } from "bun:test";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type SourceConfig, sourceConfigSchema } from "../config/schema";
import { fetchSource, fetchSources } from "./source-fetch";

const tempDirs: string[] = [];

function tempDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "aed-source-fetch-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { force: true, recursive: true });
	}
});

function config(overrides: Record<string, unknown> = {}): SourceConfig {
	return sourceConfigSchema.parse({
		connector: { family: "http_json", parser: "json" },
		drift: {},
		fetch: {
			pagination: { type: "none" },
			url: "https://example.com/data.json",
		},
		map: { name: { field: "name" } },
		parse: { json: {} },
		records: {
			identity: { source_record_id: { field: "id" } },
			path: "/rows",
		},
		source: {
			access_type: "api",
			enabled: true,
			id: "test",
			license: { id: "CC0-1.0" },
			name: "Test source",
			publisher: "Test",
			reliability_tier: "official_local",
		},
		validate: {},
		version: 1,
		...overrides,
	});
}

function json(value: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(value), {
		...init,
		headers: { "content-type": "application/json", ...(init.headers ?? {}) },
	});
}

describe("fetchSource", () => {
	test("writes raw body and complete metadata for a GET", async () => {
		const rawDir = tempDir();
		const calls: string[] = [];
		const result = await fetchSource(config(), {
			configPath: "/repo/backend/ingest/datasources-config.json",
			env: {},
			fetchImpl: async (input) => {
				calls.push(String(input));
				return json({ rows: [{ id: "1" }, { id: "2" }] });
			},
			now: () => new Date("2026-01-02T03:04:05.000Z"),
			rawDir,
		});

		expect(result.ok).toBe(true);
		expect(result.status).toBe("fetched");
		expect(calls).toHaveLength(1);
		expect(result.rawFile).toBe("test.json");
		const body = readFileSync(join(rawDir, "test.json"), "utf8");
		expect(JSON.parse(body)).toEqual({ rows: [{ id: "1" }, { id: "2" }] });
		const meta = JSON.parse(
			readFileSync(join(rawDir, "test.meta.json"), "utf8"),
		) as Record<string, unknown>;
		expect(meta["source_id"]).toBe("test");
		expect(meta["fetched_at"]).toBe("2026-01-02T03:04:05.000Z");
		expect(meta["http_status"]).toBe(200);
		expect(meta["bytes"]).toBe(statSync(join(rawDir, "test.json")).size);
		expect(meta["sha256"]).toBe(
			new Bun.CryptoHasher("sha256").update(body).digest("hex"),
		);
		expect(meta["config_path"]).toBe(
			"/repo/backend/ingest/datasources-config.json",
		);
		expect(meta["license_id"]).toBe("CC0-1.0");
		expect(meta["raw_file"]).toBe("test.json");
		expect(meta["record_count"]).toBe(2);
		expect(meta["blocked"]).toBe(false);
	});

	test("blocks and records the missing auth environment variable", async () => {
		const rawDir = tempDir();
		const result = await fetchSource(
			config({
				fetch: {
					auth: { env: "TEST_API_TOKEN", type: "bearer" },
					pagination: { type: "none" },
					url: "https://example.com/data.json",
				},
			}),
			{ env: {}, rawDir },
		);

		expect(result.status).toBe("blocked");
		expect(result.blocked).toBe(true);
		expect(result.ok).toBe(false);
		expect(existsSync(join(rawDir, "test.json"))).toBe(false);
		const meta = JSON.parse(
			readFileSync(join(rawDir, "test.meta.json"), "utf8"),
		) as Record<string, unknown>;
		expect(meta["blocked"]).toBe(true);
		expect(meta["status"]).toBe("blocked");
		expect(String(meta["error"])).toContain("TEST_API_TOKEN");
	});

	test("sends POST body, query and header auth", async () => {
		const rawDir = tempDir();
		const captured: Record<string, unknown> = {};
		await fetchSource(
			config({
				fetch: {
					auth: {
						env: "TEST_API_TOKEN",
						header: "X-Api-Key",
						prefix: "Token ",
						type: "header",
					},
					body: { action: "list" },
					method: "POST",
					pagination: { type: "none" },
					query: { format: "json" },
					url: "https://example.com/api",
				},
			}),
			{
				env: { TEST_API_TOKEN: "secret" },
				fetchImpl: async (input, init) => {
					captured["body"] = typeof init?.body === "string" ? init.body : null;
					captured["headers"] = new Headers(init?.headers);
					captured["method"] = init?.method ?? "GET";
					expect(input).toContain("format=json");
					return json({ rows: [] });
				},
				rawDir,
			},
		);

		expect(captured["method"]).toBe("POST");
		expect(captured["body"]).toBe(JSON.stringify({ action: "list" }));
		const headers = captured["headers"] as Headers;
		expect(headers.get("X-Api-Key")).toBe("Token secret");
		expect(headers.get("Content-Type")).toBe("application/json");
	});

	test("follows redirects up to max_redirects", async () => {
		const rawDir = tempDir();
		const urls: string[] = [];
		const result = await fetchSource(
			config({
				fetch: {
					max_redirects: 2,
					pagination: { type: "none" },
					url: "https://example.com/start",
				},
			}),
			{
				fetchImpl: async (input) => {
					const url = String(input);
					urls.push(url);
					if (url.endsWith("/start")) {
						return new Response(null, {
							headers: { location: "/middle" },
							status: 302,
						});
					}
					if (url.endsWith("/middle")) {
						return new Response(null, {
							headers: { location: "https://example.com/final" },
							status: 307,
						});
					}
					return json({ rows: [{ id: "1" }] });
				},
				rawDir,
			},
		);

		expect(result.ok).toBe(true);
		expect(urls).toEqual([
			"https://example.com/start",
			"https://example.com/middle",
			"https://example.com/final",
		]);
		expect(result.meta?.final_url).toBe("https://example.com/final");
	});

	test("fails cleanly when max_bytes is exceeded", async () => {
		const rawDir = tempDir();
		const result = await fetchSource(
			config({
				fetch: {
					max_bytes: 5,
					pagination: { type: "none" },
					url: "https://example.com/data.json",
				},
			}),
			{
				fetchImpl: async () => json({ rows: [{ id: "1" }] }),
				rawDir,
			},
		);

		expect(result.ok).toBe(false);
		expect(result.status).toBe("error");
		expect(result.error).toContain("max_bytes");
		expect(existsSync(join(rawDir, "test.json"))).toBe(false);
		const meta = JSON.parse(
			readFileSync(join(rawDir, "test.meta.json"), "utf8"),
		) as Record<string, unknown>;
		expect(meta["status"]).toBe("error");
	});

	test("merges page pagination into one snapshot at records.path", async () => {
		const rawDir = tempDir();
		const pages: string[] = [];
		const result = await fetchSource(
			config({
				fetch: {
					pagination: {
						limit_param: "per_page",
						page_param: "page",
						page_size: 2,
						start_page: 1,
						total_path: "/total_rows",
						type: "page",
					},
					url: "https://example.com/paged",
				},
			}),
			{
				fetchImpl: async (input) => {
					const url = new URL(String(input));
					const page = Number(url.searchParams.get("page"));
					pages.push(url.search);
					expect(url.searchParams.get("per_page")).toBe("2");
					if (page === 1) {
						return json({
							rows: [{ id: "1" }, { id: "2" }],
							total_rows: 3,
						});
					}
					return json({ rows: [{ id: "3" }], total_rows: 3 });
				},
				rawDir,
			},
		);

		expect(result.ok).toBe(true);
		expect(pages).toHaveLength(2);
		expect(result.meta?.pages).toBe(2);
		expect(result.meta?.record_count).toBe(3);
		const merged = JSON.parse(
			readFileSync(join(rawDir, "test.json"), "utf8"),
		) as { rows: unknown[] };
		expect(merged.rows).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
		expect(existsSync(join(rawDir, "test.page-1.json"))).toBe(true);
		expect(existsSync(join(rawDir, "test.page-2.json"))).toBe(true);
	});

	test("merges offset pagination into one snapshot at records.path", async () => {
		const rawDir = tempDir();
		const offsets: string[] = [];
		const result = await fetchSource(
			config({
				fetch: {
					pagination: {
						limit_param: "limit",
						offset_param: "offset",
						page_size: 2,
						start_offset: 0,
						total_path: "/total",
						type: "offset",
					},
					url: "https://example.com/paged",
				},
			}),
			{
				fetchImpl: async (input) => {
					const url = new URL(String(input));
					const offset = Number(url.searchParams.get("offset"));
					offsets.push(url.searchParams.get("offset") ?? "");
					expect(url.searchParams.get("limit")).toBe("2");
					if (offset === 0) {
						return json({
							rows: [{ id: "1" }, { id: "2" }],
							total: 3,
						});
					}
					return json({ rows: [{ id: "3" }], total: 3 });
				},
				rawDir,
			},
		);

		expect(result.ok).toBe(true);
		expect(offsets).toEqual(["0", "2"]);
		expect(result.meta?.pages).toBe(2);
		expect(result.meta?.record_count).toBe(3);
		const merged = JSON.parse(
			readFileSync(join(rawDir, "test.json"), "utf8"),
		) as { rows: unknown[] };
		expect(merged.rows).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});

	test("skips disabled sources unless includeDisabled is set", async () => {
		const rawDir = tempDir();
		const disabled = config({
			source: {
				access_type: "api",
				enabled: false,
				id: "test",
				license: { id: "CC0-1.0" },
				name: "Test source",
				publisher: "Test",
				reliability_tier: "official_local",
			},
		});
		let calls = 0;
		const fetchImpl = async () => {
			calls += 1;
			return json({ rows: [] });
		};

		const skipped = await fetchSource(disabled, { fetchImpl, rawDir });
		expect(skipped.status).toBe("skipped");
		expect(skipped.ok).toBe(true);
		expect(calls).toBe(0);
		expect(existsSync(join(rawDir, "test.meta.json"))).toBe(false);

		const fetched = await fetchSource(disabled, {
			fetchImpl,
			includeDisabled: true,
			rawDir,
		});
		expect(fetched.status).toBe("fetched");
		expect(calls).toBe(1);
	});

	test("fetchSources keeps going when one source fails", async () => {
		const rawDir = tempDir();
		const results = await fetchSources(
			[
				config({ source: { ...config().source, id: "one" } }),
				config({
					fetch: {
						auth: { env: "MISSING_TOKEN", type: "bearer" },
						pagination: { type: "none" },
						url: "https://example.com/data.json",
					},
					source: { ...config().source, id: "two" },
				}),
			],
			{
				env: {},
				fetchImpl: async () => json({ rows: [{ id: "1" }] }),
				rawDir,
			},
		);

		expect(results.map((entry) => entry.status)).toEqual([
			"fetched",
			"blocked",
		]);
	});
});
