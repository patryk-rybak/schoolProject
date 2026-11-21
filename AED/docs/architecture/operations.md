# Operations design: scheduling, CLI, secrets, retries

Status: design (phase 1) · Owner lane: `storage-pipeline`
Companion docs: [persistence](./persistence.md), [ingestion](./ingestion.md), [modules](./modules.md)

This document covers how ingestion is invoked, authenticated, retried, locked,
observed, and recovered. The CLI is the single entry point; the web process
never owns a long-running ingestion loop.

## 1. Runtime entry points

| Entry point | Purpose | Process model |
| --- | --- | --- |
| `bun scripts/ingest.ts run --due` | run any source whose schedule is due | external cron/systemd timer, every 5 min |
| `bun scripts/ingest.ts run --source <id>` | manual or backfill run | operator shell or CI |
| `bun scripts/ingest.ts worker` | optional single-node scheduler daemon | one process per deployment |
| `bun scripts/ingest.ts replay ...` | offline replay from snapshots | operator shell |
| `bun run db:migrate` | schema migration | deploy step |

Recommended production shape:

```cron
# every 5 minutes; the CLI decides what is due and is idempotent
*/5 * * * * cd /srv/aed && /usr/bin/bun scripts/ingest.ts run --due --json >> /var/log/aed-ingest.log 2>&1
```

For systemd, use a timer with `Persistent=true` so a missed slot runs once after
boot; the idempotent run key prevents duplicates.

`Bun.cron` is available in Bun 1.4 and is acceptable for a single-node
deployment or local development:

```ts
Bun.cron("*/5 * * * *", async () => {
	await runDueSources({ trigger: "schedule" });
});
```

Do not start this loop inside the Nitro request server when more than one
instance can run. Multiple schedulers are harmless for correctness because of
the run key and source lock, but they waste fetches and compete for the SQLite
writer. Pick one owner: external cron, a dedicated worker container, or a single
web instance.

## 2. CLI contract

```bash
bun scripts/ingest.ts <command> [options]
```

`package.json` scripts:

```json
{
	"ingest": "bun scripts/ingest.ts",
	"ingest:due": "bun scripts/ingest.ts run --due",
	"ingest:worker": "bun scripts/ingest.ts worker",
	"db:migrate:runtime": "bun scripts/migrate.ts",
	"db:backup": "bun scripts/db-backup.ts"
}
```

The CLI uses `node:util.parseArgs` or a small hand-written parser. Do not add a
CLI framework dependency for this surface.

### Commands

| Command | Behaviour |
| --- | --- |
| `list` | list registered sources, enabled state, schedule, last success |
| `run --source <id>` | run one source now |
| `run --all` | run every enabled source, default concurrency 2 for fetch |
| `run --due` | run sources whose cron slot is due and not already attempted |
| `run --source <id> --mode full` | ignore cursor and conditional cache |
| `run --source <id> --mode incremental` | use cursor and conditional headers |
| `run --dry-run` | fetch and parse, write nothing (no snapshots, no DB rows) |
| `run --limit <n>` | cap records per document for debugging; never used in production schedules |
| `run --fail-fast` | stop after the first source failure |
| `replay --document <id>` | parse a stored document; no network |
| `replay --run <id>` | replay every document from a run |
| `reprocess --source <id>` | re-normalize stored `source_record` rows |
| `backfill --source <id> --file <path>` | import a local snapshot through the normal path |
| `status [--source <id>]` | recent runs and current source health |
| `errors --run <id>` | bounded errors for a run, grouped by reason code |
| `config validate [--source <id>]` | parse the JSON registry, validate JSON Schema, family/parser matrix, canonical keys |
| `config show --source <id>` | print the active config and `config_sha256` |
| `drift list [--source <id>]` | open `drift_event` rows, grouped by severity |
| `drift accept-baseline --run <id>` | operator approval after a review; requires explicit `--yes` |
| `verify [--source <id>]` | integrity checks: hashes, orphan aliases, duplicates, missing snapshots |
| `prune-snapshots [--dry-run]` | apply snapshot retention |
| `reap-stale [--dry-run]` | mark expired `running` runs as `failed` |
| `worker` | long-running due-source scheduler |

