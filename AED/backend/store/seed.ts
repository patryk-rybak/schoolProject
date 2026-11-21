import { addAedDevices, clearAedDevices, listAedDevices } from "./aed-store.ts";
import type { NewAedDevice } from "./schema.ts";

/**
 * Development seed: replaces the contents of `aed_devices` with a few dummy
 * records so the map/API work can start before real ingestion exists.
 */
const seed: NewAedDevice[] = [
	{
		name: "AED — Dworzec Centralny",
		lat: 52.2285,
		lon: 21.0031,
		address: "Al. Jerozolimskie 54",
		city: "Warszawa",
		access: "always",
		status: "operational",
		source: "seed",
	},
	{
		name: "AED — Galeria Krakowska",
		lat: 50.0682,
		lon: 19.9476,
		address: "ul. Pawia 5",
		city: "Kraków",
		access: "business_hours",
		status: "operational",
		source: "seed",
	},
	{
		name: "AED — Dworzec Gdańsk Główny",
		lat: 54.3562,
		lon: 18.6441,
		address: "ul. Podwale Grodzkie 1",
		city: "Gdańsk",
		access: "always",
		status: "unknown",
		source: "seed",
	},
	{
		name: "AED — Rynek we Wrocławiu",
		lat: 51.1101,
		lon: 17.0316,
		address: "Rynek 1",
		city: "Wrocław",
		access: "business_hours",
		status: "out_of_service",
		source: "seed",
	},
	{
		name: "AED — Stary Rynek w Poznaniu",
		lat: 52.4083,
		lon: 16.9335,
		address: "Stary Rynek 1",
		city: "Poznań",
		access: "unknown",
		status: "unknown",
		source: "seed",
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
