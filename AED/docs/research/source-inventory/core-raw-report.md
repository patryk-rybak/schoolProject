# Core raw snapshot verification: `data/core/raw/`

- **Date:** 2026-11-21 (verification window ~21:04-21:12 UTC)
- **Scope:** all 11 active source configs in `backend/ingest/sources/*.json`, snapshots under `data/core/raw/`
- **Mode:** read-only verification. No configs, raw files, schema, UI, or `package.json` were modified.
- **Verdict:** **10 raw snapshots + 10 sidecar metas are consistent; 1 source (`warszawa`) has a documented blocked meta and no raw body.** No missing snapshot. Two minor, non-blocking items were flagged: inaccurate BOM wording in the two CSV metas and the expected Marki review row.

## 1. Method

For every config the verifier independently:

1. Recomputed the SHA-256 and byte length of the raw file and compared both with `<id>.meta.json`.
2. Checked HTTP status and content type plausibility for the configured parser.
3. Parsed KML as text, counted `<Placemark>` / `<Point>`, checked tag balance, the document name declared in `parse.kml.document_name_must_match`, and parsed every `<coordinates>` triplet against `validate.coords.bbox`.
4. Parsed CSV with the config's encoding, delimiter, quote, `trim_headers`, and `unwrap_outer_quotes` / `repair_double_quotes` flags; compared the header with `drift.baseline.schema_fields`, row width, row count, numeric coordinates, and bbox behavior.
5. Parsed JSON/GeoJSON and resolved `records.path` (`/rows`, `/features`, `$`); compared record counts with the meta, pagination totals, column lists, coordinate fields, and OSM identifiers.
6. Compared `meta.license_id`, `config.source.license.id`, and `config.publish.license_id`.
7. Checked that a blocked meta has a non-empty reason, no raw file reference, `bytes=0`, `sha256=null`, and no orphan or unaccounted raw file.

Snapshot naming is `<source_id>.<kml|csv|json|geojson>` plus `<source_id>.meta.json`. A blocked source has only `<source_id>.meta.json`.

## 2. Totals

| Metric | Value |
| --- | ---: |
| Active configs | 11 |
| Configs with raw body + meta | 10 |
| Configs with documented blocked meta | 1 (`warszawa`) |
| Meta files present | 11 |
| Orphan raw files | 0 |
| Raw bytes on disk | 7,351,767 |
| Tabular records (CSV + JSON/GeoJSON) | 18,353 |
| KML placemarks | 401 |
| KML point geometries | 401 |
| Records + placemarks | 18,754 |
| SHA-256 mismatches | 0 |
| Byte-count mismatches | 0 |
| Content-type mismatches | 0 |
| Licence mismatches | 0 |
| Parse failures | 0 |
| Missing snapshots | 0 |

Per family:

| Family / parser | Configs | Raw files | Bytes | Records | Placemarks |
| --- | ---: | ---: | ---: | ---: | ---: |
| `google_my_maps_kml` / `kml` | 6 | 6 | 157,209 | 0 | 401 |
| `file_static` / `csv` | 2 | 2 | 3,795 | 29 | 0 |
| `file_static` / `geojson` | 1 | 1 | 7,138,131 | 18,303 | 0 |
| `http_json` / `json` | 2 | 1 | 52,632 | 21 | 0 |
| **Total** | **11** | **10** | **7,351,767** | **18,353** | **401** |

`warszawa` contributes 0 bytes and 0 records because it is blocked; its configured `publish.license_id` is still counted in the licence check.

## 3. Source-by-source result

`enabled` below is the registry switch in the config, not a fetch gate. The fetch workers captured a snapshot for every config that could be fetched, including configs currently disabled for legal/publication reasons.

| Source | Config `enabled` | Parser | Raw artifact | Bytes | Count | HTTP | Content type | Licence | Result |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `belchatow` | false | `kml` | `belchatow.kml` | 22,746 | 32 placemarks | 200 | `text/xml; charset=utf-8` | `NOASSERTION` | pass |
| `krosno` | true | `csv` | `krosno.csv` | 2,787 | 21 rows | 200 | `application/octet-stream` | `CC0-1.0` | pass, BOM note |
| `lodz` | false | `kml` | `lodz.kml` | 59,519 | 136 placemarks | 200 | `text/xml; charset=utf-8` | `NOASSERTION` | pass |
| `marki` | true | `csv` | `marki.csv` | 1,008 | 8 rows | 200 | `application/octet-stream` | `CC-BY-4.0` | pass, expected review row |
| `olsztyn` | false | `kml` | `olsztyn.kml` | 13,820 | 43 placemarks | 200 | `text/xml; charset=utf-8` | `NOASSERTION` | pass |
| `openaedmap` | true | `geojson` | `openaedmap.geojson` | 7,138,131 | 18,303 features | 200 | `application/geo+json; charset=utf-8` | `ODbL-1.0` | pass, drift +5 |
| `pawlowice` | false | `kml` | `pawlowice.kml` | 5,269 | 12 placemarks | 200 | `text/xml; charset=utf-8` | `NOASSERTION` | pass |
| `przemysl` | true | `json` | `przemysl.json` | 52,632 | 21 rows | 200 | `application/json; charset=UTF-8` | `CC-BY-4.0` | pass |
| `tczew` | false | `kml` | `tczew.kml` | 4,836 | 13 placemarks | 200 | `text/xml; charset=utf-8` | `NOASSERTION` | pass |
| `warszawa` | false | `json` | none (blocked) | 0 | 0 | none | none | `CC-BY-4.0` | documented block |
| `zielona-gora` | false | `kml` | `zielona-gora.kml` | 51,019 | 165 placemarks | 200 | `text/xml; charset=utf-8` | `NOASSERTION` | pass |

