import type { z } from "zod";
import {
	CANONICAL_FIELDS,
	type CanonicalField,
	CONNECTOR_FAMILIES,
	CONNECTOR_PARSER_MATRIX,
	type ConnectorFamily,
	PARSERS,
	type Parser,
	type SourceConfig,
	sourceConfigSchema,
} from "./schema";

/**
 * UI-facing metadata for the source-config editor and onboarding wizard.
 *
 * This module contains no runtime I/O and no server imports, so it can be
 * imported by route components as well as by the config validator.
 */

export const CONFIG_SECTIONS = [
	{
		id: "identity",
		label: "Tożsamość i licencja",
		description: "Identyfikator źródła, wydawca, zakres i licencja.",
	},
	{
		id: "connector",
		label: "Connector i parser",
		description: "Rodzina connectora i parser wybrany dla formatu danych.",
	},
	{
		id: "fetch",
		label: "Pobieranie",
		description: "URL, metoda, sekrety, limity i paginacja.",
	},
	{
		id: "parse",
		label: "Parsowanie",
		description: "Kodowanie i naprawy specyficzne dla parsera.",
	},
	{
		id: "records",
		label: "Rekordy i tożsamość",
		description: "Ścieżka do rekordów, identyfikator źródłowy i deduplikacja.",
	},
	{
		id: "mapping",
		label: "Mapowanie pól",
		description: "Wyrażenia DSL mapujące rekord źródłowy na model kanoniczny.",
	},
	{
		id: "validation",
		label: "Walidacja",
		description: "Pola wymagane, bbox i zachowanie przy błędach.",
	},
	{
		id: "drift",
		label: "Dryf i jakość",
		description: "Baseline, progi wolumenu, jakości i osi.",
	},
	{
		id: "publish",
		label: "Publikacja",
		description: "Eksport, redakcja i bramki licencyjne.",
	},
	{
		id: "geocoding",
		label: "Geokodowanie",
		description: "Uzupełnianie współrzędnych dla źródeł adresowych.",
	},
	{
		id: "schedule",
		label: "Harmonogram",
		description: "Cron, strefa czasowa i jitter.",
	},
	{
		id: "activation",
		label: "Aktywacja",
		description: "Canary, auto-rollback i okno obserwacji.",
	},
] as const;

export type ConfigSectionId = (typeof CONFIG_SECTIONS)[number]["id"];

export type ConfigFieldKind =
	| "text"
	| "textarea"
	| "number"
	| "integer"
	| "boolean"
	| "select"
	| "multiselect"
	| "url"
	| "cron"
	| "timezone"
	| "json"
	| "yaml"
	| "secret-ref"
	| "readonly";

export interface ConfigFieldOption {
	value: string;
	label: string;
}

export interface ConfigFieldMetadata {
	path: string;
	label: string;
	help: string;
	section: ConfigSectionId;
	kind: ConfigFieldKind;
	required?: boolean;
	options?: readonly ConfigFieldOption[];
	placeholder?: string;
}

const ACCESS_TYPE_OPTIONS: readonly ConfigFieldOption[] = [
	{ value: "file", label: "Plik" },
	{ value: "api", label: "API" },
	{ value: "html", label: "HTML" },
	{ value: "kml", label: "KML" },
	{ value: "manual", label: "Ręcznie" },
];

const RELIABILITY_OPTIONS: readonly ConfigFieldOption[] = [
	{ value: "authoritative", label: "Źródło urzędowe centralne" },
	{ value: "official_local", label: "Źródło urzędowe lokalne" },
	{ value: "community", label: "Społeczność" },
	{ value: "aggregator", label: "Agregator" },
	{ value: "derived", label: "Pochodne" },
	{ value: "app", label: "Aplikacja" },
	{ value: "register", label: "Rejestr" },
];

const UPDATE_FREQUENCY_OPTIONS: readonly ConfigFieldOption[] = [
	{ value: "continuous", label: "Ciągła" },
	{ value: "daily", label: "Codzienna" },
	{ value: "weekly", label: "Tygodniowa" },
	{ value: "monthly", label: "Miesięczna" },
	{ value: "quarterly", label: "Kwartalna" },
	{ value: "once", label: "Jednorazowa" },
	{ value: "unknown", label: "Nieznana" },
];

const FAMILY_OPTIONS: readonly ConfigFieldOption[] = CONNECTOR_FAMILIES.map(
	(value) => ({ value, label: value }),
);

const PARSER_OPTIONS: readonly ConfigFieldOption[] = PARSERS.map((value) => ({
	value,
	label: value,
}));

const DRIFT_ACTION_OPTIONS: readonly ConfigFieldOption[] = [
	{ value: "ignore", label: "Ignoruj" },
	{ value: "warn", label: "Ostrzeż" },
	{ value: "review", label: "Do review" },
	{ value: "fail", label: "Zatrzymaj przebieg" },
];

const CANONICAL_FIELD_OPTIONS: readonly ConfigFieldOption[] =
	CANONICAL_FIELDS.map((value) => ({ value, label: value }));

const EXPORT_OPTIONS: readonly ConfigFieldOption[] = [
	{ value: "csv", label: "CSV" },
	{ value: "geojson", label: "GeoJSON" },
	{ value: "json", label: "JSON" },
];

