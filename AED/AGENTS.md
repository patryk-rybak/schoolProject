<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `bunx --no-install --package @tanstack/intent intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bunx --no-install --package @tanstack/intent intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# AGENTS.md

Guidance for AI coding agents working in this repository. Keep this file current when the stack, commands, or workflow change.

## Repository Layout

The application lives in `AED/`; all commands below run from that directory. The
repository root keeps non-app material only: `task_description/` (challenge
brief), `dane.gov.pl/` (published portal sources and their run guide), and
`docs/` (the static GitHub Pages share card).

## Project Snapshot

- Minimal TanStack Start (React 19) full-stack AED map with file-based routing
- Bun 1.4+ for runtime, package management, scripts, and SQLite
- Vite 8 + Nitro 3 (`bun` preset) for dev, build, and preview
- Drizzle ORM with `bun:sqlite` (WAL enabled)
- better-auth for authentication
- Tailwind CSS v4 + shadcn/ui (`new-york` style, Radix UI base; registry components: alert, badge, button, card, checkbox, field, input, label, select, separator, tabs, textarea)
- MapLibre GL JS 6.19.0 + Protomaps/PMTiles, centered on Poland with Polish labels
- Biome for linting and formatting, TypeScript strict mode

## Golden Rules

1. Use Bun for everything. Never use npm, pnpm, yarn, or Node to run or build the app.
2. Never add `better-sqlite3` or other native modules that need `node-gyp`. Use `bun:sqlite`.
3. Keep `bun run dev` working; Vite and Nitro must run on the Bun runtime.
4. Never commit secrets or local artifacts. `.env.local`, `*.db*`, `.output`, `.tanstack`, and `node_modules` are ignored.
5. Every commit must follow Conventional Commits. See below.
6. Do not hand-edit generated files, especially `frontend/routeTree.gen.ts`.
7. Keep diffs focused. Do not reformat unrelated files or rewrite generated UI components.
8. Verify with real commands before declaring work complete.

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `bun install` |
| Dev server | `bun run dev` (http://localhost:3000) |
| Local HTTPS proxy for dane.gov.pl | `bun run dev:tls` (https://0.0.0.0:3443) |
| Build | `bun run build` |
| Preview production build | `bun run preview` |
| Lint | `bun run lint` |
| Format | `bun run format` |
| Lint + format + organize imports | `bun run check` |
| Generate migrations | `bun run db:generate` |
| Apply migrations | `bun run db:migrate` |
| Push schema to database | `bun run db:push` |
| Seed development data | `bun run db:seed` |
| Full daily source refresh (fetch + store) | `bun run db:refresh-sources` |
| Open Drizzle Studio | `bun run db:studio` |
| Add a shadcn component | `bunx --bun shadcn@latest add <name>` |
| Generate Poland map tiles | `bun run map:tiles` |
| Typecheck | `bun run typecheck` |
| Run tests | `bun test` |
| Run all checks | `bun run verify` |
| Auto-fix lint/format | `bun run check:write` |

## Agent Tooling

- TanStack packages ship Agent Skills. `package.json#intent.skills` permits `@tanstack/*`, and the `intent-skills` block at the top of this file explains how to list and load them.
- The local `/tanstack` skill wraps `intent list` and `intent load` so Jcode can pull version-matched Start and Router guidance.
- The shadcn skill is installed at `.claude/skills/shadcn` and is available in Jcode as `/shadcn`. It reads `components.json` and runs the shadcn CLI for project-aware work.
- The shadcn MCP server is configured in `.jcode/mcp.json` and `.mcp.json` with `bunx --no-install --bun shadcn mcp`.
- The MCP server is daemon-scoped and starts outside the project directory. Pass `registries: ["@shadcn"]` to MCP search and view calls; use the `/shadcn` skill when an operation needs project configuration.
- Keep MCP commands on Bun. Do not add npm-only MCP wrappers.

## Architecture