### 3.1 Integrity and licence checks

Every non-blocked snapshot passed all of these: `sha256` recomputation, `bytes`, `raw_file` path, `source_id`, `config_path`, `fetched_at`, HTTP 200, content type plausibility, and licence parity (`meta.license_id == source.license.id == publish.license_id`).

Full hashes:

| Source | SHA-256 (recomputed and matched) |
| --- | --- |
| `belchatow` | `15cd97b98aedc4968357d50b391463aad61654a7bcfad3af81f54938887df188` |
| `krosno` | `bfd98b17099e294174f35ce3fdc9eb617bdf394ba8ebe148ea840419fe2f2370` |
| `lodz` | `418fa25a54ebc8f33d37bfd9781e34632421b200169458a943473b8ff0eebfba` |
| `marki` | `d42a91e47d3a89f9e2937aaaafe31c7736306c456967ae525d994a1c3743be05` |
| `olsztyn` | `19778c70b62d8547724bc42e6a3a9b402c39590930454e57b0140a8466cfbaea` |
| `openaedmap` | `2e3f991588b90ec93993d6dcb30f29c88c5a435323b0991a3db08aa3129d6126` |
| `pawlowice` | `6784ea9fc186fdf4e70c0e4a06f5ca016f8626449646646828759f26be367703` |
| `przemysl` | `3a25bb9db2eb52463066be88ca06cdc227802d6f284847630f60d1bdb083f979` |
| `tczew` | `99f7ad12fe8ed6e72500cadfc7920fdaf2605042687c7738224d3ef20c5c1ac9` |
| `zielona-gora` | `554197a3dc55090764029dadadd15182cc12a2f97fc11b7a7879d3102cd1cc9b` |

Licence distribution: `NOASSERTION` 6 (all KML), `CC-BY-4.0` 3 (`przemysl`, `marki`, `warszawa`), `CC0-1.0` 1 (`krosno`), `ODbL-1.0` 1 (`openaedmap`).

### 3.2 KML evidence

| Source | Placemarks | Points | Meta placemarks | Document name (matches config) | Coordinates in PL bbox |
| --- | ---: | ---: | ---: | --- | ---: |
| `belchatow` | 32 | 32 | 32 | `Wykaz defibrylatorów AED na terenie Bełchatowa` | 32/32 |
| `lodz` | 136 | 136 | 136 | `defibrylatory AED` | 136/136 |
| `olsztyn` | 43 | 43 | 43 | `Mapa ogólnodostępnych defibrylatorów AED w Olsztynie` | 43/43 |
| `pawlowice` | 12 | 12 | 12 | `Defibrylatory AED - Gmina Pawłowice` | 12/12 |
| `tczew` | 13 | 13 | 13 | `AED Tczew` | 13/13 |
| `zielona-gora` | 165 | 165 | 165 | `AED w Zielonej Górze` | 165/165 |

All six are well-formed XML (`<?xml ...?>`, `<kml>` root, closing `</kml>`), all placemarks balance, all are Point-only, and every placemark count equals the config baseline (32, 136, 43, 12, 13, 165).

### 3.3 CSV evidence

| Source | Raw header (after config trim) | Data rows | Meta rows | Config baseline | Coordinate axis per config | Bbox |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `krosno` | `Długość geograficzna`, `Szerokość geograficzna`, `Nazwa`, `Lokalizacja`, `Adres`, `Numer Id` | 21 | 21 | 21 | lat <- `Szerokość geograficzna`, lon <- `Długość geograficzna` | 21/21 in PL bbox |
| `marki` | `Długość geograficzna`, `Szerokość geograficzna`, `Nazwa`, `Lokalizacja`, `Adres`, `Numer Id` | 8 | 8 | 8 | lat <- `Długość geograficzna`, lon <- `Szerokość geograficzna` (config quirk) | 7/8 in Marki bbox |

