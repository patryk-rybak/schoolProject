import { resolve } from "node:path";
import {
	countCombinedAedDevices,
	replaceAllSourceAedDevices,
} from "../backend/store/aed-store.ts";
import {
	type CanonicalAedRecord,
	isMappable,
} from "../src/server/ingest/canonical.ts";

/**
 * Full external-source refresh.
 *
 * Replaces every row in `aed_source_devices` with the point records from the
 * core dataset built by `bun run ingest:run`. The user table (`aed_devices`)
 * is a different physical table and is never touched.
 *
 * Run after ingestion:
 *
 *   bun run ingest:run --all
 *   bun run db:load-core
 */

const corePath = resolve(process.cwd(), ".data/core/core.json");
const file = Bun.file(corePath);
if (!(await file.exists())) {
	console.error(`Brak ${corePath}. Najpierw uruchom: bun run ingest:run --all`);
	process.exit(1);
}

const dataset = (await file.json()) as CanonicalAedRecord[];
const manifestFile = Bun.file(resolve(process.cwd(), ".data/core/manifest.json"));
const sourceCount = (await manifestFile.exists())
	? ((await manifestFile.json()) as { source_count: number }).source_count
	: new Set(dataset.map((record) => record.source_id)).size;

const storable = dataset.filter(isMappable);
const { deleted, inserted } = replaceAllSourceAedDevices(storable);
console.log(
	`Odświeżono źródła: usunięto ${deleted}, wstawiono ${inserted} rekordów ` +
		`z ${sourceCount} źródeł do aed_source_devices.`,
);
console.log(`Razem w tabeli łączonej: ${countCombinedAedDevices()} rekordów.`);
