# backend-store — aggregation and persistence

## Scope

The database: Drizzle schema, migrations, upserts, queries the UI and publisher
need (bounding box, nearest, by id), sync bookkeeping, and retention.

## Owns

- `src/blocks/backend-store/**`
- `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `drizzle/`

> ⚠️ `src/db/index.ts` currently enables WAL and `synchronous = NORMAL` on
> `bun:sqlite`. Keep it. Never introduce `better-sqlite3` or other native
> modules.

## Public API

```ts
import { createAedRepository } from "#/blocks/backend-store";
```

`AedRepository`: `upsert`, `list` (with bbox/source filters), `getById`,
`nearest`, `count`. Also persist `SourceScope` and `SyncRun` rows.

## Depends on

- `#/blocks/contracts` — `AedRecord`, `AedQuery`, `SyncRun`
- `#/db` — the shared Drizzle client

## Data model to add

- `aed_records` — one row per device, unique on `(source_id, external_id)`
- `sources` — `SourceScope` per upstream dataset
- `sync_runs` — per ingest pass: counts, timings, errors
- `raw_snapshots` — optional, written by `backend-ingest`

SQLite has no PostGIS: store `lat`/`lon` as REAL, do bbox filtering in SQL and
nearest-neighbour with a haversine expression (or a bounding-box prefilter).

## Done when

- [ ] Schema + generated migration committed (`bun run db:generate`)
- [ ] Upsert is idempotent and reports inserted/updated/unchanged
- [ ] `list` (bbox, source, pagination) and `nearest` covered by tests
- [ ] `bun run db:push` works on a fresh `dev.db`
- [ ] No secrets or database files committed (`.env.local`, `*.db*` stay ignored)
- [ ] Indexes on `(source_id, external_id)`, `lat`, `lon`
