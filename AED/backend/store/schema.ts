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
	/** "verified" or "unverified": confirmed by a verifier or a check date. */
	verificationStatus: text("verification_status")
		.notNull()
		.default("unverified"),
	/** Who verified: email, company, organization, public body, community. */
	verifiedBy: text("verified_by"),
	/** Kind of verifier: person/email/company/organization/public_body/community. */
	verifiedByKind: text("verified_by_kind"),
	/** When it was verified (ISO date or timestamp as text). */
	verifiedAt: text("verified_at"),
	/** Where the row came from; "manual" for hand-inserted dev data. */
	source: text().notNull().default("manual"),
	/**
	 * Full canonical AED record (src/server/ingest/canonical.ts) as JSON.
	 * Null for legacy dev rows that only carry the flat columns above.
	 */
	canonical: text(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type AedDevice = typeof aedDevices.$inferSelect;
export type NewAedDevice = typeof aedDevices.$inferInsert;
