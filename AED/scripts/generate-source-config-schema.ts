#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDatasourcesConfigJsonSchema } from "../src/server/ingest/config/schema.ts";

const args = process.argv.slice(2);
const check = args.includes("--check");
const repoRoot = resolve(import.meta.dir, "..");

const outputPath = resolve(
	repoRoot,
	"backend/ingest/datasources-config.schema.json",
);

const schema = buildDatasourcesConfigJsonSchema();
const text = `${JSON.stringify(schema, null, 2)}\n`;

if (check) {
	if (!existsSync(outputPath)) {
		console.error(`Brak wygenerowanego schematu: ${outputPath}`);
		process.exit(1);
	}
	const current = readFileSync(outputPath, "utf8");
	if (current !== text) {
		console.error(
			`Schemat jest nieaktualny: ${outputPath}. Uruchom: bun scripts/generate-source-config-schema.ts`,
		);
		process.exit(1);
	}
	console.log(`OK ${outputPath}`);
} else {
	writeFileSync(outputPath, text);
	console.log(`Zapisano ${outputPath}`);
}
