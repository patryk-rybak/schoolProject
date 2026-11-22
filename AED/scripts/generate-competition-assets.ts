/**
 * Generates the contest deliverable `wzorcowy-zakres-danych-aed.xlsx`.
 *
 * The workbook documents the canonical AED record used by the ingest pipeline
 * and the fields actually published in the dane.gov.pl feed. Run with:
 *
 *   bun scripts/generate-competition-assets.ts
 */

import { createWriteStream, cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

const OUT_DIR = resolve(process.cwd(), "competition-assets");
const DATA_DIR = resolve(OUT_DIR, "wzorcowy-zakres-danych");

interface FieldRow {
	field: string;
	label: string;
	type: string;
	required: string;
	values: string;
	description: string;
	example: string;
	published: string;
}

/** Canonical fields from src/server/ingest/canonical.ts, in display order. */
const FIELDS: FieldRow[] = [
	{
		field: "record_id",
		label: "Identyfikator rekordu",
		type: "string",
		required: "Tak",
		values: "unikalny, niepusty",
		description: "Stały identyfikator w zbiorze wynikowym; nie zmienia się przy aktualizacji.",
		example: "warszawa:12345",
		published: "Nie (id w feedzie to klucz bazy)",
	},
	{
		field: "source_id",
		label: "Identyfikator dostawcy",
		type: "string",
		required: "Tak",
		values: "id z rejestru źródeł",
		description: "Dostawca odpowiada za jakość, aktualność i licencję rekordu.",
		example: "warszawa",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "source_record_id",
		label: "Identyfikator w źródle",
		type: "string",
		required: "Tak",
		values: "unikalny w ramach źródła",
		description: "Pozwala wykryć zmiany i powiązania z wykazem dysponenta.",
		example: "urn:aed:112",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "source_url",
		label: "Adres źródła",
		type: "URL | null",
		required: "Nie",
		values: "https://…",
		description: "Link do strony lub wykazu dysponenta, który potwierdza rekord.",
		example: "https://dane.um.warszawa.pl/…",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "name",
		label: "Nazwa / lokalizacja",
		type: "string | null",
		required: "Tak",
		values: "dowolny tekst",
		description: "Czytelna nazwa obiektu, np. dworzec, urząd, szkoła.",
		example: "AED – Dworzec Centralny",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "description",
		label: "Opis",
		type: "string | null",
		required: "Nie",
		values: "dowolny tekst",
		description: "Dodatkowe informacje o lokalizacji lub przeznaczeniu.",
		example: "Na parterze przy wejściu głównym",
		published: "Nie",
	},
	{
		field: "facility_type",
		label: "Typ obiektu",
		type: "string | null",
		required: "Nie",
		values: "dworzec, urząd, szkoła, szpital, …",
		description: "Kategoria miejsca, w którym znajduje się urządzenie.",
		example: "dworzec",
		published: "Nie",
	},
	{
		field: "device_type",
		label: "Typ urządzenia",
		type: "string | null",
		required: "Nie",
		values: "np. public_aed",
		description: "Rodzaj urządzenia ratunkowego.",
		example: "public_aed",
		published: "Nie",
	},
	{
		field: "lat",
		label: "Szerokość geograficzna",
		type: "number | null",
		required: "Warunkowo",
		values: "-90…90 (WGS84)",
		description: "Wymagana, gdy location_status=point lub geocoded.",
		example: "52.228500",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "lon",
		label: "Długość geograficzna",
		type: "number | null",
		required: "Warunkowo",
		values: "-180…180 (WGS84)",
		description: "Wymagana, gdy location_status=point lub geocoded.",
		example: "21.003100",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "coord_precision_m",
		label: "Dokładność współrzędnych",
		type: "number | null",
		required: "Nie",
		values: ">= 0, metry",
		description: "Szacunkowa dokładność pozycji; pomaga ocenić wiarygodność mapy.",
		example: "15",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "location_status",
		label: "Status lokalizacji",
		type: "enum",
		required: "Tak",
		values: "point | geocoded | address_only | unresolved | conflict",
		description: "Informuje, czy pozycja pochodzi ze źródła, geokodowania, czy jej brakuje.",
		example: "geocoded",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "geom_source",
		label: "Pochodzenie geometrii",
		type: "enum",
		required: "Tak",
		values: "source | geocode | registry | survey | derived | none",
		description: "Źródło współrzędnych; geocode wymaga location_status=geocoded.",
		example: "source",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "address_text",
		label: "Adres",
		type: "string | null",
		required: "Warunkowo",
		values: "dowolny tekst",
		description: "Wymagany, gdy location_status=address_only.",
		example: "ul. Marszałkowska 10, Warszawa",
		published: "Nie (obecnie tylko city w CSV)",
	},
	{
		field: "city",
		label: "Miejscowość",
		type: "string | null",
		required: "Nie",
		values: "dowolny tekst",
		description: "Miejscowość z atrybutów rekordu źródłowego.",
		example: "Warszawa",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "access_type",
		label: "Dostępność",
		type: "string | null",
		required: "Nie",
		values: "always | business_hours | restricted | unknown",
		description: "Czy AED jest dostępny bez klucza i poza godzinami pracy.",
		example: "always",
		published: "Tak jako access (CSV, GeoJSON)",
	},
	{
		field: "status",
		label: "Status urządzenia",
		type: "string | null",
		required: "Nie",
		values: "operational | out_of_service | unknown",
		description: "Aktualny stan techniczny urządzenia według dostawcy.",
		example: "operational",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "verification_status",
		label: "Status weryfikacji",
		type: "string | null",
		required: "Nie",
		values: "verified | unverified",
		description: "Czy dostawca lub weryfikator potwierdził rekord.",
		example: "verified",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "verified_by",
		label: "Weryfikujący",
		type: "string | null",
		required: "Warunkowo",
		values: "nazwa osoby/instytucji",
		description: "Wymagany przynajmniej razem z verified_at dla statusu verified.",
		example: "Urząd Miasta Warszawy",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "verified_by_kind",
		label: "Rodzaj weryfikatora",
		type: "enum | null",
		required: "Nie",
		values: "person | email | company | organization | public_body | community | unknown",
		description: "Pomaga ocenić wiarygodność potwierdzenia.",
		example: "public_body",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "verified_at",
		label: "Data weryfikacji",
		type: "string | null",
		required: "Warunkowo",
		values: "ISO 8601 (data lub znacznik czasu)",
		description: "Data ostatniego potwierdzenia danych.",
		example: "2026-06-01",
		published: "Tak (CSV, GeoJSON)",
	},
	{
		field: "confidence",
		label: "Pewność rekordu",
		type: "number | null",
		required: "Nie",
		values: "0…1",
		description: "Ocena pewności przypisania atrybutów i lokalizacji.",
		example: "0.9",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "claim_status",
		label: "Status zgłoszenia własności",
		type: "enum",
		required: "Nie",
		values: "unclaimed | pending | verified | rejected",
		description: "Czy dysponent zgłosił i potwierdził prawo do aktualizacji rekordu.",
		example: "unclaimed",
		published: "Nie",
	},
	{
		field: "source_updated_at",
		label: "Data aktualizacji w źródle",
		type: "string | null",
		required: "Nie",
		values: "ISO 8601",
		description: "Znacznik czasu aktualizacji u dysponenta (atrybut rozszerzający).",
		example: "2026-11-20T10:00:00Z",
		published: "Nie (proponowane rozszerzenie)",
	},
	{
		field: "licence",
		label: "Licencja danych",
		type: "string | null",
		required: "Tak (rekomendacja)",
		values: "CC0 1.0 | CC BY 4.0 | ODbL 1.0",
		description: "Dostawca deklaruje licencję; agregator musi ją zachować w metadanych zbioru.",
		example: "CC BY 4.0",
		published: "Nie (proponowane rozszerzenie feedu)",
	},
];

const SOURCES = [
	["openaedmap", "OpenAEDMap / OSM", "krajowe", "GeoJSON", "ODbL 1.0", "Tak", "18310", "Włączone"],
	["warszawa", "m.st. Warszawa", "mazowieckie", "JSON API", "CC BY 4.0", "Tak", "708", "Włączone"],
	["przemysl", "Otwarte Dane Przemyśl", "podkarpackie", "JSON", "CC0 1.0", "Tak", "21", "Włączone"],
	["krosno", "Defibrylatory w Krośnie", "podkarpackie", "CSV", "CC0 1.0", "Tak", "21", "Włączone"],
	["marki", "Defibrylatory w Markach", "mazowieckie", "CSV", "CC BY 4.0", "Tak", "7", "Włączone"],
	["belchatow", "Bełchatów", "łódzkie", "KML", "brak deklaracji", "Tak", "32", "Wyłączone do decyzji licencyjnej"],
	["lodz", "Łódź", "łódzkie", "KML", "brak deklaracji", "Tak", "136", "Wyłączone do decyzji licencyjnej"],
	["olsztyn", "Olsztyn", "warmińsko-mazurskie", "KML", "brak deklaracji", "Tak", "43", "Wyłączone do decyzji licencyjnej"],
	["pawlowice", "Pawłowice", "śląskie", "KML", "brak deklaracji", "Tak", "12", "Wyłączone do decyzji licencyjnej"],
	["tczew", "Tczew", "pomorskie", "KML", "brak deklaracji", "Tak", "13", "Wyłączone do decyzji licencyjnej"],
	["zielona-gora", "Zielona Góra", "lubuskie", "KML", "brak deklaracji", "Tak", "165", "Wyłączone do decyzji licencyjnej"],
];

const EXAMPLE = [
	{
		record_id: "warszawa:0001",
		source_id: "warszawa",
		source_record_id: "0001",
		name: "AED – Dworzec Centralny",
		city: "Warszawa",
		lat: 52.2285,
		lon: 21.0031,
		location_status: "point",
		geom_source: "source",
		address_text: "al. Jerozolimskie 54, Warszawa",
		access_type: "always",
		status: "operational",
		verification_status: "verified",
		verified_by: "Urząd Miasta Stołecznego Warszawy",
		verified_by_kind: "public_body",
		verified_at: "2026-06-01",
		confidence: 1,
		claim_status: "verified",
		source_updated_at: "2026-06-01T08:00:00Z",
		licence: "CC BY 4.0",
	},
];

function buildWorkbook(): void {
	const wb = XLSX.utils.book_new();

	const info = [
		["Dokument", "Wzorcowy zakres danych o defibrylatorach AED"],
		["Akacja", "DANE AED RAZEM"],
		["Hasło", "Dane darują minuty"],
		["Wersja", "1.0 (2026-11-22)"],
		["Cel", "Jednolity zakres danych dla dysponentów publikujących zbiory AED w dane.gov.pl"],
		["Zasada", "Dostawca odpowiada za jakość i aktualność swoich danych; agregator zachowuje provenance i licencję."],
		["Format", "CSV / GeoJSON / XLSX, UTF-8, WGS84"],
	];
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), "Informacje");

	const fields = [
		["pole", "etykieta", "typ", "wymagane", "dopuszczalne wartości", "opis", "przykład", "publikowane w feedzie"],
		...FIELDS.map((f) => [f.field, f.label, f.type, f.required, f.values, f.description, f.example, f.published]),
	];
	const fieldsSheet = XLSX.utils.aoa_to_sheet(fields);
	fieldsSheet["!cols"] = [
		{ wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 45 },
		{ wch: 65 }, { wch: 32 }, { wch: 30 },
	];
	XLSX.utils.book_append_sheet(wb, fieldsSheet, "Wzorcowy zakres");

	const sourceSheet = XLSX.utils.aoa_to_sheet([
		["source_id", "dostawca", "zakres referencyjny", "format", "licencja", "geometria", "rekordy", "status"],
		...SOURCES,
	]);
	sourceSheet["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 35 }];
	XLSX.utils.book_append_sheet(wb, sourceSheet, "Źródła i zakresy");

	const exampleSheet = XLSX.utils.json_to_sheet(EXAMPLE);
	exampleSheet["!cols"] = Object.keys(EXAMPLE[0] ?? {}).map(() => ({ wch: 26 }));
	XLSX.utils.book_append_sheet(wb, exampleSheet, "Przykład rekordu");

	const rules = [
		["Reguła", "Opis"],
		["Idempotencja", "Używaj stałego extIdent dla zbioru i zasobów w feedzie dane.gov.pl."],
		["WGS84", "Współrzędne w CSV jako lat, lon; w GeoJSON jako [lon, lat] (RFC 7946)."],
		["Weryfikacja", "verified wymaga verified_by lub verified_at; w przeciwnym razie unverified."],
		["Lokalizacja", "point/geocoded wymaga lat i lon; address_only nie może mieć punktu."],
		["Licencja", "Deklaruj licencję w metadanych zbioru; źródła bez deklaracji wyłącz z agregacji."],
		["Aktualność", "PUBLIC_BASE_URL i.hash danych determinują feed.xml oraz feed.md5."],
	];
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rules), "Zasady publikacji");

	mkdirSync(DATA_DIR, { recursive: true });
	XLSX.writeFile(wb, resolve(DATA_DIR, "wzorcowy-zakres-danych-aed.xlsx"));
}

