import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CanonicalAedRecord } from "../../src/server/ingest/canonical.ts";
import { parseCanonicalAedRecord } from "../../src/server/ingest/canonical.ts";
import { removeDuplicateAedDevices } from "./deduplicate.ts";

/**
 * Store tests run against a throwaway SQLite file. `DATABASE_URL` must be set
 * before `backend/store/index.ts` is imported, hence the dynamic imports.
 */
const TEST_DB = join(tmpdir(), `aed-store-${crypto.randomUUID()}.db`);
const USER_ID = "store-test-user";
const WARSAW: readonly [number, number] = [52.23, 21.01];
const KRAKOW: readonly [number, number] = [50.06, 19.94];
const GDANSK: readonly [number, number] = [54.35, 18.64];
const WROCLAW: readonly [number, number] = [51.11, 17.03];
const EXPECTED_COMBINED_ROWS = 3;
const MISSING_DEVICE_ID = 999_999;

// biome-ignore lint/complexity/useLiteralKeys: Bun.env is an index signature.
Bun.env["DATABASE_URL"] = TEST_DB;

const { db } = await import("./index.ts");
const store = await import("./aed-store.ts");

migrate(db, { migrationsFolder: join(import.meta.dir, "drizzle") });
const seedClient = new Database(TEST_DB);
seedClient
	.query(
		`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
		 VALUES (?, ?, ?, 0, unixepoch(), unixepoch())`,
	)
	.run(USER_ID, "store-test", "store-test@users.local");
seedClient.close();

function record(
	sourceId: string,
	recordId: string,
	lat: number,
	lon: number,
): CanonicalAedRecord {
	return parseCanonicalAedRecord({
		version: 1,
		record_id: recordId,
		source_id: sourceId,
		source_record_id: recordId,
		source_url: null,
		name: `AED ${recordId}`,
		description: null,
		note: null,
		facility_type: null,
		device_type: null,
		access_type: "always",
		status: "operational",
		verification_status: "unverified",
		verified_by: null,
		verified_by_kind: null,
		verified_at: null,
		confidence: null,
		lat,
		lon,
		coord_precision_m: null,
		location_status: "point",
		geom_source: "source",
		address_text: null,
		address_kind: "none",
		address_source: "source",
		address_confidence: null,
		geocode_provider: null,
		geocode_version: null,
		geocode_confidence: null,
		geocoded_at: null,
		geocode_input_sha256: null,
		geocode_note: null,
		claim_status: "unclaimed",
		claimed_by: null,
		claimed_at: null,
		claim_note: null,
		attributes: { city: "Warszawa" },
	});
}

