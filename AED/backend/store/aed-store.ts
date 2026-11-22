import { and, count, desc, eq } from "drizzle-orm";

import type { CanonicalAedRecord } from "../../src/server/ingest/canonical.ts";
import { db } from "./index.ts";
import {
	type AedDevice,
	type AedSourceDevice,
	aedDevices,
	aedDevicesCombined,
	aedSourceDevices,
	type NewAedDevice,
	type NewAedSourceDevice,
	type NewCombinedAedDevice,
} from "./schema.ts";

/**
 * Data-access layer for the canonical AED tables.
 *
 * Write paths are table-specific:
 * - `addUserAedDevice` stores a signed, verified record in `aed_devices` and
 *   mirrors it into the combined table in the same transaction;
 * - `replaceSourceAedDevices` stores unverified imported records in
 *   `aed_source_devices`, then rebuilds the combined table from both source
 *   tables, never touching user rows.
 *
 * Read paths used by the map and exports go through the materialized
 * `aed_devices_combined` table.
 */

/** SQLite stays well below the variable limit with this batch size. */
const INSERT_CHUNK_SIZE = 40;
const USER_ORIGIN = "user";
const SOURCE_ORIGIN = "source";
const SEED_ORIGIN = "seed";

export type SourceOrigin = typeof SOURCE_ORIGIN | typeof SEED_ORIGIN;

interface CanonicalColumns {
	recordId: string;
	sourceId: string;
	sourceRecordId: string;
	sourceUrl: string | null;
	version: number;
	name: string | null;
	description: string | null;
	note: string | null;
	facilityType: string | null;
	deviceType: string | null;
	accessType: string;
	status: string;
	confidence: number | null;
	lat: number;
	lon: number;
	coordPrecisionM: number | null;
	locationStatus: string;
	geomSource: string;
	addressText: string | null;
	addressKind: string;
	addressSource: string;
	addressConfidence: number | null;
	geocodeProvider: string | null;
	geocodeVersion: string | null;
	geocodeConfidence: number | null;
	geocodedAt: string | null;
	geocodeInputSha256: string | null;
	geocodeNote: string | null;
	claimStatus: string;
	claimedBy: string | null;
	claimedAt: string | null;
	claimNote: string | null;
	fieldProvenance: string | null;
	attributes: string | null;
}

function jsonOrNull(value: Record<string, unknown> | undefined): string | null {
	return value === undefined ? null : JSON.stringify(value);
}

/**
 * Checks the mandatory-coordinate invariant and maps the canonical record to
 * shared store columns. Address-only/unresolved/conflict records are rejected
 * because this project only stores geolocated AEDs.
 */
function canonicalColumns(record: CanonicalAedRecord): CanonicalColumns {
	if (record.lat === null || record.lon === null) {
		throw new Error(
			`Rekord ${record.record_id} nie ma współrzędnych i nie może trafić do bazy.`,
		);
	}
	if (
		record.location_status !== "point" &&
		record.location_status !== "geocoded"
	) {
		throw new Error(
			`Rekord ${record.record_id} ma location_status=${record.location_status}; zapisujemy tylko point/geocoded.`,
		);
	}
	return {
		recordId: record.record_id,
		sourceId: record.source_id,
		sourceRecordId: record.source_record_id,
		sourceUrl: record.source_url,
		version: record.version,
		name: record.name,
		description: record.description,
		note: record.note,
		facilityType: record.facility_type,
		deviceType: record.device_type,
		accessType: record.access_type ?? "unknown",
		status: record.status ?? "unknown",
		confidence: record.confidence,
		lat: record.lat,
		lon: record.lon,
		coordPrecisionM: record.coord_precision_m,
		locationStatus: record.location_status,
		geomSource: record.geom_source,
		addressText: record.address_text,
		addressKind: record.address_kind,
		addressSource: record.address_source,
		addressConfidence: record.address_confidence,
		geocodeProvider: record.geocode_provider,
		geocodeVersion: record.geocode_version,
		geocodeConfidence: record.geocode_confidence,
		geocodedAt: record.geocoded_at,
		geocodeInputSha256: record.geocode_input_sha256,
		geocodeNote: record.geocode_note,
		claimStatus: record.claim_status,
		claimedBy: record.claimed_by,
		claimedAt: record.claimed_at,
		claimNote: record.claim_note,
		fieldProvenance: jsonOrNull(record.field_provenance),
		attributes: jsonOrNull(record.attributes),
	};
}

