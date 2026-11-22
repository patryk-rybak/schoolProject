import { Database } from "bun:sqlite";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";

import { account, session, user, verification } from "#backend/auth/schema.ts";
import { aedDevices } from "./schema.ts";

// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
const databaseUrl = Bun.env["DATABASE_URL"] ?? "dev.db";

const sqlite: Database = new Database(databaseUrl);

// WAL is preferred for concurrency, but it requires `-wal`/`-shm` sidecar files
// that some filesystems (notably 9p/WSL mounts) cannot create. On those
// filesystems attempting WAL corrupts the connection, so we stay in the default
// (delete) journal mode there. WAL is enabled only when explicitly requested
// via DATABASE_JOURNAL_MODE=wal.
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

const schema = { aedDevices, user, session, account, verification };

export const db: BunSQLiteDatabase<typeof schema> = drizzle({
	client: sqlite,
	schema,
});
