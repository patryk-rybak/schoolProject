# Mapa AED

Minimalna aplikacja TanStack Start, która renderuje mapę Polski z MapLibre GL JS i kafelkami Protomaps oraz polskimi etykietami. To punkt wyjścia dla mapy AED (defibrylatorów).

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
│   ├── auth-form/            # plan modułu: logowanie/rejestracja
│   ├── aed-form/             # plan modułu: formularz AED
│   └── social-media/         # plan modułu: propozycje postów
└── backend/                  # dane, uwierzytelnianie, integracje
    ├── auth/                 # better-auth (serwer)
    ├── store/                # Drizzle + bun:sqlite, repozytorium AED
    ├── ingest/               # pobieranie źródeł i budowa rdzenia
    ├── normalize/            # plan modułu: standaryzacja
    └── gov-api/              # plan modułu: feed dla dane.gov.pl
```

Aliasy ścieżek: `#/*` → `frontend/*`, `#backend/*` → `backend/*`
(analogicznie `@/*` i `@backend/*`).

## Plan modułów

| Warstwa | Moduł | Status |
| --- | --- | --- |
| frontend | [`auth-form/`](./frontend/auth-form/README.md) | planowane |
| frontend | [`aed-form/`](./frontend/aed-form/README.md) | planowane |
| frontend | [`map/`](./frontend/map/README.md) | działa (mapa bazowa) |
| frontend | [`social-media/`](./frontend/social-media/README.md) | planowane |
| backend | [`auth/`](./backend/auth/README.md) | częściowo istnieje |
| backend | [`ingest/`](./backend/ingest/README.md) | działa (dev) |
| backend | [`normalize/`](./backend/normalize/README.md) | planowane |
| backend | [`store/`](./backend/store/README.md) | działa (dev) |
| backend | [`gov-api/`](./backend/gov-api/README.md) | planowane |

## Stack

- TanStack Start + TanStack Router (React 19, routing plikowy)
- Vite 8 + Nitro 3 z presetem `bun`
- Bun 1.4 jako runtime, menedżer pakietów i sterownik SQLite
- MapLibre GL JS 6.19.0 + Protomaps/PMTiles
- Tailwind CSS v4 + shadcn/ui (`new-york`, komponenty na bazie Radix UI)
- Drizzle ORM z `bun:sqlite`
- better-auth
- Biome + TypeScript w trybie strict

## Getting Started

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
| Build | `bun run build` |
| Podgląd builda | `bun run preview` |
| Migracje | `bun run db:generate`, `bun run db:migrate`, `bun run db:push` |
| Dane startowe (dev) | `bun run db:seed` |
| Drizzle Studio | `bun run db:studio` |
| Ingest źródeł i budowa core | `bun run ingest:run` |
| Kafelki mapy | `bun run map:tiles` |
| Nowy komponent shadcn | `bunx --bun shadcn@latest add <nazwa>` |

## Dane AED (ingest)

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
`--out-dir` i `--raw-dir` pozwalają sterować przebiegiem. Szczegóły:
[`backend/ingest/README.md`](./backend/ingest/README.md).

## Mapa

Strona główna (`frontend/routes/index.tsx`) renderuje `frontend/map/poland-map.tsx`: MapLibre GL JS wyśrodkowany na Polsce (`19.1451, 51.9194`), z polskimi etykietami z Protomaps, kontrolkami nawigacji i skali oraz alertem shadcn, gdy mapa nie może się wczytać.

Wyciąg kafelków kończy się na zoomie 15, a mapa pozwala dojść do zoomu 18. Źródło ma przypięte `maxzoom: 15`, więc MapLibre overzoomuje kafelki z15 zamiast żądać brakujących kafelków. Kafelki pochodzą z `/api/pmtiles` (`frontend/routes/api/pmtiles.ts`), który obsługuje nagłówki `Range` i odpowiada `206 Partial Content`. Nie podłączaj PMTiles bezpośrednio do pliku statycznego, ponieważ hosting statyczny nie zwraca zakresów bajtów wymaganych przez PMTiles.

Wygeneruj lokalny wyciąg PMTiles (domyślnie zoom 15, około 4 GB, ignorowany przez git):

