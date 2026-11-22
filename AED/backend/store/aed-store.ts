import { count, eq } from "drizzle-orm";

import type { CanonicalAedRecord } from "../../src/server/ingest/canonical.ts";
import { db } from "./index.ts";
import { aedDevices, type AedDevice, type NewAedDevice } from "./schema.ts";

/**
 * Temporary data-access layer for the development table.
 *
 * Other parts of the project should import these functions instead of touching
 * `db` or the table directly, so the storage can be swapped later without
 * rewriting call sites.
 */

export function addAedDevice(input: NewAedDevice): AedDevice {
	const row = db.insert(aedDevices).values(input).returning().get();
	if (!row) {
		throw new Error("aed-store: insert returned no row");
	}
	return row;
}

export function addAedDevices(inputs: readonly NewAedDevice[]): AedDevice[] {
	if (inputs.length === 0) {
		return [];
	}
	// SQLite limits the number of bound variables per statement (default 999
	// in older builds, 32766 in newer ones). Chunking keeps bulk ingest working
	// even with the extra `canonical` JSON column on every row.
	const CHUNK_SIZE = 100;
	const inserted: AedDevice[] = [];
	for (let offset = 0; offset < inputs.length; offset += CHUNK_SIZE) {
		const chunk = inputs.slice(offset, offset + CHUNK_SIZE);
		inserted.push(
			...db
				.insert(aedDevices)
				.values([...chunk])
				.returning()
				.all(),
		);
	}
	return inserted;
}

/**
 * Flattened store columns for a canonical record. The full record is kept as
 * JSON in `canonical`; the flat columns feed the map and the gov-api exports.
 */
export function canonicalToRow(
	record: CanonicalAedRecord,
	source?: string,
): NewAedDevice {
	if (record.lat === null || record.lon === null) {
		throw new Error(
			"canonicalToRow: rekord bez punktu nie trafia do tabeli mapy.",
		);
	}
	const attributes = record.attributes ?? {};
	const attributeText = (key: string): string | null => {
		const value = attributes[key];
		return typeof value === "string" && value !== "" ? value : null;
	};
	const streetAddress = [attributeText("street"), attributeText("house_number")]
		.filter(Boolean)
		.join(" ");
	return {
		name: record.name ?? `AED (${record.source_id})`,
		lat: record.lat,
		lon: record.lon,
		address: record.address_text ?? (streetAddress || null),
		city: attributeText("city"),
		access: record.access_type ?? "unknown",
		status: record.status ?? "unknown",
		verificationStatus: record.verification_status ?? "unverified",
		verifiedBy: record.verified_by,
		verifiedByKind: record.verified_by_kind,
		verifiedAt: record.verified_at,
		source: source ?? record.source_id,
		canonical: JSON.stringify(record),
	};
}

export function listAedDevices(): AedDevice[] {
	return db.select().from(aedDevices).all();
}

export function getAedDevice(id: number): AedDevice | null {
	return (
		db.select().from(aedDevices).where(eq(aedDevices.id, id)).get() ?? null
	);
}

export function countAedDevices(): number {
	return db.select({ value: count() }).from(aedDevices).get()?.value ?? 0;
}

/** Remove all rows ingested from one source (used before re-importing). */
export function deleteAedDevicesBySource(source: string): number {
	return db
		.delete(aedDevices)
		.where(eq(aedDevices.source, source))
		.returning({ id: aedDevices.id })
		.all().length;
}

/** Development helper: wipe the table before seeding or resetting a demo. */
export function clearAedDevices(): void {
	db.delete(aedDevices).run();
}