export const CONFIG_FIELD_METADATA_SOURCE = [
	{
		path: "version",
		label: "Wersja schematu",
		help: "Obecnie zawsze 1. Numer rewizji jest poza dokumentem.",
		section: "identity",
		kind: "number",
		required: true,
	},
	{
		path: "source.id",
		label: "Identyfikator źródła",
		help: "Stały slug, 1-32 znaki [a-z0-9._-]. Zmiana oznacza nowe źródło.",
		section: "identity",
		kind: "text",
		required: true,
	},
	{
		path: "source.name",
		label: "Nazwa",
		help: "Czytelna nazwa źródła widoczna w panelu.",
		section: "identity",
		kind: "text",
		required: true,
	},
	{
		path: "source.publisher",
		label: "Wydawca",
		help: "Instytucja lub społeczność publikująca dane.",
		section: "identity",
		kind: "text",
		required: true,
	},
	{
		path: "source.homepage_url",
		label: "Strona źródła",
		help: "HTTPS. Strona danych lub wydawcy, nie URL pliku.",
		section: "identity",
		kind: "url",
	},
	{
		path: "source.access_type",
		label: "Typ dostępu",
		help: "Sposób publikacji danych. app i manual nie dostają automatycznego harmonogramu.",
		section: "identity",
		kind: "select",
		required: true,
		options: ACCESS_TYPE_OPTIONS,
	},
	{
		path: "source.reliability_tier",
		label: "Poziom zaufania",
		help: "Wpływa na precedencję konfliktów i domyślne progi dryfu.",
		section: "identity",
		kind: "select",
		required: true,
		options: RELIABILITY_OPTIONS,
	},
	{
		path: "source.license.id",
		label: "Identyfikator licencji",
		help: "Wartość z rejestru licencji, np. CC0-1.0, ODbL-1.0, NOASSERTION.",
		section: "identity",
		kind: "text",
		required: true,
	},
	{
		path: "source.license.url",
		label: "URL licencji",
		help: "HTTPS do treści licencji.",
		section: "identity",
		kind: "url",
	},
	{
		path: "source.license.attribution",
		label: "Atrybucja",
		help: "Tekst wymagany w UI i eksporcie. Musi być zachowany także w publish.",
		section: "identity",
		kind: "text",
	},
	{
		path: "source.license.share_alike",
		label: "Share-alike",
		help: "Pochodna licencji wymagającej udostępniania na tej samej licencji (np. ODbL).",
		section: "identity",
		kind: "boolean",
	},
	{
		path: "source.coverage.country",
		label: "Kraj",
		help: "Kod ISO 3166-1 alpha-2, domyślnie PL.",
		section: "identity",
		kind: "text",
	},
	{
		path: "source.coverage.teryt",
		label: "Zakres TERYT",
		help: "Lista kodów TERYT. Puste oznacza całą Polskę.",
		section: "identity",
		kind: "multiselect",
	},
	{
		path: "source.coverage.notes",
		label: "Notatki o pokryciu",
		help: "Zakres i ograniczenia pokrycia.",
		section: "identity",
		kind: "textarea",
	},
	{
		path: "source.update_frequency",
		label: "Częstotliwość aktualizacji",
		help: "Deklaracja wydawcy, nie dowód świeżości.",
		section: "identity",
		kind: "select",
		options: UPDATE_FREQUENCY_OPTIONS,
	},
	{
		path: "source.enabled",
		label: "Źródło włączone",
		help: "Wyłączenie zatrzymuje harmonogram, ale zachowuje konfigurację.",
		section: "identity",
		kind: "boolean",
	},
	{
		path: "source.notes",
		label: "Notatki",
		help: "Kontekst operacyjny, znane pułapki i runbook.",
		section: "identity",
		kind: "textarea",
	},
	{
		path: "connector.family",
		label: "Rodzina connectora",
		help: "Określa sposób pobierania. Musi być zgodna z parserem.",
		section: "connector",
		kind: "select",
		required: true,
		options: FAMILY_OPTIONS,
	},
	{
		path: "connector.parser",
		label: "Parser",
		help: "Określa format i dostępne opcje parse.",
		section: "connector",
		kind: "select",
		required: true,
		options: PARSER_OPTIONS,
	},
	{
		path: "connector.notes",
		label: "Notatki connectora",
		help: "Dlaczego wybrano ten connector i parser.",
		section: "connector",
		kind: "textarea",
	},
	{
		path: "fetch.url",
		label: "URL danych",
		help: "Pełny HTTPS URL zasobu, nie strona opisowa.",
		section: "fetch",
		kind: "url",
		required: true,
	},
	{
		path: "fetch.method",
		label: "Metoda HTTP",
		help: "GET lub POST. Domyślnie GET.",
		section: "fetch",
		kind: "select",
		options: [
			{ value: "GET", label: "GET" },
			{ value: "POST", label: "POST" },
		],
	},
	{
		path: "fetch.timeout_ms",
		label: "Timeout (ms)",
		help: "1000-120000 ms. Źródła dużych plików mogą potrzebować 120000.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.max_bytes",
		label: "Maks. rozmiar (B)",
		help: "Górny limit pobieranego dokumentu.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.max_redirects",
		label: "Maks. redirectów",
		help: "0-5. Każdy hop jest walidowany od nowa.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.retries.max",
		label: "Liczba ponowień",
		help: "Ponowienia tylko dla błędów przejściowych.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.retries.backoff_ms",
		label: "Backoff (ms)",
		help: "Bazowy czas oczekiwania między próbami.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.rate_limit.requests_per_minute",
		label: "Limit zapytań/min",
		help: "Nie może przekraczać limitu wydawcy z regulaminu.",
		section: "fetch",
		kind: "number",
	},
	{
		path: "fetch.conditional.etag",
		label: "ETag",
		help: "Pobieranie warunkowe po ETag.",
		section: "fetch",
		kind: "boolean",
	},
	{
		path: "fetch.conditional.last_modified",
		label: "Last-Modified",
		help: "Pobieranie warunkowe po dacie modyfikacji.",
		section: "fetch",
		kind: "boolean",
	},
	{
		path: "fetch.pagination.type",
		label: "Typ paginacji",
		help: "none, page, offset, cursor lub link_header.",
		section: "fetch",
		kind: "select",
		options: [
			{ value: "none", label: "Brak" },
			{ value: "page", label: "Page" },
			{ value: "offset", label: "Offset" },
			{ value: "cursor", label: "Cursor" },
			{ value: "link_header", label: "Link header" },
		],
	},
	{
		path: "fetch.pagination.page_param",
		label: "Parametr strony",
		help: "Nazwa parametru numeru strony.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.pagination.limit_param",
		label: "Parametr limitu",
		help: "Nazwa parametru rozmiaru strony.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.pagination.page_size",
		label: "Rozmiar strony",
		help: "Liczba rekordów na stronę. Musi pokryć cały zbiór.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.pagination.start_page",
		label: "Pierwsza strona",
		help: "Indeks pierwszej strony, zwykle 0 lub 1.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.pagination.total_path",
		label: "Ścieżka total",
		help: "Pole z łączną liczbą rekordów, np. /total_rows.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.pagination.offset_param",
		label: "Parametr offsetu",
		help: "Nazwa parametru offsetu.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.pagination.start_offset",
		label: "Pierwszy offset",
		help: "Wartość początkowa offsetu, zwykle 0.",
		section: "fetch",
		kind: "integer",
	},
	{
		path: "fetch.pagination.cursor_path",
		label: "Ścieżka kursora",
		help: "Pole z kursorem następnej strony.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.pagination.next_path",
		label: "Ścieżka next",
		help: "Pole lub link następnej strony.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.user_agent",
		label: "User-Agent",
		help: "Identyfikacja klienta i kontakt. Wymagana przez wiele portali.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.auth.type",
		label: "Typ autoryzacji",
		help: "none, bearer, header lub basic. Wartość sekretu nigdy nie trafia do konfiguracji.",
		section: "fetch",
		kind: "select",
		options: [
			{ value: "none", label: "Brak" },
			{ value: "bearer", label: "Bearer" },
			{ value: "header", label: "Nagłówek" },
			{ value: "basic", label: "Basic" },
		],
	},
	{
		path: "fetch.auth.header",
		label: "Nagłówek autoryzacji",
		help: "Np. Authorization. Wymagany dla type=header.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.auth.env",
		label: "Zmienna sekretu",
		help: "Nazwa zmiennej środowiskowej, nie wartość. Preferowany prefiks AED_.",
		section: "fetch",
		kind: "secret-ref",
	},
	{
		path: "fetch.auth.prefix",
		label: "Prefiks wartości",
		help: "Opcjonalny prefiks, np. Bearer lub Token.",
		section: "fetch",
		kind: "text",
	},
	{
		path: "fetch.auth.user_env",
		label: "Zmienna użytkownika",
		help: "Dla auth basic: nazwa zmiennej z użytkownikiem.",
		section: "fetch",
		kind: "secret-ref",
	},
	{
		path: "fetch.auth.password_env",
		label: "Zmienna hasła",
		help: "Dla auth basic: nazwa zmiennej z hasłem.",
		section: "fetch",
		kind: "secret-ref",
	},
	{
		path: "fetch.headers",
		label: "Nagłówki statyczne",
		help: "JSON obiektu nagłówków. Bez sekretów i nagłówków zabronionych.",
		section: "fetch",
		kind: "json",
	},
	{
		path: "fetch.query",
		label: "Parametry zapytania",
		help: "JSON obiektu parametrów query.",
		section: "fetch",
		kind: "json",
	},
	{
		path: "fetch.body",
		label: "Ciało żądania",
		help: "JSON obiektu wysyłanego dla POST.",
		section: "fetch",
		kind: "json",
	},
	{
		path: "records.path",
		label: "Ścieżka rekordów",
		help: "$ dla całej tablicy/pliku, dot-path lub JSON Pointer, XPath dla KML.",
		section: "records",
		kind: "text",
		required: true,
	},
	{
		path: "records.identity.source_record_id",
		label: "Identyfikator rekordu",
		help: "Wyrażenie DSL. Nie może być stałą. Musi być stabilne między snapshotami.",
		section: "records",
		kind: "yaml",
		required: true,
	},
	{
		path: "records.identity.dataset_id",
		label: "Identyfikator datasetu",
		help: "Opcjonalny dyskryminator zbioru w ramach źródła.",
		section: "records",
		kind: "yaml",
	},
	{
		path: "records.identity.stable",
		label: "Tożsamość stabilna",
		help: "false wymaga jawnego allow_unstable_identity przy aktywacji.",
		section: "records",
		kind: "boolean",
	},
	{
		path: "records.dedupe.key",
		label: "Klucz dedupe",
		help: "Lista wyrażeń tworzących klucz w obrębie jednego przebiegu.",
		section: "records",
		kind: "yaml",
	},
	{
		path: "records.dedupe.keep",
		label: "Zachowaj",
		help: "first lub last.",
		section: "records",
		kind: "select",
		options: [
			{ value: "first", label: "Pierwszy" },
			{ value: "last", label: "Ostatni" },
		],
	},
	{
		path: "records.dedupe.on_duplicate",
		label: "Duplikat",
		help: "warn, reject lub merge. Wymaga klucza.",
		section: "records",
		kind: "select",
		options: [
			{ value: "warn", label: "Ostrzeż" },
			{ value: "reject", label: "Odrzuć" },
			{ value: "merge", label: "Scal" },
		],
	},
	{
		path: "validate.required",
		label: "Pola wymagane",
		help: "Pola kanoniczne bez danych odrzucają rekord lub kierują do review.",
		section: "validation",
		kind: "multiselect",
		options: CANONICAL_FIELD_OPTIONS,
	},
	{
		path: "validate.require_location",
		label: "Wymagana lokalizacja",
		help: "point, address_or_point, address lub none. Adres bez geometrii jest poprawnym rekordem address_only.",
		section: "validation",
		kind: "select",
		options: [
			{ value: "point", label: "Tylko punkt" },
			{ value: "address_or_point", label: "Adres albo punkt" },
			{ value: "address", label: "Tylko adres" },
			{ value: "none", label: "Bez wymagań" },
		],
	},
	{
		path: "validate.coords.bbox",
		label: "Bbox",
		help: "[minLon, minLat, maxLon, maxLat]. Wąski bbox chroni przed podmianą miasta.",
		section: "validation",
		kind: "json",
	},
	{
		path: "validate.coords.on_invalid",
		label: "Nieprawidłowe współrzędne",
		help: "reject, review lub null.",
		section: "validation",
		kind: "select",
		options: [
			{ value: "reject", label: "Odrzuć" },
			{ value: "review", label: "Do review" },
			{ value: "null", label: "Ustaw null" },
		],
	},
	{
		path: "validate.coords.on_missing",
		label: "Brak współrzędnych",
		help: "reject, review lub null. Dla źródeł adresowych zwykle review.",
		section: "validation",
		kind: "select",
		options: [
			{ value: "reject", label: "Odrzuć" },
			{ value: "review", label: "Do review" },
			{ value: "null", label: "Ustaw null" },
		],
	},
	{
		path: "validate.enums",
		label: "Waliduj słowniki",
		help: "Sprawdza wartości enum w mapowaniu.",
		section: "validation",
		kind: "boolean",
	},
	{
		path: "validate.on_error",
		label: "Domyślny błąd pola",
		help: "reject lub review. Nie mylić z brakiem danych.",
		section: "validation",
		kind: "select",
		options: [
			{ value: "reject", label: "Odrzuć" },
			{ value: "review", label: "Do review" },
		],
	},
	{
		path: "drift.baseline.record_count",
		label: "Baseline: liczba rekordów",
		help: "Powstaje z dry-runu, nie z ręcznej deklaracji.",
		section: "drift",
		kind: "integer",
	},
	{
		path: "drift.baseline.generated_at",
		label: "Baseline: data",
		help: "Data wygenerowania baseline.",
		section: "drift",
		kind: "text",
	},
	{
		path: "drift.schema.on_new_field",
		label: "Nowe pole",
		help: "Akcja przy nowym polu w źródle.",
		section: "drift",
		kind: "select",
		options: DRIFT_ACTION_OPTIONS,
	},
	{
		path: "drift.schema.on_missing_field",
		label: "Brakujące pole",
		help: "Akcja przy zniknięciu pola z baseline.",
		section: "drift",
		kind: "select",
		options: DRIFT_ACTION_OPTIONS,
	},
	{
		path: "drift.schema.on_type_change",
		label: "Zmiana typu",
		help: "Akcja przy zmianie typu wartości.",
		section: "drift",
		kind: "select",
		options: DRIFT_ACTION_OPTIONS,
	},
	{
		path: "drift.schema.on_header_order_change",
		label: "Zmiana kolejności nagłówków",
		help: "Akcja przy zmianie kolejności kolumn.",
		section: "drift",
		kind: "select",
		options: DRIFT_ACTION_OPTIONS,
	},
	{
		path: "drift.volume.min_records",
		label: "Min. rekordów",
		help: "Nie może przekraczać 50% wolumenu zaobserwowanego w dry-runie.",
		section: "drift",
		kind: "integer",
	},
	{
		path: "drift.volume.max_records",
		label: "Maks. rekordów",
		help: "Opcjonalny górny limit wolumenu.",
		section: "drift",
		kind: "integer",
	},
	{
		path: "drift.volume.max_delta_ratio",
		label: "Maks. delta wolumenu",
		help: "0-1, np. 0.5 oznacza 50% zmiany.",
		section: "drift",
		kind: "number",
	},
	{
		path: "drift.volume.on_breach",
		label: "Naruszenie wolumenu",
		help: "Akcja przy przekroczeniu progu.",
		section: "drift",
		kind: "select",
		options: DRIFT_ACTION_OPTIONS,
	},
	{
		path: "drift.quality.max_coord_invalid_ratio",
		label: "Maks. błędne współrzędne",
		help: "Udział 0-1 rekordów z niepoprawnymi współrzędnymi.",
		section: "drift",
		kind: "number",
	},
	{
		path: "drift.quality.max_duplicate_id_ratio",
		label: "Maks. duplikaty ID",
		help: "Udział 0-1 duplikatów identyfikatora.",
		section: "drift",
		kind: "number",
	},
	{
		path: "drift.quality.on_breach",
		label: "Naruszenie jakości",
		help: "Akcja przy przekroczeniu progu jakości.",
		section: "drift",
		kind: "select",
		options: DRIFT_ACTION_OPTIONS,
	},
	{
		path: "drift.axis.enabled",
		label: "Detekcja osi",
		help: "Wykrywanie podejrzanej zamiany lat/lon.",
		section: "drift",
		kind: "boolean",
	},
	{
		path: "drift.axis.max_suspicious_ratio",
		label: "Maks. podejrzane osie",
		help: "Udział 0-1 podejrzanych rekordów.",
		section: "drift",
		kind: "number",
	},
	{
		path: "drift.axis.on_breach",
		label: "Naruszenie osi",
		help: "Akcja przy podejrzeniu zamiany osi.",
		section: "drift",
		kind: "select",
		options: DRIFT_ACTION_OPTIONS,
	},
	{
		path: "drift.golden_sample.size",
		label: "Golden sample: rozmiar",
		help: "Liczba rekordów o stabilnym ID.",
		section: "drift",
		kind: "integer",
	},
	{
		path: "drift.golden_sample.required_match_ratio",
		label: "Golden sample: zgodność",
		help: "Wymagany udział 0-1 zgodnych rekordów.",
		section: "drift",
		kind: "number",
	},
	{
		path: "drift.actions.warn",
		label: "Akcja warn",
		help: "Zwykle log.",
		section: "drift",
		kind: "select",
		options: [{ value: "log", label: "Log" }],
	},
	{
		path: "drift.actions.review",
		label: "Akcja review",
		help: "Zwykle quarantine.",
		section: "drift",
		kind: "select",
		options: [{ value: "quarantine", label: "Kwarantanna" }],
	},
	{
		path: "drift.actions.fail",
		label: "Akcja fail",
		help: "disable lub abort.",
		section: "drift",
		kind: "select",
		options: [
			{ value: "disable", label: "Wyłącz źródło" },
			{ value: "abort", label: "Przerwij przebieg" },
		],
	},
	{
		path: "publish.enabled",
		label: "Publikacja włączona",
		help: "Bez tego źródło nie trafia do eksportu.",
		section: "publish",
		kind: "boolean",
	},
	{
		path: "publish.license_id",
		label: "Licencja eksportu",
		help: "Musi być zgodna z source.license.id.",
		section: "publish",
		kind: "text",
	},
	{
		path: "publish.attribution",
		label: "Atrybucja eksportu",
		help: "Wymagana, gdy licencja źródła wymaga atrybucji.",
		section: "publish",
		kind: "text",
	},
	{
		path: "publish.redact",
		label: "Pola do redakcji",
		help: "Pola kanoniczne usuwane z eksportu publicznego.",
		section: "publish",
		kind: "multiselect",
		options: CANONICAL_FIELD_OPTIONS,
	},
	{
		path: "publish.exports",
		label: "Formaty eksportu",
		help: "csv, geojson, json.",
		section: "publish",
		kind: "multiselect",
		options: EXPORT_OPTIONS,
	},
	{
		path: "publish.allowed_for_ingest",
		label: "Wolno pobierać",
		help: "Bramka prawna G2. Domyślnie false dla nowych źródeł runtime.",
		section: "publish",
		kind: "boolean",
	},
	{
		path: "publish.allowed_for_export",
		label: "Wolno eksportować",
		help: "Bramka prawna eksportu.",
		section: "publish",
		kind: "boolean",
	},
	{
		path: "publish.terms_hash",
		label: "Hash regulaminu",
		help: "SHA-256 dokumentu warunków, nie treści danych.",
		section: "publish",
		kind: "text",
	},
	{
		path: "publish.terms_checked_at",
		label: "Data sprawdzenia regulaminu",
		help: "Data sprawdzenia przez człowieka.",
		section: "publish",
		kind: "text",
	},
	{
		path: "geocoding.enabled",
		label: "Geokodowanie włączone",
		help: "Uzupełniaj współrzędne tylko dla rekordów adresowych.",
		section: "geocoding",
		kind: "boolean",
	},
	{
		path: "geocoding.strategy",
		label: "Strategia",
		help: "structured_first, unstructured_first lub structured_only.",
		section: "geocoding",
		kind: "select",
		options: [
			{ value: "structured_first", label: "Najpierw strukturalne" },
			{ value: "unstructured_first", label: "Najpierw niestrukturalne" },
			{ value: "structured_only", label: "Tylko strukturalne" },
		],
	},
	{
		path: "geocoding.provider_order",
		label: "Kolejność providerów",
		help: "Lista providerów geokodowania, np. prg, uug, nominatim.",
		section: "geocoding",
		kind: "multiselect",
	},
	{
		path: "geocoding.min_confidence",
		label: "Min. pewność",
		help: "0-1. Poniżej progu rekord zostaje address_only.",
		section: "geocoding",
		kind: "number",
	},
	{
		path: "geocoding.on_failure",
		label: "Błąd geokodowania",
		help: "address_only, review lub reject.",
		section: "geocoding",
		kind: "select",
		options: [
			{ value: "address_only", label: "Zostaw address_only" },
			{ value: "review", label: "Do review" },
			{ value: "reject", label: "Odrzuć" },
		],
	},
	{
		path: "geocoding.cache_ttl_days",
		label: "Cache TTL (dni)",
		help: "Jak długo trzymać wynik geokodowania.",
		section: "geocoding",
		kind: "integer",
	},
	{
		path: "schedule.cron",
		label: "Cron",
		help: "Pięć pól, np. 15 3 * * *.",
		section: "schedule",
		kind: "cron",
	},
	{
		path: "schedule.timezone",
		label: "Strefa czasowa",
		help: "Nazwa IANA, np. Europe/Warsaw.",
		section: "schedule",
		kind: "timezone",
	},
	{
		path: "schedule.jitter_seconds",
		label: "Jitter (s)",
		help: "Deterministyczne rozproszenie startu przebiegu.",
		section: "schedule",
		kind: "integer",
	},
	{
		path: "activation.mode",
		label: "Tryb aktywacji",
		help: "canary lub immediate.",
		section: "activation",
		kind: "select",
		options: [
			{ value: "canary", label: "Canary" },
			{ value: "immediate", label: "Natychmiastowa" },
		],
	},
	{
		path: "activation.canary",
		label: "Canary",
		help: "Pierwszy live run jako canary.",
		section: "activation",
		kind: "boolean",
	},
	{
		path: "activation.auto_rollback",
		label: "Auto-rollback",
		help: "Automatyczny powrót do poprzedniej wersji po błędzie.",
		section: "activation",
		kind: "boolean",
	},
	{
		path: "activation.watch_window_runs",
		label: "Okno obserwacji",
		help: "Liczba przebiegów przed uznaniem wersji za stabilną.",
		section: "activation",
		kind: "integer",
	},
	{
		path: "activation.rollback_revision",
		label: "Rewizja rollbacku",
		help: "Rewizja przywracana po incydencie.",
		section: "activation",
		kind: "integer",
	},
] as const satisfies readonly ConfigFieldMetadata[];

