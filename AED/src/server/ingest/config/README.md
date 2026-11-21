# Source config: Zod schema, types and UI metadata

Runtime contract for `backend/ingest/examples/*.yaml`. The Zod schema is the
source of truth for TypeScript types, validation and the generated JSON Schema.
The hand-edited `backend/ingest/source-config.schema.json` remains the design
contract and is kept in sync by review; the generated artifact lives next to the
schema so the code and docs can be compared without a build step.

## Files

| File | Role |
| --- | --- |
| `schema.ts` | Zod schemas, parser/family unions, semantic refinements, JSON Schema builder |
| `form-metadata.ts` | section/field labels, parser fields, canonical field matrix, Polish form errors |
| `source-config.generated.schema.json` | generated Draft 2020-12 schema (do not edit by hand) |
| `schema.test.ts` | examples, generated schema, refinements and form error tests |
| `loader.ts` | reads `backend/ingest/sources/*.json`, validates each file and keeps one in-memory registry |
| `loader.test.ts` | 12-file tabular registry, Zod/JSON Schema parity and error-path tests |
| `../../../scripts/generate-source-config-schema.ts` | writes or checks the generated artifact |

## Runtime loader

`loader.ts` is the only module that should read the JSON files at runtime.
It resolves the directory from `AED_SOURCE_CONFIG_DIR`, then falls back to
`backend/ingest/sources`, parses every `*.json`, runs
`sourceConfigSchema.safeParse`, and returns:

- `configs` sorted by `source.id`,
- `byId` for lookups,
- `errors` with file, source id and field paths,
- `summary` with parser/family counts, enabled and publishable totals.

The registry is cached in memory. Use `loadSourceConfigs({ force: true })` or
`reloadSourceConfigs()` after a file edit. Use `loadSourceConfigsOrThrow()` at
startup when an invalid config must stop the process.

```ts
import {
	getSourceConfig,
	getEnabledSourceConfigs,
	loadSourceConfigsOrThrow,
} from "./loader";

const registry = loadSourceConfigsOrThrow();
const openaedmap = getSourceConfig("openaedmap");
const enabled = getEnabledSourceConfigs();
```

## Geocoding

Address-only sources use `geocoding.enabled: true`,
`provider_order: ["gugik-uug"]` and the public GUGiK UUG endpoint
`https://services.gugik.gov.pl/uug/` (`request=GetAddress`). UUG returns
EPSG:2180 coordinates; the config records `srid: 2180` and
`output_srid: 4326`. The legacy `geoportal` object name is retained for
backwards compatibility, but the provider is GUGiK UUG.

## Parser unions

`SourceConfig` is a union of one variant per parser. Each variant ties together:

- `connector.family` and `connector.parser` (the family/parser matrix),
- the parser-specific `parse` object (`csv`, `xlsx`, `json`, `geojson`, `kml`,
  `jsonapi`, `html_table`, `html_list`, `pdf_table`),
- the common sections (`source`, `fetch`, `records`, `map`, `validate`, `drift`,
  optional `publish`, `geocoding`, `schedule` and `activation`).

`PARSER_PARSE_SCHEMAS`, `SOURCE_CONFIG_VARIANTS` and `CONNECTOR_PARSER_MATRIX`
expose the same information for loaders and the wizard.

## Refinements

Structural checks stay representable in JSON Schema. Cross-field rules live in
`sourceConfigSchema.superRefine`:

- `publish.license_id` mirrors `source.license.id` when publication is enabled,
- every `validate.required` field has an entry in `map`,
- bbox is ordered and inside valid WGS84 ranges,
- `drift.volume.max_records >= min_records`,
- forbidden static headers (`Host`, `Transfer-Encoding`, `X-Forwarded-*`, ...),
- `source_record_id` cannot be a constant,
- `lookup.file` is a relative path without `..`,
- `auth.type=basic` has a password reference and a user reference.

Raw MySQL-style conditionals are not used; mapping conditions are data under
`expr.when`.

## Generated JSON Schema

```bash
cd AED
bun run config:schema        # write src/server/ingest/config/source-config.generated.schema.json
bun run config:schema:check  # fail if the checked-in artifact is stale
```

The generator removes Zod internals (`~standard`), expands `type` arrays into
`anyOf` so Ajv `strict: true` accepts the document, and keeps the schema id
stable. Semantic refinements cannot be represented fully in JSON Schema; run the
Zod parse for those.

## UI metadata and errors

`form-metadata.ts` exports:

- `CONFIG_SECTIONS` and `CONFIG_FIELD_METADATA` for the editor form,
- `PARSER_METADATA` and `CONNECTOR_FAMILY_METADATA` for dynamic parser/family
  selection, defaults and help text,
- `CANONICAL_FIELD_METADATA` for the mapping matrix,
- `validateSourceConfigForForm(input)` and `toFormIssues(error)`.

`ConfigFormIssue` carries `path`, `section`, `label`, `message`, `code` and
`severity` so a route can focus the first error and link it with
`aria-describedby`.
