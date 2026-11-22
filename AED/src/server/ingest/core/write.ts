import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CanonicalAedRecord } from "../canonical";

export type CoreSourceManifest = {
	source_id: string;
	source_name: string;
	attribution: string | null;
	parser: string;
	enabled: boolean;
	raw_file: string | null;
	raw_sha256: string | null;
	config_sha256: string | null;
	fetched_at: string | null;
	records_seen: number;
	records_accepted: number;
	records_rejected: number;
	with_point: number;
	address_only: number;
	unresolved: number;
	error: string | null;
};

export type CoreManifest = {
	version: 1;
	generated_at: string;
	source_count: number;
	record_count: number;
	mappable_count: number;
	sources: CoreSourceManifest[];
	notes: string[];
};

export type CoreDataset = {
	records: CanonicalAedRecord[];
	manifest: CoreManifest;
};

function json(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return "";
	const text = String(value);
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function feature(record: CanonicalAedRecord): Record<string, unknown> | null {
	if (
		(record.location_status !== "point" &&
			record.location_status !== "geocoded") ||
		record.lat === null ||
		record.lon === null
	) {
		return null;
	}
	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates: [record.lon, record.lat],
		},
		properties: {
			...record,
			field_provenance: record.field_provenance ?? {},
		},
	};
}

function featureCollection(records: CanonicalAedRecord[]): Record<string, unknown> {
	const features = records
		.map(feature)
		.filter((entry): entry is Record<string, unknown> => entry !== null);
	return {
		type: "FeatureCollection",
		features,
	};
}