/**
 * Row for the user table. The author and verifier are always the same account:
 * adding a device through the authenticated form is the only verification
 * path, so verification fields are forced here instead of trusted from input.
 */
export function canonicalToUserRow(
	record: CanonicalAedRecord,
	createdById: string,
): NewAedDevice {
	if (createdById.trim() === "") {
		throw new Error("canonicalToUserRow: createdById jest wymagane.");
	}
	return {
		...canonicalColumns(record),
		verificationStatus: "verified",
		verifiedBy: createdById,
		verifiedByKind: "person",
		verifiedAt: record.verified_at ?? new Date().toISOString(),
		origin: USER_ORIGIN,
		createdById,
	};
}

/**
 * Row for the external-source table. Imported records are always unverified
 * and never linked to an account, even if the upstream payload claims
 * otherwise.
 */
export function canonicalToSourceRow(
	record: CanonicalAedRecord,
	origin: SourceOrigin = SOURCE_ORIGIN,
): NewAedSourceDevice {
	return {
		...canonicalColumns(record),
		verificationStatus: "unverified",
		verifiedBy: null,
		verifiedByKind: null,
		verifiedAt: null,
		origin,
	};
}

function insertInChunks<T>(
	insertRows: (batch: T[]) => unknown,
	rows: readonly T[],
): void {
	for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
		insertRows(rows.slice(index, index + INSERT_CHUNK_SIZE));
	}
}

type StoreTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type CombinedInsert = Omit<NewCombinedAedDevice, "id">;

/** Drops the source-table id; the combined table has its own autoincrement id. */
function omitId<T extends { id: number }>(row: T): Omit<T, "id"> {
	const { id: _id, ...rest } = row;
	return rest;
}

function userRowToCombined(row: AedDevice): CombinedInsert {
	return { ...omitId(row), createdById: row.createdById };
}

function sourceRowToCombined(row: AedSourceDevice): CombinedInsert {
	return { ...omitId(row), createdById: null };
}

function insertCombinedRows(
	tx: StoreTransaction,
	rows: readonly CombinedInsert[],
): void {
	insertInChunks(
		(chunk) => tx.insert(aedDevicesCombined).values(chunk).run(),
		rows,
	);
}

/** Clears and repopulates the materialized combined table inside `tx`. */
function rebuildCombined(tx: StoreTransaction): {
	userRows: number;
	sourceRows: number;
} {
	tx.delete(aedDevicesCombined).run();
	const userRows = tx.select().from(aedDevices).all();
	const sourceRows = tx.select().from(aedSourceDevices).all();
	insertCombinedRows(tx, userRows.map(userRowToCombined));
	insertCombinedRows(tx, sourceRows.map(sourceRowToCombined));
	return { userRows: userRows.length, sourceRows: sourceRows.length };
}

/**
 * Stores one signed, verified user record and mirrors it into the combined
 * table in the same transaction.
 */
export function addUserAedDevice(
	record: CanonicalAedRecord,
	createdById: string,
): AedDevice {
	return db.transaction((tx) => {
		const row = tx
			.insert(aedDevices)
			.values(canonicalToUserRow(record, createdById))
			.returning()
			.get();
		if (!row) {
			throw new Error("addUserAedDevice: insert returned no row");
		}
		insertCombinedRows(tx, [userRowToCombined(row)]);
		return row;
	});
}

/** Replaces every imported row for one source inside a transaction. */
export function replaceSourceAedDevices(
	sourceId: string,
	records: readonly CanonicalAedRecord[],
	origin: SourceOrigin = SOURCE_ORIGIN,
): { deleted: number; inserted: number } {
	return db.transaction((tx) => {
		const deleted = tx
			.delete(aedSourceDevices)
			.where(eq(aedSourceDevices.sourceId, sourceId))
			.returning({ id: aedSourceDevices.id })
			.all().length;
		const rows = dedupeRecords(records).map((record) =>
			canonicalToSourceRow(record, origin),
		);
		insertInChunks(
			(chunk) => tx.insert(aedSourceDevices).values(chunk).run(),
			rows,
		);
		rebuildCombined(tx);
		return { deleted, inserted: rows.length };
	});
}