export const CONFIG_FIELD_METADATA: Record<string, ConfigFieldMetadata> =
	Object.fromEntries(
		CONFIG_FIELD_METADATA_SOURCE.map((field) => [field.path, field]),
	);

// ---------------------------------------------------------------------------
// Parser and connector metadata
// ---------------------------------------------------------------------------

export interface ParserFormMetadata {
	parser: Parser;
	label: string;
	description: string;
	families: readonly ConnectorFamily[];
	parseFields: readonly ConfigFieldMetadata[];
	defaultParse: Record<string, unknown>;
}

function parseField(
	path: string,
	label: string,
	help: string,
	kind: ConfigFieldKind,
	options?: readonly ConfigFieldOption[],
): ConfigFieldMetadata {
	return {
		path,
		label,
		help,
		section: "parse",
		kind,
		...(options ? { options } : {}),
	};
}

const COMMON_PARSE_FIELDS = [
	parseField(
		"parse.encoding",
		"Kodowanie",
		"utf-8, utf-8-sig lub iso-8859-2. utf-8-sig usuwa BOM.",
		"select",
		[
			{ value: "utf-8", label: "UTF-8" },
			{ value: "utf-8-sig", label: "UTF-8 z BOM" },
			{ value: "iso-8859-2", label: "ISO-8859-2" },
		],
	),
	parseField(
		"parse.trim_headers",
		"Trim nagłówków",
		"Usuwa BOM i wiodące/trailing spacje z nazw kolumn.",
		"boolean",
	),
] as const;

