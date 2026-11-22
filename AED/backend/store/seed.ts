import { addAedDevices, clearAedDevices, listAedDevices } from "./aed-store.ts";
import type { NewAedDevice } from "./schema.ts";

/**
 * Development seed: replaces the contents of `aed_devices` with neutral sample
 * records attributed to enabled IDs from `backend/ingest/datasources-config.json`.
 * Do not use this seed as evidence of a legal obligation or a verified device.
 */
const seed: NewAedDevice[] = [
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

clearAedDevices();
const inserted = addAedDevices(seed);

Bun.stdout.write(`Seeded ${inserted.length} AED devices:\n`);
for (const device of inserted) {
	Bun.stdout.write(
		`  #${device.id} ${device.name} (${device.city ?? "?"}) ` +
			`${device.lat},${device.lon} [${device.access}/${device.status}]\n`,
	);
}
Bun.stdout.write(`\nTotal rows: ${listAedDevices().length}\n`);
