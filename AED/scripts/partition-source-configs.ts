#!/usr/bin/env bun
// biome-ignore-all lint/complexity/useLiteralKeys: JSON objects are index signatures; dot access is blocked by noPropertyAccessFromIndexSignature.

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * Partitions the source registry into:
 *
 * - `backend/ingest/sources` — sources that yield row/point records and can be
 *   parsed without manual transcription;
 * - `backend/ingest/sources-excluded` — JPG/PNG maps, DOCX/PDF prose, e-mapa
 *   JavaScript pages, HTML prose without stable rows, and HTML pages without a
 *   table.
 *
 * Files are moved, never deleted. The excluded manifest keeps the reason so a
 * later editorial pass can promote a source back without losing its config.
 */

const root = join(import.meta.dir, "..");
const activeDir = join(root, "backend", "ingest", "sources");
const excludedDir = join(root, "backend", "ingest", "sources-excluded");
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject {
	return isObject(value) ? value : {};
}

function excludeReason(row: JsonObject): string | null {
	const source = asObject(row["source"]);
	const connector = asObject(row["connector"]);
	const id = source["id"];
	if (typeof id !== "string") return "missing source.id";
	const family = connector["family"];
	const parser = connector["parser"];

	if (parser === "manual") {
		return "manual transcription only (JPG/PNG/DOCX/PDF prose/e-mapa)";
	}
	if (parser === "pdf_table") {
		return "PDF document, not a machine-readable/tabular source";
	}
	if (family === "html_table" || family === "html_list") {
		return "HTML source: registry keeps only machine-readable/tabular formats";
	}
	return null;
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (!isObject(value)) return value;
	const sorted: JsonObject = {};
	for (const key of Object.keys(value).sort()) {
		const child = value[key];
		if (child !== undefined) sorted[key] = sortValue(child);
	}
	return sorted;
}

mkdirSync(excludedDir, { recursive: true });
const existingManifestPath = join(excludedDir, "excluded.json");
const existingManifest = existsSync(existingManifestPath)
	? (JSON.parse(readFileSync(existingManifestPath, "utf8")) as unknown)
	: null;
const existingRows =
	existingManifest &&
	isObject(existingManifest) &&
	Array.isArray(existingManifest["excluded"])
		? (existingManifest["excluded"] as unknown[])
		: [];
const movedById = new Map<string, JsonObject>();
for (const row of existingRows) {
	if (!isObject(row)) continue;
	const id = row["source_id"];
	if (typeof id === "string") movedById.set(id, row);
}
const files = readdirSync(activeDir)
	.filter((file) => file.endsWith(".json"))
	.sort();
const kept: string[] = [];

for (const file of files) {
	const path = join(activeDir, file);
	const row = JSON.parse(readFileSync(path, "utf8")) as unknown;
	if (!isObject(row)) throw new Error(`${file}: top-level object expected`);
	const source = asObject(row["source"]);
	const connector = asObject(row["connector"]);
	const id = source["id"];
	if (typeof id !== "string") throw new Error(`${file}: source.id missing`);
	const reason = excludeReason(row);
	if (!reason) {
		kept.push(id);
		movedById.delete(id);
		continue;
	}
	const target = join(excludedDir, file);
	if (existsSync(target)) {
		throw new Error(`${file}: already exists in sources-excluded`);
	}
	renameSync(path, target);
	movedById.set(id, {
		family: typeof connector["family"] === "string" ? connector["family"] : "?",
		parser: typeof connector["parser"] === "string" ? connector["parser"] : "?",
		reason,
		source_id: id,
		source_name: typeof source["name"] === "string" ? source["name"] : id,
	});
}

for (const file of readdirSync(excludedDir).filter((entry) =>
	entry.endsWith(".json"),
)) {
	if (file === "excluded.json") continue;
	const row = JSON.parse(
		readFileSync(join(excludedDir, file), "utf8"),
	) as unknown;
	if (!isObject(row)) continue;
	const source = asObject(row["source"]);
	const connector = asObject(row["connector"]);
	const id = source["id"];
	if (typeof id !== "string") continue;
	movedById.set(id, {
		family: typeof connector["family"] === "string" ? connector["family"] : "?",
		parser: typeof connector["parser"] === "string" ? connector["parser"] : "?",
		reason: excludeReason(row) ?? "excluded by registry policy",
		source_id: id,
		source_name: typeof source["name"] === "string" ? source["name"] : id,
	});
}

const moved = [...movedById.values()].sort((left, right) =>
	String(left["source_id"]).localeCompare(String(right["source_id"]), "pl"),
);
const manifest = {
	generated_at: new Date().toISOString(),
	policy:
		"Only machine-readable/tabular sources (CSV, JSON, GeoJSON, KML) stay in backend/ingest/sources. All HTML, PDF, JPG/PNG, DOCX and e-mapa sources are moved here.",
	active_count: kept.length,
	excluded_count: moved.length,
	excluded: moved,
};
writeFileSync(
	join(excludedDir, "excluded.json"),
	`${JSON.stringify(sortValue(manifest), null, "\t")}\n`,
	"utf8",
);

const lines = [
	"# Źródła wyłączone z rejestru tabularnego",
	"",
	`Wygenerowano: ${manifest.generated_at}`,
	"",
	manifest.policy,
	"",
	`Aktywne: **${kept.length}** · wyłączone: **${moved.length}**`,
	"",
	"| źródło | rodzina | powód |",
	"| --- | --- | --- |",
	...moved.map(
		(row) =>
			`| \`${row["source_id"]}\` | \`${row["family"]}/${row["parser"]}\` | ${row["reason"]} |`,
	),
	"",
	"Pliki pozostają w tym katalogu. Aby przywrócić źródło, przenieś JSON z powrotem do `backend/ingest/sources/` i uruchom `bun run config:normalize`.",
	"",
];
writeFileSync(join(excludedDir, "README.md"), lines.join("\n"), "utf8");

console.log(`Kept ${kept.length} active configs, excluded ${moved.length}.`);
for (const row of moved) {
	console.log(`- ${row["source_id"]}: ${row["reason"]}`);
}