const CSV_PARSE_FIELDS = [
	...COMMON_PARSE_FIELDS,
	parseField("parse.csv.delimiter", "Separator", "Zwykle przecinek.", "text"),
	parseField("parse.csv.quote", "Cudzysłów", "Znak cytowania pól.", "text"),
	parseField(
		"parse.csv.skip_rows",
		"Pomiń wiersze",
		"Liczba wierszy przed nagłówkiem.",
		"integer",
	),
	parseField(
		"parse.csv.header",
		"Wiersz nagłówka",
		"Pierwszy wiersz to nagłówek.",
		"boolean",
	),
	parseField(
		"parse.csv.unwrap_outer_quotes",
		"Zdejmij zewnętrzne cudzysłowy",
		"Naprawa wiersza owiniętego jednym cudzysłowem.",
		"boolean",
	),
	parseField(
		"parse.csv.repair_double_quotes",
		"Napraw podwójne cudzysłowy",
		'Zamień "" na " przed parsowaniem.',
		"boolean",
	),
	parseField(
		"parse.csv.empty_as_null",
		"Puste jako null",
		"Puste stringi stają się null, nie pustą wartością.",
		"boolean",
	),
] as const;

const JSON_PARSE_FIELDS = [
	...COMMON_PARSE_FIELDS,
	parseField(
		"parse.json.unwrap_string",
		"Rozpakuj JSON string",
		"Body jest JSON-owym literałem stringa, nie obiektem.",
		"boolean",
	),
] as const;

