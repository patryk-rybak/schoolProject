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
 * Development seed: full reset of both AED tables, then a few dummy records in
 * the external-source table (origin `seed`). Never used in production.
 */
interface SeedSpec {
	name: string;
	lat: number;
	lon: number;
	address: string;
	city: string;
	access: string;
	status: string;
}

const seed: SeedSpec[] = [
	{
		name: "AED — Dworzec Centralny",
		lat: 52.2285,
		lon: 21.0031,
		address: "Al. Jerozolimskie 54",
		city: "Warszawa",
		access: "always",
		status: "operational",
	},
	{
		name: "AED — Galeria Krakowska",
		lat: 50.0682,
		lon: 19.9476,
		address: "ul. Pawia 5",
		city: "Kraków",
		access: "business_hours",
		status: "operational",
	},
	{
		name: "AED — Dworzec Gdańsk Główny",
		lat: 54.3562,
		lon: 18.6441,
		address: "ul. Podwale Grodzkie 1",
		city: "Gdańsk",
		access: "always",
		status: "unknown",
	},
	{
		name: "AED — Rynek we Wrocławiu",
		lat: 51.1101,
		lon: 17.0316,
		address: "Rynek 1",
		city: "Wrocław",
		access: "business_hours",
		status: "out_of_service",
	},
	{
		name: "AED — Stary Rynek w Poznaniu",
		lat: 52.4083,
		lon: 16.9335,
		address: "Stary Rynek 1",
		city: "Poznań",
		access: "unknown",
		status: "unknown",
	},
];

function toRecord(spec: SeedSpec, index: number): CanonicalAedRecord {
	const recordId = `seed:${index + 1}`;
	return parseCanonicalAedRecord({
		version: 1,
		record_id: recordId,
		source_id: "seed",
		source_record_id: String(index + 1),
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
		address_kind: "building",
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