function writeCsv(path: string, records: CanonicalAedRecord[]): void {
	const columns = [
		"record_id",
		"source_id",
		"source_record_id",
		"name",
		"lat",
		"lon",
		"address_text",
		"city",
		"access_type",
		"verification_status",
		"verified_by",
		"verified_by_kind",
		"verified_at",
		"confidence",
		"claim_status",
		"source_url",
	];
	const lines = [columns.join(",")];
	for (const record of records) {
		const attributes =
			record.attributes !== null && typeof record.attributes === "object"
				? record.attributes
				: {};
		lines.push(
			[
				record.record_id,
				record.source_id,
				record.source_record_id,
				record.name,
				record.lat,
				record.lon,
				record.address_text,
				typeof attributes["city"] === "string" ? attributes["city"] : "",
				record.access_type,
				record.verification_status,
				record.verified_by,
				record.verified_by_kind,
				record.verified_at,
				record.confidence,
				record.claim_status,
				record.source_url,
			]
				.map(csvCell)
				.join(","),
		);
	}
	writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

function writeSqlite(
	path: string,
	records: CanonicalAedRecord[],
	manifest: CoreManifest,
): void {
	const db = new Database(path, { create: true });
	db.exec("PRAGMA journal_mode = WAL;");
	db.exec("PRAGMA synchronous = NORMAL;");
	db.exec("DROP TABLE IF EXISTS source; DROP TABLE IF EXISTS aed_core;");
	db.exec(`
		CREATE TABLE IF NOT EXISTS source (
			source_id TEXT PRIMARY KEY,
			source_name TEXT NOT NULL,
			attribution TEXT,
			parser TEXT NOT NULL,
			enabled INTEGER NOT NULL,
			raw_file TEXT,
			raw_sha256 TEXT,
			config_sha256 TEXT,
			fetched_at TEXT,
			records_seen INTEGER NOT NULL,
			records_accepted INTEGER NOT NULL,
			records_rejected INTEGER NOT NULL,
			with_point INTEGER NOT NULL,
			address_only INTEGER NOT NULL,
			unresolved INTEGER NOT NULL,
			error TEXT
		);
		CREATE TABLE IF NOT EXISTS aed_core (
			record_id TEXT PRIMARY KEY,
			source_id TEXT NOT NULL,
			source_record_id TEXT NOT NULL,
			name TEXT,
			lat REAL,
			lon REAL,
			address_text TEXT,
			city TEXT,
			access_type TEXT,
			verification_status TEXT,
			verified_by TEXT,
			verified_by_kind TEXT,
			verified_at TEXT,
			confidence REAL,
			claim_status TEXT NOT NULL,
			claimed_by TEXT,
			claimed_at TEXT,
			claim_note TEXT,
			source_url TEXT,
			attributes_json TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_aed_core_source ON aed_core(source_id);
		CREATE TABLE IF NOT EXISTS owner_claim (
			claim_id TEXT PRIMARY KEY,
			record_id TEXT NOT NULL,
			claimed_by TEXT NOT NULL,
			status TEXT NOT NULL,
			created_at TEXT NOT NULL,
			verified_at TEXT,
			note TEXT
		);
		CREATE INDEX IF NOT EXISTS idx_owner_claim_record ON owner_claim(record_id);
	`);
	db.exec("DELETE FROM source;");
	db.exec("DELETE FROM aed_core;");

	const insertSource = db.prepare(`
		INSERT INTO source VALUES (
			$source_id, $source_name, $attribution, $parser, $enabled,
			$raw_file, $raw_sha256, $config_sha256, $fetched_at,
			$records_seen, $records_accepted, $records_rejected,
			$with_point, $address_only, $unresolved, $error
		)
	`);
	const insertRecord = db.prepare(`
		INSERT INTO aed_core VALUES (
			$record_id, $source_id, $source_record_id, $name, $lat, $lon,
			$address_text, $city, $access_type, $verification_status,
			$verified_by, $verified_by_kind, $verified_at, $confidence,
			$claim_status, $claimed_by, $claimed_at, $claim_note,
			$source_url, $attributes_json
		)
	`);

	const write = db.transaction(() => {
		for (const source of manifest.sources) {
			insertSource.run({
				$address_only: source.address_only,
				$attribution: source.attribution,
				$config_sha256: source.config_sha256,
				$enabled: source.enabled ? 1 : 0,
				$error: source.error,
				$fetched_at: source.fetched_at,
				$parser: source.parser,
				$raw_file: source.raw_file,
				$raw_sha256: source.raw_sha256,
				$records_accepted: source.records_accepted,
				$records_rejected: source.records_rejected,
				$records_seen: source.records_seen,
				$source_id: source.source_id,
				$source_name: source.source_name,
				$unresolved: source.unresolved,
				$with_point: source.with_point,
			});
		}
		for (const record of records) {
			const attributes =
				record.attributes !== null && typeof record.attributes === "object"
					? record.attributes
					: {};
			insertRecord.run({
				$access_type: record.access_type,
				$address_text: record.address_text,
				$attributes_json: JSON.stringify(attributes),
				$city: typeof attributes["city"] === "string" ? attributes["city"] : null,
				$confidence: record.confidence,
				$lat: record.lat,
				$lon: record.lon,
				$name: record.name,
				$claim_status: record.claim_status,
				$claimed_by: record.claimed_by,
				$claimed_at: record.claimed_at,
				$claim_note: record.claim_note,
				$record_id: record.record_id,
				$source_id: record.source_id,
				$source_record_id: record.source_record_id,
				$source_url: record.source_url,
				$verification_status: record.verification_status,
				$verified_by: record.verified_by,
				$verified_by_kind: record.verified_by_kind,
				$verified_at: record.verified_at,
			});
		}
	});
	write();
	db.close();
}

export function writeCoreDataset(outDir: string, dataset: CoreDataset): void {
	mkdirSync(outDir, { recursive: true });
	const { records, manifest } = dataset;

	writeFileSync(join(outDir, "core.json"), json(records), "utf8");
	writeFileSync(join(outDir, "core.geojson"), json(featureCollection(records)), "utf8");
	writeCsv(join(outDir, "core.csv"), records);
	writeSqlite(join(outDir, "core.sqlite"), records, manifest);
	writeFileSync(join(outDir, "manifest.json"), json(manifest), "utf8");
}