export const PARSER_METADATA: Record<Parser, ParserFormMetadata> = {
	csv: {
		parser: "csv",
		label: "CSV",
		description: "Tekst rozdzielany, z obsługą BOM i wadliwego cytowania.",
		families: ["file_static"],
		parseFields: CSV_PARSE_FIELDS,
		defaultParse: {
			encoding: "utf-8",
			trim_headers: true,
			csv: { delimiter: ",", quote: '"', header: true, empty_as_null: true },
		},
	},
	xlsx: {
		parser: "xlsx",
		label: "XLSX",
		description: "Arkusz kalkulacyjny z wyborem arkusza i wiersza nagłówka.",
		families: ["file_static"],
		parseFields: [
			...COMMON_PARSE_FIELDS,
			parseField(
				"parse.xlsx.sheet",
				"Arkusz",
				"Nazwa lub indeks arkusza.",
				"text",
			),
			parseField(
				"parse.xlsx.header_row",
				"Wiersz nagłówka",
				"Indeks wiersza nagłówka.",
				"integer",
			),
		],
		defaultParse: {
			encoding: "utf-8",
			trim_headers: true,
			xlsx: { header_row: 0 },
		},
	},
	json: {
		parser: "json",
		label: "JSON",
		description:
			"REST JSON, JSON:API lub odpowiedź ArcGIS/CKAN po normalizacji.",
		families: [
			"file_static",
			"http_json",
			"http_json_api",
			"arcgis_query",
			"ckan_datastore",
		],
		parseFields: JSON_PARSE_FIELDS,
		defaultParse: { encoding: "utf-8", json: { unwrap_string: false } },
	},
	geojson: {
		parser: "geojson",
		label: "GeoJSON",
		description: "FeatureCollection lub tablica features z geometrią Point.",
		families: ["file_static"],
		parseFields: JSON_PARSE_FIELDS,
		defaultParse: { encoding: "utf-8", json: { unwrap_string: false } },
	},
	kml: {
		parser: "kml",
		label: "KML",
		description:
			"Placemarki KML, opcjonalnie tylko punkty i kontrola nazwy dokumentu.",
		families: ["file_static", "google_my_maps_kml"],
		parseFields: [
			...COMMON_PARSE_FIELDS,
			parseField(
				"parse.kml.point_only",
				"Tylko punkty",
				"Odrzuć polygon i linestring.",
				"boolean",
			),
			parseField(
				"parse.kml.document_name_must_match",
				"Wymagana nazwa dokumentu",
				"Zabezpieczenie przed podmianą mapy.",
				"text",
			),
		],
		defaultParse: { encoding: "utf-8", kml: { point_only: true } },
	},
	jsonapi: {
		parser: "jsonapi",
		label: "JSON:API",
		description: "JSON:API 1.x z data/relationships i links.next.",
		families: ["http_json_api"],
		parseFields: JSON_PARSE_FIELDS,
		defaultParse: { encoding: "utf-8", json: { unwrap_string: false } },
	},
	html_table: {
		parser: "html_table",
		label: "Tabela HTML",
		description: "Heurystyczna tabela HTML. Wymaga potwierdzenia regulaminu.",
		families: ["html_table"],
		parseFields: [
			...COMMON_PARSE_FIELDS,
			parseField(
				"parse.html_table.select",
				"Selektor tabel",
				"Selektor CSS tabel, domyślnie table.",
				"text",
			),
			parseField(
				"parse.html_table.table_index",
				"Indeks tabeli",
				"Wybierz jedną tabelę po filtrze require_headers/require_keys.",
				"integer",
			),
			parseField(
				"parse.html_table.require_headers",
				"Wymagane nagłówki",
				"Zostaw tylko tabele, których nagłówek zawiera wszystkie etykiety.",
				"multiselect",
			),
			parseField(
				"parse.html_table.require_keys",
				"Wymagane klucze",
				"Zostaw tylko tabele key_value zawierające wszystkie klucze.",
				"multiselect",
			),
			parseField(
				"parse.html_table.orientation",
				"Orientacja",
				"rows: pierwszy wiersz to nagłówek. key_value: każdy wiersz to klucz i wartość.",
				"select",
				[
					{ value: "rows", label: "Wiersze" },
					{ value: "key_value", label: "Klucz-wartość" },
				],
			),
			parseField(
				"parse.html_table.columns",
				"Nazwy kolumn",
				"Nadpisuje nazwy kolumn odczytane z header_row.",
				"multiselect",
			),
			parseField(
				"parse.html_table.header_row",
				"Wiersz nagłówka",
				"Indeks wiersza nagłówka.",
				"integer",
			),
			parseField(
				"parse.html_table.data_start_row",
				"Pierwszy wiersz danych",
				"Indeks pierwszego wiersza danych.",
				"integer",
			),
			parseField(
				"parse.html_table.key_column",
				"Kolumna klucza",
				"Dla orientation=key_value: indeks kolumny klucza.",
				"integer",
			),
			parseField(
				"parse.html_table.value_column",
				"Kolumna wartości",
				"Dla orientation=key_value: indeks kolumny wartości.",
				"integer",
			),
			parseField(
				"parse.html_table.normalize_headers",
				"Normalizuj nagłówki",
				"Trim, zwijanie białych znaków i NBSP w nazwach nagłówków.",
				"boolean",
			),
			parseField(
				"parse.html_table.empty_as_null",
				"Puste jako null",
				"Puste komórki stają się null.",
				"boolean",
			),
		],
		defaultParse: {
			encoding: "utf-8",
			trim_headers: true,
			html_table: { orientation: "rows", header_row: 0 },
		},
	},
	html_list: {
		parser: "html_list",
		label: "Lista HTML",
		description:
			"Powtarzalne elementy HTML, każdy jako rekord. Wymaga selektora.",
		families: ["html_list"],
		parseFields: [
			...COMMON_PARSE_FIELDS,
			parseField(
				"parse.html_list.select",
				"Selektor elementów",
				"Selektor CSS elementów, z których każdy jest kandydatem na rekord.",
				"text",
			),
			parseField(
				"parse.html_list.record_filter.regex",
				"Filtr rekordu",
				"Regex zostawiający tylko pasujące elementy.",
				"text",
			),
			parseField(
				"parse.html_list.item_text_separator",
				"Separator tekstu",
				"Jak łączyć węzły tekstowe elementu w pole text.",
				"text",
			),
			parseField(
				"parse.html_list.empty_as_null",
				"Puste jako null",
				"Puste wartości stają się null.",
				"boolean",
			),
		],
		defaultParse: {
			encoding: "utf-8",
			trim_headers: true,
			html_list: { trim: true, collapse_whitespace: true, empty_as_null: true },
		},
	},
	pdf_table: {
		parser: "pdf_table",
		label: "Tabela PDF",
		description: "Tabela z warstwy tekstowej PDF, wyznaczana pozycjami słów.",
		families: ["pdf_table"],
		parseFields: [
			parseField(
				"parse.pdf_table.require_text_layer",
				"Wymagaj warstwy tekstowej",
				"Odrzuć PDF bez tekstu, zamiast zgadywać z obrazu.",
				"boolean",
			),
			parseField(
				"parse.pdf_table.pages",
				"Zakres stron",
				"[from, to] lub [from]. Tylko strony z warstwą tekstową.",
				"json",
			),
			parseField(
				"parse.pdf_table.expected_page_count",
				"Oczekiwana liczba stron",
				"Sygnał dryfu, gdy dokument zmieni liczbę stron.",
				"integer",
			),
			parseField(
				"parse.pdf_table.columns",
				"Kolumny (x_min, x_max)",
				"Lista kolumn z kluczem i zakresem współrzędnych X.",
				"json",
			),
			parseField(
				"parse.pdf_table.row_anchor.column",
				"Kolumna anchora",
				"Kolumna, w której znajduje się regex początku wiersza.",
				"text",
			),
			parseField(
				"parse.pdf_table.row_anchor.regex",
				"Regex anchora",
				"Wzorzec rozpoczynający nowy wiersz.",
				"text",
			),
			parseField(
				"parse.pdf_table.multi_line",
				"Wiele linii",
				"join_space, join_newline lub first.",
				"select",
				[
					{ value: "join_space", label: "Połącz spacją" },
					{ value: "join_newline", label: "Połącz nową linią" },
					{ value: "first", label: "Pierwsza linia" },
				],
			),
			parseField(
				"parse.pdf_table.empty_as_null",
				"Puste jako null",
				"Puste komórki stają się null.",
				"boolean",
			),
		],
		defaultParse: {
			pdf_table: {
				require_text_layer: true,
				strategy: "word_positions",
				multi_line: "join_space",
				trim: true,
				empty_as_null: true,
			},
		},
	},
	manual: {
		parser: "manual",
		label: "Ręcznie",
		description:
			"Dokument bez stabilnego parsera. Wpis wprowadza człowiek, a konfiguracja opisuje źródło i instrukcję.",
		families: ["manual"],
		parseFields: [
			parseField(
				"parse.manual.document_url",
				"URL dokumentu",
				"Bezpośredni link do PDF, DOCX, obrazu lub strony e-mapa.",
				"text",
			),
			parseField(
				"parse.manual.format",
				"Format dokumentu",
				"pdf, docx, xlsx, csv, html, emapa, image lub other.",
				"select",
				[
					{ value: "pdf", label: "PDF" },
					{ value: "docx", label: "DOCX" },
					{ value: "xlsx", label: "XLSX" },
					{ value: "csv", label: "CSV" },
					{ value: "html", label: "HTML" },
					{ value: "emapa", label: "e-mapa" },
					{ value: "image", label: "Obraz" },
					{ value: "other", label: "Inny" },
				],
			),
			parseField(
				"parse.manual.transcription_file",
				"Plik transkrypcji",
				"Ścieżka do ręcznie przygotowanego CSV/JSON z rekordami.",
				"text",
			),
			parseField(
				"parse.manual.instructions",
				"Instrukcja",
				"Co trzeba sprawdzić i jak uzupełnić rekordy.",
				"textarea",
			),
		],
		defaultParse: { manual: {} },
	},
};

