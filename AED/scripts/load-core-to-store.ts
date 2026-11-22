import { resolve } from "node:path";
import {
	addAedDevices,
	clearAedDevices,
	countAedDevices,
} from "../backend/store/aed-store.ts";
import type { NewAedDevice } from "../backend/store/schema.ts";
import type { CanonicalAedRecord } from "../src/server/ingest/canonical.ts";

/**
 * Minimal dev loader: replace `aed_devices` with the point records from the
 * core dataset built by `bun run ingest:run`. Run after ingestion:
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
const rows: NewAedDevice[] = [];
for (const record of dataset) {
	if (record.lat === null || record.lon === null) continue;
	const attrs = record.attributes ?? {};
	const text = (key: string): string | null => {
		const value = attrs[key];
		return typeof value === "string" && value !== "" ? value : null;
	};
	const address = [text("street"), text("house_number")]
		.filter(Boolean)
		.join(" ");
	// Canonical mapped fields (access_type, status) live at the record's top
	// level; per-source extras live in attributes.
	rows.push({
		name: record.name ?? `AED (${record.source_id})`,
		lat: record.lat,
		lon: record.lon,
		address:
			address || record.address_text || text("address_text") || null,
		city: text("city"),
		access: record.access_type ?? "unknown",
		status: record.status ?? "unknown",
		verificationStatus: record.verification_status ?? "unverified",
		verifiedBy: record.verified_by,
		verifiedByKind: record.verified_by_kind,
		verifiedAt: record.verified_at,
		source: record.source_id,
		canonical: JSON.stringify(record),
	});
}

clearAedDevices();
addAedDevices(rows);
console.log(
	`Załadowano ${countAedDevices()} rekordów z ${sourceCount} źródeł do aed_devices.`,
);
