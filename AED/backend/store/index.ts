import { Database } from "bun:sqlite";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";

import { aedDevices } from "./schema.ts";

// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
const databaseUrl = Bun.env["DATABASE_URL"] ?? "dev.db";

const sqlite: Database = new Database(databaseUrl);

sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA synchronous = NORMAL;");

const schema = { aedDevices };

export const db: BunSQLiteDatabase<typeof schema> = drizzle({
	client: sqlite,
	schema,
});