async function buildBrandPdf(): Promise<void> {
	mkdirSync(resolve(OUT_DIR, "brand"), { recursive: true });
	const doc = new PDFDocument({ size: "A4", margin: 50 });
	const output = resolve(OUT_DIR, "brand", "brandbook.pdf");
	const stream = createWriteStream(output);
	doc.pipe(stream);
	doc.registerFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
	doc.registerFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf");
	doc.rect(0, 0, 595, 842).fill("#0B1F3A");
	doc.fillColor("#E63946").rect(240, 70, 110, 110).fill();
	doc.fillColor("#E63946").rect(195, 115, 200, 20).fill();
	doc.fillColor("#FFFFFF").fontSize(28).font("DejaVu-Bold").text("DANE AED RAZEM", 50, 230);
	doc.fontSize(16).font("DejaVu").text("Hasło: Dane darują minuty", 50, 275);
	doc.fontSize(11).font("DejaVu");
	const text = `Księga znaku - koncepcja (5 zdań)
1. Nazwa akcji „DANE AED RAZEM” wskazuje, że dane o defibrylatorach mają wspólny dom w dane.gov.pl.
2. Hasło „Dane darują minuty” łączy udostępnienie danych z czasem potrzebnym do ratowania życia.
3. Krzyż w kole to skrót myślowy AED i otwartej, współdzielonej informacji.
4. Granat oznacza zaufanie instytucji, czerwień pilność ratunku, a złoto bezcenny czas.
5. Znak jest przeznaczony do kampanii zachęcającej dysponentów do publikacji zbiorów AED.

Kolorystyka
Granat #0B1F3A, czerwień #E63946, złoto #FFD166, biel #FFFFFF.

Pole ochronne
Pole ochronne ma szerokość połowy wysokości litery „A” wokół całego znaku.

Minimalna wielkość
24 mm w druku, 96 px w interfejsach cyfrowych.

Niedozwolone wykorzystywanie
Rozciąganie, zmiana proporcji i kolorów, dodawanie cieni, obracanie, umieszczanie na ruchomych tłach.`;
	doc.text(text, 50, 330, { width: 495, lineGap: 4 });
	doc.end();
	await new Promise<void>((done, fail) => {
		stream.on("finish", done);
		stream.on("error", fail);
	});
}

