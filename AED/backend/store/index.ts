import { Database } from "bun:sqlite";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";

import { account, session, user, verification } from "#backend/auth/schema.ts";
import { aedDevices, aedDevicesCombined, aedSourceDevices } from "./schema.ts";

// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
const databaseUrl = Bun.env["DATABASE_URL"] ?? "dev.db";

const sqlite: Database = new Database(databaseUrl);

sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA synchronous = NORMAL;");
sqlite.run("PRAGMA foreign_keys = ON;");

const schema = {
	aedDevices,
	aedSourceDevices,
	aedDevicesCombined,
	user,
	session,
	account,
	verification,
};

export const db: BunSQLiteDatabase<typeof schema> = drizzle({
	client: sqlite,
	schema,
});
