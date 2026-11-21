import { mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Builds the canonical runtime JSON configs from the reviewed YAML examples.
 *
 * YAML stays the human-editable import format. `backend/ingest/sources/*.json`
 * is the immutable, canonical form stored in `source_config_version.config_json`.
 * Keys are sorted so the same document imported from YAML and JSON gets the same
 * semantic hash.
 */

const root = join(import.meta.dir, "..");
const exampleDir = join(root, "backend", "ingest", "examples");
const sourceDir = join(root, "backend", "ingest", "sources");

const exampleFiles = [
	"openaedmap-pl.yaml",
	"przemysl-sod.yaml",
	"krosno-dane-gov-pl.yaml",
	"marki-dane-gov-pl.yaml",
	"warszawa-api.yaml",
] as const;

const sortValue = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value === null || typeof value !== "object") return value;
	const record = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(record).sort()) {
		const child = record[key];
		if (child !== undefined) sorted[key] = sortValue(child);
	}
	return sorted;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

await mkdir(sourceDir, { recursive: true });

const written: string[] = [];
for (const file of exampleFiles) {
	const yaml = await Bun.file(join(exampleDir, file)).text();
	const parsed = Bun.YAML.parse(yaml);
	if (!isRecord(parsed)) {
		throw new Error(`${file}: top-level YAML value must be an object`);
	}
	const source = parsed["source"];
	if (!isRecord(source) || typeof source["id"] !== "string") {
		throw new Error(`${file}: source.id is missing`);
	}
	const sourceId = source["id"];
	if (!/^[a-z0-9][a-z0-9._-]*$/.test(sourceId)) {
		throw new Error(`${file}: invalid source.id ${sourceId}`);
	}
	const json = `${JSON.stringify(sortValue(parsed), null, "\t")}\n`;
	const target = join(sourceDir, `${sourceId}.json`);
	await Bun.write(target, json);
	written.push(`${sourceId} -> ${target}`);
}

console.log(`Built ${written.length} canonical source configs.`);
for (const line of written) console.log(`- ${line}`);
