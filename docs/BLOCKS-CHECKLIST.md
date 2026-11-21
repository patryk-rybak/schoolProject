# Block checklist

Tick items off in the PR that completes them. Put your name in the **Owner**
column when you claim a block so two people don't build the same thing.

Legend: `☐` todo · `◐` in progress · `☑` done

## Status board

| Block | Owner | Status | PR |
| --- | --- | --- | --- |
| `contracts` | — | ☑ scaffolded | # |
| `backend-ingest` | — | ☐ todo | |
| `backend-normalize` | — | ☐ todo | |
| `backend-store` | — | ☐ todo | |
| `backend-publish` | — | ☐ todo | |
| `backend-auth` | — | ☐ todo | |
| `frontend-map` | — | ☐ todo | |
| `frontend-auth` | — | ☐ todo | |

---

## `backend-ingest` — fetch data from sources

- [ ] Three real sources registered, each with a full `SourceScope`
- [ ] HTTP client: timeout, retry with backoff, honest User-Agent
- [ ] Stable external identifiers
- [ ] Raw snapshots persisted for offline re-normalisation
- [ ] Recorded fixtures; tests never touch the network
- [ ] Per-source failure isolation and reporting
- [ ] Source terms of use / robots.txt respected

## `backend-normalize` — one common format

- [ ] One `Standardizer` per registered source
- [ ] Coordinates validated (Poland bounds), invalid records rejected with a code
- [ ] Access and status mapped per source and documented
- [ ] TERYT resolved to at least city/county
- [ ] Cross-source deduplication with documented rule + test
- [ ] Deterministic ids (`<sourceId>:<externalId>`), no randomness
- [ ] Rejection report totals match input

## `backend-store` — aggregation and persistence

- [ ] Drizzle tables: `aed_records`, `sources`, `sync_runs`
- [ ] Generated migration committed
- [ ] Idempotent upsert with inserted/updated/unchanged counts
- [ ] `list` with bbox/source/pagination + tests
- [ ] `nearest` (haversine) + tests
- [ ] Indexes on `(source_id, external_id)`, `lat`, `lon`
- [ ] Fresh `bun run db:push` works; WAL config untouched

## `backend-publish` — dane.gov.pl integration

- [ ] Feed generator for `urn:otwarte-dane:harvester:1.13`
- [ ] `/harvester/feed.xml` (GET + HEAD, correct Content-Type)
- [ ] `/harvester/feed.md5` matching the served XML byte for byte
- [ ] CSV and GeoJSON endpoints with correct content types
- [ ] Stable `extIdent` ≤ 36 chars, full snapshot semantics
- [ ] XSD validation in CI
- [ ] Successful import into the local dane.gov.pl instance
- [ ] Deployed on public HTTPS
- [ ] Screenshots of the imported dataset and mirrored files

## `backend-auth` — sessions and roles

- [ ] Email + password sign-in works end to end
- [ ] Session cookie HttpOnly; expiry handled
- [ ] Roles `admin` / `editor` / `custodian` enforced server-side
- [ ] 401 vs 403 behaviour documented and tested
- [ ] Rate limiting on login
- [ ] Audit log for privileged actions
- [ ] Existing `/api/auth/$` route still works

## `frontend-map` — AED map

- [ ] Markers render from `AedRecord[]`, styled by status/access
- [ ] Clustering at 10 000+ records without jank
- [ ] Detail panel: name, address, access, status, source, licence
- [ ] "Nearest to me" with permission-denied fallback
- [ ] Accessible list/table alternative
- [ ] Responsive (360×640 → desktop)
- [ ] Desktop + mobile screenshots

## `frontend-auth` — login and sign-up forms

- [ ] Login and registration wired to the real session
- [ ] Polish validation messages, server errors surfaced
- [ ] Loading/disabled states, no double submit
- [ ] WCAG 2.2 AA: labels, focus, contrast, `aria-live` errors, 200% zoom
- [ ] Responsive from 320 px
- [ ] Component tests for validation and error rendering

---

## Integration milestones

- [ ] **M1 — pipeline:** ingest → normalize → store runs end to end and is
      idempotent
- [ ] **M2 — map:** stored records visible on the map with source attribution
- [ ] **M3 — government feed:** local dane.gov.pl imports our feed and mirrors
      the resources
- [ ] **M4 — auth:** only authenticated editors can modify data; public map
      stays public
- [ ] **M5 — quality:** WCAG 2.2 AA audit + responsive check on real devices
- [ ] **M6 — submission:** XLSX schema, presentation, logo set, brand book

## Project deliverables (from the challenge rules)

- [ ] Detailed project description and title
- [ ] Presentation, ≥ 5 slides with technical proof (screenshots)
- [ ] Functionality walkthrough (user steps)
- [ ] Limitations list
- [ ] Working prototype
- [ ] `xlsx` with the standardised data scope
- [ ] Source code (this repo)
- [ ] Logo: `.jpg`, `.png`, `.pdf` + an open format
- [ ] Brand book `.pdf` (palette, clear space, min size, forbidden uses, 3–5
      sentence concept)
- [ ] AI usage declaration