afterAll(() => {
	for (const suffix of ["", "-wal", "-shm"]) {
		rmSync(`${TEST_DB}${suffix}`, { force: true });
	}
});

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: keeping related store cases together is easier to review.
describe("canonical store", () => {
	beforeAll(() => {
		store.clearAllAedDevices();
	});

	test("combined model is a physical table", () => {
		const client = new Database(TEST_DB);
		const row = client
			.query(
				"select type from sqlite_master where name = 'aed_devices_combined'",
			)
			.get() as { type: string } | null;
		client.close();
		expect(row?.type).toBe("table");
	});

	test("user record is signed and verified by its author", async () => {
		const { getAedDetail } = await import("../aed-detail.ts");
		const row = store.addUserAedDevice(
			record("manual", "user:one", ...WARSAW),
			USER_ID,
		);
		expect(row.createdById).toBe(USER_ID);
		expect(row.origin).toBe("user");
		expect(row.verificationStatus).toBe("verified");
		expect(row.verifiedBy).toBe(USER_ID);
		expect(row.verifiedByKind).toBe("person");
		expect(store.countAedDevices()).toBe(1);
		expect(store.countCombinedAedDevices()).toBe(1);
		const [combined] = store.listCombinedAedDevices();
		expect(combined?.recordId).toBe(row.recordId);
		expect(combined?.createdById).toBe(USER_ID);
		expect(combined?.origin).toBe("user");
		expect(combined ? store.getCombinedAedDevice(combined.id) : null).toEqual(
			combined ?? null,
		);
		expect(store.getCombinedAedDevice(MISSING_DEVICE_ID)).toBeNull();
		const detail = combined ? getAedDetail(combined.id) : null;
		expect(detail?.id).toBe(combined?.id);
		expect(detail?.name).toBe("AED user:one");
		expect(detail?.city).toBe("Warszawa");
		expect(detail?.source).toBe("manual");
		expect(detail?.verificationStatus).toBe("verified");
		// biome-ignore lint/complexity/useLiteralKeys: CanonicalDetail has an index signature.
		expect(detail?.canonical?.["record_id"]).toBe("user:one");
		expect(getAedDetail(MISSING_DEVICE_ID)).toBeNull();
		expect(store.listUserAedDevices(USER_ID)).toHaveLength(1);
		expect(store.listUserAedDevices("another-user")).toHaveLength(0);
	});

	test("source import never touches user rows", () => {
		store.replaceSourceAedDevices("source-a", [
			record("source-a", "source-a:one", ...KRAKOW),
		]);
		expect(store.countAedDevices()).toBe(1);
		expect(store.countSourceAedDevices()).toBe(1);

		const [sourceRow] = store.listSourceAedDevices();
		expect(sourceRow?.origin).toBe("source");
		expect(sourceRow?.verificationStatus).toBe("unverified");
		expect(sourceRow?.verifiedBy).toBeNull();
		expect(sourceRow?.verifiedAt).toBeNull();
		expect(store.countCombinedAedDevices()).toBe(2);
		const combinedSource = store
			.listCombinedAedDevices()
			.find((row) => row.origin === "source");
		expect(combinedSource?.createdById).toBeNull();
	});

	test("re-import replaces only that source", () => {
		store.replaceSourceAedDevices("source-b", [
			record("source-b", "source-b:one", ...GDANSK),
		]);
		const result = store.replaceSourceAedDevices("source-a", [
			record("source-a", "source-a:two", ...WROCLAW),
		]);
		expect(result.deleted).toBe(1);
		expect(result.inserted).toBe(1);
		expect(store.countAedDevices()).toBe(1);
		expect(
			store.listSourceAedDevices().filter((row) => row.sourceId === "source-a"),
		).toHaveLength(1);
		expect(
			store
				.listCombinedAedDevices()
				.filter((row) => row.sourceId === "source-a"),
		).toHaveLength(1);
	});

	test("combined table exposes user and source rows", () => {
		const origins = new Set(
			store.listCombinedAedDevices().map((row) => row.origin),
		);
		expect(origins).toEqual(new Set(["user", "source"]));
		expect(store.countCombinedAedDevices()).toBe(EXPECTED_COMBINED_ROWS);
	});

	test("deduplication placeholder is a no-op", () => {
		const before = store.listCombinedAedDevices().map((row) => row.recordId);
		expect(removeDuplicateAedDevices()).toBe(0);
		expect(store.listCombinedAedDevices().map((row) => row.recordId)).toEqual(
			before,
		);
	});

	test("deleting a source refreshes only its combined rows", () => {
		expect(store.deleteSourceAedDevices("source-b")).toBe(1);
		expect(store.countAedDevices()).toBe(1);
		expect(store.countSourceAedDevices()).toBe(1);
		expect(store.countCombinedAedDevices()).toBe(2);
		const sourceIds = new Set(
			store
				.listCombinedAedDevices()
				.filter((row) => row.origin === "source")
				.map((row) => row.sourceId),
		);
		expect(sourceIds).toEqual(new Set(["source-a"]));
	});

	test("explicit refresh rebuilds the combined table", () => {
		const result = store.refreshCombinedAedDevices();
		expect(result).toEqual({ userRows: 1, sourceRows: 1 });
		expect(store.countCombinedAedDevices()).toBe(2);
	});

	test("full source refresh keeps user rows in the combined table", () => {
		const result = store.replaceAllSourceAedDevices([
			record("source-c", "source-c:one", ...WARSAW),
		]);
		expect(result).toEqual({ deleted: 1, inserted: 1 });
		expect(store.countAedDevices()).toBe(1);
		expect(store.countSourceAedDevices()).toBe(1);
		expect(store.countCombinedAedDevices()).toBe(2);
		expect(
			store.listCombinedAedDevices().filter((row) => row.origin === "user"),
		).toHaveLength(1);
	});

	test("records without a point are rejected", () => {
		const addressOnly = parseCanonicalAedRecord({
			...record("source-c", "source-c:one", ...WARSAW),
			lat: null,
			lon: null,
			location_status: "address_only",
			address_text: "ul. Testowa 1, Warszawa",
		});
		expect(
			() => store.replaceSourceAedDevices("source-c", [addressOnly]),
			// biome-ignore lint/security/noSecrets: assertion text, not a credential.
		).toThrow("nie ma współrzędnych");
	});

	test("only the owner can delete a device from both tables", () => {
		const [row] = store.listUserAedDevices(USER_ID);
		if (!row) {
			throw new Error("expected a user device");
		}
		expect(store.deleteUserAedDevice(row.id, "another-user")).toBe(false);
		expect(store.countAedDevices()).toBe(1);
		expect(
			store
				.listCombinedAedDevices()
				.some((combined) => combined.recordId === row.recordId),
		).toBe(true);

		expect(store.deleteUserAedDevice(row.id, USER_ID)).toBe(true);
		expect(store.countAedDevices()).toBe(0);
		expect(
			store
				.listCombinedAedDevices()
				.some((combined) => combined.recordId === row.recordId),
		).toBe(false);
	});
});