Every command accepts `--json` for machine-readable output. Logs go to stderr;
data goes to stdout. The cron job can therefore redirect stdout to a file and
keep stderr in the service log.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | all requested work succeeded (including `skipped` and `not modified`) |
| `1` | fatal error: migration missing, database unavailable, invalid config |
| `2` | usage error: unknown command or option |
| `3` | partial or quarantined: at least one source failed, was quarantined, or had rejections above guard |
| `4` | lock contention: another run owns the source and `--wait` was not set |
| `5` | verification failed |

`run --all` continues after a source failure and returns `3` at the end. It
reports a per-source summary and only exits `1` when no source could be
attempted at all.

## 3. Scheduling semantics

A source definition has `schedule: { cron, timezone }`. The scheduler computes
the intended slot in the source timezone, converts it to UTC, and derives:

```text
run_key = "schedule:<source_id>:<UTC slot in YYYY-MM-DDTHH:mm>"
```

Rules:

- A due source is one whose most recent intended slot has no `sync_run` with
  that key.
- `run --due` runs at most one slot per source per invocation. Missed slots are
  not replayed automatically; use `run --source` for a backfill.
- DST is handled by computing the slot from the cron in the source timezone and
  normalizing to UTC. Never derive the slot from "now minus interval".
- Jitter: add a deterministic 0–120 s delay derived from `hash(source_id)` so
  many sources do not start on the same minute. Scheduled runs pass the original
  slot to the run key, so jitter does not change idempotency.
- Disabled sources are not scheduled but remain queryable and retain data.
- A source whose config entry fails validation is not scheduled; the run reports
  `failed` with `CONFIG_INVALID` and does not fetch.
- `enabled` is checked at run start and again before merge; an operator can
  disable a source while a long fetch is in progress.

## 4. Locking and crash recovery

The per-source mutex is the partial unique index on `sync_run`:

```sql
CREATE UNIQUE INDEX sync_run_one_active
  ON sync_run(source_id) WHERE status = 'running';
```

Flow:

1. Insert the run with `status = 'running'`, `started_at = now`,
   `lock_expires_at = now + 2 * expected runtime` (default 30 min).
2. If the insert violates the unique index, return `skipped` (exit `0` for that
   source) or exit `4` for an explicit manual run without `--wait`.
3. A long run updates `lock_expires_at` every 60 s (heartbeat) and records its
   stage in `error_message` only on failure; stage progress belongs in logs.
4. On completion, set `status`, `finished_at`, clear `lock_expires_at`.
5. `reap-stale` marks `running` rows whose `lock_expires_at < now` as `failed`
   with `error_code = 'STALE_LOCK'`. Run it at the start of every `run --due`
   invocation. A crashed run never blocks the source forever.
6. A transaction that has not committed leaves no canonical changes. A snapshot
   file without a DB row is pruned by `prune-snapshots`.

Do not use OS file locks as the primary mutex: they are not visible across
containers and are not durable. The database row is the source of truth.

## 5. Secrets

### Storage

- Secret **values** exist only in the process environment.
- `source.secret_env` is derived from `fetch.auth.env` in the config and stores
  the environment variable **name**, for example `AED_WARSZAWA_TOKEN`.
- `.env.local` is loaded by Bun automatically in development. It is ignored by
  git and must never appear in a build artifact.
- Production injects environment variables through the orchestrator's secret
  store (Docker secrets, systemd `EnvironmentFile` with mode `0600`, or the
  hosting platform).
- `source.config_json`, `sync_run`, `source_document.metadata_json`, and all log
  lines must be secret-free. `verify` scans for accidental token-like values in
  source config and document metadata.

### Resolution

```ts
function resolveSecret(name: string | null): string | null {
	if (!name) return null;
	const value = process.env[name];
	if (!value) throw new ConfigError(`missing secret env ${name}`);
	return value;
}
```

The HTTP layer injects the credential into the request and never returns the
header to the connector. The connector receives a prepared `FetchContext`.

### Naming

```text
AED_<SOURCE_ID_UPPER_SNAKE>_TOKEN
AED_<SOURCE_ID_UPPER_SNAKE>_USER
AED_<SOURCE_ID_UPPER_SNAKE>_PASSWORD
AED_SNAPSHOT_DIR
AED_INGEST_CONCURRENCY
AED_INGEST_HTTP_TIMEOUT_MS
AED_INGEST_MAX_BYTES
AED_LOG_LEVEL
```