export function getParserMetadata(parser: Parser): ParserFormMetadata {
	return PARSER_METADATA[parser];
}

export function allowedParsers(family: ConnectorFamily): readonly Parser[] {
	return CONNECTOR_PARSER_MATRIX[family];
}

export function isParserAllowed(
	family: ConnectorFamily,
	parser: Parser,
): boolean {
	const allowed: readonly Parser[] = CONNECTOR_PARSER_MATRIX[family];
	return allowed.includes(parser);
}

export interface ConnectorFamilyFormMetadata {
	family: ConnectorFamily;
	label: string;
	description: string;
	allowedParsers: readonly Parser[];
	requiresPagination: boolean;
}

export const CONNECTOR_FAMILY_METADATA: Record<
	ConnectorFamily,
	ConnectorFamilyFormMetadata
> = {
	file_static: {
		family: "file_static",
		label: "Plik statyczny",
		description: "Jedno pobranie CSV, XLSX, JSON, GeoJSON lub KML.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.file_static,
		requiresPagination: false,
	},
	http_json: {
		family: "http_json",
		label: "REST JSON",
		description: "REST zwracający JSON, z własną paginacją.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.http_json,
		requiresPagination: true,
	},
	http_json_api: {
		family: "http_json_api",
		label: "JSON:API",
		description: "JSON:API 1.x, np. dane.gov.pl.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.http_json_api,
		requiresPagination: true,
	},
	google_my_maps_kml: {
		family: "google_my_maps_kml",
		label: "Google My Maps KML",
		description: "Osadzone mapy Google My Maps z walidacją typu Placemark.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.google_my_maps_kml,
		requiresPagination: false,
	},
	arcgis_query: {
		family: "arcgis_query",
		label: "ArcGIS REST",
		description: "ArcGIS /query z where, outFields i resultOffset.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.arcgis_query,
		requiresPagination: true,
	},
	ckan_datastore: {
		family: "ckan_datastore",
		label: "CKAN Datastore",
		description: "CKAN datastore_search z limit/offset i total.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.ckan_datastore,
		requiresPagination: true,
	},
	html_table: {
		family: "html_table",
		label: "Tabela HTML",
		description: "Oficjalna tabela HTML bez API, tylko po zgodzie.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.html_table,
		requiresPagination: false,
	},
	html_list: {
		family: "html_list",
		label: "Lista HTML",
		description: "Oficjalna lista HTML bez API, tylko po zgodzie.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.html_list,
		requiresPagination: false,
	},
	pdf_table: {
		family: "pdf_table",
		label: "Tabela PDF",
		description: "Tabela z warstwy tekstowej oficjalnego PDF.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.pdf_table,
		requiresPagination: false,
	},
	manual: {
		family: "manual",
		label: "Ręcznie",
		description:
			"PDF lub dokument bez stabilnego URL. Import z kontrolą człowieka.",
		allowedParsers: CONNECTOR_PARSER_MATRIX.manual,
		requiresPagination: false,
	},
};