Both headers match `drift.baseline.schema_fields` exactly, all data rows have 6 fields, and all coordinates are numeric. The Marki axis swap is deliberate in the config because the source declares `lon, lat` in the header but stores `lat, lon` in 7 of 8 rows.

### 3.4 JSON / GeoJSON evidence

| Source | `records.path` | Actual array | Meta | Additional checks |
| --- | --- | ---: | ---: | --- |
| `openaedmap` | `/features` | 18,303 features | 18,303 | `FeatureCollection`; 18,303/18,303 Point; all coordinate pairs numeric and in PL bbox; all features have `@osm_type` and `@osm_id` |
| `przemysl` | `/rows` | 21 rows | 21 | `/total_rows=21`, single page with `per_page=100`; 19 columns; all config baseline fields present; all rows numeric `latitude`/`longitude` and in PL bbox; 21/21 unique `id` |
| `warszawa` | `$` (blocked) | not fetched | null | no raw body, no parse attempted |

## 4. Blockers and inconsistencies

### 4.1 Blocked source (documented, not a snapshot defect)

**`warszawa`** has no raw snapshot because `WARSZAWA_API_TOKEN` is absent from the environment and `.env.local`. The meta records `status: "blocked"`, `raw_file: null`, `sha256: null`, `bytes: 0`, `http_status: null`, and a reason naming the missing env var. No `warszawa.json` file exists. This matches the config's `fetch.auth` contract and the existing `publish.enabled: false` gate. The source must be retried after the token is supplied.

### 4.2 Minor metadata inconsistency: BOM claim

`krosno.meta.json` and `marki.meta.json` both say the payload was parsed as "UTF-8 with BOM (utf-8-sig)", but neither saved body starts with the UTF-8 BOM (`EF BB BF`):

- `krosno.csv` starts `44 C5 82 ...` = `Długość...`
- `marki.csv` starts `22 44 C5 82 ...` = `"Długość...`

The bytes and SHA-256 in the metas match the files, so the snapshots themselves are internally consistent. The configs use `encoding: utf-8-sig`, which decodes both BOM and non-BOM UTF-8, and both headers/rows parse correctly. This is a wording/observation error in `parse_notes`, not a data-loss or parse blocker. It should be corrected the next time the metas are regenerated.

### 4.3 Expected review row in Marki

`marki.csv` row `Numer Id=7` has Krosno coordinates (about `21.7203, 49.7188`), outside the narrow Marki bbox `[21.05, 52.28, 21.18, 52.38]`. This is 1 of 8 rows (12.5%), within the configured `max_coord_invalid_ratio: 0.13`, and the config routes it to `review` rather than rejecting the source. The snapshot correctly preserves the upstream defect. No action beyond the existing review queue.

### 4.4 OpenAEDMap drift

The snapshot has 18,303 features versus the config baseline of 18,298: delta `+5` (`+0.03%`), well inside `max_delta_ratio: 0.5` and above `min_records: 10000`. The meta records the observed count and explicitly notes the baseline delta. Also, 1,096 of 18,303 features (5.99%) lack a `name` and fall back to `defibrillator:location:*` or `operator`, within the configured `max_null_ratio.name: 0.5`. Both are normal live-data drift, not snapshot defects.

### 4.5 Content-type note

`krosno` and `marki` are served by `api.dane.gov.pl` as `application/octet-stream` rather than `text/csv`. The bodies are valid UTF-8 CSV with the expected headers and row counts, so the content type is plausible for this host and does not block parsing. KML, JSON, and GeoJSON content types match their payloads directly.

### 4.6 Non-blocking observations

- `przemysl` `final_url` adds pagination query parameters (`?page=1&per_page=100`) to the configured base URL. The base URL matches, `total_rows=21` equals the 21 returned rows, and single-page completeness is confirmed.
- The six KML sources carry `NOASSERTION` in both the config and meta. That is a **legal/publication blocker** already reflected by `source.enabled: false` and `publish.enabled: false`, not a fetch or integrity failure.
- No orphan raw files and no missing meta files were found.

## 5. Conclusion

The core raw layer is complete for every fetchable active source:

- **10/10 fetched snapshots** have a raw body and matching meta; SHA-256, bytes, content type, KML placemark counts, CSV headers, JSON record paths, and licences all agree.
- **1/11 sources (`warszawa`)** is correctly represented by a documented blocked meta with no fabricated raw body.
- **No snapshot is missing and no integrity check failed.**
- Remaining items are one expected Marki review row, benign OpenAEDMap volume drift (+5), and a BOM wording error in the two CSV metas that does not affect decoding or parsing.