### Redaction

- Never log `Authorization`, `Cookie`, `Set-Cookie`, API keys, or query
  parameters named `token`, `key`, `apikey`, `access_token`, `password`.
- Redact URLs in logs by replacing query values with `<redacted>`.
- Truncate document bodies from error messages; log the snapshot id and hash
  instead.
- A source that embeds an email address for an individual is redacted at export
  time; public contact fields are organizational only.
- `--json` output goes through the same redactor.

## 6. Retry policy

### Request-level retries

All ingestion requests are HTTP GETs, so retries are safe.

```text
attempts      = 5
base_delay_ms = 500
cap_delay_ms  = 60_000
delay         = min(cap, base * 2^(attempt-1)) * random(0.5, 1.0)
```

Rules:

- Retry `408`, `425`, `429`, `500`, `502`, `503`, `504`, and network/timeout
  errors.
- Honor `Retry-After` when present; if it exceeds the remaining run budget, stop
  and mark `partial` rather than sleeping forever.
- Do not retry `400`, `401`, `403`, `404`, `405`, `410`, `422`, or content-type
  mismatches.
- Each attempt logs `attempt`, `status`, `delay_ms`, and `run_id`; do not log
  response bodies.
- Respect a per-source rate limit (default 2 requests/second, configurable
  lower). A `429` halves the token bucket for the next run and records the
  cooldown.
- Total run budget: 30 minutes for a full national snapshot, 5 minutes for a
  small municipal API. When the budget is exhausted, finish the current record
  batch and mark the run `partial` with `BUDGET_EXHAUSTED`.

### Run-level retries

A failed run is not automatically retried by the same invocation. The next
scheduled slot is the retry. This prevents a broken endpoint from burning the
whole day's budget. A manual `run --source` may be invoked immediately.

### Circuit breaker

- Increment `source.consecutive_failures` on `failed`.
- Reset to 0 on `ok` or `not modified`.
- After 3 consecutive failures, set
  `breaker_open_until = now + 30 min`; `run --due` skips the source with status
  `skipped` and reason `BREAKER_OPEN`.
- Half-open: after the cooldown, allow one run. Success closes the breaker;
  failure reopens it for 2× the previous cooldown, capped at 6 h.
- A `partial` run does not open the breaker, but it does count toward alerts.

## 7. Observability

Structured logs (one JSON object per line) include:

```json
{
	"ts": "2026-11-21T20:00:00.000Z",
	"level": "info",
	"event": "run.finished",
	"run_id": "...",
	"source_id": "osm",
	"status": "ok",
	"duration_ms": 41230,
	"records_seen": 18298,
	"records_unchanged": 18001,
	"records_updated": 297,
	"bytes_fetched": 7453182
}
```

Minimum metrics (exposed by the ops lane, derived from `sync_run` and `source`):

| Metric | Alert |
| --- | --- |
| `aed_ingest_runs_total{source,status}` | any `failed` |
| `aed_ingest_run_duration_seconds` | > 2× baseline |
| `aed_ingest_records_rejected_ratio` | > 0.20 for a run |
| `aed_ingest_source_last_success_age_seconds` | > 2× declared cadence |
| `aed_ingest_breaker_open` | true for > 1 h |
| `aed_ingest_snapshot_bytes` | > 80% of volume |
| `aed_db_bytes` | > 80% of volume |
| `aed_ingest_alias_review_queue` | growing for 7 days |

The ops API/UI lane owns the read endpoint, for example
`GET /api/admin/ingest/status`, protected by the admin role. The storage lane
provides the query functions; it does not create the route.

## 8. Snapshot retention

`prune-snapshots` policy:

- Always keep the latest successful document per source and URL.
- Keep bodies for 90 days; keep metadata indefinitely.
- Keep failed-run bodies for 14 days for debugging.
- Keep any body pinned by a `replay --document` run in the last 30 days.
- Delete only files under `AED_SNAPSHOT_DIR` whose `body_path` has no DB
  reference, plus expired referenced bodies after updating `body_path = null`
  and `body_encoding = 'pruned'`.
