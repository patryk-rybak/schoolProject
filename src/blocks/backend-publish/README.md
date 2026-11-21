# backend-publish — the dane.gov.pl integration

## Scope

Producing exactly what the government portal's harvester consumes:

- `GET /harvester/feed.xml` — valid `urn:otwarte-dane:harvester:1.13`
- `GET /harvester/feed.md5` — MD5 of those exact bytes
- `GET /data/aed.csv`, `GET /data/aed.geojson` — machine-readable resources

Full wire protocol, extracted from the portal source: **`docs/dane-gov-pl-harvester.md`**.

## Owns

- `src/blocks/backend-publish/**`
- Route files the owner adds: `src/routes/harvester/feed[.]xml.ts`,
  `src/routes/harvester/feed[.]md5.ts`, `src/routes/data/aed[.]csv.ts`,
  `src/routes/data/aed[.]geojson.ts`

## Public API

```ts
import { createPublishService } from "#/blocks/backend-publish";
```

`buildFeed()` returns `{ xml, md5, generatedAt, dataset, resources }`.
`buildCsv()` / `buildGeoJson()` return the resource payloads.

## Non-negotiable details

- The checksum URL is `<feed-url minus ".xml"> + ".md5"` — e.g.
  `https://host/harvester/feed.xml` → `https://host/harvester/feed.md5`.
- `HEAD` must answer 200 with `Content-Type: application/xml; charset=utf-8`.
- The server must send the **same bytes** to the harvester and the checksum
  endpoint; never regenerate with a timestamp between requests (build once,
  cache, version).
- Identity is `extIdent`, max 36 chars. Never randomise it.
- Feeds are **full snapshots**: anything missing is deleted by the portal.
- Only HTTPS resource URLs (XSD pattern `https://.*`).

## Done when

- [ ] Generated feed validates against the official XSD in CI
- [ ] `feed.md5` matches the served XML byte for byte
- [ ] `extIdent`s stable across runs and ≤ 36 chars
- [ ] CSV/GeoJSON served with correct `Content-Type`
- [ ] End-to-end import into the local dane.gov.pl instance succeeds and mirrors
      the files (`availability=local`)
- [ ] Deployed over public HTTPS (the portal cannot reach localhost)
- [ ] Screenshots of the imported dataset in the portal admin + API
