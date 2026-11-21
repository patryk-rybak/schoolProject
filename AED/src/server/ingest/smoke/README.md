# Live smoke harness

Reusable, read-only smoke test for the active declarative source configs in
`backend/ingest/sources/`. It answers one question per family: does the live
source still respond, parse with the configured shape, and satisfy the minimum
mapping contract?

This is not a production connector, a dry-run, or shadow. It never writes
source records, snapshots, observations, aliases, or review items.

## Files

| File | Role |
| --- | --- |
| `parsers.ts` | Pure CSV/HTML/KML/JSON helpers and the mapping-DSL subset |
| `harness.ts` | Fetch policy, family handlers, validation statistics, status |
| `report.ts` | JSON and Markdown renderers |
| `../../../scripts/smoke-source-configs.ts` | CLI |

## Usage

```bash
cd AED
bun scripts/smoke-source-configs.ts                       # all configs live
bun scripts/smoke-source-configs.ts --family html_table    # one family
bun scripts/smoke-source-configs.ts --source krosno,marki  # selected ids
bun scripts/smoke-source-configs.ts --active-only          # only the active registry
bun scripts/smoke-source-configs.ts --ignore-robots        # compliance override
bun scripts/smoke-source-configs.ts --no-write --quiet     # CI-friendly
bun scripts/smoke-source-configs.ts --fail-on=failed       # nonzero on error
```

Defaults: concurrency 4, timeout 30 s, both `backend/ingest/sources` and
`backend/ingest/sources-excluded` (so the report still covers all 69), disabled
configs included, `robots.txt` respected for HTML and KML, JSON report at
`docs/research/source-inventory/config-smoke-report.json`, Markdown at
`docs/research/source-inventory/config-smoke-report.md`.

Each result carries `registry: "active" | "excluded"`. The Markdown report
labels both groups and summarises them separately.

## Family behavior

- `file_static` + `csv`: BOM decoding, outer-quote repair, doubled-quote repair,
  header trimming, header lookup through `map`.
- `file_static` + `geojson`: `FeatureCollection.features`, properties flattened
  over `geometry`, coordinates read as `[lon, lat]`.
- `http_json` + `json`: `records.path`, optional string unwrapping, POST body,
  bearer/header/basic auth from environment variables. No pagination fan-out;
  the first page plus `total_path` metadata is enough for smoke.
- `google_my_maps_kml` + `kml`: fetch the page, find `mid=`, fetch
  `https://www.google.com/maps/d/kml?mid=...&forcekml=1`, parse Placemarks,
  count points, lines, polygons and placemarks without geometry.
- `html_table` + `html_table`: the selector subset `table`, `tag.class`, `#id`;
  `table_index`, `header_row`, `data_start_row`, `columns`, `require_headers`,
  `orientation=key_value`, `require_keys`. The parser is intentionally small.
- `manual`: reachability and document signature only. No transcription.

## Status semantics

| Status | Meaning |
| --- | --- |
| `ok` | 2xx, parsed, required fields and location pass, no material drift |
| `warning` | parsed with partial rejections, coordinate drift, volume drift, or a content-type mismatch |
| `failed` | network/HTTP error, no records, parse error, below `min_records`, or required coverage below 100% |
| `blocked` | missing secret environment variable, 401/403, or `robots.txt` disallow |
| `manual` | reachable manual source; no automatic parser expected |

The report never includes response bodies, headers, or secret values.
