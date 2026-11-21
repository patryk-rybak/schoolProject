import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Temporary development table.
 *
 * This is deliberately the only table in the database and a placeholder for
 * the final AED model: columns may be added, changed or removed freely until
 * the real schema lands. Do not build long-lived features on it.
 */
export const aedDevices = sqliteTable("aed_devices", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	lat: real().notNull(),
	lon: real().notNull(),
	address: text(),
	city: text(),
	/** Free-form for now: "always", "business_hours", "restricted", "unknown". */
	access: text().notNull().default("unknown"),
	/** Free-form for now: "operational", "out_of_service", "unknown". */
	status: text().notNull().default("unknown"),
	/** Where the row came from; "manual" for hand-inserted dev data. */
	source: text().notNull().default("manual"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type AedDevice = typeof aedDevices.$inferSelect;
export type NewAedDevice = typeof aedDevices.$inferInsert;
