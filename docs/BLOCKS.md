# Splitting the work into blocks

The project is one app, but it is built as seven independent blocks plus a
shared contract. Each block can be developed, reviewed and demoed on its own;
the app works only when all of them are plugged in.

```
                    ┌──────────────────────────────┐
                    │          contracts           │
                    │  AedRecord · SourceScope ·   │
                    │  RawBatch · FeedArtifact …   │
                    └──────────────┬───────────────┘
                                   │ (everyone depends on this)
        ┌──────────────┬───────────┴───────────┬──────────────┐
        │              │                       │              │
 ┌──────▼─────┐ ┌──────▼──────┐          ┌─────▼──────┐ ┌─────▼──────┐
 │backend-    │ │backend-     │          │backend-    │ │backend-    │
 │ingest      │ │normalize    │          │store       │ │publish     │
 └──────┬─────┘ └──────┬──────┘          └─────┬──────┘ └─────┬──────┘
        │              │                       │              │
        └──────► RawBatch ──► AedRecord ───────┘              │
                                                             ▼
                                                    dane.gov.pl harvester
        ┌──────────────┐        ┌──────────────┐
        │ frontend-map │◄───────│backend-auth  │
        └──────────────┘  AedRecord[]  ▲
        ┌──────────────┐               │
        │frontend-auth │───────────────┘
        └──────────────┘
```

## Blocks

| Block | Responsibility | Depends on |
| --- | --- | --- |
| `contracts` | Shared types only | — |
| `backend-ingest` | Fetch raw data, document source scope | contracts |
| `backend-normalize` | Raw → `AedRecord`, dedup, validation | contracts, ingest (types) |
| `backend-store` | Drizzle schema, upsert, queries | contracts, `#/db` |
| `backend-publish` | dane.gov.pl feed + CSV/GeoJSON | contracts, store |
| `backend-auth` | Sessions, roles, guards | contracts, `#/db` |
| `frontend-map` | Map UI | contracts, base map |
| `frontend-auth` | Login / sign-up forms | contracts, auth-client |

Checklist with owner slots: [`BLOCKS-CHECKLIST.md`](./BLOCKS-CHECKLIST.md).
Harvester protocol: [`dane-gov-pl-harvester.md`](./dane-gov-pl-harvester.md).

## Golden rules

1. **Import only through `index.ts`.** `#/blocks/backend-store` is fine;
   `#/blocks/backend-store/adapters/sqlite` is not. Internals are private.
2. **One-way dependencies.** Frontend blocks never import backend blocks
   directly — they get data through routes/server functions. Backend blocks
   never import frontend blocks.
3. **No contract edits inside feature PRs.** Changing `src/blocks/contracts/**`
   is its own PR, reviewed by every affected block owner.
4. **Keep `main` green.** `bun run verify` must pass before a PR is merged.
5. **Placeholders stay inert.** A block that is not finished must not be wired
   into a route. The stubs throw `not implemented` on purpose.
6. **Don't touch working infrastructure.** `src/db/index.ts` (WAL),
   `/api/pmtiles`, `/api/maplibre-worker`, `src/routes/api/auth/$` and
   `src/components/ui/**` are shared; extend, don't rewrite.

## How to use a block from another block

```ts
// inside backend-publish
import type { AedRepository } from "#/blocks/backend-store";
import type { AedRecord } from "#/blocks/contracts";
```

`backend-store` also exports a factory:

```ts
import { createAedRepository } from "#/blocks/backend-store";
const repository = createAedRepository();
```

The rule is simple: **consume the interface, never the implementation.** If a
block needs something that is not exported yet, request it in the contract PR
or in the block's README — don't reach into its folder.

## Local workflow

```bash
bun install
bun run dev        # http://localhost:3000
bun run verify     # typecheck + lint, must pass before a PR
```

Tests run with `bun test` once a block adds them.

## Branch and PR conventions

- Branch: `<type>/<short-description>` (`feat/map-clustering`,
  `feat/ingest-warszawa`).
- Commits: Conventional Commits (`feat(ingest): add Warszawa source`).
- `main` is protected; `run-tests` must be green.
- PR description: which block, what changed in its public API, and screenshots
  for UI work.

## Definition of done for every block

- [ ] Public API implemented behind the contract, no stubs left in the path used
      by the app
- [ ] `bun run verify` passes
- [ ] Tests cover the happy path and at least one failure path
- [ ] README updated: scope, API, dependencies, limitations
- [ ] Checkbox in [`BLOCKS-CHECKLIST.md`](./BLOCKS-CHECKLIST.md) ticked
- [ ] Demo evidence (screenshot, sample output or recorded run)
