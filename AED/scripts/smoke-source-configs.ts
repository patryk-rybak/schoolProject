#!/usr/bin/env bun
/**
 * Live smoke harness for the declarative AED source configs.
 *
 * Loads every JSON config through the Zod loader, then performs one bounded
 * live fetch per source and runs the family-specific parser. The result is a
 * machine-readable JSON report and a Markdown summary. Individual source
 * failures are findings, not fatal errors.
 *
 * Usage (from the AED directory):
 *   bun scripts/smoke-source-configs.ts
 *   bun scripts/smoke-source-configs.ts --concurrency 4 --timeout-ms 15000
 *   bun scripts/smoke-source-configs.ts --source krosno,przemysl --no-write
 *   bun scripts/smoke-source-configs.ts --family html_table --ignore-robots
 *   bun scripts/smoke-source-configs.ts --out /tmp/smoke.json --md /tmp/smoke.md
 */

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
	defaultSourceConfigDir,
	loadSourceConfigs,
	type SourceConfigRegistry,
} from "../src/server/ingest/config/loader";
import type { SourceConfig } from "../src/server/ingest/config/schema";
import {
	formatSmokeProgress,
	runSourceSmoke,
	type SmokeStatus,
} from "../src/server/ingest/smoke/harness";
import {
	renderJsonReport,
	renderMarkdownReport,
} from "../src/server/ingest/smoke/report";

const ROOT = resolve(join(import.meta.dir, ".."));

type CliOptions = {
	out: string;
	markdownOut: string;
	concurrency: number;
	timeoutMs: number;
	maxBytes: number | null;
	sources: string[];
	families: string[];
	onlyEnabled: boolean;
	onlyDisabled: boolean;
	respectRobots: boolean;
	includeExcluded: boolean;
	noWrite: boolean;
	quiet: boolean;
	failOn: "none" | "failed" | "warning" | "blocked";
};