- `frontend/routes/` — TanStack file routes (`__root.tsx`, `index.tsx`, `logowanie.tsx`, `dodaj-aed.tsx`, `moje-aed.tsx`, `zrodla/`, `api/auth/$.ts`, `api/pmtiles.ts`)
- `frontend/lib/public-paths.ts`, `frontend/lib/auth-guard.ts` — public-route allowlist and the root session guard; only `/`, `/logowanie`, `/api/auth/*`, `/api/pmtiles`, `/data/*`, and `/harvester/*` are public, everything else redirects to `/logowanie`
- `frontend/router.tsx` — router factory (`getRouter`) consumed by TanStack Start
- `frontend/components/ui/` — shadcn/ui components in use (`alert`, `badge`, `button`, `card`, `checkbox`, `field`, `input`, `label`, `select`, `separator`, `tabs`, `textarea`), managed by the shadcn registry; add or update them with the CLI, do not hand-edit
- `frontend/server/forms.ts` — TanStack server functions for the AED forms; return `{ok:false,message,issues}` instead of throwing; source-admin and geocode functions require a session
- `frontend/map/poland-map.tsx` — MapLibre + Protomaps map of Poland; optional `onPick`/`picked` props turn it into a point picker, plain clicks open a „Dodaj AED tutaj” popup linking to `/dodaj-aed?lat&lon`, and `showLocateControl` enables the main-page „Moja lokalizacja” button (Geolocation API + blue marker)
- `backend/forms/` — server-only form logic: `manual-record.ts` (full canonical schema validation + save), `geocode.ts` (Nominatim, throttled, Polish errors), `source-admin.ts` (registry list/save/preview/import/delete)
- `frontend/hooks/use-mobile.ts` — generated shadcn hook
- `backend/store/index.ts` — Drizzle client backed by `bun:sqlite`; enables WAL and `synchronous = NORMAL`
- `backend/store/schema.ts` — Drizzle schema
- `backend/auth/auth.ts` — better-auth server config (Drizzle adapter, username plugin)
- `backend/auth/schema.ts` — better-auth tables (`user`, `session`, `account`, `verification`)
- `frontend/auth-form/` — login/register panel and header with sign-out
- `frontend/lib/auth-client.ts` — better-auth client
- `frontend/lib/social-share.ts` — Facebook sharer URL and the post text copied after saving an AED; its landing-page URL must match `docs/share.html`
- `docs/share.html`, `docs/razimy-dobrem.png` — static GitHub Pages campaign card published from `main` `/docs`; keep the canonical and `og:*` URLs in sync with `frontend/lib/social-share.ts`
- `frontend/styles.css` — Tailwind v4 theme and CSS variables
- `drizzle.config.ts` — Drizzle Kit config
- `vite.config.ts` — Vite, TanStack Start, Tailwind, and Nitro plugins
- `frontend/scripts/fetch-poland-pmtiles.sh` — downloads a Protomaps extract for Poland
- `frontend/scripts/copy-maplibre-worker.ts` — copies the MapLibre worker into `frontend/public/`; no `api/maplibre-worker.ts` route exists
- `frontend/scripts/dev-tls-proxy.ts` — self-signed HTTPS proxy for testing against the local dane.gov.pl harvester
- `backend/gov-api/` — dane.gov.pl feed builder (XML 1.13, MD5, CSV, GeoJSON) and vendored XSD
- `frontend/routes/harvester/` — `/harvester/feed.xml` and `/harvester/feed.md5`
- `frontend/routes/data/` — `/data/aed.csv` and `/data/aed.geojson`

There is no `frontend/integrations/` directory and no `frontend/env.ts` validation module. Read server configuration from `process.env` and client `VITE_` variables from `import.meta.env`. There is no TanStack Query provider or devtools integration; use route loaders and server functions.

Path aliases: `#/*` and `@/*` map to `./frontend/*`; `#backend/*` and `@backend/*` map to `./backend/*`.

Non-default paths to keep in mind: Vite serves static files from `frontend/public` (`publicDir` in `vite.config.ts`), and Drizzle Kit writes migrations to `backend/store/drizzle` (`out` in `drizzle.config.ts`).

## Runtime and Data Rules

- `DATABASE_URL` defaults to `dev.db`. Bun loads `.env.local` automatically.
- Drizzle Kit needs `@libsql/client` (dev dependency) because its CLI does not support `bun:sqlite`. Never use it at runtime; the app uses `bun:sqlite`.
- Run database tooling with Bun: `bun run db:*`.
- WAL mode is configured in `backend/store/index.ts`. Keep it.
- Prefer Drizzle's synchronous APIs (`db.select().from(...).all()`) in Bun-native server code.
- Schema changes require a generated migration and a corresponding `db:push` or `db:migrate`.
- The domain schema has three physical AED tables in `backend/store/schema.ts`: `aed_devices` (user-added, signed by `created_by_id`, verified), `aed_source_devices` (imports; wiped/refilled, unverified), and the materialized `aed_devices_combined` read model used by the map and dane.gov.pl. Access them through `backend/store/aed-store.ts`, not by importing `db` directly. User writes and every source refresh update the combined table transactionally; import code must never delete or update `aed_devices`. `/moje-aed` lists only `created_by_id = session.user.id` and deletes through `deleteUserAedDevice`, which removes the row from both `aed_devices` and `aed_devices_combined` after an ownership check.
- All three AED tables require `lat`/`lon` and only accept `location_status` `point`/`geocoded`; records without a point are dropped by the importers. `aed_devices_combined` must be rebuilt from the two source tables whenever they change.
- `frontend/public/poland.pmtiles` is generated locally and ignored by git. Run `bun run map:tiles` after cloning or when the map data is stale. The script defaults to `POLAND_MAXZOOM=15` (about 4 GB), `PMTILES_THREADS=12`, and `PMTILES_ATTEMPTS=3`; override with `POLAND_BBOX` or `PROTOMAPS_PLANET_URL` when needed. The map pins the source `maxzoom` to 15 and overzooms those tiles up to `maxZoom: 18`. The script keeps an existing archive untouched and extracts to a temporary file before swapping, so failed downloads and normal runs never re-download or destroy it; set `POLAND_FORCE=1` to regenerate. Before swapping, it flushes the temporary file with `sync` and validates it with `pmtiles verify`; if the temporary file disappears during the download (the `*.pmtiles.tmp.*` name is ignored, so `git clean -fdX` can unlink it), it retries the extraction.
- `frontend/public/maplibre-gl-worker.mjs` is copied by `postinstall`/`predev`/`prebuild` and ignored by git. The map loads it as a static asset (`/maplibre-gl-worker.mjs?v=6.19.0`); keep the `?v=` query in sync with the `maplibre-gl` version so caches are invalidated. Do not serve the worker through a server route: Nitro's dev middleware routes `Sec-Fetch-Dest: worker` requests to static assets and skips API routes.
- The PMTiles archive is served by `frontend/routes/api/pmtiles.ts` with HTTP byte-range support; static hosting does not provide the range responses PMTiles needs.

