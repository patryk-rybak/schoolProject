# contracts — the shared language of all blocks

These files define the only types blocks exchange. They are deliberately
data-only: no runtime code, no dependencies, no side effects.

| File | Contents |
| --- | --- |
| `domain.ts` | `AedRecord`, `SourceScope`, enums for access/status/verification |
| `ingest.ts` | `RawRecord`, `RawBatch`, `IngestSource`, `IngestRegistry` |
| `normalize.ts` | `Standardizer`, `NormalizationResult`, `NormalizationIssue` |
| `store.ts` | `AedRepository`, `AedQuery`, `SyncRun` |
| `publish.ts` | `FeedArtifact`, `FeedDatasetMeta`, dane.gov.pl enums |
| `auth.ts` | `AuthenticatedUser`, `Role`, `AuthService` |
| `map.ts` | `AedMapProps`, `AedSummary` |

## Changing a contract

1. Open a PR that touches **only** `src/blocks/contracts/**`.
2. Explain in the PR which blocks are affected and how they migrate.
3. Get approval from the owner of every affected block.
4. Merge before the dependent block work, so everyone builds against the same
   version.

Additive changes (new optional field) are cheap. Renames and removed fields are
breaking and need a coordinated update.

## Conventions

- Data fields use `T | null` for "unknown" — not optional properties, not empty
  strings.
- Records are immutable (`readonly`), and ids are strings.
- Timestamps are ISO-8601 strings; dates are `YYYY-MM-DD`.
- No imports from other blocks here; contracts depend on nothing.