await buildWorkbook();
console.log("Generated competition assets in", OUT_DIR);
await buildBrandPdf();
console.log("Generated brandbook.pdf");

async function buildPresentationPdf(): Promise<void> {
	mkdirSync(resolve(OUT_DIR, "prezentacja"), { recursive: true });
	const doc = new PDFDocument({ size: "A4", margin: 50 });
	const output = resolve(OUT_DIR, "prezentacja", "prezentacja.pdf");
	const stream = createWriteStream(output);
	doc.pipe(stream);
	doc.registerFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
	doc.registerFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf");
	const markdown = await Bun.file(resolve(OUT_DIR, "prezentacja", "prezentacja.md")).text();
	const slides = markdown.split(/\n---\n/u).filter((part) => part.trim().length > 0);
	slides.forEach((slide, index) => {
		if (index > 0) doc.addPage();
		doc.rect(0, 0, 595, 842).fill("#0B1F3A");
		doc.fillColor("#FFFFFF").font("DejaVu-Bold").fontSize(20);
		const lines = slide.replace(/^# /u, "").split("\n").filter((line) => !line.startsWith("Format slajdów:"));
		doc.text(lines.join("\n"), 50, 55, { width: 495, lineGap: 8 });
	});
	doc.end();
	await new Promise<void>((done, fail) => {
		stream.on("finish", done);
		stream.on("error", fail);
	});
}

function copyPublicAssets(): void {
	const dest = resolve(process.cwd(), "frontend/public/materialy");
	mkdirSync(dest, { recursive: true });
	const copies: [string, string][] = [
		["wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx", "wzorcowy-zakres-danych-aed.xlsx"],
		["brand/brandbook.pdf", "brandbook.pdf"],
		["logo/dane-aed-razem.png", "logo.png"],
		["logo/dane-aed-razem.jpg", "logo.jpg"],
		["logo/dane-aed-razem.svg", "logo.svg"],
		["prezentacja/prezentacja.pdf", "prezentacja.pdf"],
		["INSTRUKCJA-DLA-JURY.md", "instrukcja-dla-jury.md"],
		["screenshots/01-mapa.png", "screenshot-mapa.png"],
		["screenshots/02-dodaj-aed.png", "screenshot-dodaj-aed.png"],
		["screenshots/03-zrodla-nowe.png", "screenshot-zrodla-nowe.png"],
	];
	for (const [from, to] of copies) {
		cpSync(resolve(OUT_DIR, from), resolve(dest, to));
	}
}

/** Converts the primary PNG logo to JPG using pure-JS codecs. */
async function buildLogoJpg(): Promise<void> {
	const { PNG } = await import("pngjs");
	const jpeg = await import("jpeg-js");
	const input = await Bun.file(resolve(OUT_DIR, "logo", "dane-aed-razem.png")).arrayBuffer();
	const png = PNG.sync.read(Buffer.from(input));
	const encoded = jpeg.encode(
		{ data: new Uint8Array(png.data), width: png.width, height: png.height },
		92,
	);
	await Bun.write(resolve(OUT_DIR, "logo", "dane-aed-razem.jpg"), encoded.data);
}

await buildLogoJpg();
console.log("Generated logo JPG");
await buildPresentationPdf();
console.log("Generated presentation PDF");
copyPublicAssets();
console.log("Copied assets to frontend/public/materialy");
