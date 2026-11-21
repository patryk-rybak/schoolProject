// biome-ignore-all lint/complexity/useLiteralKeys: CSV rows are index signatures; dot access is blocked by noPropertyAccessFromIndexSignature.
// biome-ignore-all lint/style/useBlockStatements: compact one-line format switch.

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Builds a valid, intentionally conservative config scaffold for every source
 * in the normalized inventory. Existing configs are never overwritten.
 *
 * The scaffolds are a starting point for a human or a source-specific worker:
 * every unknown selector/field is marked in `source.notes`, `enabled` stays
 * false, and publication stays closed. The Zod loader is the gate that proves
 * the generated JSON conforms to the common contract.
 */

const root = join(import.meta.dir, "..");
const inventoryPath = join(
	root,
	"docs",
	"research",
	"source-inventory",
	"normalized-source-inventory.csv",
);
const sourceDir = join(root, "backend", "ingest", "sources");
const excludedDir = join(root, "backend", "ingest", "sources-excluded");

type InventoryRow = Record<string, string>;

function parseCsv(text: string): InventoryRow[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const next = text[index + 1];
		if (quoted) {
			if (char === '"' && next === '"') {
				field += '"';
				index += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"') {
			quoted = true;
		} else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else if (char !== "\r") {
			field += char;
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	const [header, ...body] = rows;
	if (!header) return [];
	return body
		.filter((entry) => entry.some((value) => value.trim().length > 0))
		.map((entry) =>
			Object.fromEntries(
				header.map((key, index) => [key, entry[index]?.trim() ?? ""]),
			),
		);
}

function numberOrNull(value: string): number | null {
	const normalized = value.replace(/\s+/g, "").replace(",", ".");
	if (!normalized) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function licenseUrl(licenseId: string): string | undefined {
	switch (licenseId) {
		case "ODbL-1.0":
			return "https://opendatacommons.org/licenses/odbl/1-0/";
		case "CC0-1.0":
			return "https://creativecommons.org/publicdomain/zero/1.0/";
		case "CC-BY-4.0":
			return "https://creativecommons.org/licenses/by/4.0/";
		default:
			return undefined;
	}
}

function manualFormat(url: string): string {
	const lower = url.toLowerCase();
	if (lower.endsWith(".pdf")) return "pdf";
	if (lower.endsWith(".docx")) return "docx";
	if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
	if (lower.endsWith(".csv")) return "csv";
	if (lower.includes("emapa")) return "emapa";
	return "html";
}

function terytCodes(value: string): string[] {
	return value
		.split(/[;, ]+/)
		.map((entry) => entry.trim())
		.filter((entry) => /^\d{2,7}$/.test(entry));
}

function safeRecordCount(row: InventoryRow): number | null {
	return numberOrNull(row["expected_records"] ?? "");
}

function scaffold(row: InventoryRow): Record<string, unknown> {
	const id = row["source_id"] ?? "";
	if (!/^[a-z0-9][a-z0-9._-]{0,31}$/.test(id)) {
		throw new Error(`Invalid source_id: ${id}`);
	}
	const name = row["source_name"] || id;
	const url = (row["source_url"] || "").replace(/^http:\/\//, "https://");
	if (!url.startsWith("https://")) {
		throw new Error(`${id}: source_url must be https`);
	}
	const licenseId = row["license_id"] || "NOASSERTION";
	const openLicense = row["license_status"] === "open";
	const publishEnabled =
		openLicense && (row["publish_enabled"] || "").toLowerCase() === "true";
	const hasCoords = (row["has_coords"] || "").toLowerCase() === "yes";
	const parser = row["parser"] === "none" ? "manual" : row["parser"];
	const family =
		parser === "manual"
			? "manual"
			: (row["connector_family"] as string) || "html_table";
	const expected = safeRecordCount(row);
	const blockers = (row["blockers"] || "")
		.split(";")
		.map((entry) => entry.trim())
		.filter(Boolean);
	const notes = [
		`Scaffold z inwentarza 69 źródeł (${row["class_raw"] || "?"}, ${row["priority"] || "?"}, readiness=${row["readiness"] || "?"}).`,
		blockers.length > 0 ? `Blockery: ${blockers.join(", ")}.` : "",
		row["notes"] || "",
	]
		.filter(Boolean)
		.join(" ");

	const source: Record<string, unknown> = {
		id,
		name,
		publisher: row["unit"] || name,
		homepage_url: url,
		access_type:
			parser === "manual" ? "manual" : (row["access_type"] as string) || "html",
		reliability_tier: id === "openaedmap" ? "community" : "official_local",
		license: {
			id: licenseId,
			...(licenseUrl(licenseId) ? { url: licenseUrl(licenseId) } : {}),
			...(licenseId === "NOASSERTION"
				? { attribution: `${row["unit"] || name}: brak deklaracji licencji` }
				: { attribution: `${row["unit"] || name} — ${licenseId}` }),
			...(licenseId === "ODbL-1.0" ? { share_alike: true } : {}),
		},
		coverage: {
			country: "PL",
			...(terytCodes(row["teryt"] || "").length > 0
				? { teryt: terytCodes(row["teryt"] || "") }
				: {}),
			notes: `${row["voivodeship"] || "Polska"}; ${row["unit_type"] || "jednostka"}; ${notes}`,
		},
		update_frequency: "unknown",
		enabled: false,
		notes,
	};

	const parse: Record<string, unknown> =
		parser === "manual"
			? {
					manual: {
						document_url: url,
						format: manualFormat(url),
						instructions:
							"Ręczna transkrypcja albo OCR. Uzupełnij plik transkrypcji i dopiero potem włącz źródło.",
					},
				}
			: parser === "html_table"
				? {
						encoding: "utf-8",
						trim_headers: true,
						html_table: {
							select: "table",
							table_index: 0,
							header_row: 0,
							orientation: "rows",
							normalize_headers: true,
							trim: true,
							collapse_whitespace: true,
							empty_as_null: true,
							min_records: 1,
						},
					}
				: parser === "html_list"
					? {
							encoding: "utf-8",
							trim_headers: true,
							html_list: {
								select: "li",
								trim: true,
								collapse_whitespace: true,
								empty_as_null: true,
								min_records: 1,
							},
						}
					: parser === "kml"
						? { encoding: "utf-8", kml: { point_only: true } }
						: { encoding: "utf-8", json: { unwrap_string: false } };

	const map: Record<string, unknown> = {
		name: { field: "Nazwa" },
		address_text: { field: "Adres" },
		city: { const: row["unit"] || name },
		country_code: { const: "PL" },
		facility_type: { const: "unknown" },
		asset_type: undefined,
		access_type: { const: "unknown" },
		status: { const: "unknown" },
		verification_status: { const: "unverified" },
		confidence: { const: 0.3 },
		source_url: { const: url },
	};
	delete map["asset_type"];
	if (hasCoords) {
		map["lat"] = { func: "to_float", args: [{ field: "lat" }] };
		map["lon"] = { func: "to_float", args: [{ field: "lon" }] };
		map["coord_precision_m"] = { const: 100 };
	}

	const config: Record<string, unknown> = {
		version: 1,
		source,
		connector: {
			family,
			parser,
			notes,
		},
		fetch: {
			url,
			method: "GET",
			timeout_ms: 30000,
			retries: { max: 2, backoff_ms: 1500 },
			rate_limit: { requests_per_minute: 6 },
			conditional: { etag: true, last_modified: true },
			pagination: { type: "none" },
			user_agent:
				"AED-PL-ingest/0.1 (+https://example.org/aed; contact: data@example.org)",
		},
		parse,
		records: {
			path: "$",
			identity: {
				source_record_id: {
					template: `${id}:{row_index}`,
					vars: { row_index: { builtin: "row_index" } },
				},
				stable: false,
			},
		},
		map,
		validate: {
			required: ["name"],
			require_location: hasCoords ? "point" : "address_or_point",
			coords: {
				bbox: [14.07, 49.0, 24.15, 54.84],
				on_invalid: "review",
				on_missing: "review",
			},
			enums: true,
			on_error: "review",
		},
		drift: {
			baseline: {
				record_count: expected,
				generated_at: "2026-11-21",
			},
			schema: {
				on_new_field: "review",
				on_missing_field: "review",
				on_type_change: "review",
				on_header_order_change: "ignore",
			},
			volume: {
				min_records: Math.min(1, expected ?? 1),
				max_delta_ratio: 0.5,
				on_breach: "review",
			},
			quality: {
				max_coord_invalid_ratio: hasCoords ? 0.1 : 1,
				max_duplicate_id_ratio: 0.1,
				on_breach: "review",
			},
			axis: {
				enabled: hasCoords,
				max_suspicious_ratio: 0.1,
				on_breach: "review",
			},
			actions: { warn: "log", review: "quarantine", fail: "disable" },
		},
		publish: {
			enabled: publishEnabled,
			license_id: licenseId,
			attribution: `${row["unit"] || name} — ${licenseId}`,
			allowed_for_ingest: openLicense,
			allowed_for_export: publishEnabled,
			...(licenseUrl(licenseId) ? { terms_url: licenseUrl(licenseId) } : {}),
			exports: publishEnabled ? ["csv", "geojson"] : [],
		},
		schedule: {
			cron: "0 3 * * 1",
			timezone: "Europe/Warsaw",
			jitter_seconds: 300,
		},
	};

	if (!hasCoords) {
		config["geocoding"] = {
			enabled: true,
			strategy: "structured_first",
			provider_order: ["gugik-uug"],
			address_template: "{address_text}, {city}",
			required_components: ["city"],
			min_confidence: 0.8,
			on_failure: "address_only",
			cache_ttl_days: 365,
			rate_limit: { requests_per_minute: 30 },
			geoportal: {
				endpoint: "https://services.gugik.gov.pl/uug/",
				request: "GetAddress",
				max_results: 5,
				min_accuracy: 0.8,
				only_exact_numbers: true,
				srid: 2180,
				output_srid: 4326,
			},
		};
	}

	return config;
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value === null || typeof value !== "object") return value;
	const record = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(record).sort()) {
		const child = record[key];
		if (child !== undefined) sorted[key] = sortValue(child);
	}
	return sorted;
}

mkdirSync(sourceDir, { recursive: true });
const rows = parseCsv(await Bun.file(inventoryPath).text());
const written: string[] = [];
const skipped: string[] = [];

for (const row of rows) {
	const id = row["source_id"] ?? "";
	if (!id) continue;
	const target = join(sourceDir, `${id}.json`);
	if (existsSync(target) || existsSync(join(excludedDir, `${id}.json`))) {
		skipped.push(id);
		continue;
	}
	const config = scaffold(row);
	await Bun.write(target, `${JSON.stringify(sortValue(config), null, "\t")}\n`);
	written.push(id);
}

console.log(
	`Generated ${written.length} scaffolds, skipped ${skipped.length} existing configs.`,
);
if (written.length > 0) console.log(`New: ${written.join(", ")}`);
if (skipped.length > 0) console.log(`Existing: ${skipped.join(", ")}`);