// ---------------------------------------------------------------------------
// Canonical field metadata for the mapping matrix
// ---------------------------------------------------------------------------

export type CanonicalFieldGroup =
	| "identity"
	| "naming"
	| "location"
	| "address"
	| "access"
	| "device"
	| "status"
	| "operator"
	| "media"
	| "provenance";

export type CanonicalValueType =
	| "string"
	| "number"
	| "boolean"
	| "date"
	| "enum";

export interface CanonicalFieldMetadata {
	field: CanonicalField;
	label: string;
	group: CanonicalFieldGroup;
	valueType: CanonicalValueType;
	help: string;
	enumValues?: readonly string[];
}

function cf(
	field: CanonicalField,
	label: string,
	group: CanonicalFieldGroup,
	valueType: CanonicalValueType,
	help: string,
	enumValues?: readonly string[],
): CanonicalFieldMetadata {
	return {
		field,
		label,
		group,
		valueType,
		help,
		...(enumValues ? { enumValues } : {}),
	};
}

export const CANONICAL_FIELD_METADATA_SOURCE = [
	cf(
		"public_code",
		"Kod publiczny",
		"identity",
		"string",
		"Stabilny kod publiczny AED.",
	),
	cf(
		"source_record_id",
		"ID rekordu źródłowego",
		"identity",
		"string",
		"Identyfikator w obrębie źródła.",
	),
	cf(
		"source_url",
		"URL rekordu",
		"identity",
		"string",
		"Link do rekordu w źródle.",
	),
	cf("name", "Nazwa", "naming", "string", "Nazwa obiektu lub lokalizacji."),
	cf("description", "Opis", "naming", "string", "Opis obiektu."),
	cf("note", "Notatka", "naming", "string", "Dodatkowa notatka."),
	cf(
		"facility_type",
		"Typ obiektu",
		"naming",
		"enum",
		"Typ miejsca, np. urząd, szkoła.",
		[
			"unknown",
			"municipality",
			"school",
			"healthcare",
			"shopping",
			"transport",
			"sport",
			"other",
		],
	),
	cf(
		"label",
		"Etykieta urządzenia",
		"naming",
		"string",
		"Etykieta widoczna na obudowie.",
	),
	cf("lat", "Szerokość geograficzna", "location", "number", "WGS84, -90..90."),
	cf("lon", "Długość geograficzna", "location", "number", "WGS84, -180..180."),
	cf(
		"coord_precision_m",
		"Precyzja współrzędnych",
		"location",
		"number",
		"Przybliżony błąd w metrach.",
	),
	cf("country_code", "Kod kraju", "location", "string", "ISO 3166-1 alpha-2."),
	cf("voivodeship", "Województwo", "location", "string", "Nazwa województwa."),
	cf("county", "Powiat", "location", "string", "Nazwa powiatu."),
	cf("commune", "Gmina", "location", "string", "Nazwa gminy."),
	cf("city", "Miejscowość", "location", "string", "Nazwa miejscowości."),
	cf("district", "Dzielnica", "location", "string", "Dzielnica lub osiedle."),
	cf("street", "Ulica", "address", "string", "Nazwa ulicy."),
	cf(
		"house_number",
		"Numer budynku",
		"address",
		"string",
		"Numer posesji lub budynku.",
	),
	cf("postcode", "Kod pocztowy", "address", "string", "Format XX-XXX."),
	cf(
		"address_text",
		"Adres",
		"address",
		"string",
		"Pełny adres w jednym polu.",
	),
	cf(
		"teryt_voivodeship",
		"TERYT województwa",
		"address",
		"string",
		"Kod TERYT.",
	),
	cf("teryt_county", "TERYT powiatu", "address", "string", "Kod TERYT."),
	cf("teryt_commune", "TERYT gminy", "address", "string", "Kod TERYT."),
	cf("simc", "SIMC", "address", "string", "Identyfikator miejscowości."),
	cf("ulic", "ULIC", "address", "string", "Identyfikator ulicy."),
	cf("indoor", "Wewnątrz", "access", "boolean", "Czy AED jest w budynku."),
	cf("level", "Piętro", "access", "string", "Poziom lub piętro."),
	cf(
		"room",
		"Pomieszczenie",
		"access",
		"string",
		"Nazwa lub numer pomieszczenia.",
	),
	cf(
		"entrance_description",
		"Opis wejścia",
		"access",
		"string",
		"Jak dotrzeć do urządzenia.",
	),
	cf("access_type", "Dostęp", "access", "enum", "Sposób dostępu do AED.", [
		"unknown",
		"public",
		"key",
		"permissive",
		"customers",
		"private",
		"no",
	]),
	cf(
		"opening_hours",
		"Godziny otwarcia",
		"access",
		"string",
		"Format OSM opening_hours.",
	),
	cf(
		"is_24_7",
		"Dostęp 24/7",
		"access",
		"boolean",
		"Tylko gdy źródło potwierdza.",
	),
	cf(
		"requires_dispatcher",
		"Wymaga dyspozytora",
		"access",
		"boolean",
		"Dostęp przez służby.",
	),
	cf("fee", "Opłata", "access", "boolean", "Czy dostęp jest płatny."),
	cf(
		"wheelchair_access",
		"Dostęp wózkiem",
		"access",
		"enum",
		"Dostępność dla wózków.",
		["unknown", "yes", "limited", "no"],
	),
	cf("manufacturer", "Producent", "device", "string", "Producent AED."),
	cf("model", "Model", "device", "string", "Model urządzenia."),
	cf(
		"serial_number",
		"Numer seryjny",
		"device",
		"string",
		"Dane wrażliwe, zwykle redagowane.",
	),
	cf(
		"device_type",
		"Typ urządzenia",
		"device",
		"enum",
		"public_aed lub inne.",
		["public_aed", "candidate", "unknown"],
	),
	cf(
		"pads_type",
		"Typ elektrod",
		"device",
		"string",
		"Elektrody dorosłe/dziecięce.",
	),
	cf("installed_at", "Data instalacji", "device", "date", "Data instalacji."),
	cf(
		"battery_expiry",
		"Ważność baterii",
		"device",
		"date",
		"Data wymiany baterii.",
	),
	cf(
		"pads_expiry",
		"Ważność elektrod",
		"device",
		"date",
		"Data wymiany elektrod.",
	),
	cf(
		"last_inspection_at",
		"Ostatni przegląd",
		"device",
		"date",
		"Data przeglądu.",
	),
	cf(
		"next_inspection_at",
		"Następny przegląd",
		"device",
		"date",
		"Planowany przegląd.",
	),
	cf(
		"status",
		"Status",
		"status",
		"enum",
		"Stan urządzenia. Brak danych to unknown.",
		["unknown", "active", "inactive", "removed", "maintenance"],
	),
	cf(
		"status_reason",
		"Powód statusu",
		"status",
		"string",
		"Uzasadnienie statusu.",
	),
	cf(
		"verification_status",
		"Status weryfikacji",
		"status",
		"enum",
		"Poziom pewności danych.",
		["unknown", "unverified", "probable", "confirmed", "disputed"],
	),
	cf("confidence", "Pewność", "status", "number", "0-1."),
	cf(
		"last_verified_at",
		"Ostatnia weryfikacja",
		"status",
		"date",
		"Data sprawdzenia.",
	),
	cf(
		"last_seen_at",
		"Ostatnio widziane",
		"status",
		"date",
		"Data ostatniej obserwacji.",
	),
	cf(
		"is_public",
		"Publiczne",
		"status",
		"boolean",
		"Czy rekord może być publiczny.",
	),
	cf("operator_name", "Operator", "operator", "string", "Nazwa opiekuna."),
	cf("operator_type", "Typ operatora", "operator", "enum", "Typ opiekuna.", [
		"unknown",
		"government",
		"municipality",
		"business",
		"ngo",
		"healthcare",
		"school",
	]),
	cf(
		"phone",
		"Telefon",
		"operator",
		"string",
		"Dane kontaktowe, często redagowane.",
	),
	cf(
		"email",
		"E-mail",
		"operator",
		"string",
		"Dane kontaktowe, często redagowane.",
	),
	cf("website", "Strona www", "operator", "string", "Strona operatora."),
	cf(
		"photo_url",
		"URL zdjęcia",
		"media",
		"string",
		"Zdjęcie obiektu lub urządzenia.",
	),
	cf(
		"photo_license",
		"Licencja zdjęcia",
		"media",
		"string",
		"Licencja zdjęcia.",
	),
	cf(
		"source_updated_at",
		"Aktualizacja źródła",
		"provenance",
		"date",
		"Data danych w źródle.",
	),
	cf(
		"address_kind",
		"Rodzaj adresu",
		"address",
		"enum",
		"building, street lub locality.",
		["building", "street", "locality", "unknown"],
	),
	cf(
		"address_source",
		"Źródło adresu",
		"provenance",
		"enum",
		"source, geocoder lub manual.",
		["source", "geocoder", "manual"],
	),
	cf("address_confidence", "Pewność adresu", "provenance", "number", "0-1."),
	cf(
		"location_status",
		"Status lokalizacji",
		"status",
		"enum",
		"point, address_only lub missing.",
		["point", "address_only", "missing"],
	),
	cf(
		"geom_source",
		"Źródło geometrii",
		"provenance",
		"enum",
		"source, geocoder lub none.",
		["source", "geocoder", "none"],
	),
] as const satisfies readonly CanonicalFieldMetadata[];

