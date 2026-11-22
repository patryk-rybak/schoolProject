import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	real,
	sqliteTable,
	sqliteView,
	text,
} from "drizzle-orm/sqlite-core";

import { user } from "#backend/auth/schema.ts";

/**
 * Canonical AED storage.
 *
 * The columns mirror `src/server/ingest/canonical.ts`. There are two physical
 * tables because user-added and imported records have different lifecycles:
 *
 * - `aed_devices`     — records added by a signed-in user; verified by them.
 * - `aed_source_devices` — records imported from external sources; wiped and
 *   refilled on every source refresh, never verified.
 *
 * `aed_devices_combined` is a read-only SQL view over both tables. Later
 * processing (deduplication, publishing) reads the view and never mutates the
 * physical tables directly.
 *
 * Coordinates are mandatory in both tables. Canonical records without a point
 * (`location_status` other than `point`/`geocoded`) are intentionally not
 * stored: the project only publishes geolocated AEDs.
 */

/**
 * Column builders are recreated for each table. Drizzle column builders are
 * stateful, so they must not be shared between two `sqliteTable` definitions.
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: one obvious list of canonical columns.
function canonicalColumns() {
	return {
		id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		/** Canonical identity from `canonical.ts`; stable external id. */
		recordId: text("record_id").notNull(),
		sourceId: text("source_id").notNull(),
		sourceRecordId: text("source_record_id").notNull(),
		sourceUrl: text("source_url"),
		version: integer().notNull().default(1),
		name: text(),
		description: text(),
		note: text(),
		facilityType: text("facility_type"),
		deviceType: text("device_type"),
		accessType: text("access_type").notNull().default("unknown"),
		status: text().notNull().default("unknown"),
		verificationStatus: text("verification_status").notNull(),
		verifiedBy: text("verified_by"),
		verifiedByKind: text("verified_by_kind"),
		verifiedAt: text("verified_at"),
		confidence: real(),
		lat: real().notNull(),
		lon: real().notNull(),
		coordPrecisionM: real("coord_precision_m"),
		locationStatus: text("location_status").notNull().default("point"),
		geomSource: text("geom_source").notNull().default("source"),
		addressText: text("address_text"),
		addressKind: text("address_kind").notNull().default("none"),
		addressSource: text("address_source").notNull().default("source"),
		addressConfidence: real("address_confidence"),
		geocodeProvider: text("geocode_provider"),
		geocodeVersion: text("geocode_version"),
		geocodeConfidence: real("geocode_confidence"),
		geocodedAt: text("geocoded_at"),
		geocodeInputSha256: text("geocode_input_sha256"),
		geocodeNote: text("geocode_note"),
		claimStatus: text("claim_status").notNull().default("unclaimed"),
		claimedBy: text("claimed_by"),
		claimedAt: text("claimed_at"),
		claimNote: text("claim_note"),
		/** Canonical `field_provenance` as JSON text. */
		fieldProvenance: text("field_provenance"),
		/** Canonical `attributes` as JSON text (city, phone, opening hours, …). */
		attributes: text(),
		/** `user` or `source`/`seed`: which physical table a row belongs to. */
		origin: text().notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
	};
}

/**
 * User-added devices. A row is "signed" by `created_by_id`; the same user is
 * recorded as the verifier. Only this table can contain verified records.
 */
export const aedDevices = sqliteTable(
	"aed_devices",
	{
		...canonicalColumns(),
		createdById: text("created_by_id")
			.notNull()
			.references(() => user.id),
	},
	(table) => [
		index("aed_devices_record_id_idx").on(table.recordId),
		index("aed_devices_created_by_id_idx").on(table.createdById),
		index("aed_devices_coords_idx").on(table.lat, table.lon),
		check(
			"aed_devices_user_verification",
			sql`"verification_status" = 'verified' AND "verified_by" IS NOT NULL`,
		),
		check("aed_devices_user_origin", sql`"origin" = 'user'`),
		check(
			"aed_devices_has_point",
			sql`"lat" IS NOT NULL AND "lon" IS NOT NULL AND "location_status" IN ('point', 'geocoded')`,
		),
	],
);

/**
 * Records imported from external sources (including the development seed).
 * The table is wiped and refilled, so rows must never be verified or linked
 * to an account.
 */
export const aedSourceDevices = sqliteTable(
	"aed_source_devices",
	{
		...canonicalColumns(),
	},
	(table) => [
		index("aed_source_devices_record_id_idx").on(table.recordId),
		index("aed_source_devices_source_id_idx").on(table.sourceId),
		index("aed_source_devices_coords_idx").on(table.lat, table.lon),
		check(
			"aed_source_devices_unverified",
			sql`"verification_status" = 'unverified' AND "verified_by" IS NULL`,
		),
		check("aed_source_devices_origin", sql`"origin" IN ('source', 'seed')`),
		check(
			"aed_source_devices_has_point",
			sql`"lat" IS NOT NULL AND "lon" IS NOT NULL AND "location_status" IN ('point', 'geocoded')`,
		),
	],
);

/**
 * Combined read model used by the map and the dane.gov.pl exports.
 *
 * `created_by_id` is internal and is not published; it is exposed here only so
 * later deduplication can prefer/protect user records.
 */
export const aedDevicesCombined = sqliteView("aed_devices_combined", {
	...canonicalColumns(),
	createdById: text("created_by_id"),
}).existing();

export type AedDevice = typeof aedDevices.$inferSelect;
export type NewAedDevice = typeof aedDevices.$inferInsert;
export type AedSourceDevice = typeof aedSourceDevices.$inferSelect;
export type NewAedSourceDevice = typeof aedSourceDevices.$inferInsert;
export type CombinedAedDevice = typeof aedDevicesCombined.$inferSelect;
