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

## Project Snapshot

- TanStack Start (React 19) full-stack app with file-based routing
- Bun 1.4+ for runtime, package management, scripts, and SQLite
- Vite 8 + Nitro 3 (`bun` preset) for dev, build, and preview
- Drizzle ORM with `bun:sqlite` (WAL enabled)
- better-auth for authentication
- Tailwind CSS v4 + shadcn/ui (`new-york` style)
- MapLibre GL JS + Protomaps/PMTiles, centered on Poland with Polish labels
- Biome for linting and formatting, TypeScript strict mode

## Golden Rules

1. Use Bun for everything. Never use npm, pnpm, yarn, or Node to run or build the app.
2. Never add `better-sqlite3` or other native modules that need `node-gyp`. Use `bun:sqlite`.
3. Keep `bun run dev` working; Vite and Nitro must run on the Bun runtime.
4. Never commit secrets or local artifacts. `.env.local`, `*.db*`, `.output`, `.tanstack`, and `node_modules` are ignored.
5. Every commit must follow Conventional Commits. See below.
6. Do not hand-edit generated files, especially `src/routeTree.gen.ts`.
7. Keep diffs focused. Do not reformat unrelated files or rewrite generated UI components.
8. Verify with real commands before declaring work complete.

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `bun install` |
| Dev server | `bun run dev` (http://localhost:3000) |
| Typecheck | `bunx tsc --noEmit` |
| Build | `bun run build` |
| Preview production build | `bun run preview` |
| Lint | `bun run lint` |
| Format | `bun run format` |
| Lint + format + organize imports | `bun run check` |
| Generate migrations | `bun run db:generate` |
| Push schema to database | `bun run db:push` |
| Open Drizzle Studio | `bun run db:studio` |
| Add a shadcn component | `bunx --bun shadcn@latest add <name>` |
| Generate Poland map tiles | `bun run map:tiles` |
| Typecheck | `bun run typecheck` |
| Run all checks | `bun run verify` |
| Auto-fix lint/format | `bun run check:write` |

## Agent Tooling

- TanStack packages ship Agent Skills. `package.json#intent.skills` permits `@tanstack/*`, and the `intent-skills` block at the top of this file explains how to list and load them.
- The local `/tanstack` skill wraps `intent list` and `intent load` so Jcode can pull version-matched Start, Router, Query, and Table guidance.
- The shadcn skill is installed at `.claude/skills/shadcn` and is available in Jcode as `/shadcn`. It reads `components.json` and runs the shadcn CLI for project-aware work.
- The shadcn MCP server is configured in `.jcode/mcp.json` and `.mcp.json` with `bunx --no-install --bun shadcn mcp`.
- The MCP server is daemon-scoped and starts outside the project directory. Pass `registries: ["@shadcn"]` to MCP search and view calls; use the `/shadcn` skill when an operation needs project configuration.
- Keep MCP commands on Bun. Do not add npm-only MCP wrappers.

## Architecture

- `src/routes/` — TanStack file routes (`__root.tsx`, `index.tsx`, `api/auth/$.ts`)
- `src/components/ui/` — shadcn/ui components
- `src/components/map/poland-map.tsx` — MapLibre + Protomaps map of Poland
- `src/db/index.ts` — Drizzle client backed by `bun:sqlite`; enables WAL and `synchronous = NORMAL`
- `src/db/schema.ts` — Drizzle schema
- `src/lib/auth.ts` — better-auth server config
- `src/lib/auth-client.ts` — better-auth client
- `src/styles.css` — Tailwind v4 theme and CSS variables
- `drizzle.config.ts` — Drizzle Kit config
- `vite.config.ts` — Vite, TanStack Start, Tailwind, and Nitro plugins
- `scripts/fetch-poland-pmtiles.sh` — downloads a Protomaps extract for Poland
- `scripts/copy-maplibre-worker.ts` — copies the MapLibre worker into `public/`

Path aliases: both `#/*` and `@/*` map to `./src/*`.

## Runtime and Data Rules

- `DATABASE_URL` defaults to `dev.db`. Bun loads `.env.local` automatically.
- Drizzle Kit needs `@libsql/client` (dev dependency) because its CLI does not support `bun:sqlite`. Never use it at runtime; the app uses `bun:sqlite`.
- Run database tooling with Bun: `bun run db:*`.
- WAL mode is configured in `src/db/index.ts`. Keep it.
- Prefer Drizzle's synchronous APIs (`db.select().from(...).all()`) in Bun-native server code.
- Schema changes require a generated migration and a corresponding `db:push` or `db:migrate`.
- `public/poland.pmtiles` is generated locally and ignored by git. Run `bun run map:tiles` after cloning or when the map data is stale.
- `public/maplibre-gl-worker.mjs` is copied by `postinstall`/`predev`/`prebuild` and ignored by git.
- The PMTiles archive is served by `src/routes/api/pmtiles.ts` with HTTP byte-range support; static hosting does not provide the range responses PMTiles needs.
- `src/routes/api/maplibre-worker.ts` serves the MapLibre worker, and the client wraps it in a Blob URL before calling `setWorkerUrl`. Keep the `?v=` query in sync when upgrading MapLibre so caches are invalidated.

Environment variables live in `.env.local` (never committed):

- `DATABASE_URL` — SQLite file path
- `BETTER_AUTH_URL` — base URL for better-auth
- `BETTER_AUTH_SECRET` — signing secret

## UI Rules

- Add components with `bunx --bun shadcn@latest add <component>`; do not hand-roll shadcn primitives.
- Use the generated `cn` helper (from the `cn` package) or `#/lib/utils`.
- Use `lucide-react` for icons.
- Preserve the `new-york` style and CSS-variable theme in `components.json` and `src/styles.css`.
- Wrap tooltip consumers in `TooltipProvider` when required.

## Code Style

- Biome formatter: tabs, double quotes, organized imports.
- `bun run check` enables every Biome rule group (including nursery) and fails on warnings. Framework-specific nursery/style rules are skipped explicitly in the script; keep that list deliberate and documented.
- TypeScript runs with all strict flags, including `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `noPropertyAccessFromIndexSignature`.
- `src/components/**` is excluded from Biome and from the TypeScript root include because it is generated UI code.
- Avoid `any`, prefer inferred types, and keep server-only code out of client components.
- Do not edit `src/routeTree.gen.ts`; regenerate it with `bun run dev` or `bun run build`.
- Tests: there is no test suite yet. If you add tests, use `bun test` and place `*.test.ts` files near the code they cover.

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