```bash
bun run map:tiles
```

Skrypt pobiera najnowszy dzienny build Protomaps i wycina Polskę do `frontend/public/poland.pmtiles`. Domyślnie używa `PMTILES_THREADS=12` i ponawia próbę do `PMTILES_ATTEMPTS=3` razy. Nadpisz ustawienia przez `POLAND_MAXZOOM`, `POLAND_BBOX`, `PMTILES_THREADS`, `PMTILES_ATTEMPTS` lub `PROTOMAPS_PLANET_URL`. Szybki, mały wyciąg: `POLAND_MAXZOOM=10 bun run map:tiles` (około 100 MB; mapa nadal przybliża, ale kafelki są rozmyte). Skrypt nie nadpisuje istniejącego archiwum i nie usuwa go przy nieudanej próbie; aby wymusić ponowne pobranie, ustaw `POLAND_FORCE=1`.

Worker MapLibre jest ładowany jako statyczny zasób z `/maplibre-gl-worker.mjs?v=6.19.0`. Utrzymuj parametr `?v=` w `frontend/map/poland-map.tsx` zgodny z wersją `maplibre-gl`, aby unieważniać cache po aktualizacji. Nie serwuj workera przez route serwerowy: middleware Nitro w trybie dev kieruje żądania z `Sec-Fetch-Dest: worker` do plików statycznych i pomija route API.

## UI

Projekt używa wyłącznie natywnych komponentów shadcn/ui generowanych przez CLI: `alert`, `badge`, `button` i `card`. Są zarządzane przez rejestr shadcn, bazują na Radix UI i zachowują styl `new-york` oraz motyw oparty na zmiennych CSS w `frontend/styles.css`. Nie edytuj wygenerowanych plików w `frontend/components/ui/` ręcznie i nie dodawaj własnych prymitywów zamiast komponentów shadcn.

```bash
bunx --bun shadcn@latest add <nazwa>
```

## Database

Aplikacja używa natywnego sterownika SQLite Buna przez `drizzle-orm/bun-sqlite`. Plik bazy pochodzi z `DATABASE_URL` (domyślnie `dev.db`), a `backend/store/index.ts` włącza WAL i `synchronous = NORMAL`. Schemat znajduje się w `backend/store/schema.ts`.

W wersji deweloperskiej istnieje jedna tabela domenowa `aed_devices` (tymczasowa,
kolumny mogą się zmieniać). Funkcje dostępu dla innych modułów są w
`backend/store/aed-store.ts` (`addAedDevice`, `addAedDevices`, `listAedDevices`,
`getAedDevice`, `countAedDevices`, `clearAedDevices`).

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed      # 5 przykładowych rekordów do dev.db
bun run db:studio
```

Drizzle Kit działa na Bunie. `@libsql/client` jest zależnością deweloperską, ponieważ CLI Drizzle Kit potrzebuje klienta SQLite; aplikacja w runtime używa `bun:sqlite`.

## Integracja z dane.gov.pl

Backend publikuje dane AED w formacie harwestera dane.gov.pl (`urn:otwarte-dane:harvester:1.13`). Portal sam pobiera feed raz na dobę — nie ma API do wypychania danych.

| Endpoint | Zawartość |
| --- | --- |
| `/harvester/feed.xml` | feed XML 1.13 (GET/HEAD) |
| `/harvester/feed.md5` | suma MD5 dokładnie tych bajtów |
| `/data/aed.csv` | rejestr AED w CSV |
| `/data/aed.geojson` | rejestr AED jako GeoJSON |

Zasoby muszą być dostępne przez HTTPS, dlatego do testów lokalnych służy
`bun run dev:tls` (self-signed proxy na porcie 3443).

Pełna instrukcja testu end-to-end z lokalnym portalem (łącznie z wymaganym
workerem Celery, regułą `ufw` i obejściem walidacji formularza dla adresów IP):
[`backend/gov-api/README.md`](./backend/gov-api/README.md).

```bash
bun run dev
PUBLIC_BASE_URL=https://172.18.18.1:3443 bun run dev   # wariant dla portalu w Dockerze
bun run dev:tls
```

## Auth

better-auth jest skonfigurowany w `backend/auth/auth.ts` (logowanie e-mailem i hasłem, plugin `tanstackStartCookies`), klient w `frontend/lib/auth-client.ts`, a handler w `frontend/routes/api/auth/$.ts`.

Ustaw w `.env.local`:

```bash
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

