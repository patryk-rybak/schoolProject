# backend-ingest — fetch raw data from sources

## Scope

Reaching out to the outside world: one `IngestSource` per upstream dataset,
HTTP with timeouts/retries/user-agent, polite rate limits, raw snapshot storage,
and the metadata that documents each source's **reference scope** (area, fields,
licence, cadence).

The challenge explicitly requires "gathering data from multiple dispersed
sources while indicating their reference scope" — that is `SourceScope`, and it
is part of this block's deliverable.

## Owns

- `src/blocks/backend-ingest/**` (including `sources/<source-id>.ts`)

## Public API

```ts
import { createIngestRegistry } from "#/blocks/backend-ingest";
```

Returns an `IngestRegistry`: `register`, `list`, `run(sourceId)`. Every call
returns a `RawBatch` of untouched `RawRecord`s — no interpretation happens here.

## Depends on

- `#/blocks/contracts` — `RawRecord`, `RawBatch`, `SourceScope`
- `#/blocks/backend-store` — only for persisting raw snapshots and sync runs

## Done when

- [ ] At least three real sources registered (e.g. Warszawa, Przemyśl, Marki),
      each with a complete `SourceScope`
- [ ] HTTP client has timeout, retry with backoff, and an honest User-Agent
- [ ] External identifiers are stable across runs
- [ ] Raw payloads are snapshotted so re-normalising never needs the network
- [ ] Fixtures recorded for tests; unit tests do not hit the internet
- [ ] Failures are isolated per source and reported, not swallowed
- [ ] Terms of use / robots.txt respected for every scraped source
