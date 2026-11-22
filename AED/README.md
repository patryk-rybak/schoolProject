# Mapa AED

Minimalna aplikacja TanStack Start, która renderuje mapę Polski z MapLibre GL JS i kafelkami Protomaps oraz polskimi etykietami. To punkt wyjścia dla mapy AED (defibrylatorów).

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

## Struktura repozytorium

Kod aplikacji znajduje się w katalogu `AED/`. W katalogu głównym repozytorium
zostają tylko materiały niezwiązane z uruchamianiem aplikacji:

| Ścieżka | Zawartość |
| --- | --- |
| `AED/` | aplikacja: kod, konfiguracja, skrypty, dokumentacja techniczna |
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
│   ├── routes/               # trasy TanStack (w tym /api/*)
│   ├── router.tsx            # fabryka routera
│   ├── routeTree.gen.ts      # generowany — nie edytować ręcznie
│   ├── components/ui/        # komponenty shadcn (rejestr)
│   ├── map/                  # mapa AED (MapLibre + Protomaps)
│   ├── hooks/, lib/          # hooki i helpery klienta
│   ├── auth-form/            # moduł: logowanie/rejestracja
│   ├── server/               # server functions (forms.ts)
│   ├── aed-form/             # moduł: formularz AED
│   └── social-media/         # moduł: propozycje postów
├── backend/                  # dane, uwierzytelnianie, integracje
│   ├── auth/                 # better-auth (serwer)
│   ├── forms/                # zapis ręczny AED, geokodowanie, admin źródeł
│   ├── store/                # Drizzle + bun:sqlite, repozytorium AED
│   ├── ingest/               # pobieranie źródeł i budowa rdzenia
│   ├── normalize/            # standaryzacja danych
│   └── gov-api/              # feed dla dane.gov.pl
├── src/server/ingest/        # loader, schemat, fetch i core
├── SOURCES.md                # pełny inwentarz 79 źródeł danych
└── scripts/                  # narzędzia deweloperskie
```

Aliasy ścieżek: `#/*` → `frontend/*`, `#backend/*` → `backend/*`
(analogicznie `@/*` i `@backend/*`).

## Status modułów

