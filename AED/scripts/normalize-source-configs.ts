#!/usr/bin/env bun
// biome-ignore-all lint/complexity/useLiteralKeys: JSON objects are index signatures; dot access is blocked by noPropertyAccessFromIndexSignature.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GUGIK_UUG_GEOCODER } from "../src/server/ingest/config/schema.ts";

/**
 * Normalizes cross-source conventions that are easy to miss in hand-written
 * configs:
 *
 * - address-only sources always use GUGiK UUG (`provider_order: gugik-uug`);
 * - every geocoding block carries the UUG endpoint and EPSG:2180 -> WGS84;
 * - missing `validate.require_location` is inferred from the mapping;
 * - key order stays stable so diffs are reviewable.
 *
 * Run after adding a source config. It never enables a source or changes a
 * licence gate.
 */

const sourceDir = join(import.meta.dir, "..", "backend", "ingest", "sources");

const GEOPORTAL_DEFAULTS = {
	endpoint: GUGIK_UUG_GEOCODER.endpoint,
	request: GUGIK_UUG_GEOCODER.request,
	max_results: 5,
	min_accuracy: 0.8,
	only_exact_numbers: true,
	srid: GUGIK_UUG_GEOCODER.srid,
	output_srid: GUGIK_UUG_GEOCODER.output_srid,
} as const;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject {
	return isObject(value) ? value : {};
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

function geocodingDefaults(): JsonObject {
	return {
		enabled: true,
		strategy: "structured_first",
		provider_order: ["gugik-uug"],
		address_template: "{address_text}, {city}",
		required_components: ["city"],
		min_confidence: 0.8,
		on_failure: "address_only",
		cache_ttl_days: 365,
		rate_limit: { requests_per_minute: 30 },
		geoportal: { ...GEOPORTAL_DEFAULTS },
	};
}

function normalize(config: JsonObject): {
	config: JsonObject;
	changed: boolean;
} {
	const source = asObject(config["source"]);
	const map = asObject(config["map"]);
	const validate = asObject(config["validate"]);
	const existingGeocoding = asObject(config["geocoding"]);
	const hasAddress = map["address_text"] !== undefined;
	const hasPoint = map["lat"] !== undefined && map["lon"] !== undefined;
	const requireLocation =
		typeof validate["require_location"] === "string"
			? validate["require_location"]
			: hasPoint
				? "point"
				: hasAddress
					? "address_or_point"
					: "none";

	const next: JsonObject = { ...config };
	next["validate"] = { ...validate, require_location: requireLocation };

	if (requireLocation === "address" || requireLocation === "address_or_point") {
		next["geocoding"] = {
			...geocodingDefaults(),
			...existingGeocoding,
			provider_order: ["gugik-uug"],
			geoportal: {
				...GEOPORTAL_DEFAULTS,
				...asObject(existingGeocoding["geoportal"]),
			},
		};
	} else if (Object.keys(existingGeocoding).length > 0) {
		next["geocoding"] = {
			...existingGeocoding,
			provider_order: ["gugik-uug"],
			geoportal: {
				...GEOPORTAL_DEFAULTS,
				...asObject(existingGeocoding["geoportal"]),
			},
		};
	}

	if (Object.keys(source).length === 0) {
		throw new Error("source is missing");
	}

	return {
		config: next,
		changed:
			JSON.stringify(sortValue(config)) !== JSON.stringify(sortValue(next)),
	};
}

const files = readdirSync(sourceDir)
	.filter((file) => file.endsWith(".json"))
	.sort();

let changed = 0;
let unchanged = 0;
const uug = [];
for (const file of files) {
	const path = join(sourceDir, file);
	const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
	if (!isObject(parsed)) throw new Error(`${file}: top-level object expected`);
	const result = normalize(parsed);
	const text = `${JSON.stringify(sortValue(result.config), null, "\t")}\n`;
	if (result.changed) {
		writeFileSync(path, text, "utf8");
		changed += 1;
	} else {
		unchanged += 1;
	}
	const geocoding = asObject(result.config["geocoding"]);
	if (geocoding["enabled"] === true) {
		uug.push(asObject(result.config["source"])["id"]);
	}
}

console.log(
	`Normalized ${files.length} configs: ${changed} changed, ${unchanged} already canonical.`,
);
console.log(`GUGiK UUG geocoding enabled for ${uug.length} sources.`);