/**
 * Replaces the whole source table (daily full refresh / `db:load-core`).
 * User rows live in another table and cannot be affected by this operation.
 */
export function replaceAllSourceAedDevices(
	records: readonly CanonicalAedRecord[],
	origin: SourceOrigin = SOURCE_ORIGIN,
): { deleted: number; inserted: number } {
	return db.transaction((tx) => {
		const deleted = tx
			.delete(aedSourceDevices)
			.returning({ id: aedSourceDevices.id })
			.all().length;
		const rows = dedupeRecords(records).map((record) =>
			canonicalToSourceRow(record, origin),
		);
		insertInChunks(
			(chunk) => tx.insert(aedSourceDevices).values(chunk).run(),
			rows,
		);
		rebuildCombined(tx);
		return { deleted, inserted: rows.length };
	});
}

/** The same canonical id must not be inserted twice in one refresh. */
function dedupeRecords(
	records: readonly CanonicalAedRecord[],
): CanonicalAedRecord[] {
	const seen = new Set<string>();
	const unique: CanonicalAedRecord[] = [];
	for (const record of records) {
		if (seen.has(record.record_id)) {
			continue;
		}
		seen.add(record.record_id);
		unique.push(record);
	}
	return unique;
}

export function listAedDevices(): AedDevice[] {
	return db.select().from(aedDevices).all();
}

/** Devices added by one account, newest first. */
export function listUserAedDevices(createdById: string): AedDevice[] {
	return db
		.select()
		.from(aedDevices)
		.where(eq(aedDevices.createdById, createdById))
		.orderBy(desc(aedDevices.id))
		.all();
}

export function listSourceAedDevices(): AedSourceDevice[] {
	return db.select().from(aedSourceDevices).all();
}

/** Materialized combined table: user records first, then imported records. */
export function listCombinedAedDevices() {
	return db
		.select()
		.from(aedDevicesCombined)
		.orderBy(aedDevicesCombined.id)
		.all();
}

export function countAedDevices(): number {
	return db.select({ value: count() }).from(aedDevices).get()?.value ?? 0;
}

export function countSourceAedDevices(): number {
	return db.select({ value: count() }).from(aedSourceDevices).get()?.value ?? 0;
}

export function countCombinedAedDevices(): number {
	return (
		db.select({ value: count() }).from(aedDevicesCombined).get()?.value ?? 0
	);
}

/** Rebuilds the materialized combined table from both source tables. */
export function refreshCombinedAedDevices(): {
	userRows: number;
	sourceRows: number;
} {
	return db.transaction((tx) => rebuildCombined(tx));
}

/**
 * Deletes one user-owned record from both the user table and the combined
 * table. Returns false when the id does not belong to `createdById`.
 */
export function deleteUserAedDevice(id: number, createdById: string): boolean {
	return db.transaction((tx) => {
		const row = tx
			.select({ recordId: aedDevices.recordId })
			.from(aedDevices)
			.where(
				and(eq(aedDevices.id, id), eq(aedDevices.createdById, createdById)),
			)
			.get();
		if (!row) {
			return false;
		}
		tx.delete(aedDevices)
			.where(
				and(eq(aedDevices.id, id), eq(aedDevices.createdById, createdById)),
			)
			.run();
		tx.delete(aedDevicesCombined)
			.where(
				and(
					eq(aedDevicesCombined.recordId, row.recordId),
					eq(aedDevicesCombined.origin, USER_ORIGIN),
				),
			)
			.run();
		return true;
	});
}

/** Removes the imported rows of one source and refreshes the combined table. */
export function deleteSourceAedDevices(sourceId: string): number {
	return db.transaction((tx) => {
		const deleted = tx
			.delete(aedSourceDevices)
			.where(eq(aedSourceDevices.sourceId, sourceId))
			.returning({ id: aedSourceDevices.id })
			.all().length;
		if (deleted > 0) {
			rebuildCombined(tx);
		}
		return deleted;
	});
}

/** Development reset only: removes user, source and combined rows. */
export function clearAllAedDevices(): void {
	db.transaction((tx) => {
		tx.delete(aedDevicesCombined).run();
		tx.delete(aedSourceDevices).run();
		tx.delete(aedDevices).run();
	});
}
