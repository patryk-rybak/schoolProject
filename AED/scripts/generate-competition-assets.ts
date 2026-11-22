/**
 * Generates contest deliverables, including the mascot-based logo package.
 *
 * The supplied mascot PNG is the canonical artwork. All raster logo formats,
 * the mono variant, and the SVG wrapper are regenerated from it on every run.
 * Run from the repository root with:
 *
 *   bun scripts/generate-competition-assets.ts
 */

import { createWriteStream, cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import PDFDocument from "pdfkit";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import * as XLSX from "xlsx";

const OUT_DIR = resolve(process.cwd(), "competition-assets");
const DATA_DIR = resolve(OUT_DIR, "wzorcowy-zakres-danych");
const LOGO_DIR = resolve(OUT_DIR, "logo");
const PUBLIC_DIR = resolve(process.cwd(), "frontend/public/materialy");
const MASCOT_SOURCE = resolve(
	process.cwd(),
	"competition-assets/brand/cheerful-crayon-aed-mascot.png",
);
const LOGO_SIZE = 1200;

interface Pixel {
	r: number;
	g: number;
	b: number;
}

const WHITE: Pixel = { r: 255, g: 255, b: 255 };

function colorDistance(a: Pixel, b: Pixel): number {
	return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function pixelAt(png: PNG, x: number, y: number): Pixel {
	const offset = (y * png.width + x) * 4;
	return {
		r: png.data[offset] ?? 255,
		g: png.data[offset + 1] ?? 255,
		b: png.data[offset + 2] ?? 255,
	};
}

function setPixel(png: PNG, x: number, y: number, color: Pixel): void {
	const offset = (y * png.width + x) * 4;
	png.data[offset] = color.r;
	png.data[offset + 1] = color.g;
	png.data[offset + 2] = color.b;
	png.data[offset + 3] = 255;
}

/** Crops near-white margins, then pads the drawing to a square canvas. */
function fitSquare(source: PNG): PNG {
	const threshold = 72;
	let left = source.width;
	let top = source.height;
	let right = -1;
	let bottom = -1;

	for (let y = 0; y < source.height; y++) {
		for (let x = 0; x < source.width; x++) {
			if (colorDistance(pixelAt(source, x, y), WHITE) <= threshold) continue;
			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
		}
	}

	if (right < left || bottom < top) {
		throw new Error("The mascot source image contains no visible drawing.");
	}

	const pad = 8;
	left = Math.max(0, left - pad);
	top = Math.max(0, top - pad);
	right = Math.min(source.width - 1, right + pad);
	bottom = Math.min(source.height - 1, bottom + pad);
	const width = right - left + 1;
	const height = bottom - top + 1;
	const scale = (LOGO_SIZE - 1) / Math.max(width, height);
	const output = new PNG({ width: LOGO_SIZE, height: LOGO_SIZE });

	for (let y = 0; y < LOGO_SIZE; y++) {
		for (let x = 0; x < LOGO_SIZE; x++) {
			const sx = Math.round(left + x / scale);
			const sy = Math.round(top + y / scale);
			setPixel(
				output,
				x,
				y,
				sx <= right && sy <= bottom
					? pixelAt(source, sx, sy)
					: WHITE,
			);
		}
	}

	return output;
}

function grayscale(png: PNG): PNG {
	const output = new PNG({ width: png.width, height: png.height });
	output.data.set(png.data);
	for (let i = 0; i < output.data.length; i += 4) {
		const r = output.data[i] ?? 0;
		const g = output.data[i + 1] ?? 0;
		const b = output.data[i + 2] ?? 0;
		const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
		output.data[i] = gray;
		output.data[i + 1] = gray;
		output.data[i + 2] = gray;
		output.data[i + 3] = 255;
	}
	return output;
}

async function buildLogoAssets(): Promise<void> {
	mkdirSync(LOGO_DIR, { recursive: true });
	const source = PNG.sync.read(
		Buffer.from(await Bun.file(MASCOT_SOURCE).arrayBuffer()),
	);
	const square = fitSquare(source);
	const png = PNG.sync.write(square);
	await Bun.write(resolve(LOGO_DIR, "dane-aed-razem.png"), png);
	await Bun.write(resolve(PUBLIC_DIR, "logo.png"), png);
	await Bun.write(
		resolve(OUT_DIR, "screenshots", "00-logotyp.png"),
		png,
	);

	const gray = PNG.sync.write(grayscale(square));
	await Bun.write(resolve(LOGO_DIR, "dane-aed-razem-mono.png"), gray);

	const encoded = jpeg.encode(square, 92).data;
	await Bun.write(resolve(LOGO_DIR, "dane-aed-razem.jpg"), encoded);
	await Bun.write(resolve(PUBLIC_DIR, "logo.jpg"), encoded);

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}" role="img" aria-label="Logo akcji Dane AED Razem - uśmiechnięty defibrylator w stylu kredkowym">
<image width="${LOGO_SIZE}" height="${LOGO_SIZE}" xlink:href="data:image/png;base64,${png.toString("base64")}" />
</svg>
`;
	await Bun.write(resolve(LOGO_DIR, "dane-aed-razem.svg"), svg);
	await Bun.write(resolve(PUBLIC_DIR, "logo.svg"), svg);
}

interface FieldRow {
	field: string;
	label: string;
	type: string;
	tier: Tier;
	values: string;
	description: string;
	example: string;
	published: string;
	legacy: string;
}

type Tier = "Wymagane" | "Zalecane" | "Opcjonalne";

/**
 * Canonical submission schema for dane.gov.pl, grouped by the three tiers
 * requested by the competition task. `legacy` names are the existing
 * ingest/export fields still accepted for backward compatibility.
 */
const FIELDS: FieldRow[] = [
	{
		field: "id",
		label: "Identyfikator rekordu",
		type: "UUID (string)",
		tier: "Wymagane",
		values: "unikalny UUID wersji 4",
		description: "Stały identyfikator rekordu w publicznym zbiorze; system generuje go deterministycznie z source:id i nie zmienia go przy aktualizacji.",
		example: "2f8a6c34-3f2b-4b3e-9a11-7c9d1e0f4a55",
		published: "Tak jako id_uuid (CSV, GeoJSON, XLSX)",
		legacy: "record_id / uuid",
	},
	{
		field: "nazwa_obiektu",
		label: "Nazwa obiektu",
		type: "string",
		tier: "Wymagane",
		values: "niepusty tekst",
		description: "Czytelna nazwa obiektu lub lokalizacji urządzenia, np. ratusz, przystanek, urząd.",
		example: "AED – Dworzec Centralny",
		published: "Tak jako name / nazwa_obiektu",
		legacy: "name",
	},
	{
		field: "szerokosc_geo",
		label: "Szerokość geograficzna",
		type: "number",
		tier: "Wymagane",
		values: "-90…90 (WGS84)",
		description: "Szerokość geograficzna punktu w układzie WGS84.",
		example: "52.228500",
		published: "Tak jako lat / szerokosc_geo",
		legacy: "lat",
	},
	{
		field: "dlugosc_geo",
		label: "Długość geograficzna",
		type: "number",
		tier: "Wymagane",
		values: "-180…180 (WGS84)",
		description: "Długość geograficzna punktu w układzie WGS84.",
		example: "21.003100",
		published: "Tak jako lon / dlugosc_geo",
		legacy: "lon",
	},
	{
		field: "miejscowosc",
		label: "Miejscowość",
		type: "string",
		tier: "Wymagane",
		values: "niepusty tekst",
		description: "Miejscowość, w której znajduje się AED.",
		example: "Warszawa",
		published: "Tak jako city / miejscowosc",
		legacy: "city",
	},
	{
		field: "typ_dostepnosci",
		label: "Typ dostępności",
		type: "string",
		tier: "Wymagane",
		values: "always | business_hours | restricted | unknown",
		description: "Informacja, czy AED jest dostępny bez klucza i poza godzinami pracy obiektu.",
		example: "always",
		published: "Tak jako access / typ_dostepnosci",
		legacy: "access_type / access",
	},
	{
		field: "data_aktualizacji",
		label: "Data aktualizacji",
		type: "ISO 8601 (string)",
		tier: "Wymagane",
		values: "2026-11-22T10:00:00Z",
		description: "Znacznik czasu ostatniej aktualizacji rekordu; w eksporcie pochodzi z updated_at bazy.",
		example: "2026-11-22T10:00:00.000Z",
		published: "Tak jako data_aktualizacji",
		legacy: "updated_at",
	},
	{
		field: "ulica",
		label: "Ulica",
		type: "string | null",
		tier: "Zalecane",
		values: "dowolny tekst",
		description: "Nazwa ulicy; razem z numerem budynku tworzy adres.",
		example: "al. Jerozolimskie",
		published: "Nie (pola adresowe pozostają w rekordzie kanonicznym)",
		legacy: "street",
	},
	{
		field: "nr_budynku",
		label: "Numer budynku",
		type: "string | null",
		tier: "Zalecane",
		values: "np. 54, 12A",
		description: "Numer budynku lub lokalu uzupełniający ulicę.",
		example: "54",
		published: "Nie",
		legacy: "house_number",
	},
	{
		field: "opis_lokalizacji",
		label: "Opis lokalizacji",
		type: "string | null",
		tier: "Zalecane",
		values: "dowolny tekst",
		description: "Dodatkowy opis ułatwiający znalezienie urządzenia, np. parter przy wejściu głównym.",
		example: "Parter przy wejściu głównym",
		published: "Nie",
		legacy: "description / entrance_description",
	},
	{
		field: "godziny_otwarcia",
		label: "Godziny otwarcia",
		type: "string | null",
		tier: "Zalecane",
		values: "np. 24/7, Pon–Pt 8:00–16:00",
		description: "Godziny dostępności urządzenia w obiekcie.",
		example: "24/7",
		published: "Nie",
		legacy: "opening_hours / is_24_7",
	},
	{
		field: "wewnatrz_zewnatrz",
		label: "Wewnątrz / na zewnątrz",
		type: "boolean | null",
		tier: "Zalecane",
		values: "true | false (tak | nie)",
		description: "Czy urządzenie znajduje się wewnątrz budynku.",
		example: "true",
		published: "Nie",
		legacy: "indoor",
	},
	{
		field: "status_sprawnosci",
		label: "Status sprawności",
		type: "string | null",
		tier: "Zalecane",
		values: "operational | out_of_service | unknown",
		description: "Aktualny stan techniczny urządzenia według dostawcy.",
		example: "operational",
		published: "Tak jako status",
		legacy: "status",
	},
	{
		field: "opiekun_nazwa",
		label: "Opiekun / operator",
		type: "string | null",
		tier: "Zalecane",
		values: "nazwa osoby lub instytucji",
		description: "Dysponent lub opiekun odpowiedzialny za konserwację urządzenia.",
		example: "Urząd Miasta Stołecznego Warszawy",
		published: "Częściowo jako verified_by",
		legacy: "operator_name / verified_by",
	},
	{
		field: "opiekun_kontakt",
		label: "Kontakt do opiekuna",
		type: "string | null",
		tier: "Zalecane",
		values: "e-mail, telefon lub URL",
		description: "Kontakt do opiekuna w razie potrzeby aktualizacji lub zgłoszenia awarii.",
		example: "aed@um.warszawa.pl",
		published: "Nie",
		legacy: "phone / email / website",
	},
	{
		field: "producent_model",
		label: "Producent i model",
		type: "string | null",
		tier: "Opcjonalne",
		values: "producent + model",
		description: "Producent i model urządzenia, przydatne przy serwisie i wymianie elektrod.",
		example: "Philips HeartStart MRx",
		published: "Nie",
		legacy: "manufacturer / model",
	},
	{
		field: "elektrody_pediatryczne",
		label: "Elektrody pediatryczne",
		type: "boolean | null",
		tier: "Opcjonalne",
		values: "true | false (tak | nie)",
		description: "Czy urządzenie ma elektrody pediatryczne lub tryb pediatryczny.",
		example: "true",
		published: "Nie",
		legacy: "pads_type",
	},
	{
		field: "data_waznosci_baterii",
		label: "Ważność baterii",
		type: "ISO 8601 (string | null)",
		tier: "Opcjonalne",
		values: "data w formacie RRRR-MM-DD",
		description: "Data ważności baterii urządzenia.",
		example: "2028-04-30",
		published: "Nie",
		legacy: "battery_expiry",
	},
	{
		field: "data_waznosci_elektrod",
		label: "Ważność elektrod",
		type: "ISO 8601 (string | null)",
		tier: "Opcjonalne",
		values: "data w formacie RRRR-MM-DD",
		description: "Data ważności elektrod.",
		example: "2027-09-30",
		published: "Nie",
		legacy: "pads_expiry",
	},
	{
		field: "url_zdjecia",
		label: "Adres zdjęcia",
		type: "URL | null",
		tier: "Opcjonalne",
		values: "https://…",
		description: "Link do zdjęcia urządzenia lub jego otoczenia wraz z licencją w atrybutach rozszerzających.",
		example: "https://example.org/aed-123.jpg",
		published: "Nie",
		legacy: "photo_url / photo_license",
	},
];

/** System fields added automatically to every published export. */
const SYSTEM_FIELDS: FieldRow[] = [
	{
		field: "data_utworzenia",
		label: "Data utworzenia",
		type: "ISO 8601 (string)",
		tier: "Wymagane",
		values: "2026-11-22T10:00:00Z",
		description: "Znacznik czasu utworzenia rekordu, dodawany automatycznie przez system.",
		example: "2026-11-22T10:00:00.000Z",
		published: "Tak (CSV, GeoJSON, XLSX)",
		legacy: "created_at",
	},
	{
		field: "zrodlo_danych",
		label: "Źródło danych",
		type: "string",
		tier: "Wymagane",
		values: "id z rejestru źródeł",
		description: "Identyfikator dostawcy rekordu, zachowany jako provenance w każdym eksporcie.",
		example: "warszawa",
		published: "Tak jako source_id / zrodlo_danych",
		legacy: "source_id / source",
	},
	{
		field: "status_weryfikacji",
		label: "Status weryfikacji",
		type: "string",
		tier: "Wymagane",
		values: "verified | unverified",
		description: "Status weryfikacji ustawiany przez system; nie jest polem formularza obywatelskiego.",
		example: "verified",
		published: "Tak jako verification_status / status_weryfikacji",
		legacy: "verification_status",
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
		id: "2f8a6c34-3f2b-4b3e-9a11-7c9d1e0f4a55",
		nazwa_obiektu: "AED – Dworzec Centralny",
		szerokosc_geo: 52.2285,
		dlugosc_geo: 21.0031,
		miejscowosc: "Warszawa",
		typ_dostepnosci: "always",
		data_utworzenia: "2026-06-01T08:00:00.000Z",
		data_aktualizacji: "2026-11-22T10:00:00.000Z",
		zrodlo_danych: "warszawa",
		status_weryfikacji: "verified",
		ulica: "al. Jerozolimskie",
		nr_budynku: "54",
		opis_lokalizacji: "Parter przy wejściu głównym",
		godziny_otwarcia: "24/7",
		wewnatrz_zewnatrz: true,
		status_sprawnosci: "operational",
		opiekun_nazwa: "Urząd Miasta Stołecznego Warszawy",
		opiekun_kontakt: "aed@um.warszawa.pl",
		producent_model: "Philips HeartStart MRx",
		elektrody_pediatryczne: true,
		data_waznosci_baterii: "2028-04-30",
		data_waznosci_elektrod: "2027-09-30",
		url_zdjecia: "https://example.org/aed-123.jpg",
	},
];

function buildWorkbook(): void {
	const wb = XLSX.utils.book_new();

	const info = [
		["Dokument", "Wzorcowy zakres danych o defibrylatorach AED"],
		["Akacja", "DANE AED RAZEM"],
		["Hasło", "Dane darują minuty"],
		["Wersja", "2.0 (2026-11-22)"],
		["Cel", "Jednolity zakres danych dla dysponentów publikujących zbiory AED w dane.gov.pl"],
		["Zasada", "Dostawca odpowiada za jakość i aktualność swoich danych; agregator zachowuje provenance i licencję."],
		["Format", "CSV / GeoJSON / XLSX, UTF-8, WGS84"],
		["Poziomy", "Wymagane (7 pól) / Zalecane (8 pól) / Opcjonalne (5 pól)"],
		["Pola systemowe", "id (UUID), data_utworzenia, data_aktualizacji, zrodlo_danych, status_weryfikacji — dodawane automatycznie do eksportów; nie umieszczane w formularzu obywatelskim."],
	];
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), "Informacje");

	const fields = [
		["pole", "etykieta", "typ", "priorytet", "dopuszczalne wartości", "opis", "przykład", "publikowane w feedzie", "poprzednia nazwa"],
		...FIELDS.map((f) => [f.field, f.label, f.type, f.tier, f.values, f.description, f.example, f.published, f.legacy]),
	];
	const fieldsSheet = XLSX.utils.aoa_to_sheet(fields);
	fieldsSheet["!cols"] = [
		{ wch: 24 }, { wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 45 },
		{ wch: 65 }, { wch: 38 }, { wch: 38 }, { wch: 34 },
	];
	XLSX.utils.book_append_sheet(wb, fieldsSheet, "Wzorcowy zakres");

	const systemFields = [
		["pole", "etykieta", "typ", "priorytet", "dopuszczalne wartości", "opis", "przykład", "publikowane w feedzie", "poprzednia nazwa"],
		...SYSTEM_FIELDS.map((f) => [f.field, f.label, f.type, f.tier, f.values, f.description, f.example, f.published, f.legacy]),
	];
	const systemSheet = XLSX.utils.aoa_to_sheet(systemFields);
	systemSheet["!cols"] = fieldsSheet["!cols"];
	XLSX.utils.book_append_sheet(wb, systemSheet, "Pola systemowe");

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
		["WGS84", "Współrzędne w CSV i XLSX jako szerokosc_geo / dlugosc_geo (aliasy lat/lon); w GeoJSON jako [lon, lat] (RFC 7946)."],
		["Weryfikacja", "verified wymaga verified_by lub verified_at; w przeciwnym razie unverified."],
		["Lokalizacja", "point/geocoded wymaga lat i lon; address_only nie może mieć punktu."],
		["Licencja", "Deklaruj licencję w metadanych zbioru; źródła bez deklaracji wyłącz z agregacji."],
		["Aktualność", "PUBLIC_BASE_URL i.hash danych determinują feed.xml oraz feed.md5."],
		["Pola systemowe", "id (UUID), data_utworzenia, data_aktualizacji, zrodlo_danych i status_weryfikacji są dodawane do CSV, GeoJSON i XLSX automatycznie."],
	];
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rules), "Zasady publikacji");

	mkdirSync(DATA_DIR, { recursive: true });
	XLSX.writeFile(wb, resolve(DATA_DIR, "wzorcowy-zakres-danych-aed.xlsx"));
}

async function buildBrandPdf(): Promise<void> {
	mkdirSync(resolve(OUT_DIR, "brand"), { recursive: true });
	mkdirSync(PUBLIC_DIR, { recursive: true });
	const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
	const output = resolve(OUT_DIR, "brand", "dane-aed-razem-ksiega-znaku.pdf");
	const stream = createWriteStream(output);
	doc.pipe(stream);
	doc.registerFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
	doc.registerFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf");
	const W = 595.28;
	const H = 841.89;
	const NAVY = "#0B1F3A";
	const RED = "#E63946";
	const YELLOW = "#FFD166";
	const WHITE = "#FFFFFF";
	const MUTED = "#5A6B82";

	/** Shared page header used by every page of the brandbook. */
	function pageHeader(title: string, kicker: string): void {
		doc.rect(0, 0, W, 112).fill(NAVY);
		doc.fillColor(YELLOW).font("DejaVu-Bold").fontSize(9).text(kicker, 50, 30);
		doc.fillColor(WHITE).fontSize(23).text(title, 50, 48, { width: 495 });
	}

	function pageFooter(page: number): void {
		doc.fillColor(MUTED).font("DejaVu").fontSize(8)
			.text("DANE AED RAZEM  |  Księga znaku  |  wersja 1.0", 50, H - 36, { width: 300 });
		doc.text(String(page).padStart(2, "0"), 500, H - 36, { width: 45, align: "right" });
	}

	// --- Page 1: concept and primary lockup ---------------------------------
	pageHeader("Księga znaku", "DANE AED RAZEM  /  TOŻSAMOŚĆ WIZUALNA");
	doc.fillColor(NAVY).font("DejaVu-Bold").fontSize(25)
		.text("Dane darują minuty", 50, 140, { width: 495 });
	doc.fillColor(MUTED).font("DejaVu").fontSize(11)
		.text("Koncepcja w 5 zdaniach", 50, 184);
	const concept = [
		"1. Nazwa akcji „DANE AED RAZEM” wskazuje, że dane o defibrylatorach mają wspólny dom w dane.gov.pl.",
		"2. Hasło „Dane darują minuty” łączy udostępnienie danych z czasem potrzebnym do ratowania życia.",
		"3. Maskotka to uśmiechnięty defibrylator z kredkowymi elektrodami, który personifikuje ratownictwo i otwarte dane.",
		"4. Czerwień oznacza pilność ratunku, żółć energię, granat zaufanie instytucji, a biel czystość przekazu.",
		"5. Znak jest przeznaczony do kampanii zachęcającej dysponentów do publikacji zbiorów AED.",
	];
	doc.fillColor(NAVY).fontSize(10.5).text(concept.join("\n\n"), 50, 206, {
		width: 495,
		lineGap: 1,
	});
	doc.roundedRect(50, 430, 495, 315, 10).fill("#F3F6FA");
	doc.image(MASCOT_SOURCE, 195, 446, { fit: [205, 205] });
	doc.fillColor(RED).font("DejaVu-Bold").fontSize(19)
		.text("DANE AED RAZEM", 50, 665, { width: 495, align: "center" });
	doc.fillColor(NAVY).font("DejaVu").fontSize(12)
		.text("Dane darują minuty", 50, 695, { width: 495, align: "center" });
	pageFooter(1);

	// --- Page 2: clear space and minimum size -------------------------------
	doc.addPage();
	pageHeader("Pole ochronne i wielkość", "ZASADY UŻYCIA  /  ZNAK");
	doc.fillColor(NAVY).font("DejaVu-Bold").fontSize(13).text("Pole ochronne", 50, 142);
	doc.fillColor(MUTED).font("DejaVu").fontSize(10)
		.text("Zostaw wokół znaku wolny margines o szerokości połowy wysokości litery „A” (0,5×A).", 50, 166, { width: 495 });
	doc.rect(70, 205, 200, 200).fill("#F3F6FA");
	doc.rect(70, 205, 200, 200).strokeColor(RED).dash(4, { space: 3 }).stroke();
	doc.undash();
	doc.image(MASCOT_SOURCE, 92, 227, { fit: [156, 156] });
	doc.fillColor(NAVY).font("DejaVu-Bold").fontSize(11).text("0,5×A", 280, 208);
	doc.fillColor(MUTED).font("DejaVu").fontSize(9)
		.text("Pole mierzone od skrajnych krawędzi maskotki i logotypu.", 280, 230, { width: 265 });
	doc.fillColor(NAVY).font("DejaVu-Bold").fontSize(13)
		.text("Minimalna wielkość", 50, 445);
	doc.fillColor(MUTED).font("DejaVu").fontSize(10)
		.text("Poniżej tych wymiarów znak traci czytelność. Nie skaluj go mniejszym.", 50, 469, { width: 495 });
	doc.rect(70, 505, 120, 120).fill("#F3F6FA");
	doc.image(MASCOT_SOURCE, 78, 513, { fit: [104, 104] });
	doc.fillColor(NAVY).font("DejaVu-Bold").fontSize(10).text("24 mm", 70, 640, { width: 120, align: "center" });
	doc.fillColor(MUTED).font("DejaVu").fontSize(9).text("druk", 70, 656, { width: 120, align: "center" });
	doc.rect(240, 505, 120, 120).fill("#F3F6FA");
	doc.image(MASCOT_SOURCE, 248, 513, { fit: [104, 104] });
	doc.fillColor(NAVY).font("DejaVu-Bold").fontSize(10).text("96 px", 240, 640, { width: 120, align: "center" });
	doc.fillColor(MUTED).font("DejaVu").fontSize(9).text("ekran", 240, 656, { width: 120, align: "center" });
	doc.fillColor(MUTED).font("DejaVu").fontSize(9)
		.text("Wersje: pełna (maskotka + nazwa), symbol (sam defibrylator) oraz mono do tła jednokolorowego.", 50, 710, { width: 495 });
	pageFooter(2);

	// --- Page 3: palette ----------------------------------------------------
	doc.addPage();
	pageHeader("Kolorystyka", "SYSTEM BARW  /  WARTOŚCI HEX");
	const palette: [string, string, string][] = [
		["Czerwień ratunku", RED, "#E63946"],
		["Żółć energii", YELLOW, "#FFD166"],
		["Granat zaufania", NAVY, "#0B1F3A"],
		["Biel czystości", WHITE, "#FFFFFF"],
	];
	palette.forEach(([label, hex, value], index) => {
		const y = 145 + index * 130;
		doc.roundedRect(50, y, 130, 96, 8).fill(hex);
		if (hex === WHITE) {
			doc.roundedRect(50, y, 130, 96, 8).strokeColor("#D5DCE6").stroke();
		}
		doc.fillColor(NAVY).font("DejaVu-Bold").fontSize(14).text(label, 205, y + 12);
		doc.fillColor(MUTED).font("DejaVu").fontSize(11).text(value, 205, y + 38);
		doc.fontSize(9).text(index === 0 ? "Pilność i działanie ratunkowe." : index === 1 ? "Optymizm i widoczność w ruchu." : index === 2 ? "Stabilność instytucji i danych." : "Tło i oddech kompozycji.", 205, y + 62, { width: 340 });
	});
	doc.fillColor(MUTED).font("DejaVu").fontSize(9)
		.text("Barwy kredkowe są inspirowane plikiem źródłowym i nie są separacją drukarską. Na tle ciemnym użyj wersji mono lub białej.", 50, 700, { width: 495 });
	pageFooter(3);

	// --- Page 4: misuse -----------------------------------------------------
	doc.addPage();
	pageHeader("Niedozwolone wykorzystywanie", "ZASADY UŻYCIA  /  ZAKAZY");
	const misuses: [string, string][] = [
		["Rozciąganie", "Nigdy nie zmieniaj proporcji znaku."],
		["Zmiana kolorów", "Nie używaj innych barw niż paleta."],
		["Cienie i efekty", "Nie dodawaj cieni, poświat ani gradientów."],
		["Obrót", "Znak zawsze stoi prosto."],
		["Ruchome tło", "Nie umieszczaj na animowanym tle."],
		["Wersja mono", "Nie mieszaj wersji mono z kolorową."],
	];
	misuses.forEach(([title, description], index) => {
		const column = index % 2;
		const row = Math.floor(index / 2);
		const x = 50 + column * 255;
		const y = 145 + row * 175;
		doc.roundedRect(x, y, 240, 150, 8).fill("#F3F6FA");
		doc.fillColor(RED).font("DejaVu-Bold").fontSize(18).text(`0${index + 1}`, x + 18, y + 16);
		doc.fillColor(NAVY).fontSize(13).text(title, x + 18, y + 48, { width: 205 });
		doc.fillColor(MUTED).font("DejaVu").fontSize(9.5)
			.text(description, x + 18, y + 76, { width: 205 });
	});
	doc.fillColor(MUTED).font("DejaVu").fontSize(9)
		.text("Autorem maskotki jest Zdzisław. Materiał dostarczony na potrzeby zgłoszenia konkursowego; dalsze użycie wymaga ustalenia licencji z autorem.", 50, 720, { width: 495 });
	pageFooter(4);

	doc.end();
	await new Promise<void>((done, fail) => {
		stream.on("finish", done);
		stream.on("error", fail);
	});
	cpSync(output, resolve(PUBLIC_DIR, "brandbook.pdf"));
}

await buildWorkbook();
console.log("Generated competition assets in", OUT_DIR);
await buildBrandPdf();
console.log("Generated brandbook.pdf");
await buildLogoAssets();
console.log("Generated mascot logo package");

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
	mkdirSync(PUBLIC_DIR, { recursive: true });
	const copies: [string, string][] = [
		["wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx", "wzorcowy-zakres-danych-aed.xlsx"],
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
		cpSync(resolve(OUT_DIR, from), resolve(PUBLIC_DIR, to));
	}
}

await buildPresentationPdf();
console.log("Generated presentation PDF");
copyPublicAssets();
console.log("Copied assets to frontend/public/materialy");
