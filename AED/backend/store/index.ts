import { Database } from "bun:sqlite";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";

import { account, session, user, verification } from "#backend/auth/schema.ts";
import { aedDevices, aedDevicesCombined, aedSourceDevices } from "./schema.ts";

const schema = {
	aedDevices,
	aedSourceDevices,
	aedDevicesCombined,
	user,
	session,
	account,
	verification,
};

type StoreDatabase = BunSQLiteDatabase<typeof schema>;

/**
 * The SQLite connection is opened on first use instead of at import time.
 *
 * `DATABASE_URL` is therefore read when the store is actually queried, which
 * keeps imports side-effect free: tests can import modules that touch the
 * store (for example `backend/forms/manual-record.ts`) and still point the
 * store at a throwaway database afterwards, and no `*.db` file is created by
 * a plain import.
 */
let database: StoreDatabase | null = null;

function openDatabase(): StoreDatabase {
	const databaseUrl = Bun.env["DATABASE_URL"] ?? "dev.db";
	const sqlite: Database = new Database(databaseUrl);

	// WAL is preferred for concurrency, but it requires `-wal`/`-shm` sidecar
	// files that some filesystems (notably 9p/WSL mounts) cannot create. On those
	// filesystems attempting WAL corrupts the connection, so we stay in the
	// default (delete) journal mode there. WAL is enabled only when explicitly
	// requested via DATABASE_JOURNAL_MODE=wal.
	const requestedMode = Bun.env["DATABASE_JOURNAL_MODE"]?.toLowerCase();
	if (requestedMode === "wal") {
		try {
			sqlite.run("PRAGMA journal_mode = WAL;");
		} catch {
			// fall through to delete mode
		}
	}
	sqlite.run("PRAGMA synchronous = NORMAL;");
	sqlite.run("PRAGMA foreign_keys = ON;");

	return drizzle({ client: sqlite, schema });
}

/** Returns the shared Drizzle client, opening the connection on first call. */
export function getDb(): StoreDatabase {
	database ??= openDatabase();
	return database;
}

export const db: StoreDatabase = new Proxy({} as StoreDatabase, {
	get(_target, property) {
		const target = getDb() as unknown as Record<PropertyKey, unknown>;
		const value = target[property];
		return typeof value === "function" ? value.bind(target) : value;
	},
	has(_target, property) {
		return property in (getDb() as object);
	},
});
