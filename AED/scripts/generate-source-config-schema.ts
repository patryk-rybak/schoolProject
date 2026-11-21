#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSourceConfigJsonSchema } from "../src/server/ingest/config/schema.ts";

const args = process.argv.slice(2);
const check = args.includes("--check");
const outputArg = args.find((arg) => !arg.startsWith("--"));
const repoRoot = resolve(import.meta.dir, "..");
const outputPath = outputArg
	? resolve(process.cwd(), outputArg)
	: resolve(
			repoRoot,
			"src/server/ingest/config/source-config.generated.schema.json",
		);

const schema = buildSourceConfigJsonSchema();
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