export const CANONICAL_FIELD_METADATA: Record<
	CanonicalField,
	CanonicalFieldMetadata
> = Object.fromEntries(
	CANONICAL_FIELD_METADATA_SOURCE.map((field) => [field.field, field]),
) as Record<CanonicalField, CanonicalFieldMetadata>;

for (const field of CANONICAL_FIELDS) {
	if (!(field in CANONICAL_FIELD_METADATA)) {
		throw new Error(`Brak metadanych UI dla pola kanonicznego: ${field}`);
	}
}

export const CANONICAL_FIELD_GROUPS: readonly {
	group: CanonicalFieldGroup;
	label: string;
}[] = [
	{ group: "identity", label: "Tożsamość" },
	{ group: "naming", label: "Nazwa i opis" },
	{ group: "location", label: "Lokalizacja" },
	{ group: "address", label: "Adres" },
	{ group: "access", label: "Dostęp" },
	{ group: "device", label: "Urządzenie" },
	{ group: "status", label: "Status i pewność" },
	{ group: "operator", label: "Operator" },
	{ group: "media", label: "Media" },
	{ group: "provenance", label: "Proweniencja" },
];

// ---------------------------------------------------------------------------
// Validation errors mapped to form fields
// ---------------------------------------------------------------------------

const ROOT_SECTION: Record<string, ConfigSectionId> = {
	version: "identity",
	source: "identity",
	connector: "connector",
	fetch: "fetch",
	parse: "parse",
	records: "records",
	map: "mapping",
	validate: "validation",
	drift: "drift",
	publish: "publish",
	geocoding: "geocoding",
	schedule: "schedule",
	activation: "activation",
};

export interface ConfigFormIssue {
	/** Dotted path with numeric indices, e.g. `validate.required[0]`. */
	path: string;
	section: ConfigSectionId;
	label: string;
	message: string;
	code: string;
	severity: "error";
}

export function formatIssuePath(path: readonly PropertyKey[]): string {
	let output = "";
	for (const segment of path) {
		if (typeof segment === "number") {
			output += `[${segment}]`;
			continue;
		}
		output += output.length === 0 ? String(segment) : `.${String(segment)}`;
	}
	return output;
}

export function sectionForPath(path: string): ConfigSectionId {
	const root = path.split(/[.[]/)[0] ?? "";
	return ROOT_SECTION[root] ?? "identity";
}

export function labelForPath(path: string): string {
	const exact = CONFIG_FIELD_METADATA[path];
	if (exact) {
		return exact.label;
	}
	const withoutIndex = path.replace(/\[\d+\]/g, "");
	const indexed = CONFIG_FIELD_METADATA[withoutIndex];
	if (indexed) {
		return indexed.label;
	}
	for (const prefix of Object.keys(CONFIG_FIELD_METADATA).sort(
		(a, b) => b.length - a.length,
	)) {
		if (path.startsWith(prefix)) {
			const metadata = CONFIG_FIELD_METADATA[prefix];
			if (metadata) {
				return metadata.label;
			}
		}
	}
	return path;
}

function translateIssue(issue: z.ZodIssue): { code: string; message: string } {
	switch (issue.code) {
		case "invalid_type":
			return {
				code: issue.code,
				message: `Oczekiwano typu ${issue.expected}.`,
			};
		case "too_small":
			return {
				code: issue.code,
				message: issue.inclusive
					? `Wartość musi być większa lub równa ${String(issue.minimum)}.`
					: `Wartość musi być większa niż ${String(issue.minimum)}.`,
			};
		case "too_big":
			return {
				code: issue.code,
				message: issue.inclusive
					? `Wartość musi być mniejsza lub równa ${String(issue.maximum)}.`
					: `Wartość musi być mniejsza niż ${String(issue.maximum)}.`,
			};
		case "unrecognized_keys":
			return {
				code: issue.code,
				message: `Nieznane pola: ${issue.keys.join(", ")}.`,
			};
		case "invalid_union":
			return {
				code: issue.code,
				message: "Wartość nie pasuje do żadnego dozwolonego wariantu.",
			};
		default:
			return {
				code: issue.code,
				message: issue.message || "Nieprawidłowa wartość.",
			};
	}
}

export function toFormIssues(error: z.ZodError): ConfigFormIssue[] {
	return error.issues.map((issue) => {
		const path = formatIssuePath(issue.path);
		const translated = translateIssue(issue);
		return {
			path,
			section: sectionForPath(path),
			label: labelForPath(path),
			message: translated.message,
			code: translated.code,
			severity: "error",
		};
	});
}

export type ConfigFormValidationResult =
	| { success: true; data: SourceConfig; issues: [] }
	| { success: false; data: null; issues: ConfigFormIssue[] };

export function validateSourceConfigForForm(
	input: unknown,
): ConfigFormValidationResult {
	const result = sourceConfigSchema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data, issues: [] };
	}
	return { success: false, data: null, issues: toFormIssues(result.error) };
}

export function groupConfigFieldsBySection(): Record<
	ConfigSectionId,
	ConfigFieldMetadata[]
> {
	const grouped = Object.fromEntries(
		CONFIG_SECTIONS.map((section) => [section.id, [] as ConfigFieldMetadata[]]),
	) as Record<ConfigSectionId, ConfigFieldMetadata[]>;
	for (const field of CONFIG_FIELD_METADATA_SOURCE) {
		grouped[field.section].push(field);
	}
	return grouped;
}