function readArg(name: string): string | undefined {
	const prefix = `--${name}=`;
	const inline = process.argv.find((arg) => arg.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	if (index !== -1) {
		const next = process.argv[index + 1];
		if (next !== undefined && !next.startsWith("--")) return next;
		return "";
	}
	return undefined;
}

function readFlag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
	if (!raw) return fallback;
	const value = Number.parseInt(raw, 10);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseList(raw: string | undefined): string[] {
	return (raw ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

const options: CliOptions = {
	concurrency: parsePositiveInt(readArg("concurrency"), 4),
	families: parseList(readArg("family")),
	failOn: (() => {
		const value = readArg("fail-on");
		return value === "failed" || value === "blocked" || value === "warning"
			? value
			: "none";
	})(),
	markdownOut: resolve(
		ROOT,
		readArg("md") || "docs/research/source-inventory/config-smoke-report.md",
	),
	maxBytes: readArg("max-bytes")
		? parsePositiveInt(readArg("max-bytes"), 64 * 1024 * 1024)
		: null,
	noWrite: readFlag("no-write"),
	onlyDisabled: readFlag("disabled-only"),
	onlyEnabled: readFlag("enabled-only"),
	out: resolve(
		ROOT,
		readArg("out") || "docs/research/source-inventory/config-smoke-report.json",
	),
	quiet: readFlag("quiet"),
	respectRobots: !readFlag("ignore-robots"),
	includeExcluded: !readFlag("active-only"),
	sources: parseList(readArg("source")),
	timeoutMs: parsePositiveInt(readArg("timeout-ms"), 30_000),
};

function commandLine(): string {
	return [
		"bun",
		"scripts/smoke-source-configs.ts",
		...process.argv.slice(2),
	].join(" ");
}

function selected(configs: SourceConfig[]): SourceConfig[] {
	return configs.filter((config) => {
		if (
			options.sources.length > 0 &&
			!options.sources.includes(config.source.id)
		) {
			return false;
		}
		if (
			options.families.length > 0 &&
			!options.families.includes(config.connector.family)
		) {
			return false;
		}
		if (options.onlyEnabled && config.source.enabled === false) return false;
		if (options.onlyDisabled && config.source.enabled !== false) return false;
		return true;
	});
}

function failExitCode(totals: Record<SmokeStatus, number>): boolean {
	if (options.failOn === "none") return false;
	if (options.failOn === "failed") return totals.failed > 0;
	if (options.failOn === "blocked")
		return totals.failed > 0 || totals.blocked > 0;
	if (options.failOn === "warning") {
		return totals.failed > 0 || totals.blocked > 0 || totals.warning > 0;
	}
	return false;
}

async function main(): Promise<void> {
	const activeDir = defaultSourceConfigDir();
	const excludedDir = resolve(ROOT, "backend", "ingest", "sources-excluded");
	const registries: Array<{
		registry: SourceConfigRegistry;
		label: "active" | "excluded";
	}> = [
		{
			label: "active",
			registry: loadSourceConfigs({ dir: activeDir, force: true }),
		},
	];
	if (options.includeExcluded && existsSync(excludedDir)) {
		registries.push({
			label: "excluded",
			registry: loadSourceConfigs({ dir: excludedDir, force: true }),
		});
	}
	const allConfigs = registries.flatMap((entry) => [...entry.registry.configs]);
	const allErrors = registries
		.flatMap((entry) =>
			entry.registry.errors.map((error) => ({
				...error,
				registry: entry.label,
			})),
		)
		.filter(
			(error) =>
				!(error.registry === "excluded" && error.file === "excluded.json"),
		);
	const registryBySource = new Map<string, "active" | "excluded">();
	for (const entry of registries) {
		for (const config of entry.registry.configs) {
			registryBySource.set(config.source.id, entry.label);
		}
	}
	const configDirLabel = registries
		.map((entry) => relative(ROOT, entry.registry.configDir))
		.join(" + ");

	if (allErrors.length > 0) {
		console.error(
			`Uwaga: ${allErrors.length} plik(ów) nie przeszło walidacji Zod; smoke obejmie ${allConfigs.length} poprawnych konfiguracji.`,
		);
		for (const error of allErrors) {
			console.error(
				`- ${error.registry}/${error.file}: ${error.issues.length} problem(ów)`,
			);
			for (const entry of error.issues.slice(0, 5)) {
				console.error(`  ${entry.path || "(root)"}: ${entry.message}`);
			}
		}
	}

	const configs = selected(allConfigs);
	if (configs.length === 0) {
		console.error("Filtr nie wybrał żadnej konfiguracji.");
		process.exit(1);
	}
	if (!options.quiet) {
		console.log(
			`Smoke ${configs.length}/${allConfigs.length} konfiguracji z ${configDirLabel}`,
		);
		console.log(
			`concurrency=${options.concurrency} timeout=${options.timeoutMs}ms robots=${
				options.respectRobots ? "tak" : "nie"
			}`,
		);
	}

	const report = await runSourceSmoke(configs, {
		concurrency: options.concurrency,
		maxBytes: options.maxBytes ?? undefined,
		onProgress: options.quiet
			? undefined
			: (result) => console.log(formatSmokeProgress(result)),
		respectRobots: options.respectRobots,
		timeoutMs: options.timeoutMs,
	});
	report.results = report.results.map((result) => ({
		...result,
		registry: registryBySource.get(result.sourceId) ?? "active",
	}));
	report.loader = {
		configDir: configDirLabel,
		errors: allErrors.map((error) => ({
			file: error.file,
			issues: error.issues.map((entry) => ({
				code: entry.code,
				message: entry.message,
				path: entry.path,
			})),
			sourceId: error.sourceId ?? null,
		})),
		loaded: allConfigs.length,
		totalFiles: allConfigs.length + allErrors.length,
	};

	if (!options.quiet) {
		console.log("");
		console.log(
			`Wynik: ${report.totals.ok} OK, ${report.totals.warning} ostrzeżeń, ${report.totals.blocked} zablokowanych, ${report.totals.failed} błędów, ${report.totals.manual} manualnych.`,
		);
	}

	if (!options.noWrite) {
		await mkdir(dirname(options.out), { recursive: true });
		await mkdir(dirname(options.markdownOut), { recursive: true });
		await Bun.write(options.out, renderJsonReport(report));
		await Bun.write(
			options.markdownOut,
			renderMarkdownReport(report, {
				command: commandLine(),
				configDir: configDirLabel,
			}),
		);
		if (!options.quiet) {
			console.log(`JSON: ${relative(ROOT, options.out)}`);
			console.log(`Markdown: ${relative(ROOT, options.markdownOut)}`);
		}
	}

	if (report.totals.total !== configs.length) {
		console.error(
			`Nieoczekiwana liczba wyników: ${report.totals.total} zamiast ${configs.length}.`,
		);
		process.exit(1);
	}

	if (failExitCode(report.totals)) process.exit(1);
}

await main();
