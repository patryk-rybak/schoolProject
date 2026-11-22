# Mapa AED

Otwarty rejestr AED dla Polski: mapa z MapLibre GL JS, dodawanie urządzeń
przez zalogowanych użytkowników, import danych z zewnętrznych źródeł,
kanoniczny schemat rekordów w SQLite oraz publikacja w dane.gov.pl. Aplikacja
jest zbudowana na TanStack Start, Vite/Nitro i Bunie.

## Spis treści

1. [Struktura repozytorium](#struktura-repozytorium)
2. [Struktura kodu](#struktura-kodu)
3. [Status modułów](#status-modułów)
4. [Stack](#stack)
5. [Uruchomienie](#uruchomienie)
6. [Skrypty](#skrypty)
7. [Architektura i przepływ danych](#architektura-i-przepływ-danych)
8. [Frontend](#frontend)
9. [Backend](#backend)
10. [Routing](#routing)
11. [Server Functions i API Routes](#server-functions-i-api-routes)
12. [Data Fetching](#data-fetching)
13. [Environment Variables](#environment-variables)
14. [Linting i formatowanie](#linting-i-formatowanie)
15. [Commit Conventions](#commit-conventions)
16. [Testy i CI](#testy-i-ci)
17. [Deploy](#deploy)
18. [AI Tooling](#ai-tooling)
19. [Learn More](#learn-more)
20. [Materiały konkursowe](#materiały-konkursowe)

## Materiały konkursowe

Gotowe materiały do zgłoszenia konkursowego znajdują się w `competition-assets/`.

Przycisk **Pobierz dane XLSX** na stronie głównej obok mapy (`/data/aed.xlsx`) pobiera aktualną, pełną bazę AED w formacie XLSX, znormalizowaną do wspólnego rekordu kanonicznego. To nie jest pusty arkusz wzorca: eksport ma jeden wiersz na urządzenie, nagłówki wyłącznie z polskimi nazwami pól oraz metadane dodawane przez system.

Eksport XLSX (tak jak CSV i GeoJSON) ma jedną kolumnę na pojęcie i wyłącznie polskie nazwy: `id` (stabilny UUID), `nazwa_obiektu`, `szerokosc_geo`, `dlugosc_geo`, `miejscowosc`, `typ_dostepnosci`, `status_sprawnosci`, `status_weryfikacji`, `zweryfikowane_przez`, `typ_weryfikatora`, `data_weryfikacji`, `identyfikator_kanoniczny`, `zrodlo_danych`, `identyfikator_w_zrodle`, `url_zrodla`, `status_lokalizacji`, `zrodlo_geometrii`, `data_utworzenia` i `data_aktualizacji`.

Formularz dodawania AED pokazuje trzy sekcje główne rozwinięte: **Podstawowe informacje**, **Lokalizacja/Adres** i **Dostępność**. **Typ dostępu** jest obowiązkowy (24/7 publiczny, w godzinach otwarcia, ograniczony/na klucz, nieznany), a godziny otwarcia pojawiają się tylko dla dostępu w godzinach otwarcia. Współrzędne pochodzą z kliknięcia na mapie lub geokodowania adresu; kod pocztowy, województwo i powiat są uzupełniane automatycznie. Sekcje **Cechy dostępności**, **Urządzenie i przeglądy** oraz **Opiekun** są zwinięte i opcjonalne, więc zgłoszenie nie wymaga od mieszkańca znajomości dat ważności baterii czy elektrod.

Wzorcowy XLSX (statyczny plik `wzorcowy-zakres-danych-aed.xlsx`) jest zgodny z ujęciem dane.gov.pl/DCAT-AP i dzieli pola na trzy poziomy. To dokumentacja wzorca, nie dane z bazy:

- **Wymagane** (7): `id`, `nazwa_obiektu`, `szerokosc_geo` (WGS84), `dlugosc_geo` (WGS84), `miejscowosc`, `typ_dostepnosci`, `data_aktualizacji`,
- **Zalecane** (8): `ulica`, `nr_budynku`, `opis_lokalizacji`, `godziny_otwarcia`, `wewnatrz_zewnatrz`, `status_sprawnosci`, `opiekun_nazwa`, `opiekun_kontakt`,
- **Opcjonalne** (5): `producent_model`, `elektrody_pediatryczne`, `data_waznosci_baterii`, `data_waznosci_elektrod`, `url_zdjecia`.

W eksportach CSV, GeoJSON i XLSX system uwzględnia pola techniczne: `id` (stabilny UUID), `identyfikator_kanoniczny`, `zrodlo_danych`, `identyfikator_w_zrodle`, `url_zrodla`, `status_lokalizacji`, `zrodlo_geometrii`, `data_utworzenia`, `data_aktualizacji` i `status_weryfikacji`. Nie są one wpisywane ręcznie w formularzu; pozwalają jury i dostawcom prześledzić pochodzenie i weryfikację rekordu.

Statyczny plik `wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx` pozostaje wyłącznie dokumentacją wzorca (6 arkuszy). Nie zawiera danych z bazy i nie jest plikiem pobieranym przez przycisk na stronie głównej (`/data/aed.xlsx`).

- `wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx`: wzorcowy zakres danych (6 arkuszy, dokumentacja),
- `logo/`: logo z maskotką AED w formatach PNG, JPG i SVG (wersja monochromatyczna PNG),
- `brand/cheerful-crayon-aed-mascot.png`: kanoniczny plik źródłowy maskotki dostarczony przez Zdzisława,
- `brand/brandbook.pdf` i `brand/dane-aed-razem-ksiega-znaku.pdf`: księga znaku (PDF),
- `prezentacja/prezentacja.pdf` i `prezentacja/prezentacja.md`: prezentacja projektu w formacie PDF i jej źródło Markdown
- `INSTRUKCJA-DLA-JURY.md`: instrukcja dla jury,
- `screenshots/`: zrzuty ekranu aplikacji (logo, mapa, formularze).

Materiały można odtworzyć poleceniem `bun scripts/generate-competition-assets.ts` (skrypt generuje XLSX, księgę znaku, pliki loga na podstawie maskotki i prezentację PDF, a pozostałe pliki są przechowywane w repozytorium). Canonicalny jest plik PNG: SVG osadza ten sam raster jako dane base64, a nie wektorowy odrys. Maskotka została dostarczona na potrzeby zgłoszenia przez Zdzisława; dalsze użycie wymaga ustalenia licencji z autorem.

## Struktura repozytorium

Kod aplikacji znajduje się w katalogu `AED/`. W katalogu głównym repozytorium
zostają tylko materiały niezwiązane z uruchamianiem aplikacji:

| Ścieżka | Zawartość |
| --- | --- |
| `AED/` | aplikacja: kod, konfiguracja, skrypty, dokumentacja techniczna |
| `docs/` | statyczna strona kampanii „razimy dobrem” publikowana przez GitHub Pages (`share.html`, obraz OG) |
| `task_description/` | treść zadania konkursowego (PDF) |
| `dane.gov.pl/` | opublikowane źródła portalu dane.gov.pl (archiwa) i instrukcja uruchomienia |

Wszystkie poniższe komendy uruchamiaj z katalogu `AED/`:

```bash
cd AED
bun install
bun run dev
```

## Struktura kodu

Cały kod aplikacji jest podzielony na dwie warstwy:

```text
AED/
├── frontend/                 # routing, komponenty, hooki, style
│   ├── routes/               # mapa, /logowanie, /dodaj-aed, /moje-aed, /aed/$aedId, /zrodla, /data, /harvester
│   ├── router.tsx            # fabryka routera
│   ├── routeTree.gen.ts      # generowany — nie edytować ręcznie
│   ├── components/           # komponenty własne + ui/ (shadcn, rejestr)
│   ├── map/                  # mapa AED (MapLibre + Protomaps)
│   ├── auth-form/            # logowanie/rejestracja
│   ├── server/               # server functions (forms.ts)
│   └── hooks/, lib/          # hooki i helpery klienta (cn, etykiety AED, auth-client, social-share)
├── backend/                  # dane, uwierzytelnianie, integracje
│   ├── auth/                 # better-auth (serwer)
│   ├── forms/                # zapis ręczny AED, geokodowanie, admin źródeł
│   ├── store/                # Drizzle + bun:sqlite, tabele źródłowe + tabela łączona
│   ├── ingest/               # rejestr źródeł (konfiguracja)
│   └── gov-api/              # feed i eksporty dla dane.gov.pl
├── src/server/ingest/        # loader, schemat, fetch i core
├── SOURCES.md                # pełny inwentarz 79 źródeł danych
└── scripts/                  # narzędzia deweloperskie
```

Aliasy ścieżek: `#/*` → `frontend/*`, `#backend/*` → `backend/*`
(analogicznie `@/*` i `@backend/*`).

## Status modułów

| Warstwa | Moduł | Status | Sekcja |
| --- | --- | --- | --- |
| frontend | auth-form | działa | [Logowanie i rejestracja](#logowanie-i-rejestracja-auth-form) |
| frontend | aed-form | działa (dev) | [Formularz AED](#formularz-aed-aed-form) |
| frontend | my-aed | działa | [Moje AED](#moje-aed-my-aed) |
| frontend | map | działa (mapa + wybór punktu) | [Mapa AED](#mapa-aed-map) |
| frontend | social-share | działa | [Udostępnianie na Facebooku](#udostępnianie-na-facebooku-social-share) |
| frontend | social-media | planowane | [Propozycje postów](#propozycje-postów-social-media) |
| backend | auth | działa | [Uwierzytelnianie](#uwierzytelnianie-auth) |
| backend | ingest | działa (dev) | [Pobieranie danych](#pobieranie-danych-ingest) |
| backend | normalize | częściowo działa | [Standaryzacja danych](#standaryzacja-danych-normalize) |
| backend | store | działa (dev) | [Baza danych](#baza-danych-store) |
| backend | gov-api | działa | [Integracja z dane.gov.pl](#integracja-z-danegovpl-gov-api) |

## Stack

- TanStack Start + TanStack Router (React 19, routing plikowy)
- Vite 8 + Nitro 3 z presetem `bun`
- Bun 1.4 jako runtime, menedżer pakietów i sterownik SQLite
- MapLibre GL JS 6.19.0 + Protomaps/PMTiles
- Tailwind CSS v4 + shadcn/ui (`new-york`, komponenty na bazie Radix UI)
- Drizzle ORM z `bun:sqlite`
- better-auth
- Biome + TypeScript w trybie strict

## Uruchomienie

```bash
bun install
bun run dev
```

Aplikacja działa pod http://localhost:3000.

`bun run dev` (i `bun run preview`) uruchamia przed startem `bun run db:bootstrap`: migruje bazę i, jeśli tabela źródeł jest pusta albo zawiera tylko rekordy `db:seed`, ładuje punkty z gotowego `.data/core/core.json`. Dzięki temu świeży klon z pobranym datasetem core od razu pokazuje pełną mapę. Jeśli core nie został jeszcze zbudowany, uruchom `bun run ingest:run --all` (lub `bun run db:refresh-sources`).

Worker MapLibre jest wbudowywany przez Vite bezpośrednio z pakietu `maplibre-gl`
(`?worker&url`); nie jest kopiowany do `frontend/public/` i nie wymaga żadnych
hooków instalacyjnych.

## Skrypty

| Zadanie | Komenda |
| --- | --- |
| Serwer deweloperski | `bun run dev` |
| Lokalny HTTPS dla testu dane.gov.pl | `bun run dev:tls` |
| Typecheck | `bun run typecheck` |
| Lint | `bun run lint` |
| Format | `bun run format` |
| Lint + format + importy | `bun run check` |
| Autofix | `bun run check:write` |
| Wszystkie kontrole | `bun run verify` |
| Testy | `bun test` |
| Build | `bun run build` |
| Podgląd builda | `bun run preview` |
| Migracje | `bun run db:generate`, `bun run db:migrate`, `bun run db:push` |
| Dane startowe (dev) | `bun run db:seed` |
| Automatyczny rozruch bazy dev (migracje + core, gdy pusta) | `bun run db:bootstrap` |
| Drizzle Studio | `bun run db:studio` |
| Ingest źródeł i budowa core | `bun run ingest:run` |
| Pełny refresh tabeli źródeł z gotowego core | `bun run db:load-core` |
| Dzienny refresh (fetch + zapis) | `bun run db:refresh-sources` |
| Kafelki mapy | `bun run map:tiles` |
| Nowy komponent shadcn | `bunx --bun shadcn@latest add <nazwa>` |

## Architektura i przepływ danych

```
źródła zewnętrzne ──ingest──> aed_source_devices ─┐
                                                   ├──> aed_devices_combined ──> mapa / CSV / GeoJSON / feed
użytkownik ──/dodaj-aed──> aed_devices ────────────┘
```

Model danych ma dwa niezależne cykle życia:

- `aed_devices` — rekordy dodane przez zalogowanego użytkownika; są trwałe,
  podpisane jego identyfikatorem i od razu zweryfikowane,
- `aed_source_devices` — rekordy z importów; cała tabela jest odświeżana,
  a rekordy są zawsze niezweryfikowane,
- `aed_devices_combined` — materializowana tabela łącząca oba źródła,
  przebudowywana transakcyjnie; czytają z niej mapa, eksporty i dane.gov.pl,
  a import nie może usunąć ani zmienić `aed_devices`.

Zasady wspólne dla backendu:

- Bun + `bun:sqlite` + Drizzle (WAL zostaje włączony),
- brak sekretów w repozytorium (`.env.local`),
- każda zmiana schematu = migracja,
- kod serwerowy nie trafia do komponentów klienckich.

### Źródła danych i provenance

Zbiór jest budowany wyłącznie ze źródeł zdefiniowanych w `backend/ingest/datasources-config.json`. Konfiguracja obejmuje 11 źródeł, z których 5 jest włączonych: `krosno`, `marki`, `openaedmap`, `przemysl` i `warszawa`. Pozostałe wpisy (`belchatow`, `lodz`, `olsztyn`, `pawlowice`, `tczew`, `zielona-gora`) pozostają wyłączone do decyzji licencyjnej. Każdy rekord zachowuje źródło (`zrodlo_danych`), URL źródła (`url_zrodla`) i `status_weryfikacji`, więc provenance jest jednoznacznie przypisane do źródła z konfiguracji.

| Identyfikator źródła | Nazwa | Status |
| --- | --- | --- |
| `krosno` | Defibrylatory w Krośnie | włączone |
| `marki` | Defibrylatory w Markach | włączone |
| `openaedmap` | OpenAEDMap — eksport krajowy PL | włączone |
| `przemysl` | Otwarte Dane Przemyśl — defibrylatory AED | włączone |
| `warszawa` | Lokalizacja defibrylatorów (AED) — m.st. Warszawa | włączone |
| `belchatow` | Wykaz defibrylatorów AED na terenie Bełchatowa (KML) | wyłączone do decyzji licencyjnej |
| `lodz` | Defibrylatory AED w Łodzi (Google My Maps, KML) | wyłączone do decyzji licencyjnej |
| `olsztyn` | Mapa ogólnodostępnych defibrylatorów AED w Olsztynie (KML) | wyłączone do decyzji licencyjnej |
| `pawlowice` | Defibrylatory AED - Gmina Pawłowice (KML) | wyłączone do decyzji licencyjnej |
| `tczew` | AED Tczew (Google My Maps, KML) | wyłączone do decyzji licencyjnej |
| `zielona-gora` | AED w Zielonej Górze (Google My Maps, KML) | wyłączone do decyzji licencyjnej |

Każdy rekord zachowuje źródło (`zrodlo_danych`), URL źródła (`url_zrodla`) i `status_weryfikacji`.

Zasady wspólne dla frontendu:

- komponenty z `frontend/components/ui/` (shadcn, `new-york`) — bez ręcznego
  duplikowania primitywów,
- WCAG 2.2 AA i pełna responsywność (320 px → desktop),
- brak sekretów w kodzie klienta; dane przez loadery/server functions,
- teksty interfejsu po polsku, spójne z resztą aplikacji.

## Frontend

Warstwa interfejsu użytkownika — tutaj mieszka kod frontendu (routing, komponenty,
hooki, style) oraz implementacje modułów.

### Logowanie i rejestracja (auth-form)

**Status:** działa · **Kod:** `frontend/auth-form/`, `backend/auth/`

**Cel:** pozwolić użytkownikom założyć konto i zalogować się nazwą użytkownika
oraz hasłem. Sesja jest wymagana do dodania AED, a identyfikator konta podpisuje
nowy rekord.

**Co działa:**

- rejestracja i logowanie **nazwa użytkownika + hasło** (bez e-maila w UI),
- better-auth tworzy wewnętrzny adres `<nazwa>@users.local`; nie jest on
  pokazywany ani weryfikowany,
- hasła są hashowane przez better-auth (scrypt), nigdy nie trafiają do bazy
  jawnie,
- sesja w cookie HttpOnly (`better-auth.session_token`), wylogowanie czyści
  cookie,
- walidacja po polsku: nazwa 3–30 znaków (`a-z`, `0-9`, `_`), hasło min. 8,
  potwierdzenie hasła przy rejestracji,
- komunikaty błędów m.in. dla zajętej nazwy i błędnych danych logowania,
- strona główna to nagłówek + mapa; w prawym górnym rogu nagłówka jest
  przycisk **„Zaloguj / Zarejestruj”** prowadzący do `/logowanie`,
- w nawigacji jest link **„Moje AED”**; bez sesji prowadzi on do
  `/logowanie`, a po zalogowaniu pokazuje własne rekordy użytkownika,
- strona `/logowanie` ma wyśrodkowany panel z polami nazwa użytkownika i
  hasło oraz przyciskami **Zaloguj** i **Zarejestruj**,
- pod formularzem na `/logowanie` jest **wyłączony** przycisk
  **„Zaloguj z gov.pl”** — placeholder, który nic nie robi,
- po udanym logowaniu lub rejestracji użytkownik wraca na stronę główną,
  a w nagłówku zamiast „Zaloguj / Zarejestruj” pojawia się
  **Witaj {nazwa}!** oraz **Wyloguj**,
- identyfikator zalogowanego konta trafia do `aed_devices.created_by_id`
  i jest jednocześnie zapisywany jako weryfikator rekordu.

**Pliki:** `frontend/auth-form/auth-panel.tsx` (formularze),
`frontend/auth-form/site-header.tsx` (przyciski w nagłówku),
`frontend/routes/logowanie.tsx` (strona logowania),
`frontend/lib/auth-client.ts` (klient z pluginem `username`).

**Czego jeszcze nie ma:** ról i uprawnień, limitowania prób logowania,
weryfikacji e-maila, logowania przez gov.pl, zarządzania kontem.

### Formularz AED (aed-form)

**Status:** działa (dev) · **Kod:** `frontend/routes/dodaj-aed.tsx`,
`frontend/components/aed-form/`, `frontend/routes/zrodla/`, `backend/forms/`,
`frontend/server/forms.ts`

**Cel:** umożliwić dodanie nowego defibrylatora oraz podłączenie źródeł danych
bezpośrednio w aplikacji.

**Co działa:**

- `/dodaj-aed` wymaga zalogowania: bez sesji użytkownik jest przekierowany
  na `/logowanie`, a zapis po stronie serwera i tak odrzuca brak sesji.
- `/dodaj-aed` — formularz ręcznego rekordu obejmujący pełny schemat
  kanoniczny (nazwa, adres, dostępność, urządzenie, przeglądy, opiekun).
  Punkt lokalizacji wybiera się klikając mapę albo wyznacza z adresu
  przyciskiem „Wyznacz współrzędne z adresu” (geokodowanie Nominatim po
  stronie serwera, `backend/forms/geocode.ts`, z limitem 1 żądania/s).
- nowy rekord jest podpisany identyfikatorem konta (`created_by_id`) i od razu
  oznaczony jako zweryfikowany przez dodającego użytkownika.
- Kliknięcie dowolnego miejsca na mapie głównej otwiera popup „Dodaj AED
  tutaj” z linkiem do formularza z wypełnionymi współrzędnymi.
- `/zrodla` — rejestr konektorów (`backend/ingest/datasources-config.json`)
  z akcjami „Importuj do mapy” (fetch → parse → map → validate → zapis do
  `aed_source_devices`, zastępuje tylko wiersze danego źródła) i „Usuń”.
- `/zrodla/nowe` — kreator konektora: plik kolumnowy po HTTPS (CSV, XLSX,
  JSON, GeoJSON, KML) albo magazyn danych (SQLite, PostgreSQL, S3). Podgląd
  kolumn i przykładowych wierszy, a następnie mapowanie kolumn na pola
  schematu AED (w tym tryby współrzędnych: kolumny lat/lon, para, GeoJSON,
  KML) i walidacja bbox Polski.
- Poświadczenia (Postgres, S3) podaje się przez nazwy zmiennych
  środowiskowych — sekrety nie trafiają do rejestru w repozytorium.
- Walidacja po stronie serwera (`backend/forms/manual-record.ts`,
  `source-admin.ts`) zwraca polskie komunikaty per pole; formularze nie
  tracą wpisanych danych przy błędzie.

**Czego jeszcze nie ma:** edycja istniejących rekordów, moderacja zgłoszeń,
historia zmian, deduplikacja łączonej tabeli.

**Zależności:** [backend/store](#baza-danych-store) — zapis rekordów,
`src/server/ingest/` — walidacja konfiguracji i pipeline importu,
`frontend/map/` — wspólny komponent wyboru punktu na mapie.

### Moje AED (my-aed)

**Status:** działa · **Kod:** `frontend/routes/moje-aed.tsx`,
`frontend/server/forms.ts`, `backend/store/aed-store.ts`

**Cel:** pokazać użytkownikowi wyłącznie jego własne defibrylatory i pozwolić
mu je usuwać.

**Co działa:**

- link **Moje AED** w nagłówku prowadzi do `/moje-aed`; bez sesji root guard
  przekierowuje na `/logowanie`, a server functions sprawdzają sesję ponownie,
- lista zawiera tylko rekordy, których `created_by_id` równa się id
  zalogowanego konta; rekordy innych użytkowników i importy są niewidoczne,
- każdy wiersz pokazuje nazwę, adres/miasto, współrzędne, datę dodania i status
  weryfikacji,
- przycisk kosza wymaga potwierdzenia; usunięcie w jednej transakcji usuwa
  rekord z `aed_devices` i z `aed_devices_combined` (dopasowanie po
  `record_id`),
- próba usunięcia cudzego rekordu jest odrzucana po stronie serwera,
- przycisk **Dodaj AED** prowadzi do istniejącego formularza `/dodaj-aed`.

**Czego jeszcze nie ma:** edycji istniejącego rekordu i przywracania usuniętych
danych.

### Mapa AED (map)

**Status:** działa (dev) · **Kod:** `frontend/map/`, `frontend/routes/index.tsx`

**Cel:** pokazać, gdzie znajdują się defibrylatory, czy są dostępne i czy
działają — tak szybko, jak to możliwe, również na telefonie.

**Co działa:**

- strona główna to nagłówek + mapa Polski (MapLibre, kafelki Protomaps),
- punkty AED pochodzą z `/data/aed.geojson`, czyli z tabeli
  `aed_devices_combined`; publikowane są tylko rekordy `point`/`geocoded`,
- kolor punktu pokazuje weryfikację: **zielony** = zweryfikowany (rekord
  użytkownika), **szary** = niezweryfikowany (import/seed),
- popup pokazuje nazwę, miasto i informację o weryfikacji,
- przycisk **„Moja lokalizacja”** (na stronie głównej) pobiera bieżącą pozycję
  przez Geolocation API, przybliża mapę i pokazuje niebieską kropkę z etykietą
  „Twoja lokalizacja”; błędy uprawnień są komunikowane w alercie,
- kliknięcie w mapę otwiera popup „Dodaj AED tutaj” z linkiem do formularza
  i wypełnionymi współrzędnymi,
- ten sam komponent mapy służy w formularzu do wyboru punktu.

Geolokalizacja wymaga bezpiecznego kontekstu: działa na `localhost` oraz pod
HTTPS. Przy dostępie przez zwykłe HTTP z adresu LAN przeglądarka zablokuje
`navigator.geolocation`.

**Czego jeszcze nie ma:** klastrowania, filtrów, panelu szczegółów z pełnym
adresem i licencją, funkcji „najbliższy AED”, tabelarycznej alternatywy dla
mapy oraz automatycznego odświeżania punktów bez przeładowania strony.

**Zależności:** dane z [backend/store](#baza-danych-store) → API/loader,
kafelki z `frontend/routes/api/pmtiles.ts` i `frontend/public/poland.pmtiles`
(`bun run map:tiles`), styl z `frontend/components/ui/`.

**Implementacja:** strona główna (`frontend/routes/index.tsx`) renderuje
`frontend/map/poland-map.tsx`: MapLibre GL JS wyśrodkowany na Polsce
(`19.1451, 51.9194`), z polskimi etykietami z Protomaps, kontrolkami nawigacji
i skali oraz alertem shadcn, gdy mapa nie może się wczytać.

Wyciąg kafelków kończy się na zoomie 15, a mapa pozwala dojść do zoomu 18.
Źródło ma przypięte `maxzoom: 15`, więc MapLibre overzoomuje kafelki z15 zamiast
żądać brakujących kafelków. Kafelki pochodzą z `/api/pmtiles`
(`frontend/routes/api/pmtiles.ts`), który obsługuje nagłówki `Range` i odpowiada
`206 Partial Content`. Nie podłączaj PMTiles bezpośrednio do pliku statycznego,
ponieważ hosting statyczny nie zwraca zakresów bajtów wymaganych przez PMTiles.

Wygeneruj lokalny wyciąg PMTiles (domyślnie zoom 15, około 4 GB, ignorowany
przez git):

```bash
bun run map:tiles
```

Skrypt pobiera najnowszy dzienny build Protomaps i wycina Polskę do
`frontend/public/poland.pmtiles`. Domyślnie używa `PMTILES_THREADS=12` i ponawia
próbę do `PMTILES_ATTEMPTS=3` razy. Nadpisz ustawienia przez `POLAND_MAXZOOM`,
`POLAND_BBOX`, `PMTILES_THREADS`, `PMTILES_ATTEMPTS` lub
`PROTOMAPS_PLANET_URL`. Szybki, mały wyciąg: `POLAND_MAXZOOM=10 bun run map:tiles`
(około 100 MB; mapa nadal przybliża, ale kafelki są rozmyte). Skrypt nie
nadpisuje istniejącego archiwum i nie usuwa go przy nieudanej próbie; aby wymusić
ponowne pobranie, ustaw `POLAND_FORCE=1`. Przed podmianą plik tymczasowy jest
synchronizowany (`sync`) i weryfikowany przez `pmtiles verify`; jeśli zniknie w
trakcie pobierania (np. przez `git clean -fdX`, bo pasuje do ignorowanego wzorca
`*.pmtiles.tmp.*`), skrypt ponawia wyciąg.

Worker MapLibre jest ładowany przez Vite jako zasób wygenerowany z
`maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url`. Plik
`frontend/map/poland-map.tsx` ustawia jego adres przez `maplibregl.setWorkerUrl()`
raz przy starcie w przeglądarce. Nie trzeba ręcznie dodawać parametru `?v=`,
kopiować pliku do `public/` ani serwować workera przez route serwerowy.

### Udostępnianie na Facebooku (social-share)

**Status:** działa · **Kod:** `frontend/lib/social-share.ts`,
`frontend/routes/dodaj-aed.tsx`, `docs/share.html`

**Cel:** po zapisaniu AED pozwolić jednym kliknięciem udostępnić kampanię
„razimy dobrem” na Facebooku, bez publicznego wdrażania całej aplikacji.

**Co działa:**

- ekran sukcesu `/dodaj-aed` pokazuje kartę **Poraź dobrem** z przyciskiem
  w kolorach Facebooka,
- kliknięcie kopiuje tekst posta z nazwą zapisanego AED i otwiera
  `https://www.facebook.com/sharer/sharer.php?u=…` w nowej karcie,
- publiczna strona `https://patryk-rybak.github.io/schoolProject/share.html`
  (GitHub Pages, folder `docs/`) udostępnia obraz i tagi Open Graph; aplikacja
  nadal działa wyłącznie lokalnie,
- statyczna strona ma nagłówek „⚡ razimy dobrem ⚡” i notkę, że w środowisku
  produkcyjnym link prowadziłby do mapy z nowo dodanym defibrylatorem,
- jeśli schowek jest niedostępny, tekst posta pojawia się w polu do ręcznego
  skopiowania.

**Uwagi:**

- podgląd linku na Facebooku jest stały (obraz, tytuł, opis); nazwa AED
  znajduje się tylko w kopiowanym tekście,
- po zmianie obrazu użyj nowej nazwy pliku albo odśwież podgląd w
  [Sharing Debugger](https://developers.facebook.com/tools/debug/),
- publiczna strona nie zawiera danych aplikacji ani bazy; publikowany jest
  wyłącznie folder `docs/`.

### Propozycje postów (social-media)

**Status:** planowane · **Kod:** brak

**Cel:** wspierać kampanię „oddaj dane o AED” — generować gotowe propozycje
postów, które instytucje i opiekunowie urządzeń mogą opublikować bez pracy
redakcyjnej.

**Zakres:**

- szablony postów (krótkie, z liczbą urządzeń, obszarem i wezwaniem do
  udostępnienia danych),
- podgląd posta w układzie wybranej platformy,
- kopiowanie treści jednym kliknięciem, eksport jako tekst,
- warianty językowe (PL/EN) i ton (formalny/społecznościowy),
- oznaczenie treści jako propozycji do akceptacji, nie publikacja automatyczna,
- zgodność z zasadami dostępności: tekst alternatywny do grafik, czytelne
  kontrasty.

**Zależności:** dane z [backend/store](#baza-danych-store) — liczby i obszary do
wstawienia w treść; kampania: nazwa, hasło i logotyp (poza zakresem tego
katalogu); `frontend/map/` — link do mapy w treści posta.

**Stan obecny:** brak. Moduł nie jest powiązany z żadnym istniejącym kodem.

### UI

Projekt używa wyłącznie natywnych komponentów shadcn/ui generowanych przez CLI:
`alert`, `badge`, `button`, `card`, `input` i `label`. Są zarządzane przez rejestr shadcn, bazują
na Radix UI i zachowują styl `new-york` oraz motyw oparty na zmiennych CSS w
`frontend/styles.css`. Nie edytuj wygenerowanych plików w
`frontend/components/ui/` ręcznie i nie dodawaj własnych prymitywów zamiast
komponentów shadcn.

```bash
bunx --bun shadcn@latest add <nazwa>
```

## Backend

Warstwa danych i integracji — tutaj mieszka kod backendu (baza,
uwierzytelnianie, ingest, integracja z dane.gov.pl).

### Uwierzytelnianie (auth)

**Status:** działa · **Kod:** `backend/auth/`, `frontend/auth-form/`

**Cel:** wiedzieć, kto korzysta z aplikacji, chronić dodawanie danych i podpisywać
rekordy identyfikatorem konta.

**Co działa:**

- better-auth z adapterem Drizzle (`better-auth/adapters/drizzle`) na
  `bun:sqlite`,
- logowanie **nazwa użytkownika + hasło** (plugin `username`),
- tabele `user`, `session`, `account`, `verification` w tej samej bazie co
  dane AED (schemat w `backend/auth/schema.ts`),
- każdy użytkownik ma unikalne `user.id` (string generowany przez better-auth),
- sesja w cookie HttpOnly, ważna 7 dni; wylogowanie unieważnia sesję,
- rejestracja nie wymaga e-maila — UI tworzy techniczny adres
  `<nazwa>@users.local`,
- `session.user.id` jest przekazywany wyłącznie po stronie serwera do zapisu
  ręcznego AED; klient nie może go podmienić,
- `/dodaj-aed` jest chroniony przez `beforeLoad` w root route, a
  `saveManualAedFn` powtarza sprawdzenie przed zapisem (obrona w głąb).

**Pliki:** `backend/auth/auth.ts` (konfiguracja + adapter),
`backend/auth/schema.ts` (tabele), `frontend/lib/auth-client.ts` (klient),
`frontend/routes/api/auth/$.ts` (handler `/api/auth/*`).

Ustaw w `.env.local`:

```bash
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

Sekret wygenerujesz przez `openssl rand -hex 32` (albo
`bunx --bun @better-auth/cli secret`).

**Czego jeszcze nie ma:** ról i uprawnień, limitowania prób logowania,
weryfikacji e-maila, logowania przez gov.pl, zarządzania kontem.

### Pobieranie danych (ingest)

**Status:** działa (dev) · **Rejestr:** `backend/ingest/datasources-config.json`

**Cel:** zebrać dane o AED od wszystkich dysponentów: portale open-data miast,
serwisy organizacji, dane z OSM i inne dostępne źródła — wraz z **zakresem
referencyjnym** każdego źródła.

Pełna lista 79 znalezionych źródeł danych: [`SOURCES.md`](./SOURCES.md).

Rejestr źródeł to jeden plik `backend/ingest/datasources-config.json`.
`source.enabled=false` wyłącza źródło w zwykłym przebiegu; `--all` (lub jawne
`--source <id>`) pobiera je mimo bramki. Pełny przebieg:

```bash
bun run ingest:run
```

Skrypt najpierw zapisuje **surowe snapshoty** do `.data/core/raw/`
(`<source-id>.<ext>` + `.meta.json` z `sha256`, HTTP, licencją i liczbą
rekordów), a potem buduje wspólny zbiór kanoniczny w `.data/core/`. Katalog
`.data/` jest ignorowany przez git. Opcje `--no-fetch`, `--no-write`,
`--out-dir` i `--raw-dir` pozwalają sterować przebiegiem.

Konfiguracja źródeł jest „mapping-only”: rodzina connectora i parser są
wybierane na podstawie wpisu w rejestrze, a mapowanie pól opisuje DSL z sekcją
`map`. Loader i schemat Zod znajdują się w `src/server/ingest/config/`
(`loader.ts`, `schema.ts`), a pobieranie i budowa core w
`src/server/ingest/fetch/` oraz `src/server/ingest/core/`.

**Produkty core:**

| Plik | Zawartość |
|---|---|
| `.data/core/core.json` | wszystkie rekordy kanoniczne |
| `.data/core/core-public.json` | tylko `publish_state=published` |
| `.data/core/core-internal.json` | rekordy niewidoczne publicznie |
| `.data/core/core.geojson` | wszystkie rekordy z punktem |
| `.data/core/core-public-osm.geojson` | publiczne OSM/OpenAEDMap (ODbL-1.0) |
| `.data/core/core-public-local.geojson` | publiczne źródła lokalne |
| `.data/core/core.csv` | płaska tabela do podglądu |
| `.data/core/core.sqlite` | tabele `source`, `aed_core`, `owner_claim` |
| `.data/core/manifest.json` | źródła, licencje, hashe, liczby i błędy |

Samo przebudowanie z istniejących snapshotów:

```bash
bun run core:build
# lub
bun run ingest:run -- --no-fetch
```

**Zapis do bazy:** `bun run db:load-core` bierze punktowe rekordy z
`.data/core/core.json` i w jednej transakcji zastępuje całą tabelę
`aed_source_devices`. Tabela użytkowników `aed_devices` nie jest przy tym
dotykana. Pojedyncze źródło można też zaimportować z panelu `/zrodla`.

**Zależności:** [baza danych](#baza-danych-store) — zapis rekordów źródłowych,
`src/server/ingest/core/` — parsowanie, mapowanie i walidacja,
[kanoniczny rekord AED](#kanoniczny-rekord-aed-canonical) — wspólny format.

### Standaryzacja danych (normalize)

**Status:** częściowo zaimplementowane · **Kod:** `src/server/ingest/canonical.ts`,
`src/server/ingest/core/`, `backend/store/schema.ts`

**Cel:** sprowadzić dane z wszystkich źródeł do jednego, porównywalnego
formatu — tak, aby mapa i portal dane.gov.pl pokazywały ten sam zestaw pól
niezależnie od źródła.

**Co już działa:**

- jeden kanoniczny schemat Zod (`canonical.ts`) dla importu i formularza,
- mapowanie pól źródeł (`core/map.ts`) i walidacja reguł (`core/validate.ts`),
- kanoniczne kolumny w SQLite oraz `field_provenance` i `attributes`,
- obowiązkowe współrzędne: rekordy `address_only`/`unresolved`/`conflict`
  są raportowane, ale nie trafiają do bazy,
- deterministyczne `record_id` dla źródeł i unikalny identyfikator dla
  rekordów użytkownika,
- pola pewności, geokodowania i claimów w schemacie (jeszcze niewykorzystane
  przez UI).

**Czego jeszcze nie ma:** normalizacji adresów i przypisania TERYT,
deduplikacji tych samych urządzeń z różnych źródeł, kolejki kwarantanny i
ręcznej moderacji oraz pełnej historii zmian rekordu.

**Zależności:** [pobieranie danych](#pobieranie-danych-ingest) — dane wejściowe,
[kanoniczny rekord AED](#kanoniczny-rekord-aed-canonical) — wspólny format,
[baza danych](#baza-danych-store) — zapis wyniku.

### Kanoniczny rekord AED (canonical)

**Status:** działa · **Źródło prawdy:** `src/server/ingest/canonical.ts`

Każdy rekord — niezależnie od tego, czy pochodzi z importu, czy z formularza —
ma ten sam kształt:

| Grupa | Pola |
| --- | --- |
| tożsamość | `version`, `record_id`, `source_id`, `source_record_id`, `source_url` |
| treść | `name`, `description`, `note`, `facility_type`, `device_type`, `access_type`, `status` |
| weryfikacja | `verification_status`, `verified_by`, `verified_by_kind`, `verified_at`, `confidence` |
| lokalizacja | `lat`, `lon`, `coord_precision_m`, `location_status`, `geom_source` |
| adres i geokodowanie | `address_text`, `address_kind`, `address_source`, `address_confidence`, `geocode_*` |
| claimy | `claim_status`, `claimed_by`, `claimed_at`, `claim_note` |
| dodatkowe | `field_provenance`, `attributes` (JSON) |

`location_status` opisuje jakość lokalizacji:

| Wartość | Znaczenie | Zapis w bazie |
| --- | --- | --- |
| `point` | punkt podany przez źródło lub wskazany ręcznie | tak, publikowany |
| `geocoded` | punkt wyznaczony z adresu | tak, publikowany |
| `address_only` | znany tylko adres, brak punktu | nie |
| `unresolved` | nie udało się ustalić lokalizacji | nie |
| `conflict` | sprzeczne lokalizacje w źródłach | nie |

Wszystkie tabele AED wymagają `lat`/`lon`, dlatego trzy ostatnie statusy są
pomijane przy zapisie i liczone w raporcie importu. Mogą zostać później
zgeokodowane i zapisane jako `geocoded`.

W bazie dochodzą kolumny spoza schematu kanonicznego: `origin`
(`user`/`source`/`seed`) oraz `created_by_id` (identyfikator autora rekordu
użytkownika; `NULL` dla rekordów źródłowych, także w tabeli łączonej). SQLite
`CHECK` pilnuje, żeby cykli życia i pól weryfikacji nie dało się pomylić.

### Baza danych (store)

**Status:** działa (wersja deweloperska) · **Kod:** `backend/store/`

**Cel:** trzymać kanoniczne rekordy AED w dwóch cyklach życia (użytkownik vs
import), udostępniać jedną materializowaną tabelę łączoną mapie i eksportom
oraz zagwarantować, że odświeżenie źródeł nigdy nie usunie danych użytkowników.

Aplikacja używa natywnego sterownika SQLite Buna przez
`drizzle-orm/bun-sqlite`. Plik bazy pochodzi z `DATABASE_URL` (domyślnie
`dev.db`), a `backend/store/index.ts` włącza WAL i `synchronous = NORMAL`.
Schemat znajduje się w `backend/store/schema.ts`.

Schemat jest podzielony na dwa pliki: `backend/store/schema.ts` (dane AED) i
`backend/auth/schema.ts` (tabele better-auth). `drizzle.config.ts` wskazuje oba,
więc migracje obejmują całość.

Dane AED są przechowywane w trzech fizycznych tabelach o tym samym schemacie
kanonicznym (`src/server/ingest/canonical.ts`):

| Tabela | Zawartość | Cykl życia |
| --- | --- | --- |
| `aed_devices` | rekordy dodane przez zalogowanego użytkownika | trwałe; importy nigdy ich nie usuwają |
| `aed_source_devices` | rekordy z importów zewnętrznych źródeł i seeda | czyszczone i wypełniane ponownie przy odświeżeniu źródeł |
| `aed_devices_combined` | materiał źródłowy + użytkownicy | przebudowywana przy każdym zapisie użytkownika i odświeżeniu źródeł; czyta z niej mapa, eksporty i dane.gov.pl |

Kolumny odwzorowują schemat kanoniczny: `record_id`, `source_id`,
`source_record_id`, `source_url`, `name`, `description`, `note`,
`facility_type`, `device_type`, `access_type`, `status`, pola weryfikacji,
`lat`, `lon`, `coord_precision_m`, `location_status`, `geom_source`,
`address_*`, `geocode_*`, `claim_*` oraz `field_provenance` i `attributes`
zapisywane jako JSON. `lat`/`lon` są wymagane we wszystkich trzech tabelach.

**Podpis i weryfikacja:**

- `aed_devices.created_by_id` to klucz obcy do `user.id` (`NOT NULL`);
  `origin='user'`.
- rekord użytkownika jest od razu zweryfikowany: `verification_status='verified'`,
  `verified_by=created_by_id`, `verified_by_kind='person'`, `verified_at`.
- `aed_source_devices` nie ma kolumny twórcy; `origin` to `source` albo `seed`,
  a rekordy są zawsze `unverified` z `verified_by = NULL`.
- formularz nie może ustawić weryfikacji: serwer bierze `created_by_id`
  wyłącznie z sesji i wymusza pola weryfikacji.
- ograniczenia `CHECK` w SQLite pilnują obu reguł na poziomie bazy.

**Tabela łączona:** `aed_devices_combined` jest fizyczną, materializowaną
tabelą. Mapa, CSV, GeoJSON i feed dane.gov.pl czytają właśnie z niej.

Synchronizacja jest transakcyjna:

- dodanie rekordu przez użytkownika zapisuje go do `aed_devices` i od razu
  dopisuje odpowiadający wiersz do `aed_devices_combined` w tej samej
  transakcji,
- import jednego źródła (`/zrodla`) w jednej transakcji usuwa tylko wiersze
  tego `source_id` z `aed_source_devices`, wstawia nowe i przebudowuje
  `aed_devices_combined` z obu tabel,
- pełny refresh (`bun run db:refresh-sources` = `ingest:run` + `db:load-core`)
  czyści całą `aed_source_devices`, wstawia nowy zbiór i przebudowuje
  `aed_devices_combined`,
- `bun run db:seed` to pełny reset deweloperski wszystkich trzech tabel,
- `refreshCombinedAedDevices()` pozwala jawnie przebudować tabelę łączoną,
- usunięcie rekordu z `/moje-aed` usuwa go z `aed_devices` i
  `aed_devices_combined` w jednej transakcji; tylko właściciel może to zrobić,
- po każdym przebudowaniu tabeli łączonej i po każdym wstawieniu do niej
  wiersza użytkownika wołany jest `removeDuplicateAedDevices()` z
  `backend/store/deduplicate.ts`; obecnie jest to świadomy no-op (zwraca `0`),
  przygotowany jako miejsce na przyszłą deduplikację,
- żadna ścieżka importu nie modyfikuje `aed_devices`.

Tabela łączona udostępnia `created_by_id` (dla źródeł `NULL`) tylko do
wewnętrznego przetwarzania; eksporty go nie publikują. W przyszłości to właśnie
tutaj będzie uruchamiana deduplikacja i scalanie.

Rekordy kanoniczne bez punktu (`location_status` = `address_only`,
`unresolved` albo `conflict`) nie są zapisywane, bo projekt publikuje wyłącznie
zgeolokalizowane AED. Są liczone w raporcie importu jako pominięte.

Tabele uwierzytelniania: `user`, `session`, `account`, `verification`
(szczegóły w sekcji [Uwierzytelnianie](#uwierzytelnianie-auth)).

Funkcje dla innych modułów (`backend/store/aed-store.ts`):

```ts
import {
	// zapis
	addUserAedDevice,
	replaceSourceAedDevices,
	replaceAllSourceAedDevices,
	// odczyt
	listAedDevices,
	listUserAedDevices,
	listSourceAedDevices,
	listCombinedAedDevices,
	countAedDevices,
	countSourceAedDevices,
	countCombinedAedDevices,
	// tabela łączona i porządki
	refreshCombinedAedDevices,
	deleteUserAedDevice,
	deleteSourceAedDevices,
	clearAllAedDevices,
} from "#backend/store/aed-store";
```

**Co już jest:**

- pełny schemat kanoniczny w Drizzle dla obu tabel źródłowych i tabeli łączonej,
- podpisywanie i wymuszona weryfikacja rekordów użytkownika,
- `CHECK`-y blokujące weryfikację rekordów źródłowych i rekordy bez punktu,
- indeksy na `record_id`, `source_id` i współrzędnych,
- transakcyjne zastępowanie jednego źródła i całej tabeli źródeł,
- funkcje odczytu dla mapy i eksportów przez `aed_devices_combined`.

**Docelowy zakres:**

- historia przebiegów synchronizacji i błędów per źródło,
- zapytania przestrzenne (bbox, najbliższe urządzenia),
- paginacja i filtry dla interfejsu,
- historia zmian rekordu (kto, kiedy, co),
- deduplikacja i scalanie rekordów w tabeli łączonej.

**Uwagi:**

- `dev.db` jest ignorowany przez git; migracje w `backend/store/drizzle/` są
  wersjonowane. Przy starcie dev/preview `db:bootstrap` migruje bazę i ładuje
  `.data/core/core.json` tylko wtedy, gdy nie ma jeszcze prawdziwych danych
  źródłowych (tabela pusta lub same rekordy `db:seed`).
- Baza zawiera trzy domenowe tabele AED (`aed_devices`, `aed_source_devices`,
  `aed_devices_combined`), cztery tabele better-auth oraz techniczną
  `__drizzle_migrations`.

### Integracja z dane.gov.pl (gov-api)

**Status:** działa (wersja deweloperska) · **Kod:** `backend/gov-api/`

Ten moduł publikuje dane AED w formacie, który portal dane.gov.pl pobiera
samodzielnie harwesterem. Nie ma tu żadnego „push API” — portal raz na dobę
wykonuje żądania HTTP do naszych endpointów.

#### Endpointy

| Endpoint | Metody | Zawartość | Content-Type |
| --- | --- | --- | --- |
| `/harvester/feed.xml` | `GET`, `HEAD` | feed XML `urn:otwarte-dane:harvester:1.13` | `application/xml; charset=utf-8` |
| `/harvester/feed.md5` | `GET`, `HEAD` | MD5 dokładnie tych samych bajtów XML | `text/plain; charset=utf-8` |
| `/data/aed.csv` | `GET`, `HEAD` | rejestr AED, po jednym urządzeniu w wierszu | `text/csv; charset=utf-8` |
| `/data/aed.geojson` | `GET`, `HEAD` | rejestr AED jako `FeatureCollection` | `application/geo+json; charset=utf-8` |
| `/data/aed.xlsx` | `GET` | pełny rejestr AED jako XLSX, jeden wiersz na urządzenie (pobiera przycisk na stronie głównej) | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

#### Jak portal to pobiera

Kolejność jest wymuszona przez kod harwestera (backend 2.63.0):

1. `HEAD /harvester/feed.xml` — musi zwrócić 200 i `Content-Type` zawierający
   `text/xml` lub `application/xml`.
2. `GET /harvester/feed.md5` — adres powstaje przez zamianę `.xml` na `.md5`
   (`/harvester/feed.md5`, **nie** `feed.xml.md5`).
3. `GET /harvester/feed.xml` — portal liczy MD5 pobranych bajtów i porównuje
   z punktem 2.
4. Walidacja XSD `urn:otwarte-dane:harvester:1.13`.
5. Import po `extIdent`: aktualizacja lub utworzenie, usunięcie rekordów
   nieobecnych w feedzie.
6. Zasoby z `availability=local` portal kopiuje do siebie i udostępnia dalej
   nawet wtedy, gdy nasza aplikacja nie działa.

Dlatego generator jest deterministyczny: `lastUpdateDate` bierze się
z `MAX(updated_at)` w bazie (nie z `Date.now()`), a artefakt jest cache'owany
per wersja danych. `feed.xml` i `feed.md5` zawsze zwracają ten sam zestaw
bajtów.

#### Co publikujemy

Jeden zbiór danych i dwa zasoby — dokładnie tak, jak robią to miasta w
istniejących zbiorach AED na portalu:

| Element | `extIdent` | Uwagi |
| --- | --- | --- |
| zbiór | `aed-pl-open` | tytuł, opis, kategorie `HEAL`/`REGI`, tagi, CC0 1.0 |
| zasób CSV | `aed-pl-open-csv` | `availability=local` |
| zasób GeoJSON | `aed-pl-open-geojson` | `availability=local` |

Źródłem eksportów jest tabela `aed_devices_combined`, ograniczona do rekordów
`location_status` = `point`/`geocoded`. Eksporty pokazują pola weryfikacji, ale
**nie publikują** `origin` ani `created_by_id`.

Kolumny CSV:
`id, nazwa_obiektu, szerokosc_geo, dlugosc_geo, miejscowosc,
typ_dostepnosci, status_sprawnosci, status_weryfikacji, zweryfikowane_przez,
typ_weryfikatora, data_weryfikacji, identyfikator_kanoniczny, zrodlo_danych,
identyfikator_w_zrodle, url_zrodla, status_lokalizacji, zrodlo_geometrii,
data_utworzenia, data_aktualizacji`.

W GeoJSON te same wartości trafiają do `properties`, a `szerokosc_geo` /
`dlugosc_geo` stają się geometrią `[dlugosc_geo, szerokosc_geo]` (kolejność
RFC 7946). `id` to stabilny UUID rekordu. Nie ma już duplikatów typu
`name`/`nazwa_obiektu`, `lat`/`szerokosc_geo` ani `id_uuid`.

`extIdent` jest kluczem idempotencji — **nigdy go nie zmieniaj**.

#### Dlaczego to jest zgodne z dane.gov.pl

- format feedu to oficjalny XSD wersji 1.13 (skopiowany do
  `backend/gov-api/xsd/`),
- zasoby są w formatach odczytywalnych maszynowo (CSV, GeoJSON),
- linki do zasobów są wyłącznie `https://` (wymóg XSD),
- `updateFrequency=daily` odpowiada `frequency_in_days=1` w konfiguracji
  DataSource,
- `availability=local` sprawia, że portal przechowuje kopię danych,
- brak autoryzacji i publiczny dostęp są zgodne z tym, jak działa harwester.

---

### Test end-to-end: nasza aplikacja → lokalny dane.gov.pl

Ta sekcja jest pełną instrukcją powtórzenia testu od zera. Po restarcie
komputera wystarczy przejść kroki 1–6.

#### 0. Wymagania

- kod z gałęzi `main`,
- zainstalowane zależności i dane w bazie,
- uruchomiony lokalny portal według `../dane.gov.pl/RUNNING.md`,
- reguła `ufw` zezwalająca kontenerom na port 3443,
- worker Celery (`mcod-local-celery`) — potrzebny do walidacji XML w panelu
  admina i do zadań asynchronicznych harwestera.

```bash
cd ~/Documents/schoolProject/AED
bun install
bun run db:migrate
bun run db:seed              # kończy się "combined rows: 5"

sudo ufw allow from 172.18.18.0/24 to any port 3443 proto tcp
```

#### 1. Uruchom portal

```bash
cd ~/Documents/schoolProject/dane.gov.pl/backend

sudo docker compose -f docker-compose.local.yml up -d \
  mcod-db mcod-redis mcod-rabbitmq mcod-elasticsearch mcod-rdfdb mcod-smtp mcod-nginx \
  mcod-local-admin mcod-local-api mcod-local-cms mcod-local-celery
```

Odczekaj ~30 s i sprawdź:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://admin.mcod.local/
# 302 = panel działa
```

#### 2. Uruchom naszą aplikację i proxy HTTPS

**Terminal 1** — aplikacja z adresem, który widzi portal:

```bash
cd ~/Documents/schoolProject/AED
PUBLIC_BASE_URL=https://172.18.18.1:3443 bun run dev
```

**Terminal 2** — proxy TLS (self-signed):

```bash
cd ~/Documents/schoolProject/AED
bun run dev:tls
```

`PUBLIC_BASE_URL` jest czytany przy budowie feedu — po zmianie zrestartuj
aplikację. Wartość musi zaczynać się od `https://`.

Sprawdź feed z hosta:

```bash
curl -sk https://172.18.18.1:3443/harvester/feed.xml | grep '<url>'
# https://172.18.18.1:3443/data/aed.csv
# https://172.18.18.1:3443/data/aed.geojson

curl -sk https://172.18.18.1:3443/harvester/feed.xml | md5sum
curl -sk https://172.18.18.1:3443/harvester/feed.md5
# oba MD5 muszą być identyczne

xmllint --noout --schema \
  ~/Documents/schoolProject/AED/backend/gov-api/xsd/xml_import_otwarte_dane_1_13.xsd \
  <(curl -sk https://172.18.18.1:3443/harvester/feed.xml)
# "... validates"
```

#### 3. Sprawdź połączenie z wnętrza portalu

To jest dokładnie to żądanie, które wykona harwester:

```bash
cd ~/Documents/schoolProject/dane.gov.pl/backend

sudo docker compose -f docker-compose.local.yml exec mcod-local-api \
  python -c "import requests; r=requests.get('https://172.18.18.1:3443/harvester/feed.xml', verify=False); print(r.status_code, r.headers.get('content-type'))"
```

Oczekiwane: `200 application/xml; charset=utf-8`.

Jeśli tu jest błąd, dalsze kroki nie zadziałają — patrz Rozwiązywanie problemów.

#### 4. Zarejestruj DataSource

##### Wariant A — przez shell (zalecany, działa z adresem IP)

Formularz admina ma walidację URL po stronie przeglądarki, która odrzuca adresy
IP (szczegóły w wariancie B), więc najszybsza i powtarzalna droga to utworzenie
źródła bezpośrednio w bazie:

```bash
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.models import DataSource
from mcod.organizations.models import Organization
from mcod.users.models import User

org = Organization.objects.first()
admin = User.objects.get(email='admin@mcod.local')

ds, created = DataSource.objects.get_or_create(
    xml_url='https://172.18.18.1:3443/harvester/feed.xml',
    defaults=dict(
        name='AED Open Data (local test)',
        description='Lokalny test feedu AED',
        source_type='xml',
        organization=org,
        frequency_in_days=1,
        status='active',
        emails='test@example.com',
        institution_type='other',
        created_by=admin,
    ),
)
print('created:', created, 'id:', ds.pk)
"
```

##### Wariant B — przez panel admina (np. do zrzutów ekranu)

Przycisk **ZAPISZ** jest zablokowany, dopóki nie przejdzie walidacja XML
(przycisk **„Check correctness of file”**). Ten przycisk z kolei odblokowuje
się tylko dla adresów przechodzących regex portalu:

```
^(http|https|ftp):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,13}(:[0-9]{1,5})?(\/.*)?$
```

Adres IP (`172.18.18.1`) i `localhost` **nie przechodzą** — potrzebna jest
nazwa z literowym TLD. Najprościej użyć `sslip.io`, które rozwiązuje
`172.18.18.1.sslip.io` na `172.18.18.1` (działa też w kontenerach):

```bash
# zrestartuj aplikację z nowym adresem
PUBLIC_BASE_URL=https://172.18.18.1.sslip.io:3443 bun run dev
```

Następnie w panelu (`https://admin.mcod.local` → Data sources → Add):

- source type: `XML`
- xml url: `https://172.18.18.1.sslip.io:3443/harvester/feed.xml`
- institution: dowolna (wymagane)
- frequency: `every day`, status: `aktywny`, e-mail: dowolny

Po wpisaniu adresu naciśnij `End`, potem spację i backspace — regex nasłuchuje
zdarzenia `keyup`, a samo wklejenie może go nie wywołać. Przycisk
„Check correctness of file” stanie się aktywny. Kliknij, poczekaj na
**„XML Validation successful!”**, a `ZAPISZ` się odblokuje.

#### 5. Wymuś import

Niezależnie od wariantu źródło znajdziemy po URL, bez wpisywania `<id>`:

```bash
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.models import DataSource
from mcod.harvester.tasks import import_data_task

url = 'https://172.18.18.1:3443/harvester/feed.xml'
ds = DataSource.objects.get(xml_url=url)
print('datasource id:', ds.pk)
print(import_data_task(ds.pk, force=True))
"
```

`DataSource.DoesNotExist` oznacza, że krok 4 się nie udał.
`{}` na końcu to normalny wynik zadania.

#### 6. Sprawdź wynik

```bash
# status importu i liczniki (najczytelniejszy dowód)
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.models import DataSourceImport
for i in DataSourceImport.objects.order_by('-id')[:3]:
    print(i.datasource.name, '|', i.status, '| ds:', i.datasets_count, '| res:', i.resources_count, '|', i.error_desc[:200])
"

# zbiór widoczny w API
curl -sk "https://api.mcod.local/1.4/datasets?q=defibrylator" | head -c 400
```

Oczekiwane:

```
AED Open Data (local test) | ok | ds: 1 | res: 2 |
```

oraz zbiór `Ogólnopolski rejestr defibrylatorów AED` w API.

Sprawdź, że portal skopiował pliki (`availability=local`):

```bash
curl -sk "https://api.mcod.local/1.4/datasets/<ID_ZBIORU>/resources" | head -c 800
```

`file_url` musi wskazywać `https://api.mcod.local/media/resources/...`.
To jest dowód, że portal pobrał i przechowuje dane u siebie.

#### 7. Powtórzenie później

Po restarcie nie twórz źródła ponownie:

1. Uruchom portal (krok 1) i aplikację + proxy (krok 2).
2. Sprawdź połączenie (krok 3).
3. Wymuś import (krok 5) — `get_or_create` w kroku 4 i tak nic nie zepsuje.
4. Sprawdź wynik (krok 6).

Docelowo portal sam pobiera feed codziennie o 03:00, jeśli DataSource jest
`active` i minął `frequency_in_days`.

---

### Rozwiązywanie problemów

| Objaw | Przyczyna / rozwiązanie |
| --- | --- |
| `admin.mcod.local` = **502** | kontener admina jeszcze wstaje (~30 s) albo padł. `sudo docker compose ... ps --all`, `sudo docker logs mcod-admin --tail 80` |
| Przycisk „Check correctness…” nieaktywny | adres IP/`localhost` nie przechodzi regexu z wariantu B. Użyj `*.sslip.io` albo wariantu A |
| `ZAPISZ` nieaktywny po walidacji | walidacja nie wystartowała — brak workera: `up -d mcod-local-celery`; sprawdź `docker logs mcod-celery --tail 50` |
| Modal walidacji wisi | jw. — zadanie czeka w kolejce `harvester` na workera |
| Krok 3: `SSLError` / connection refused | brak reguły `ufw` na 3443 albo proxy nie działa (`ss -ltn \| grep 3443`) |
| Krok 3: `404` | zły URL (musi kończyć się `/harvester/feed.xml`) lub aplikacja bez tej gałęzi |
| `PUBLIC_BASE_URL must start with https://` | literówka w zmiennej; zrestartuj aplikację |
| W feedzie zasoby wskazują `localhost:3443` | aplikacja uruchomiona bez `PUBLIC_BASE_URL`; zrestartuj i ponów import |
| `DataSource.DoesNotExist` | źródło nie zostało utworzone — powtórz krok 4 |
| `XMLMD5DoesNoMatch` | feed zmienił się między żądaniami; zrestartuj aplikację i ponów import |
| `XML Validation error` | uruchom `xmllint` z kroku 2 — komunikat wskaże błędny element |
| `no such service` / profile | dodaj `--profile manual` po `-f docker-compose.local.yml` |

---

#### Testy jednostkowe i CI

```bash
cd AED
bun test                    # kontrakt feedu, CSV, GeoJSON, MD5
bun run typecheck
bun run check
```

Test XSD wymaga `xmllint` (pakiet `libxml2-utils`); bez niego test wypisuje
ostrzeżenie i jest pomijany. W CI `xmllint` jest instalowany, więc walidacja
zawsze się wykonuje.

Ręczny test kontraktu bez portalu:

```bash
curl -sI http://localhost:3000/harvester/feed.xml | grep -i content-type
curl -s http://localhost:3000/harvester/feed.xml | md5sum
curl -s http://localhost:3000/harvester/feed.md5
```

#### Licencja

Obecnie deklarujemy `CC0 1.0` — taką licencję mają zbadane miejskie zbiory AED.

**TODO:** przed publikacją prawdziwych danych sprawdź licencję każdego źródła.
Jeśli którekolwiek wymaga atrybucji (np. CC BY 4.0), zmień `LICENCE`
w `feed.ts` i dopisz atrybucję do opisu zbioru.

#### Ograniczenia

- dane źródłowe w `aed_source_devices` są odświeżane i mogą pochodzić z
  różnych licencji; rekordy użytkowników są trwałe i zweryfikowane,
- brak TERYT i pól producenta/modelu,
- brak DCAT-AP i brak osobnych zbiorów per region,
- certyfikat `dev:tls` jest self-signed i służy wyłącznie do testów lokalnych,
- adres `*.sslip.io` zależy od publicznego DNS i jest tylko obejściem
  walidacji formularza w panelu.


## Routing

Routing jest plikowy i oparty na TanStack Router. Pliki w `frontend/routes/`
tworzą route'y, a `frontend/router.tsx` buduje router z `routeTree.gen.ts`.
Nie edytuj `frontend/routeTree.gen.ts` ręcznie; generuje go `bun run dev` lub
`bun run build`.

Aktualne route'y:

| Route | Zawartość | Dostęp |
| --- | --- | --- |
| `/` | strona główna: nagłówek + mapa AED | publiczny |
| `/logowanie` | rejestracja i logowanie nazwą użytkownika | publiczny |
| `/dodaj-aed` | formularz AED | wymaga sesji |
| `/moje-aed` | lista własnych AED z usuwaniem | wymaga sesji |
| `/aed/$aedId` | strona szczegółów pojedynczego urządzenia AED | wymaga sesji |
| `/zrodla` | rejestr źródeł i usuwanie | wymaga sesji |
| `/zrodla/nowe` | kreator konektora i mapowania kolumn | wymaga sesji |
| `/data/aed.csv` | eksport CSV | publiczny (dane.gov.pl) |
| `/data/aed.geojson` | eksport GeoJSON | publiczny (dane.gov.pl) |
| `/data/aed.points.geojson` | lekki eksport punktów GeoJSON dla mapy (negocjacja gzip) | publiczny (mapa) |
| `/data/aed.xlsx` | eksport pełnej bazy AED w formacie XLSX | publiczny (eksport) |
| `/harvester/feed.xml`, `/harvester/feed.md5` | feed i suma MD5 dla dane.gov.pl | publiczny (dane.gov.pl) |
| `/api/auth/$` | handler better-auth | publiczny (logowanie) |
| `/api/pmtiles` | kafelki PMTiles z obsługą `Range` | publiczny (mapa) |

Publiczna jest tylko strona główna, logowanie oraz techniczne endpointy potrzebne
mapie i portalowi dane.gov.pl (`/api/auth/*`, `/api/pmtiles`, `/data/*`,
`/harvester/*`). O tym, czy route wymaga sesji, decyduje
`beforeLoad` w `frontend/routes/__root.tsx` i allowlista w
`frontend/lib/public-paths.ts`; nowe strony są domyślnie chronione. Server
functions źródeł, geokodowania i reverse-geocodingu także sprawdzają sesję.

Aby dodać route, dodaj plik w `frontend/routes/`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/o-projekcie")({
	component: About,
});

function About() {
	return <main>O projekcie</main>;
}
```

Layout aplikacji znajduje się w `frontend/routes/__root.tsx` i używa
`shellComponent` do renderowania dokumentu HTML.

## Server Functions i API Routes

Server functions z TanStack Start pozwalają uruchamiać kod serwerowy
bezpośrednio z komponentów:

```tsx
import { createServerFn } from "@tanstack/react-start";

const getServerTime = createServerFn({ method: "GET" }).handler(async () => {
	return new Date().toISOString();
});
```

Route'y API definiuje się przez `server.handlers`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";

export const Route = createFileRoute("/api/hello")({
	server: {
		handlers: {
			GET: () => json({ message: "Hello, World!" }),
		},
	},
});
```

### Server functions w tym projekcie

Wszystkie funkcje są w `frontend/server/forms.ts` i wykonują logikę wyłącznie
na serwerze:

| Funkcja | Metoda | Rola |
| --- | --- | --- |
| `getSessionUserFn` | GET | sprawdza sesję dla root guardu tras |
| `getAedDetailFn` | GET | czyta szczegóły jednego AED dla mapy i `/aed/$aedId`; publiczna |
| `listMyAedFn` | GET | zwraca tylko rekordy zalogowanego użytkownika |
| `deleteMyAedFn` | POST | usuwa własny rekord z `aed_devices` i tabeli łączonej |
| `saveManualAedFn` | POST | waliduje formularz, wymaga sesji i zapisuje podpisany, zweryfikowany rekord w `aed_devices` |
| `geocodeAddressFn` | POST | geokoduje adres przez Nominatim po stronie serwera; wymaga sesji |
| `reverseGeocodeFn` | POST | ustala adres z punktu przez Nominatim; wymaga sesji |
| `listSourcesFn` | GET | zwraca rejestr źródeł; wymaga sesji |
| `saveSourceFn` | POST | waliduje i dopisuje konfigurację źródła; wymaga sesji |
| `previewSourceFn` | POST | pobiera próbkę źródła i zwraca kolumny do mapowania; wymaga sesji |
| `deleteSourceFn` | POST | usuwa konfigurację i wiersze tylko tego źródła; wymaga sesji |

`saveManualAedFn` nie przyjmuje `created_by_id` ani pól weryfikacji z klienta.
Bierze `session.user.id` z nagłówków żądania, a przy braku sesji zwraca
`{ ok: false, code: "unauthorized" }` bez dotykania bazy. Funkcje źródeł,
geokodowania i reverse-geocodingu robią to samo. Importy nigdy nie dotykają
tabeli `aed_devices`.

## Data Fetching

Dane ładuj przez `loader` TanStack Router lub przez server functions. Aplikacja
nie ma integracji z TanStack Query: nie ma providera `QueryClient` ani
devtools. Jeśli w przyszłości dodasz Query, zainstaluj `@tanstack/react-query`
i podłącz provider w `frontend/router.tsx`.

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/osoby")({
	loader: async () => {
		const response = await fetch("https://swapi.dev/api/people");
		return response.json();
	},
	component: Osoby,
});

function Osoby() {
	const data = Route.useLoaderData();
	return (
		<ul>
			{data.results.map((person: { name: string }) => (
				<li key={person.name}>{person.name}</li>
			))}
		</ul>
	);
}
```

W tym projekcie:

- mapa ładuje `/data/aed.geojson` i `/api/pmtiles` po stronie klienta,
- `/zrodla` korzysta z loadera `listSourcesFn`,
- formularze wysyłają dane przez server functions (`saveManualAedFn`,
  `importSourceFn`, …),
- eksporty CSV/GeoJSON i feed są budowane na serwerze z tabeli
  `aed_devices_combined`.

## Environment Variables

Zmienne środowiskowe mieszkają w `.env.local` (nigdy nie commitowanym). Bun
ładuje ten plik automatycznie:

- `DATABASE_URL` — ścieżka do pliku SQLite (domyślnie `dev.db`)
- `BETTER_AUTH_URL` — bazowy URL better-auth
- `BETTER_AUTH_SECRET` — sekret podpisujący better-auth
- `PUBLIC_BASE_URL` — origin HTTPS używany w linkach do zasobów feedu
  dane.gov.pl (domyślnie `https://localhost:3443`; dla portalu w Dockerze
  `https://172.18.18.1:3443`)
- `AED_DATASOURCES_CONFIG` — opcjonalna ścieżka do rejestru źródeł

W kodzie serwerowym używaj `process.env` lub `Bun.env`, a w kliencie
`import.meta.env` dla zmiennych z prefiksem `VITE_`. Nie ma modułu walidacji
`frontend/env.ts`; kafelki zawsze pochodzą z `/api/pmtiles`.

## Linting i formatowanie

Projekt używa Biome do lintowania i formatowania: tabulatory, podwójne
cudzysłowy, organizacja importów.

```bash
bun run lint
bun run format
bun run check
```

## Commit Conventions

Projekt stosuje [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
Format: `<type>(<scope>): <description>`.

```bash
git commit -m "feat(map): add AED markers"
git commit -m "fix(auth): handle expired sessions"
git commit -m "docs(readme): document map tile defaults"
```

Dozwolone typy: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

## Testy i CI

```bash
cd AED
bun test
bun run typecheck
bun run check
```

Zakres testów:

- walidacja kanonicznego schematu i reguł importu (`src/server/ingest`),
- kontrakt feedu XML, MD5, CSV i GeoJSON (`backend/gov-api`),
- podpisywanie i weryfikacja rekordów użytkownika oraz brak twórcy przy
  rekordach źródłowych (`backend/store/aed-store.test.ts`),
- zachowanie rekordów użytkownika i odtwarzanie tabeli łączonej przy
  ponownym imporcie źródła,
- brak zmian danych przez placeholder deduplikacji,
- listowanie i usuwanie wyłącznie własnych rekordów użytkownika z obu tabel,
- odrzucanie rekordów bez współrzędnych,
- budowa rekordu ręcznego i metadata geokodowania (`backend/forms`).

Test XSD feedu wymaga `xmllint` (pakiet `libxml2-utils`); bez niego test
wypisuje ostrzeżenie i jest pomijany. W CI `xmllint` jest instalowany, więc
walidacja zawsze się wykonuje.

GitHub Actions (`.github/workflows/tests.yml`) uruchamia na każdym PR:
`bun install --frozen-lockfile`, `bun run typecheck`, `bun run check`,
instalację `libxml2-utils` i `bun test`.

Ręczny test kontraktu feedu:

```bash
curl -sI http://localhost:3000/harvester/feed.xml | grep -i content-type
curl -s http://localhost:3000/harvester/feed.xml | md5sum
curl -s http://localhost:3000/harvester/feed.md5
```

## Deploy

Build korzysta z presetu Bun w Nitro:

```bash
bun run build
bun .output/server/index.mjs
```

Katalog `.output/` zawiera samodzielny serwer Bun. Aby wdrożyć, wyślij
`.output/` na hosting i uruchom powyższą komendę. Presety dla innych platform
opisuje dokumentacja Nitro: https://v3.nitro.build/deploy.

## AI Tooling

- TanStack Agent Skills są dostępne przez `@tanstack/intent`.
  `package.json#intent.skills` dopuszcza `@tanstack/*`; użyj
  `bunx --no-install --package @tanstack/intent intent list`, aby zobaczyć
  lokalne skille.
- Lokalny skill `/tanstack` opakowuje `intent list` i `intent load` dla
  wskazówek dopasowanych do wersji Start i Router.
- Skill shadcn jest w `.claude/skills/shadcn` i jest dostępny w Jcode jako
  `/shadcn`. Czyta `components.json` i uruchamia CLI shadcn.
- Serwer MCP shadcn jest skonfigurowany w `.jcode/mcp.json` i `.mcp.json` i
  działa przez Bun. Przy wywołaniach spoza katalogu projektu podawaj
  `registries: ["@shadcn"]`.

## Learn More

- [TanStack Start](https://tanstack.com/start) i
  [TanStack Router](https://tanstack.com/router)
- [MapLibre GL JS](https://maplibre.org/) i [Protomaps](https://protomaps.com)
- [shadcn/ui](https://ui.shadcn.com/)
- [Drizzle ORM](https://orm.drizzle.team/) i
  [better-auth](https://www.better-auth.com)