- Run with `--dry-run` first; print a summary and total bytes.
- Retention never touches the database rows needed for audit, only large blobs.

Backups:

1. `bun scripts/db-backup.ts` runs `VACUUM INTO 'backups/aed-<timestamp>.db'`
   or the SQLite backup API, then verifies `PRAGMA integrity_check`.
2. Keep 7 daily and 4 weekly backups; encrypt at rest if the environment is
   shared.
3. Snapshot directory is content-addressed; a `rsync --link-dest` incremental is
   sufficient.
4. Test restoration quarterly: restore the DB and snapshots into a temp
   directory, run `verify`, and start the CLI in `--dry-run` mode.

## 9. Security and compliance

- Only configured source hosts are contacted. The HTTP client validates the URL
  scheme (`https` in production), rejects redirects to non-configured hosts
  unless explicitly allowed, and caps redirects and body size. This prevents a
  compromised source from turning ingestion into SSRF.
- Respect `robots.txt` for HTML sources and each portal's terms. Do not scrape
  apps whose terms forbid bulk extraction (SOS DAE, commercial apps).
- Record license id and attribution per source in `source`; exports must carry
  them. ODbL-derived output must remain ODbL.
- Do not store personal data. Redact individual emails and phone numbers from
  source payloads when the source clearly publishes a private contact.
- Admin CLI access is host-level. If an admin HTTP trigger is added, it requires
  an authenticated admin session and CSRF protection; it must enqueue a run,
  not execute it inline in the request.
- The database and snapshot directory contain public data but are still not
  served directly; only the curated API/export is public.

## 10. Runbook

### A source is failing

1. `bun scripts/ingest.ts status --source <id>` and `errors --run <last>`.
2. Check `last_error_code`: auth → rotate secret; 404 → source moved, update
   config; parse/schema → inspect the stored document and fix the connector.
3. If the source is structurally gone, set `enabled = false` in the registry;
   do not delete historical canonical rows.
4. After a fix, run `replay --document <id>` first, then a real run.

### A run is stuck

1. `reap-stale --dry-run` lists expired runs.
2. Run `reap-stale`; then start the source again.
3. If the process is still alive but not heartbeating, terminate it; the
   transaction rolls back and the lock expires.

### A run is quarantined

1. `bun scripts/ingest.ts drift list --source <id>` shows the layer, observed
   value, and baseline.
2. Inspect the stored document and the golden sample; do not edit the database
   to force `ok`.
3. If the change is legitimate, update the registry entry or explicitly run
   `drift accept-baseline --run <id> --yes`; this writes an audit entry.
4. If the source is wrong, keep `enabled = false` and contact the publisher.
5. The previous published projection stays live until a later `ok` run.

### A config change was rejected

1. `config validate --source <id>` prints the failing path and key.
2. Fix the config entry; never edit `source_config` rows by hand.
3. `config show` confirms the new `config_sha256`; the first run compares
   against a golden sample and does not reuse the old incremental cursor.

### The map shows too few records

1. Check the last run status and `records_rejected_ratio`.
2. Inspect `record_candidate` rejected rows for one source.
3. A validation regression is more likely than mass deletion; do not disable
   absence protection.

### Disk pressure

1. `prune-snapshots --dry-run`, then apply.
2. Rotate WAL with a checkpoint; `PRAGMA wal_checkpoint(TRUNCATE)`.
3. Prune old `sync_run` rows only after aggregating counts.
4. Expand the volume before disabling ingestion; missing data is worse than a
   paused source.

## 11. Acceptance checks

1. `run --due` twice in the same minute creates one run and returns `skipped`
   for the second.
2. Killing a run leaves a `running` row that `reap-stale` converts to `failed`;
   the next run succeeds.
3. A 429 with `Retry-After: 2` waits at least 2 seconds and does not exceed the
   configured attempt count.
4. A missing secret env fails only the affected source, with no secret value in
   logs or JSON output.
5. `prune-snapshots --dry-run` reports the same byte total as a subsequent real
   prune with no other changes.
6. `verify` detects a deliberately corrupted snapshot and a dangling alias.
7. `config validate` rejects an unknown canonical key and an invalid
   family/parser pair before any network call.
8. A quarantined run stores records but leaves the published projection
   unchanged until `drift accept-baseline`.