| Warstwa | Moduł | Status | Sekcja |
| --- | --- | --- | --- |
| frontend | auth-form | planowane | [Logowanie i rejestracja](#logowanie-i-rejestracja-auth-form) |
| frontend | aed-form | działa (dev) | [Formularz AED](#formularz-aed-aed-form) |
| frontend | map | działa (mapa + wybór punktu) | [Mapa AED](#mapa-aed-map) |
| frontend | social-media | planowane | [Propozycje postów](#propozycje-postów-social-media) |
| backend | auth | częściowo istnieje | [Uwierzytelnianie](#uwierzytelnianie-auth) |
| backend | ingest | działa (dev) | [Pobieranie danych](#pobieranie-danych-ingest) |
| backend | normalize | planowane | [Standaryzacja danych](#standaryzacja-danych-normalize) |
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

`bun install` uruchamia `frontend/scripts/copy-maplibre-worker.ts`, który kopiuje worker MapLibre do `frontend/public/maplibre-gl-worker.mjs`.

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
| Drizzle Studio | `bun run db:studio` |
| Ingest źródeł i budowa core | `bun run ingest:run` |
| Kafelki mapy | `bun run map:tiles` |
| Nowy komponent shadcn | `bunx --bun shadcn@latest add <nazwa>` |

## Architektura i przepływ danych

```
źródła → ingest → normalize → store → gov-api → dane.gov.pl
                     ↑
                frontend (mapa, formularze)
```

Zasady wspólne dla backendu:

- Bun + `bun:sqlite` + Drizzle (WAL zostaje włączony),
- brak sekretów w repozytorium (`.env.local`),
- każda zmiana schematu = migracja,
- kod serwerowy nie trafia do komponentów klienckich.

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

**Status:** planowane · **Kod:** brak

**Cel:** pozwolić osobom zarządzającym danymi (opiekunowie AED, redakcja)
zalogować się i założyć konto, zanim dopuszczone zostanie dodawanie lub edycja
rekordów.

**Zakres:**

- formularz logowania (e-mail + hasło),
- formularz rejestracji z potwierdzeniem hasła,
- walidacja pól i komunikaty błędów po polsku,
- stany: ładowanie, błąd serwera, sukces,
- obsługa klawiatury i czytników ekranu, widoczny fokus, kontrast 4.5:1.

**Zależności:** [backend/auth](#uwierzytelnianie-auth) — sesje i role,
`frontend/lib/auth-client.ts` — klient better-auth,
`frontend/components/ui/` — pola i przyciski shadcn.

**Stan obecny:** skonfigurowany jest better-auth po stronie serwera
(`backend/auth/auth.ts`, `frontend/routes/api/auth/$.ts`). Brak jakiegokolwiek
interfejsu logowania.

### Formularz AED (aed-form)

**Status:** działa (dev) · **Kod:** `frontend/routes/dodaj-aed.tsx`,
`frontend/routes/zrodla/`, `backend/forms/`, `frontend/server/forms.ts`

**Cel:** umożliwić dodanie nowego defibrylatora oraz podłączenie źródeł danych
bezpośrednio w aplikacji.

**Co działa:**

- `/dodaj-aed` — formularz ręcznego rekordu obejmujący pełny schemat
  kanoniczny (nazwa, adres, dostępność, urządzenie, przeglądy, opiekun,
  weryfikacja). Punkt lokalizacji wybiera się klikając mapę albo wyznacza z
  adresu przyciskiem „Wyznacz współrzędne z adresu” (geokodowanie Nominatim
  po stronie serwera, `backend/forms/geocode.ts`, z limitem 1 żądania/s).
- Kliknięcie dowolnego miejsca na mapie głównej otwiera popup „Dodaj AED
  tutaj” z linkiem do formularza z wypełnionymi współrzędnymi.
- `/zrodla` — rejestr konektorów (`backend/ingest/datasources-config.json`)
  z akcjami „Importuj do mapy” (fetch → parse → map → validate → zapis do
  dev store, zastępuje wiersze danego źródła) i „Usuń”.
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
historia zmian, powiązanie z kontami (auth).

**Zależności:** [backend/store](#baza-danych-store) — zapis rekordów,
`src/server/ingest/` — walidacja konfiguracji i pipeline importu,
`frontend/map/` — wspólny komponent wyboru punktu na mapie.

### Mapa AED (map)

**Status:** częściowo istnieje · **Kod:** `frontend/map/`, `frontend/routes/index.tsx`

**Cel:** pokazać, gdzie znajdują się defibrylatory, czy są dostępne i czy
działają — tak szybko, jak to możliwe, również na telefonie.

**Zakres:**

- znaczniki AED z kolorem zależnym od statusu i dostępności,
- klastrowanie przy dużej liczbie rekordów,
- panel szczegółów: nazwa, adres, dostępność, status, źródło danych, licencja,
- „najbliższy AED” na podstawie geolokalizacji (z obsługą odmowy zgody),
- filtry (dostępność 24/7, status, źródło),
- alternatywa dostępna z klawiatury: ta sama lista rekordów jako tabela,
- responsywność 360×640 → desktop.

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

Worker MapLibre jest ładowany jako statyczny zasób z
`/maplibre-gl-worker.mjs?v=6.19.0`. Utrzymuj parametr `?v=` w
`frontend/map/poland-map.tsx` zgodny z wersją `maplibre-gl`, aby unieważniać
cache po aktualizacji. Nie serwuj workera przez route serwerowy: middleware
Nitro w trybie dev kieruje żądania z `Sec-Fetch-Dest: worker` do plików
statycznych i pomija route API.

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
`alert`, `badge`, `button` i `card`. Są zarządzane przez rejestr shadcn, bazują
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

**Status:** częściowo istnieje · **Kod:** `backend/auth/auth.ts`, `frontend/routes/api/auth/$.ts`

**Cel:** wiedzieć, kto modyfikuje dane, i dopuszczać do tego tylko osoby
uprawnione.

**Zakres:**

- logowanie e-mail + hasło (better-auth),
- sesja w cookie HttpOnly, wygaśnięcie i wylogowanie,
- role: administrator, redakcja, opiekun urządzenia,
- ochrona server functions i tras API (401 vs 403),
- limitowanie prób logowania,
- ślad audytowy zmian uprawnień i danych.

**Zależności:** [Baza danych](#baza-danych-store) — tabele better-auth w
istniejącej bazie, [frontend auth-form](#logowanie-i-rejestracja-auth-form) —
interfejs logowania.

**Stan obecny:** skonfigurowany better-auth z logowaniem e-mail/hasło oraz
montaż `/api/auth/*`. Brak ról, brak guardów na poziomie aplikacji, brak
limitowania prób.

better-auth jest skonfigurowany w `backend/auth/auth.ts` (logowanie e-mailem i
hasłem, plugin `tanstackStartCookies`), klient w `frontend/lib/auth-client.ts`,
a handler w `frontend/routes/api/auth/$.ts`.

Ustaw w `.env.local`:

```bash
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

Sekret wygenerujesz przez `bunx --bun @better-auth/cli secret`.

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

**Zależności:** [baza danych](#baza-danych-store) (docelowy zapis przebiegów
pobierania) oraz `src/server/ingest/core/` (parsowanie, mapowanie, walidacja i
zapis wspólnego zbioru).

### Standaryzacja danych (normalize)

**Status:** planowane · **Kod:** brak

**Cel:** sprowadzić dane z wszystkich źródeł do jednego, porównywalnego
formatu — tak, aby mapa i portal dane.gov.pl pokazywały ten sam zestaw pól
niezależnie od źródła.

**Zakres:**

- mapowanie pól każdego źródła na wspólny model rekordu AED,
- walidacja współrzędnych (obszar Polski) i odrzucanie błędnych rekordów
  z czytelnym powodem,
- normalizacja adresów i przypisanie TERYT (gmina/powiat/województwo),
- interpretacja dostępności i statusu urządzenia (bez zgadywania),
- deduplikacja tych samych urządzeń z różnych źródeł,
- deterministyczne identyfikatory rekordów,
- raport przyjętych i odrzuconych rekordów.

**Zależności:** [pobieranie danych](#pobieranie-danych-ingest) — dane wejściowe,
[baza danych](#baza-danych-store) — zapis wyniku.

**Stan obecny:** brak kodu. Reguły walidacji, cykl życia rekordu, pewność i
kwarantanna nie zostały jeszcze zaimplementowane.

### Baza danych (store)

**Status:** częściowo istnieje (wersja deweloperska) · **Kod:** `backend/store/`

**Cel:** trzymać jeden, spójny zbiór defibrylatorów i udostępniać go reszcie
aplikacji: mapie, formularzom i integracji z dane.gov.pl.

Aplikacja używa natywnego sterownika SQLite Buna przez
`drizzle-orm/bun-sqlite`. Plik bazy pochodzi z `DATABASE_URL` (domyślnie
`dev.db`), a `backend/store/index.ts` włącza WAL i `synchronous = NORMAL`.
Schemat znajduje się w `backend/store/schema.ts`.

W wersji deweloperskiej istnieje jedna tabela domenowa `aed_devices` (tymczasowa,
kolumny mogą się zmieniać):

| Kolumna | Typ | Uwagi |
| --- | --- | --- |
| `id` | integer PK | autoincrement |
| `name` | text | wymagane |
| `lat`, `lon` | real | wymagane |
| `address`, `city` | text | opcjonalne |
| `access` | text | `always` / `business_hours` / `restricted` / `unknown` |
| `status` | text | `operational` / `out_of_service` / `unknown` |
| `source` | text | skąd rekord (`seed`, `manual`, …) |
| `created_at`, `updated_at` | integer | znaczniki czasu |

Funkcje dla innych modułów (`backend/store/aed-store.ts`):

```ts
import {
	addAedDevice,
	addAedDevices,
	listAedDevices,
	getAedDevice,
	countAedDevices,
	clearAedDevices,
} from "#backend/store/aed-store";
```

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed      # 5 przykładowych rekordów do dev.db
bun run db:studio
```

Drizzle Kit działa na Bunie. `@libsql/client` jest zależnością deweloperską,
ponieważ CLI Drizzle Kit potrzebuje klienta SQLite; aplikacja w runtime używa
`bun:sqlite`.

**Docelowy zakres:**

- schemat Drizzle: rekordy AED, źródła, przebiegi synchronizacji,
- zapis idempotentny (upsert) po identyfikatorze źródła,
- zapytania: po obszarze (bbox), najbliższe urządzenia, po identyfikatorze,
- paginacja i filtry dla interfejsu,
- indeksy na współrzędnych i identyfikatorach,
- historia zmian rekordu (kto, kiedy, co).

**Uwagi:**

- `dev.db` jest ignorowany przez git; migracje w `backend/store/drizzle/` są
  wersjonowane.
- `db:migrate` tworzy dodatkowo techniczną tabelę `__drizzle_migrations`
  (księgowość migracji), więc w bazie są dwie tabele: domena + techniczna.

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

Kolumny zasobów: `id, name, lat, lon, city, access, status`.
W GeoJSON `lat`/`lon` stają się geometrią `[lon, lat]` (kolejność RFC 7946).

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

- kod z tym modułem (`main` po scaleniu zmian; wcześniej gałąź
  `feat/dane-gov-harvester-feed`),
- zainstalowane zależności i dane w bazie,
- uruchomiony lokalny portal według `../dane.gov.pl/RUNNING.md`,
- reguła `ufw` zezwalająca kontenerom na port 3443,
- worker Celery (`mcod-local-celery`) — potrzebny do walidacji XML w panelu
  admina i do zadań asynchronicznych harwestera.

```bash
cd ~/Documents/schoolProject/AED
bun install
bun run db:migrate
bun run db:seed              # kończy się "Total rows: 5"

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

- dane w bazie są tymczasowe (dev), bez TERYT i bez pól producenta/modelu,
- brak DCAT-AP i brak osobnych zbiorów per region,
- certyfikat `dev:tls` jest self-signed i służy wyłącznie do testów lokalnych,
- adres `*.sslip.io` zależy od publicznego DNS i jest tylko obejściem
  walidacji formularza w panelu.


## Routing

Routing jest plikowy i oparty na TanStack Router. Pliki w `frontend/routes/`
tworzą route'y, a `frontend/router.tsx` buduje router z `routeTree.gen.ts`.
Nie edytuj `frontend/routeTree.gen.ts` ręcznie; generuje go `bun run dev` lub
`bun run build`.

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
