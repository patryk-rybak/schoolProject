import { afterAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSourceConfig, type SourceConfig } from "../config/schema";
import { loadRawSnapshot } from "../core/raw";
import { parseRawSource } from "../core/parse";
import { fetchSource } from "./source-fetch";
import type { SourceFetchMeta } from "./source-fetch";

const workDir = mkdtempSync(join(tmpdir(), "aed-db-s3-fetch-"));
afterAll(() => {
	rmSync(workDir, { recursive: true, force: true });
});

function sqliteConfig(
	overrides: {
		id?: string;
		path?: string;
		query?: string;
		enabled?: boolean;
	} = {},
): SourceConfig {
	return parseSourceConfig({
		source: {
			id: overrides.id ?? "sqlite-demo",
			name: "SQLite demo AED",
			enabled: overrides.enabled ?? true,
		},
		connector: { family: "sqlite_db", parser: "json" },
		connection: {
			kind: "sqlite",
			path: overrides.path ?? join(workDir, "aed.db"),
			query: overrides.query ?? "SELECT id, name, lat, lon FROM aed ORDER BY id",
		},
		parse: {},
		records: { path: "$" },
		map: {
			name: { field: "name" },
			lat: { field: "lat" },
			lon: { field: "lon" },
		},
		validate: {},
	});
}

function createSqliteFile(path: string): void {
	const db = new Database(path);
	db.run("CREATE TABLE aed (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lon REAL)");
	db.run(
		"INSERT INTO aed (id, name, lat, lon) VALUES (1, 'AED Rynek', 52.2, 21.0), (2, 'AED Dworzec', 52.25, 21.05)",
	);
	db.close();
}

describe("fetchNonHttpSource via fetchSource", () => {
	test("sqlite round-trip: snapshot, meta and parseRawSource", async () => {
		const dbPath = join(workDir, "aed.db");
		createSqliteFile(dbPath);
		const rawDir = join(workDir, "raw-sqlite");
		const config = sqliteConfig();
		const result = await fetchSource(config, {
			configSha256: "abc123",
			now: () => new Date("2026-01-01T00:00:00Z"),
			rawDir,
		});
		expect(result.status).toBe("fetched");
		expect(result.ok).toBe(true);
		expect(result.rawFile).toBe("sqlite-demo.json");

		const meta = JSON.parse(
			readFileSync(join(rawDir, "sqlite-demo.meta.json"), "utf8"),
		) as SourceFetchMeta;
		expect(meta.source_id).toBe("sqlite-demo");
		expect(meta.status).toBe("fetched");
		expect(meta.blocked).toBe(false);
		expect(meta.http_status).toBeNull();
		expect(meta.content_type).toBeNull();
		expect(meta.final_url).toBe(`sqlite:${dbPath}`);
		expect(meta.record_count).toBe(2);
		expect(meta.bytes).toBeGreaterThan(0);
		expect(meta.config_sha256).toBe("abc123");
		expect(meta.fetched_at).toBe("2026-01-01T00:00:00.000Z");
		expect(meta.sha256).toBe(
			new Bun.CryptoHasher("sha256")
				.update(readFileSync(join(rawDir, "sqlite-demo.json")))
				.digest("hex"),
		);

		const snapshot = loadRawSnapshot(rawDir, config);
		const parsed = parseRawSource(config, snapshot.text, snapshot.body);
		expect(parsed.parser).toBe("json");
		expect(parsed.seen).toBe(2);
		expect(parsed.records[0]).toEqual({
			id: 1,
			lat: 52.2,
			lon: 21,
			name: "AED Rynek",
		});
	});

	test("disabled sqlite source is skipped without touching the database", async () => {
		const config = sqliteConfig({
			enabled: false,
			id: "sqlite-off",
			path: join(workDir, "does-not-exist.db"),
		});
		const result = await fetchSource(config, {
			rawDir: join(workDir, "raw-off"),
		});
		expect(result.status).toBe("skipped");
		expect(result.ok).toBe(true);
		expect(result.meta).toBeNull();
		expect(result.rawFile).toBeNull();
	});

	test("missing sqlite file returns an error result, never throws", async () => {
		const config = sqliteConfig({
			id: "sqlite-missing",
			path: join(workDir, "missing.db"),
		});
		const rawDir = join(workDir, "raw-missing");
		const result = await fetchSource(config, { rawDir });
		expect(result.status).toBe("error");
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Nie można otworzyć bazy SQLite/);
		expect(result.rawFile).toBeNull();
		const meta = JSON.parse(
			readFileSync(join(rawDir, "sqlite-missing.meta.json"), "utf8"),
		) as SourceFetchMeta;
		expect(meta.status).toBe("error");
		expect(meta.sha256).toBeNull();
		expect(meta.error).toMatch(/Nie można otworzyć bazy SQLite/);
	});

	test("invalid sqlite query returns an error result", async () => {
		const dbPath = join(workDir, "aed-query.db");
		createSqliteFile(dbPath);
		const config = sqliteConfig({
			id: "sqlite-bad-query",
			path: dbPath,
			query: "SELECT nope FROM aed",
		});
		const result = await fetchSource(config, {
			rawDir: join(workDir, "raw-bad-query"),
		});
		expect(result.status).toBe("error");
		expect(result.error).toMatch(/Zapytanie SQLite nie powiodło się/);
	});

	test("postgres env variable missing returns an error result without network", async () => {
		const config = parseSourceConfig({
			source: { id: "pg-demo", name: "Postgres demo AED" },
			connector: { family: "postgres_db", parser: "json" },
			connection: {
				kind: "postgres",
				env: "AED_TEST_PG_URL_MISSING",
				query: "SELECT * FROM aed",
			},
			parse: {},
			records: { path: "$" },
			map: { name: { field: "name" } },
			validate: {},
		});
		const result = await fetchSource(config, {
			env: {},
			rawDir: join(workDir, "raw-pg"),
		});
		expect(result.status).toBe("error");
		expect(result.error).toMatch(/AED_TEST_PG_URL_MISSING/);
	});

	test("s3 credentials missing in env returns an error result without network", async () => {
		const config = parseSourceConfig({
			source: { id: "s3-demo", name: "S3 demo AED" },
			connector: { family: "s3_object", parser: "csv" },
			connection: {
				kind: "s3",
				bucket: "aed",
				key: "devices/data.csv",
				access_key_id_env: "AED_TEST_S3_KEY_MISSING",
				secret_access_key_env: "AED_TEST_S3_SECRET_MISSING",
			},
			parse: {},
			records: { path: "$" },
			map: { name: { field: "name" } },
			validate: {},
		});
		const result = await fetchSource(config, {
			env: {},
			rawDir: join(workDir, "raw-s3"),
		});
		expect(result.status).toBe("error");
		expect(result.error).toMatch(/Brak poświadczenia S3/);
	});
});