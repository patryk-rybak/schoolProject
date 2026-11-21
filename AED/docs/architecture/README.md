# Backend architecture: storage and ingestion

Status: phase-1 design package · Owner lane: `storage-pipeline`

These documents define how AED data is stored, ingested, scheduled, and exposed
to the other backend lanes. They refine the model in
[`../aed-data-sources-common-schema.md`](../aed-data-sources-common-schema.md)
and are the integration contract for the connector, dedup, lifecycle, and ops
lanes.

| Document | Covers |
| --- | --- |
| [persistence.md](./persistence.md) | tables, keys, indexes, Drizzle mapping, migrations, retention |
| [ingestion.md](./ingestion.md) | stage graph, cross-lane types, idempotency, absence, replay |
| [operations.md](./operations.md) | scheduling, CLI commands, secrets, retries, locks, runbook |
| [modules.md](./modules.md) | directory layout, dependency rules, per-lane hand-offs, test plan |

## Decisions that other lanes must follow

1. **Key identity.** `UNIQUE (source_id, source_record_id)` is the idempotency
   anchor. `aed_alias` maps that pair to one canonical `aed.id`; the alias
   primary key is `(source_id, source_record_id)`.
2. **Raw and canonical are separate.** Connectors write `source_record` only.
   The merge engine is the only writer of `aed`, `facility`, `operator`,
   `observation`, and `field_provenance`.
3. **Snapshots are files; SQLite stores metadata.** Raw bodies live in
   `AED_SNAPSHOT_DIR` under content-addressed names. The database keeps hashes,
   paths, and run metadata.
4. **Times are UTC epoch milliseconds.** ISO strings appear only at API,
   export, and log boundaries.
5. **Absence is explicit and safe.** Only a complete snapshot may advance
   `missing_streak`; a failed or partial run never removes records. The
   lifecycle lane decides canonical `removed`.
6. **Runs are idempotent.** `UNIQUE (source_id, run_key)` plus a partial unique
   index on `status = 'running'` provide scheduler dedupe and a cross-process
   lock. A stale lock is reaped, not waited on forever.
7. **Secrets are env-only.** `source.secret_env` stores a variable name. No
   secret value enters the database, snapshots, logs, or JSON output.
8. **Every stage is replayable.** Stored documents plus connector and
   normalizer versions reproduce candidates. Replaying an unchanged document
   must produce zero new canonical rows and observations.
9. **Sources are config, not code.** One validated YAML per source selects a
   generic connector family (`file_static`, `http_json`, ...) and a whitelisted
   mapping DSL. The exact YAML and hash are stored in `source_config` for every
   historical run.
10. **Drift quarantines, it does not publish.** Schema/volume/quality review
    signals store the new snapshot but leave the previous public projection
    live until an operator accepts the baseline.

## Contract entry points

| Lane | Must provide | Must consume |
| --- | --- | --- |
| connector-config | YAML per source, JSON Schema, generic `Connector` families, stable ids | `SourceConfig`/`ConnectorResult`, `source` + `source_config`, snapshot writer |
| dedup-merge | `matchCandidate`, scoring, precedence | `MatchInput`/`MatchDecision`, `aed_alias`, merge helper |
| lifecycle-cleansing | validation reason codes, status transitions, confidence | `ValidationResult`, `record_candidate`, `missing_streak` |
| ops-ui-api | auth guard, routes, pagination, UI | `AedListItem`, `AedDetail`, `IngestStatus` queries |
| gov-api/export | feed/export generator | canonical read queries, license/attribution fields |

## Phased delivery

| Phase | Scope | Exit criterion |
| --- | --- | --- |
| 1 | this design package | lanes agree on table/command/type names |
| 2 | M1 schema + migration runner + primitives | empty DB migrates, parser/hash tests pass |
| 3 | one connector end to end (OpenAEDMap) | second run reports all unchanged |
| 4 | normalize + canonical write + map read | first points render from the database |
| 5 | second connector (Przemyśl) + dedup aliases | same device not duplicated across sources |
| 6 | lifecycle + CSV connectors + ops commands | absence, retries, and status are covered by tests |
| 7 | export/gov-api | deterministic export hash and license fields |

## Non-goals for this lane

- Choosing final dedup thresholds, field precedence, or verification expiry
  rules; those belong to the dedup and lifecycle lanes. This package defines the
  storage inputs and atomic guarantees they need.
- The public API route shapes and UI; those belong to the ops lane, using the
  read models in `modules.md`.
- The dane.gov.pl XML feed generator; that belongs to the gov/export lane, using
  the canonical export query.
