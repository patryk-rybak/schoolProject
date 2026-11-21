import { count, eq } from "drizzle-orm";

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
	return db
		.insert(aedDevices)
		.values([...inputs])
		.returning()
		.all();
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

/** Development helper: wipe the table before seeding or resetting a demo. */
export function clearAedDevices(): void {
	db.delete(aedDevices).run();
}
