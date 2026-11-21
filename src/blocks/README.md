# Blocks

This repo is split into independently owned blocks. One person (or pair) takes
one block, builds it behind the interfaces in `../contracts`, and the blocks are
wired together at the end.

- Overview, rules and integration guide: [`docs/BLOCKS.md`](../../docs/BLOCKS.md)
- Mark-off checklist: [`docs/BLOCKS-CHECKLIST.md`](../../docs/BLOCKS-CHECKLIST.md)
- dane.gov.pl harvester protocol: [`docs/dane-gov-pl-harvester.md`](../../docs/dane-gov-pl-harvester.md)

## Layout

| Directory | Block | Owner |
| --- | --- | --- |
| `frontend-auth/` | Login / sign-up forms | unassigned |
| `frontend-map/` | AED map | unassigned |
| `backend-auth/` | Sessions, roles, guards | unassigned |
| `backend-ingest/` | Fetching raw data from sources | unassigned |
| `backend-normalize/` | Mapping raw data to `AedRecord` | unassigned |
| `backend-store/` | Drizzle schema, persistence, queries | unassigned |
| `backend-publish/` | dane.gov.pl feed + resource endpoints | unassigned |
| `contracts/` | Shared types and interfaces | reviewed by everyone |

Nothing here is wired into the app yet: importing a block only gives you types
and a stub that throws `not implemented`.
