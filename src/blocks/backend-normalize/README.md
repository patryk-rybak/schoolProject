# backend-normalize — one common format

## Scope

Turning each source's `RawRecord.payload` into the shared `AedRecord` model:
field mapping, coordinate parsing, Polish address handling, TERYT resolution,
status/access interpretation, stable ids, cross-source deduplication, and
explicit rejection reasons.

## Owns

- `src/blocks/backend-normalize/**` (one standardizer per source id)

## Public API

```ts
import { createStandardizer } from "#/blocks/backend-normalize";
```

Returns a `Standardizer` for a `sourceId`. `normalize(batch)` yields
`{ accepted, rejected }`; rejected items carry a machine-readable `code` and a
human message.

## Depends on

- `#/blocks/contracts` — `AedRecord`, `NormalizationResult`
- `#/blocks/backend-ingest` — only its types (`RawBatch`), never its internals

## Rules

- `id` must be deterministic: `<sourceId>:<externalId>`, never random.
- Coordinates: Poland is roughly `lat 49–55`, `lon 14–24.2`; anything outside is
  rejected with `out_of_poland`.
- Unknown values are `null`, never `""` or `0`.
- Never invent data: if the source does not say a device works, `status` is
  `"unknown"`, not `"operational"`.

## Done when

- [ ] One standardizer per registered source, all fixtures covered
- [ ] Deduplication (same device from two sources) with a documented rule
      (distance + name similarity) and a test
- [ ] Access/status mapping documented per source
- [ ] TERYT resolved for at least city/county level
- [ ] Rejection report totals match the input count
- [ ] 100% deterministic output for the same input
