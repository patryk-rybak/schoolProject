# Source config: Zod schema, types and UI metadata

Runtime contract for `backend/ingest/datasources-config.json`. The file is the
single canonical registry of all source configs and has the shape:

```json
{
  "version": 1,
  "sources": [
    { "version": 1, "source": { "id": "..." }, "...": "..." }
  ]
}
```

`sources` is sorted by `source.id`. The Zod schema is the source of truth for
TypeScript types, validation and the generated JSON Schema. The generated JSON
Schema files under `src/server/ingest/config/` and `backend/ingest/` are kept in
sync by review; they let code and docs be compared without a build step.

## Files

| File | Role |
| --- | --- |
| `schema.ts` | Zod schemas for a source config and the datasources registry, parser/family unions, semantic refinements, JSON Schema builders |
| `form-metadata.ts` | section/field labels, parser fields, canonical field matrix, Polish form errors |
| `datasources-config.generated.schema.json` | generated Draft 2020-12 registry schema (do not edit by hand) |
| `schema.test.ts` | registry validation, generated schema, refinements and form error tests |
| `loader.ts` | reads `backend/ingest/datasources-config.json`, validates the registry and keeps one in-memory registry |
| `loader.test.ts` | single-file registry, env override, Zod/JSON Schema parity and error-path tests |
| `../../../scripts/generate-source-config-schema.ts` | writes or checks both generated artifacts |

The copy at `backend/ingest/datasources-config.schema.json` is identical to the
generated file in this directory. Both are written by the generator.

## Runtime loader

`loader.ts` is the only module that should read the registry at runtime. It
resolves the file from `AED_DATASOURCES_CONFIG`, then falls back to
`backend/ingest/datasources-config.json`, parses the file once, checks for
duplicate `source.id` values, runs `datasourcesConfigSchema.safeParse`, and
returns:

- `configs` sorted by `source.id`,
- `byId` for lookups,
- `errors` with the registry file name, optional source id and field paths
  (`sources.<index>.…`),
- `summary` with parser/family counts, enabled and publishable totals,
- `configPath` (resolved file) and `configDir` (its directory, kept for
  backwards compatibility).

The registry is cached in memory. Use `loadSourceConfigs({ force: true })` or
`reloadSourceConfigs()` after a file edit. Use `loadSourceConfigsOrThrow()` at
startup when an invalid config must stop the process. Pass `path` to load a
different registry file in tests or tooling.

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

Duplicate ids are reported with the `duplicate_id` issue code and the path
`sources.<index>.source.id`. Structural and semantic problems are reported from
the Zod schema with their full field path.

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

`datasourcesConfigBaseSchema` is the structural registry used for JSON Schema
generation. `datasourcesConfigSchema` wraps `sourceConfigSchema` for each entry
and adds the duplicate-id refinement.

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

`datasourcesConfigSchema` additionally rejects duplicate `source.id` values.
Raw MySQL-style conditionals are not used; mapping conditions are data under
`expr.when`.

## Generated JSON Schema

```bash
cd AED
bun run config:schema        # write both registry schema artifacts
bun run config:schema:check  # fail if either checked-in artifact is stale
```

The generator writes:

- `src/server/ingest/config/datasources-config.generated.schema.json`,
- `backend/ingest/datasources-config.schema.json`.

It removes Zod internals (`~standard`), expands `type` arrays into `anyOf` so
Ajv `strict: true` accepts the document, and keeps the schema id stable.
Semantic refinements (including duplicate ids) cannot be represented fully in
JSON Schema; run the Zod parse for those.

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