Sekret wygenerujesz przez `bunx --bun @better-auth/cli secret`.

## Routing

Routing jest plikowy i oparty na TanStack Router. Pliki w `frontend/routes/` tworzą route'y, a `frontend/router.tsx` buduje router z `routeTree.gen.ts`. Nie edytuj `frontend/routeTree.gen.ts` ręcznie; generuje go `bun run dev` lub `bun run build`.

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

Layout aplikacji znajduje się w `frontend/routes/__root.tsx` i używa `shellComponent` do renderowania dokumentu HTML.

## Server Functions i API Routes

Server functions z TanStack Start pozwalają uruchamiać kod serwerowy bezpośrednio z komponentów:

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

Dane ładuj przez `loader` TanStack Router lub przez server functions. Aplikacja nie ma integracji z TanStack Query: nie ma providera `QueryClient` ani devtools. Jeśli w przyszłości dodasz Query, zainstaluj `@tanstack/react-query` i podłącz provider w `frontend/router.tsx`.

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

Zmienne środowiskowe mieszkają w `.env.local` (nigdy nie commitowanym). Bun ładuje ten plik automatycznie:

- `DATABASE_URL` — ścieżka do pliku SQLite (domyślnie `dev.db`)
- `BETTER_AUTH_URL` — bazowy URL better-auth
- `BETTER_AUTH_SECRET` — sekret podpisujący better-auth

W kodzie serwerowym używaj `process.env` lub `Bun.env`, a w kliencie `import.meta.env` dla zmiennych z prefiksem `VITE_`. Nie ma modułu walidacji `frontend/env.ts`; kafelki zawsze pochodzą z `/api/pmtiles`.

## Linting i formatowanie

Projekt używa Biome do lintowania i formatowania: tabulatory, podwójne cudzysłowy, organizacja importów.

```bash
bun run lint
bun run format
bun run check
```

## Commit Conventions

Projekt stosuje [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Format: `<type>(<scope>): <description>`.

```bash
git commit -m "feat(map): add AED markers"
git commit -m "fix(auth): handle expired sessions"
git commit -m "docs(readme): document map tile defaults"
```

Dozwolone typy: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Deploy

Build korzysta z presetu Bun w Nitro:

```bash
bun run build
bun .output/server/index.mjs
```

Katalog `.output/` zawiera samodzielny serwer Bun. Aby wdrożyć, wyślij `.output/` na hosting i uruchom powyższą komendę. Presety dla innych platform opisuje dokumentacja Nitro: https://v3.nitro.build/deploy.

## AI Tooling

- TanStack Agent Skills są dostępne przez `@tanstack/intent`. `package.json#intent.skills` dopuszcza `@tanstack/*`; użyj `bunx --no-install --package @tanstack/intent intent list`, aby zobaczyć lokalne skille.
- Lokalny skill `/tanstack` opakowuje `intent list` i `intent load` dla wskazówek dopasowanych do wersji Start i Router.
- Skill shadcn jest w `.claude/skills/shadcn` i jest dostępny w Jcode jako `/shadcn`. Czyta `components.json` i uruchamia CLI shadcn.
- Serwer MCP shadcn jest skonfigurowany w `.jcode/mcp.json` i `.mcp.json` i działa przez Bun. Przy wywołaniach spoza katalogu projektu podawaj `registries: ["@shadcn"]`.

## Learn More

- [TanStack Start](https://tanstack.com/start) i [TanStack Router](https://tanstack.com/router)
- [MapLibre GL JS](https://maplibre.org/) i [Protomaps](https://protomaps.com)
- [shadcn/ui](https://ui.shadcn.com/)
- [Drizzle ORM](https://orm.drizzle.team/) i [better-auth](https://www.better-auth.com)
