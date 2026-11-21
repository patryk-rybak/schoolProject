import { resolve } from "node:path";
import { buildCoreDataset } from "../src/server/ingest/core/build";
import { writeCoreDataset } from "../src/server/ingest/core/write";

type Args = {
	rawDir: string;
	outDir: string;
	sourceIds?: string[];
	write: boolean;
};

function parseArgs(argv: string[]): Args {
	const args: Args = {
		outDir: resolve(process.cwd(), ".data/core"),
		rawDir: resolve(process.cwd(), ".data/core/raw"),
		write: true,
	};
	const sources: string[] = [];
	for (let index = 2; index < argv.length; index += 1) {
		const arg = argv[index];
		const next = argv[index + 1];
		if (arg === "--raw-dir" && next) {
			args.rawDir = resolve(process.cwd(), next);
			index += 1;
		} else if (arg === "--out-dir" && next) {
			args.outDir = resolve(process.cwd(), next);
			index += 1;
		} else if (arg === "--source" && next) {
			sources.push(...next.split(",").map((entry) => entry.trim()).filter(Boolean));
			index += 1;
		} else if (arg === "--no-write") {
			args.write = false;
		} else if (arg === "--help" || arg === "-h") {
			console.log(
				[
					"Użycie: bun scripts/build-core-dataset.ts [opcje]",
					"  --raw-dir <dir>   katalog surowych snapshotów (domyślnie .data/core/raw)",
					"  --out-dir <dir>   katalog wyjściowy (domyślnie .data/core)",
					"  --source <id>     tylko wskazane źródło (można powtarzać / po przecinku)",
					"  --no-write        tylko policz, nie zapisuj plików",
				].join("\n"),
			);
			process.exit(0);
		}
	}
	if (sources.length > 0) args.sourceIds = sources;
	return args;
}

try {
	const args = parseArgs(process.argv);
	const dataset = buildCoreDataset(args);
	if (args.write) writeCoreDataset(args.outDir, dataset);
	const { manifest } = dataset;
	console.log(
		`Core: ${manifest.record_count} rekordów, ${manifest.public_count} publicznych, ${manifest.internal_count} wewnętrznych, ${manifest.mappable_count} na mapie.`,
	);
	for (const source of manifest.sources) {
		const status = source.error ? `ERROR ${source.error}` : `${source.records_accepted} ok`;
		console.log(
			`  ${source.source_id.padEnd(18)} ${source.parser.padEnd(8)} seen=${String(source.records_seen).padStart(6)} accepted=${String(source.records_accepted).padStart(6)} point=${String(source.with_point).padStart(6)} ${status}`,
		);
	}
	if (manifest.notes.length > 0) {
		console.log("Uwagi:");
		for (const note of manifest.notes) console.log(`  - ${note}`);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
