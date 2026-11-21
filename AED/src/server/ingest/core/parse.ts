import type { SourceConfig } from "../config/schema";
import {
	type RecordValue,
	evaluateExpression,
	flattenGeoJsonFeature,
	parseCsv,
	parseJsonRecords,
	parseKml,
} from "../smoke/parsers";

export type ParsedSource = {
	records: RecordValue[];
	parser: string;
	seen: number;
};

export type DedupedSource = {
	records: RecordValue[];
	duplicates: number;
};

export function dedupeRecords(
	config: SourceConfig,
	records: RecordValue[],
): DedupedSource {
	const dedupe = config.records.dedupe;
	if (dedupe?.key === undefined || dedupe.key.length === 0) {
		return { duplicates: 0, records };
	}
	const keep = dedupe.keep ?? "first";
	const onDuplicate = dedupe.on_duplicate ?? "warn";
	const indexes = new Map<string, number>();
	const output: RecordValue[] = [];
	let duplicates = 0;
	for (const [index, row] of records.entries()) {
		const key = dedupe.key
			.map((expr) =>
				JSON.stringify(
					evaluateExpression(expr, row, {
						row_index: index,
						source_id: config.source.id,
					}),
				),
			)
			.join("|");
		const existing = indexes.get(key);
		if (existing === undefined) {
			indexes.set(key, output.length);
			output.push(row);
			duplicates += 0;
			continue;
		}
		duplicates += 1;
		if (keep === "last") {
			output[existing] = row;
		} else if (onDuplicate === "merge") {
			output[existing] = { ...output[existing], ...row };
		}
	}
	return { duplicates, records: output };
}

function asRecord(value: unknown): RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as RecordValue)
		: {};
}

export function parseRawSource(
	config: SourceConfig,
	text: string,
): ParsedSource {
	const parser = config.connector.parser;
	const parse = config.parse as Record<string, unknown>;

	if (parser === "csv") {
		const options = asRecord(parse["csv"]);
		const result = parseCsv(text.replace(/^\uFEFF/, ""), {
			delimiter: typeof options["delimiter"] === "string" ? options["delimiter"] : undefined,
			emptyAsNull: options["empty_as_null"] !== false,
			header: options["header"] !== false,
			quote: typeof options["quote"] === "string" ? options["quote"] : undefined,
			repairDoubleQuotes: options["repair_double_quotes"] === true,
			skipRows:
				typeof options["skip_rows"] === "number" ? options["skip_rows"] : undefined,
			trimHeaders: parse["trim_headers"] !== false,
			unwrapOuterQuotes: options["unwrap_outer_quotes"] === true,
		});
		return { parser, records: result.records, seen: result.rows.length };
	}

	if (parser === "json" || parser === "geojson") {
		let root: unknown = JSON.parse(text);
		if (parse["json"] !== null && typeof parse["json"] === "object") {
			const jsonOptions = parse["json"] as Record<string, unknown>;
			if (jsonOptions["unwrap_string"] === true && typeof root === "string") {
				root = JSON.parse(root);
			}
		}
		const selected = parseJsonRecords(root, config.records.path);
		const records =
			parser === "geojson" ? selected.map(flattenGeoJsonFeature) : selected;
		return { parser, records, seen: records.length };
	}

	if (parser === "kml") {
		const result = parseKml(text);
		const records: RecordValue[] = result.placemarks.map((placemark) => {
			const coordinate = placemark.coordinates[0];
			const isPoint = placemark.geometryTypes.includes("Point");
			return {
				Nazwa: placemark.name,
				coordinates: coordinate ? [coordinate[0], coordinate[1]] : null,
				geometry:
					isPoint && coordinate
						? { coordinates: [coordinate[0], coordinate[1]], type: "Point" }
						: null,
				lat: isPoint && coordinate ? coordinate[1] : null,
				lon: isPoint && coordinate ? coordinate[0] : null,
				name: placemark.name,
			};
		});
		return { parser, records, seen: result.placemarks.length };
	}

	throw new Error(
		`Parser ${parser} nie jest obsługiwany przez core buildera. Aktywne źródła powinny być CSV/JSON/GeoJSON/KML.`,
	);
}
