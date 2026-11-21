import { resolve } from "node:path";
import { loadSourceConfigsOrThrow } from "../src/server/ingest/config/loader";
import type { SourceConfig } from "../src/server/ingest/config/schema";
import { buildCoreDataset } from "../src/server/ingest/core/build";
import { writeCoreDataset } from "../src/server/ingest/core/write";
import {
	fetchSource,
	type SourceFetchResult,
} from "../src/server/ingest/fetch/source-fetch";

/**
 * Scheduled entry point: load the single datasources registry, refresh raw
 * snapshots for the selected sources, then build and write the common
 * canonical core dataset from those snapshots.
 *
 * Source-level fetch failures are reported but never fail the run: the core
 * builder records them per source and keeps the rest of the dataset. Only
 * registry errors and fatal build/write errors exit nonzero.
 */

type Args = {
	all: boolean;
	fetch: boolean;
	outDir: string;
	rawDir: string;
	rawDirExplicit: boolean;
	sourceIds?: string[];
	write: boolean;
};

function parseArgs(argv: string[]): Args {
	const outDir = resolve(process.cwd(), ".data/core");
	const args: Args = {
		all: false,
		fetch: true,
		outDir,
		rawDir: resolve(outDir, "raw"),
		rawDirExplicit: false,
		write: true,
	};
	const sources: string[] = [];
	for (let index = 2; index < argv.length; index += 1) {
		const arg = argv[index];
		const next = argv[index + 1];
		if (arg === "--source" && next) {
			sources.push(
				...next
					.split(",")
					.map((entry) => entry.trim())
					.filter(Boolean),
			);
			index += 1;
		} else if (arg === "--all") {
			args.all = true;
		} else if (arg === "--no-fetch") {
			args.fetch = false;
		} else if (arg === "--no-write") {
			args.write = false;
		} else if (arg === "--out-dir" && next) {
			args.outDir = resolve(process.cwd(), next);
			if (!args.rawDirExplicit) args.rawDir = resolve(args.outDir, "raw");
			index += 1;
		} else if (arg === "--raw-dir" && next) {
			args.rawDir = resolve(process.cwd(), next);
			args.rawDirExplicit = true;
			index += 1;
		} else if (arg === "--help" || arg === "-h") {
			console.log(
				[
					"Użycie: bun scripts/ingest-run.ts [opcje]",
					"  --source <id>     tylko wskazane źródło (można powtarzać / po przecinku)",
					"  --all             pobierz też źródła z source.enabled=false",
					"  --no-fetch        nie pobieraj, użyj istniejących snapshotów",
					"  --no-write        zbuduj w pamięci, nie zapisuj plików core",
					"  --out-dir <dir>   katalog wyjściowy core (domyślnie .data/core)",
					"  --raw-dir <dir>   katalog snapshotów (domyślnie <out-dir>/raw)",
				].join("\n"),
			);
			process.exit(0);
		}
	}
	if (sources.length > 0) args.sourceIds = sources;
	return args;
}

function selectConfigs(
	configs: readonly SourceConfig[],
	byId: ReadonlyMap<string, SourceConfig>,
	args: Args,
): SourceConfig[] {
	if (args.sourceIds !== undefined) {
		const missing = args.sourceIds.filter((id) => !byId.has(id));
		if (missing.length > 0) {
			throw new Error(
				`Nieznane źródła w rejestrze: ${missing.join(", ")}. Dostępne: ${[
					...byId.keys(),
				].join(", ")}.`,
			);
		}
		return args.sourceIds.map((id) => byId.get(id)!);
	}
	return configs.filter(
		(config) => args.all || config.source.enabled !== false,
	);
}

function fetchSummary(results: readonly SourceFetchResult[]): string {
	const counts: Record<string, number> = {};
	for (const result of results) {
		counts[result.status] = (counts[result.status] ?? 0) + 1;
	}
	return ["fetched", "blocked", "error", "skipped"]
		.map((status) => `${status}=${counts[status] ?? 0}`)
		.join(" ");
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv);
	const registry = loadSourceConfigsOrThrow({ force: true });
	const selected = selectConfigs(registry.configs, registry.byId, args);

	console.log(
		`Rejestr: ${registry.configPath} (${registry.summary.total} źródeł, ${registry.summary.enabled} aktywnych)`,
	);
	console.log(`Wybrano: ${selected.length} źródeł`);

	const results: SourceFetchResult[] = [];
	if (args.fetch) {
		const includeDisabled = args.all || args.sourceIds !== undefined;
		for (const config of selected) {
			results.push(
				await fetchSource(config, {
					configPath: registry.configPath,
					includeDisabled,
					rawDir: args.rawDir,
				}),
			);
		}
		console.log(`Pobieranie: ${fetchSummary(results)}`);
	} else {
		console.log("Pobieranie: pominięte (--no-fetch)");
	}

	for (const result of results) {
		const detail =
			result.status === "fetched"
				? `${result.meta?.bytes ?? 0} B, ${result.meta?.record_count ?? "?"} rekordów`
				: (result.error ?? "");
		console.log(
			`  ${result.sourceId.padEnd(18)} ${result.status.padEnd(8)} ${detail}`.trimEnd(),
		);
	}

	const dataset = buildCoreDataset({
		outDir: args.outDir,
		rawDir: args.rawDir,
		sourceIds: selected.map((config) => config.source.id),
		write: false,
	});
	if (args.write) {
		writeCoreDataset(args.outDir, dataset);
	}

	const { manifest } = dataset;
	console.log(
		`Core: ${manifest.record_count} rekordów, ${manifest.public_count} publicznych, ${manifest.internal_count} wewnętrznych, ${manifest.mappable_count} na mapie.`,
	);
	for (const source of manifest.sources) {
		const status = source.error
			? `ERROR ${source.error}`
			: `${source.records_accepted} ok`;
		console.log(
			`  ${source.source_id.padEnd(18)} seen=${String(source.records_seen).padStart(6)} accepted=${String(source.records_accepted).padStart(6)} point=${String(source.with_point).padStart(6)} ${status}`,
		);
	}
	if (manifest.notes.length > 0) {
		console.log("Uwagi:");
		for (const note of manifest.notes) console.log(`  - ${note}`);
	}
	if (args.write) {
		console.log(`Zapisano: ${args.outDir}`);
	} else {
		console.log("Zapis: pominięty (--no-write)");
	}
}

try {
	await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
