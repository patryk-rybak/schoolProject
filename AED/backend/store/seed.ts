import {
	clearAllAedDevices,
	countAedDevices,
	countCombinedAedDevices,
	replaceAllSourceAedDevices,
} from "./aed-store.ts";
import {
	type CanonicalAedRecord,
	parseCanonicalAedRecord,
} from "../../src/server/ingest/canonical.ts";

/**
 * Development seed: full reset of all AED tables, then a few dummy records in
 * the external-source table (origin `seed`, attributed to enabled IDs from
 * `backend/ingest/datasources-config.json`) and a rebuild of the combined
 * table. Never used in production.
 */
interface SeedSpec {
	name: string;
	lat: number;
	lon: number;
	address: string | null;
	city: string;
	access: string;
	status: string;
	source: string;
}

const seed: SeedSpec[] = [
	{
		name: "AED — Ratusz w Krośnie",
		lat: 49.7005,
		lon: 21.4955,
		address: "ul. Staszica 1",
		city: "Krosno",
		access: "unknown",
		status: "unknown",
		source: "krosno",
	},
	{
		name: "AED — Urząd Miasta Marki",
		lat: 52.3175,
		lon: 21.1778,
		address: "ul. Piłsudskiego 32",
		city: "Marki",
		access: "unknown",
		status: "unknown",
		source: "marki",
	},
	{
		name: "AED — Obiekt publiczny (OSM)",
		lat: 52.2297,
		lon: 21.0122,
		address: null,
		city: "Warszawa",
		access: "unknown",
		status: "unknown",
		source: "openaedmap",
	},
	{
		name: "AED — Przystanek w Przemyślu",
		lat: 49.7764,
		lon: 22.7719,
		address: null,
		city: "Przemyśl",
		access: "unknown",
		status: "unknown",
		source: "przemysl",
	},
	{
		name: "AED — Urząd dzielnicy Warszawa",
		lat: 52.2319,
		lon: 21.0111,
		address: null,
		city: "Warszawa",
		access: "unknown",
		status: "unknown",
		source: "warszawa",
	},
];

function toRecord(spec: SeedSpec, index: number): CanonicalAedRecord {
	const recordId = `${spec.source}:seed-${index + 1}`;
	return parseCanonicalAedRecord({
		version: 1,
		record_id: recordId,
		source_id: spec.source,
		source_record_id: `seed-${index + 1}`,
		source_url: null,
		name: spec.name,
		description: null,
		note: null,
		facility_type: null,
		device_type: null,
		access_type: spec.access,
		status: spec.status,
		verification_status: "unverified",
		verified_by: null,
		verified_by_kind: null,
		verified_at: null,
		confidence: null,
		lat: spec.lat,
		lon: spec.lon,
		coord_precision_m: null,
		location_status: "point",
		geom_source: "registry",
		address_text: spec.address,
		address_kind: spec.address === null ? "none" : "building",
		address_source: "source",
		address_confidence: null,
		geocode_provider: null,
		geocode_version: null,
		geocode_confidence: null,
		geocoded_at: null,
		geocode_input_sha256: null,
		geocode_note: null,
		claim_status: "unclaimed",
		claimed_by: null,
		claimed_at: null,
		claim_note: null,
		field_provenance: { name: "seed", lat: "seed", lon: "seed" },
		attributes: { city: spec.city },
	});
}

clearAllAedDevices();
const records = seed.map(toRecord);
const { inserted } = replaceAllSourceAedDevices(records, "seed");

Bun.stdout.write(`Seeded ${inserted} AED devices into aed_source_devices:\n`);
for (const record of records) {
	// biome-ignore lint/complexity/useLiteralKeys: attributes is an index signature.
	const city = record.attributes?.["city"];
	Bun.stdout.write(
		`  ${record.record_id} ${record.name} (${String(city ?? "?")}) ` +
			`${record.lat},${record.lon} [${record.access_type}/${record.status}]\n`,
	);
}
Bun.stdout.write(
	`\nUser rows: ${countAedDevices()}, combined rows: ${countCombinedAedDevices()}\n`,
);