The dane.gov.pl feed is deterministic per data version: `lastUpdateDate` comes
from `MAX(updated_at)`, and the artifact is cached so `/harvester/feed.xml` and
`/harvester/feed.md5` always serve the same bytes. `extIdent` values are stable
upsert keys — never change them. Resource URLs must be `https://` (XSD pattern).

Environment variables live in `.env.local` (never committed):

- `DATABASE_URL` — SQLite file path
- `BETTER_AUTH_URL` — base URL for better-auth
- `BETTER_AUTH_SECRET` — signing secret
- `PUBLIC_BASE_URL` — https origin used in feed resource links (default `https://localhost:3443`; use `https://172.18.18.1:3443` for the local portal container)

## UI Rules

- Add components with `bunx --bun shadcn@latest add <component>`; do not hand-roll shadcn primitives.
- Keep the component set to the registry components currently in `frontend/components/ui/` unless the task explicitly needs more.
- Keep the generated components on their Radix UI base; do not swap in another primitive library.
- Use the generated `cn` helper (from the `cn` package) or `#/lib/utils`.
- Use `lucide-react` for icons.
- Preserve the `new-york` style and CSS-variable theme in `components.json` and `frontend/styles.css`. The Facebook share card intentionally uses Facebook brand blue (`#1877F2`) and a decorative animated rainbow border; these are the only non-theme colors in that card. Keep the reduced-motion fallback in `frontend/styles.css`.

## Code Style

- Biome formatter: tabs, double quotes, organized imports.
- `bun run check` enables every Biome rule group (including nursery) and fails on warnings. Framework-specific nursery/style rules are skipped explicitly in the script; keep that list deliberate and documented.
- TypeScript runs with all strict flags, including `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `noPropertyAccessFromIndexSignature`.
- `frontend/components/**` is excluded from Biome and the TypeScript root include. `frontend/components/ui/` is registry-managed shadcn code; add or update it with the shadcn CLI. Hand-written components such as `frontend/map/poland-map.tsx` live alongside it and are covered by project conventions even though the directory is excluded.
- Avoid `any`, prefer inferred types, and keep server-only code out of client components.
- Do not edit `frontend/routeTree.gen.ts`; regenerate it with `bun run dev` or `bun run build`.
- Tests: run with `bun test`; place `*.test.ts` files near the code they cover. `backend/gov-api/feed.test.ts` validates the generated feed against the vendored XSD with `xmllint` when available.

## Git and Pull Requests

`main` is protected. The `run-tests` status check is required, so direct pushes are rejected.

1. Branch: `git switch -c <type>/<short-description>`
2. Commit with Conventional Commits.
3. Push: `git push -u origin <branch>`
4. Open a PR: `gh pr create --fill`
5. Wait for `run-tests`, then merge.

Never force-push `main`. Never commit databases, build output, or secrets.

## Conventional Commits (Required)

All commits must follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>(<scope>): <description>`

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Examples:

```text
feat(ui): add data table filters
fix(auth): handle expired sessions
docs(agents): document Bun runtime constraints
chore(deps): update drizzle-orm
```

Rules:

- Use imperative mood: "add", not "added".
- Keep the subject under about 72 characters.
- Reference issues in the body or footer when applicable (`Closes #123`).
- Use `!` or a `BREAKING CHANGE:` footer for breaking changes.

## Deployment

The Nitro output uses the Bun preset. Build and run it with Bun:

```bash
bun run build
bun .output/server/index.mjs
```

## Definition of Done

- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run check` passes
- [ ] `bun run build` passes
- [ ] `bun run lint` passes, or only pre-existing issues remain
- [ ] New UI uses shadcn components and existing theme tokens
- [ ] Database changes include generated migrations
- [ ] No secrets, databases, or build artifacts are staged
- [ ] Commits follow Conventional Commits
