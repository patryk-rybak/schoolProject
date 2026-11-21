import type { SmokeRunReport, SmokeStatus, SourceSmokeResult } from "./harness";
import {
	compactText,
	issueCodeSet,
	sortIssuesForReport,
	statusLabel,
} from "./harness";

const STATUS_ORDER: SmokeStatus[] = [
	"ok",
	"warning",
	"blocked",
	"failed",
	"manual",
];

function escapeCell(value: string): string {
	return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function coverageText(result: SourceSmokeResult): string {
	const entries = Object.entries(result.requiredCoverage);
	if (entries.length === 0) return "—";
	return entries
		.map(([field, ratio]) => `${field} ${(ratio * 100).toFixed(0)}%`)
		.join(", ");
}

function recordsText(result: SourceSmokeResult): string {
	if (result.parser === "manual" || result.parser === "pdf_table") return "—";
	const expected =
		result.expectedRecords === null ? "?" : String(result.expectedRecords);
	return `${result.recordsSeen}/${expected}`;
}

function issueCounts(report: SmokeRunReport): Array<{
	code: string;
	total: number;
	sources: string[];
	severity: "info" | "warning" | "error";
}> {
	const map = new Map<
		string,
		{ total: number; sources: string[]; severity: "info" | "warning" | "error" }
	>();
	for (const result of report.results) {
		for (const entry of result.issues) {
			const bucket = map.get(entry.code) ?? {
				severity: entry.severity,
				sources: [],
				total: 0,
			};
			bucket.total += 1;
			bucket.sources.push(result.sourceId);
			if (entry.severity === "error") bucket.severity = "error";
			else if (entry.severity === "warning" && bucket.severity === "info") {
				bucket.severity = "warning";
			}
			map.set(entry.code, bucket);
		}
	}
	return [...map.entries()]
		.map(([code, bucket]) => ({
			code,
			severity: bucket.severity,
			sources: bucket.sources,
			total: bucket.total,
		}))
		.sort((left, right) => right.total - left.total);
}

function statusRow(
	label: string,
	counts: Record<SmokeStatus, number> & { total: number },
): string {
	return `| ${label} | ${counts.total} | ${counts.ok} | ${counts.warning} | ${counts.blocked} | ${counts.failed} | ${counts.manual} |`;
}

function familyHeading(family: string): string {
	switch (family) {
		case "file_static":
			return "file_static (CSV / GeoJSON)";
		case "http_json":
			return "http_json (REST JSON)";
		case "google_my_maps_kml":
			return "google_my_maps_kml (KML)";
		case "html_table":
			return "html_table (HTML)";
		case "manual":
			return "manual (człowiek / OCR)";
		case "pdf_table":
			return "pdf_table (PDF z warstwą tekstową)";
		default:
			return family;
	}
}

function renderFamily(
	family: SmokeRunReport["families"][number],
	results: SourceSmokeResult[],
): string[] {
	const lines: string[] = [];
	lines.push(`### ${familyHeading(family.family)}`);
	lines.push("");
	lines.push(
		`Źródeł: ${family.total}. OK: ${family.ok}, ostrzeżenia: ${family.warning}, zablokowane: ${family.blocked}, błędy: ${family.failed}, manualne: ${family.manual}.`,
	);
	lines.push("");
	lines.push(
		"| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |",
	);
	lines.push("| --- | :---: | ---: | ---: | --- | --- | --- |");
	for (const result of results) {
		lines.push(
			`| \`${result.sourceId}\` | ${
				result.registry === "excluded" ? "wył." : "aktywne"
			} | ${result.httpStatus ?? "—"} | ${recordsText(result)} | ${escapeCell(
				coverageText(result),
			)} | ${statusLabel(result.status)} | ${escapeCell(
				issueCodeSet(result) || "—",
			)} |`,
		);
	}
	lines.push("");
	const notOk = results.filter((result) => result.status !== "ok");
	if (notOk.length > 0) {
		lines.push("Ustalenia:");
		lines.push("");
		for (const result of notOk) {
			const issues = sortIssuesForReport(result).filter(
				(entry) => entry.severity !== "info",
			);
			const details =
				issues.length === 0
					? "brak szczegółów"
					: issues
							.map(
								(entry) =>
									`\`${entry.code}\`: ${compactText(entry.message, 180)}`,
							)
							.join("; ");
			lines.push(
				`- \`${result.sourceId}\` (${statusLabel(result.status)}): ${details}`,
			);
		}
		lines.push("");
	}
	return lines;
}

export function renderMarkdownReport(
	report: SmokeRunReport,
	options: { command: string; configDir: string },
): string {
	const lines: string[] = [];
	lines.push(`# Live smoke ${report.totals.total} konfiguracji źródeł AED`);
	lines.push("");
	lines.push(`- Data: ${report.generatedAt}`);
	lines.push(
		`- Czas: ${(report.durationMs / 1000).toFixed(1)} s · konfiguracje: ${report.totals.total}`,
	);
	lines.push(`- Katalog konfiguracji: \`${options.configDir}\``);
	lines.push(`- Polecenie: \`${options.command}\``);
	if (report.loader) {
		lines.push(
			`- Pliki: ${report.loader.totalFiles} · załadowane: ${report.loader.loaded} · odrzucone przez loader: ${report.loader.errors.length}`,
		);
	}
	const excluded = report.results.filter(
		(result) => result.registry === "excluded",
	).length;
	if (excluded > 0) {
		lines.push(
			`- Rejestr: ${report.results.length - excluded} aktywne · ${excluded} wyłączone (testowane na żywo, poza rejestrem tabularnym)`,
		);
	}
	lines.push("");
	lines.push(
		"Harness pobiera każdy URL na żywo, sprawdza HTTP, typ treści i parsuje odpowiedź parserem właściwym dla rodziny. Wynik `OK` oznacza, że źródło odpowiedziało, dało się sparsować, a wymagane pola i lokalizacja przeszły walidację konfiguracji. `ostrzeżenie` oznacza dryf lub częściowe odrzucenia, `błąd` brak rekordów albo niespełnione wymagania, `zablokowane` brak sekretu lub robots.txt, `manualne` źródło wymaga człowieka i nie ma automatycznego parsera.",
	);
	lines.push("");
	lines.push("## Podsumowanie");
	lines.push("");
	if (report.loader && report.loader.errors.length > 0) {
		lines.push("### Konfiguracje odrzucone przez loader");
		lines.push("");
		lines.push(
			"Te pliki nie przeszły walidacji Zod, więc nie wysłano dla nich żądania. Napraw konfigurację i uruchom smoke ponownie.",
		);
		lines.push("");
		for (const error of report.loader.errors) {
			const identifier = error.sourceId ? ` (\`${error.sourceId}\`)` : "";
			lines.push(`- \`${error.file}\`${identifier}`);
			for (const entry of error.issues.slice(0, 5)) {
				lines.push(
					`  - \`${entry.path || "(root)"}\` [${entry.code}]: ${compactText(entry.message, 200)}`,
				);
			}
		}
		lines.push("");
	}
	lines.push(
		"| Zakres | Razem | OK | Ostrzeżenia | Zablokowane | Błędy | Manualne |",
	);
	lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
	lines.push(statusRow("Wszystkie", report.totals));
	for (const status of STATUS_ORDER) {
		lines.push(
			`| ${statusLabel(status)} | ${report.totals[status]} | — | — | — | — | — |`,
		);
	}
	lines.push("");
	lines.push("### Rodziny connectorów");
	lines.push("");
	lines.push(
		"| Rodzina | Razem | OK | Ostrzeżenia | Zablokowane | Błędy | Manualne |",
	);
	lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
	for (const family of report.families) {
		lines.push(statusRow(familyHeading(family.family), family));
	}
	lines.push("");

	const codes = issueCounts(report);
	const active = report.results.filter(
		(result) => result.registry !== "excluded",
	);
	const excludedResults = report.results.filter(
		(result) => result.registry === "excluded",
	);
	lines.push("## Wnioski");
	lines.push("");
	if (active.length > 0) {
		lines.push(
			`- Rejestr aktywny: ${active.length} źródeł — ${active.filter((result) => result.status === "ok").length} OK, ${active.filter((result) => result.status === "warning").length} ostrzeżeń, ${active.filter((result) => result.status === "blocked").length} zablokowanych, ${active.filter((result) => result.status === "failed").length} błędów, ${active.filter((result) => result.status === "manual").length} manualnych.`,
		);
	}
	const excludedFailures = excludedResults.filter(
		(result) => result.status === "failed",
	);
	if (excludedFailures.length > 0) {
		const byFamily = new Map<string, number>();
		for (const result of excludedFailures) {
			byFamily.set(result.family, (byFamily.get(result.family) ?? 0) + 1);
		}
		lines.push(
			`- Poza rejestrem: ${excludedFailures.length} błędów w ${[
				...byFamily.entries(),
			]
				.map(([family, count]) => `${family} (${count})`)
				.join(
					", ",
				)}. Te źródła są testowane na żywo, ale nie są aktywne w rejestrze tabularnym.`,
		);
	}
	if (codes.length > 0) {
		const actionable = codes.filter((entry) => entry.severity !== "info");
		lines.push(
			`- Najczęstsze kody: ${(actionable.length > 0 ? actionable : codes)
				.slice(0, 4)
				.map((entry) => `\`${entry.code}\` (${entry.total})`)
				.join(", ")}.`,
		);
	}
	const missingSecret = report.results.filter((result) =>
		result.issues.some((entry) => entry.code === "missing_secret"),
	);
	if (missingSecret.length > 0) {
		lines.push(
			`- Brak sekretu blokuje: ${missingSecret
				.map((result) => `\`${result.sourceId}\``)
				.join(", ")}. To bramka operacyjna, nie błąd parsera.`,
		);
	}
	const unparsableHtml = report.results.filter(
		(result) =>
			result.status === "failed" &&
			(result.issues.some((entry) => entry.code === "html_no_table") ||
				result.issues.some(
					(entry) => entry.code === "required_fields_missing",
				)),
	);
	if (unparsableHtml.length > 0) {
		lines.push(
			`- ${unparsableHtml.length} źródeł HTML wymaga poprawy selektora lub mapowania pól; lista jest w sekcjach rodzin poniżej.`,
		);
	}
	lines.push("");

	if (codes.length > 0) {
		lines.push("## Kody ustaleń");
		lines.push("");
		lines.push("| Kod | Liczba źródeł | Źródła |");
		lines.push("| --- | ---: | --- |");
		for (const entry of codes) {
			const sources =
				entry.sources.join(", ").length > 160
					? `${entry.sources.slice(0, 12).join(", ")} i ${entry.sources.length - 12} więcej`
					: entry.sources.join(", ");
			lines.push(
				`| \`${entry.code}\` | ${entry.total} | ${escapeCell(sources)} |`,
			);
		}
		lines.push("");
	}

	lines.push("## Wyniki per rodzina");
	lines.push("");
	for (const family of report.families) {
		const results = report.results.filter(
			(result) => result.family === family.family,
		);
		lines.push(...renderFamily(family, results));
	}

	lines.push("## Metoda i ograniczenia");
	lines.push("");
	lines.push(
		"1. Pobranie: metoda i nagłówki z konfiguracji, timeout i retry z `fetch`, maksymalnie 3 próby.",
	);
	lines.push(
		"2. `manual`: sprawdzana jest tylko osiągalność dokumentu i sygnatura PDF/ZIP; brak transkrypcji nie jest błędem konfiguracji.",
	);
	lines.push(
		"3. `google_my_maps_kml`: harness szuka `mid=` na stronie i pobiera KML z `https://www.google.com/maps/d/kml`, tak jak docelowy connector.",
	);
	lines.push(
		"4. HTML: obsługiwane są selektory `tag`, `.klasa`, `#id`, `[atrybut]`, potomkowie i listy po przecinku; dla `html_table` dodatkowo `header_row`, `columns`, `require_headers`, `orientation=key_value`. To smoke test, nie pełny parser DOM.",
	);
	lines.push(
		"5. Walidacja mapowania obejmuje wymagane pola, bbox, `require_location` i duplikaty `source_record_id`; nie jest to pełny dry-run ani shadow.",
	);
	lines.push(
		"6. Domyślnie respektowany jest `robots.txt` dla HTML i KML. Wyłączenie: `--ignore-robots`.",
	);
	lines.push(
		"7. Raport nie zawiera treści odpowiedzi ani sekretów; tylko statusy, liczniki i kody błędów.",
	);
	lines.push("");
	return lines.join("\n");
}

export function renderJsonReport(report: SmokeRunReport): string {
	return `${JSON.stringify(report, null, "\t")}\n`;
}
