import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import {
	countSourceAedDevices,
	replaceAllSourceAedDevices,
} from "../backend/store/aed-store.ts";
import { db } from "../backend/store/index.ts";
import { aedSourceDevices } from "../backend/store/schema.ts";
import {
	type CanonicalAedRecord,
	isMappable,
} from "../src/server/ingest/canonical.ts";

/**
 * Dev-only startup bootstrap. `dev.db` and `.data/` are gitignored, so a fresh
 * checkout would otherwise start with an empty or five-row seed store while
 * the map expects the full core dataset. This script migrates the database and
 * loads `.data/core/core.json` when the imported source table is empty or
 * still holds only `db:seed` samples. Existing real imports are never touched.
 *
 * Wired into `bun run dev` and `bun run preview`. Production should still load
 * data explicitly via `db:load-core` / `db:refresh-sources`.
 */

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../backend/store/drizzle");
const CORE_PATH = resolve(process.cwd(), ".data/core/core.json");
const MAX_SEED_ROWS = 10;

function needsCoreLoad(): boolean {
	const count = countSourceAedDevices();
	if (count === 0) {
		return true;
	}
	if (count > MAX_SEED_ROWS) {
		return false;
	}
	const origins = db
		.select({ origin: aedSourceDevices.origin })
		.from(aedSourceDevices)
		.all();
	return origins.length > 0 && origins.every((row) => row.origin === "seed");
}

async function main(): Promise<void> {
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

	if (!needsCoreLoad()) {
		Bun.stdout.write("AED dev store already populated; skipping core load.\n");
		return;
	}
	if (!existsSync(CORE_PATH)) {
		console.warn(
			`AED dev store is empty and ${CORE_PATH} is missing. ` +
				"Run `bun run ingest:run --all` then `bun run db:load-core`.",
		);
		return;
	}

	const dataset = (await Bun.file(CORE_PATH).json()) as CanonicalAedRecord[];
	const records = dataset.filter(isMappable);
	if (records.length === 0) {
		console.warn("AED core dataset has no mappable point records; store left empty.");
		return;
	}
	const { inserted } = replaceAllSourceAedDevices(records);
	Bun.stdout.write(
		`AED dev store bootstrapped: loaded ${inserted} core point records ` +
			`from ${CORE_PATH}.\n`,
	);
}

main();
