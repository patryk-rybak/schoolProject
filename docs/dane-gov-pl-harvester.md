# dane.gov.pl harvester protocol

How the government portal pulls data **from us**. Extracted from the portal's
own source (`dane.gov.pl/backend`, release 2.63.0); file references below point
there.

## Sequence

`source_type = "xml"` (`mcod/harvester/models.py`, `mcod/harvester/utils.py`):

```
daily 03:00  harvester_supervisor  (mcod/celeryapp.py)
             └─ per active DataSource where last_import + frequency_in_days <= now
                └─ import_data_task

1. HEAD <feed-url>                  → 200
                                    → Content-Type contains "text/xml" or "application/xml"
2. GET  <feed-url minus .xml>.md5   → body contains a 32-char MD5 hex digest
3. GET  <feed-url>                  → streamed; MD5 compared with step 2
4. root namespace → urn:otwarte-dane:harvester:<version>
5. validate against that version's XSD
6. deserialize → upsert datasets/resources by extIdent → delete stale
7. per resource: availability=local → download + mirror; remote → link only
```

## Hard requirements

| Requirement | Detail |
| --- | --- |
| URL | **must end in `.xml`**, no spaces in the file name |
| Public access | no authentication is supported (`make_request` sends only a User-Agent) |
| TLS | portal calls with `verify=False`, but use a real certificate anyway |
| `HEAD` | must return 200 and an XML content type |
| Checksum | `https://host/path/feed.xml` → `https://host/path/feed.md5` |
| Feed | valid XML, namespace `urn:otwarte-dane:harvester:1.13`, schema-valid |
| Resource URLs | must match `https://.*` (XSD pattern) |
| Timeout | 180 s per HTTP request |

Versions 1.0-rc1 and 1.1 … 1.13 are accepted
(`HARVESTER_XML_VERSION_TO_SCHEMA_PATH`). Use **1.13**.

## Feed structure

Root: `<ns2:datasets xmlns:ns2="urn:otwarte-dane:harvester:1.13">`, then one or more
`<dataset status="published">`.

### Dataset

| Element | Cardinality | Notes |
| --- | --- | --- |
| `extIdent` | 1 | 1–36 chars, stable upsert key |
| `title/polish` | 1 | ≤ 300 chars |
| `title/english` | 0..1 | ≤ 300 |
| `description/polish` | 1 | ≤ 1000 |
| `description/english` | 0..1 | ≤ 1000 |
| `url` | 0..1 | ≤ 1000 |
| `updateFrequency` | 1 | `daily weekly monthly quarterly everyHalfYear yearly irregular notPlanned` |
| `categories/category` | 1..n | `AGRI EDUC ENVI ENER TRAN TECH ECON SOCI HEAL GOVE REGI JUST INTR` |
| `resources/resource` | 1..n | see below |
| `tags/tag` | 1..n | `lang="pl"` / `lang="en"` |
| `conditions/*` | 0..1 | licence block, see below |
| `lastUpdateDate` | 0..1 | `xs:dateTime` |
| `hasDynamicData`, `hasHighValueData`, `hasResearchData`, `hasHighValueDataFromEuropeanCommissionList` | 0..1 | booleans |
| `supplements/supplement` | 0..n | extra documents |

`conditions` accepts: `source`, `modification` (booleans),
`responsibilities` (≤4000), `dbOrCopyrighted` (≤4000),
`dbOrCopyrightedLicenseChosen` — one of `CC0 1.0`, `CC BY 4.0`, `CC BY-SA 4.0`,
`CC BY-NC 4.0`, `CC BY-NC-SA 4.0`, `CC BY-ND 4.0`, `CC BY-NC-ND 4.0`.

### Resource

| Element | Cardinality | Notes |
| --- | --- | --- |
| `extIdent` | 1 | 1–36 chars, stable |
| `url` | 1 | **https://** only, ≤ 2000 |
| `title/polish` | 1 | |
| `description/polish` | 1 | |
| `availability` | 0..1 | `local` (portal mirrors, default) / `remote` (link only) |
| `dataDate` | 0..1 | `xs:date` |
| `lastUpdateDate` | 0..1 | `xs:dateTime` |
| `regions/terytIdent` | 0..20 | 2–7 chars: voivodeship / county / municipality |
| `containsProtectedData` | 0..1 | default `false` |
| `hasDynamicData` | 0..1 | |
| `specialSigns`, `supplements` | 0..n | optional |

There is **no `format` element** — the portal detects the format from the HTTP
`Content-Type` and/or file extension. Serve honest headers
(`text/csv; charset=utf-8`, `application/geo+json`).

## Minimal valid example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ns2:datasets xmlns:ns2="urn:otwarte-dane:harvester:1.13">
  <dataset status="published">
    <extIdent>aed-pl-open</extIdent>
    <title>
      <polish>Ogólnopolski rejestr defibrylatorów AED</polish>
      <english>National AED registry</english>
    </title>
    <description>
      <polish>Zintegrowany rejestr AED z wielu źródeł wraz z zakresem danych.</polish>
    </description>
    <url>https://aed.example.org/dataset</url>
    <updateFrequency>daily</updateFrequency>
    <hasDynamicData>true</hasDynamicData>
    <hasHighValueData>true</hasHighValueData>
    <hasResearchData>false</hasResearchData>
    <categories>
      <category>HEAL</category>
      <category>REGI</category>
    </categories>
    <conditions>
      <dbOrCopyrighted>Dane na licencji CC0 1.0</dbOrCopyrighted>
      <dbOrCopyrightedLicenseChosen>CC0 1.0</dbOrCopyrightedLicenseChosen>
    </conditions>
    <resources>
      <resource status="published">
        <extIdent>aed-pl-open-csv</extIdent>
        <url>https://aed.example.org/data/aed.csv</url>
        <title>
          <polish>Rejestr AED – CSV</polish>
        </title>
        <description>
          <polish>Pełny rejestr w formacie CSV (UTF-8).</polish>
        </description>
        <availability>local</availability>
        <dataDate>2026-11-21</dataDate>
        <lastUpdateDate>2026-11-21T06:00:00Z</lastUpdateDate>
        <hasDynamicData>true</hasDynamicData>
        <containsProtectedData>false</containsProtectedData>
        <regions>
          <terytIdent>14</terytIdent>
        </regions>
      </resource>
    </resources>
    <tags>
      <tag lang="pl">AED</tag>
      <tag lang="pl">defibrylator</tag>
    </tags>
    <lastUpdateDate>2026-11-21T06:00:00Z</lastUpdateDate>
  </dataset>
</ns2:datasets>
```

## Update semantics

- `extIdent` is the **only** identity. Reuse it forever; never randomise.
- Each import is a **full snapshot** — records missing from the feed are deleted
  from the portal (`delete_stale_datasets`, `delete_stale_resources`).
- A failed import (timeout, bad MD5, invalid XSD) leaves the previous data
  untouched.
- One feed belongs to **one institution** — the organization is taken from the
  DataSource configuration, not from the XML.

## Local end-to-end test

The portal runs locally (see `dane.gov.pl/RUNNING.md`). Register our feed as a
data source and force an import:

1. `https://admin.mcod.local` → Data sources → add:
   `source_type=xml`, `xml_url=<our feed>`, organization, frequency `1`,
   e-mail contact.
2. Force the import:

```bash
cd dane.gov.pl/backend
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.tasks import import_data_task
print(import_data_task(<data_source_id>, force=True))
"
```

3. Check `DataSourceImport` in the admin, then
   `https://api.mcod.local/1.4/datasets` and the mirrored files under
   `/media/resources/...`.

Because the portal runs in Docker while our app runs on the host, point the
DataSource at `http://host.docker.internal:<port>/...` (HTTPS is enforced by our
own endpoints, not by the portal's fetcher).

## Failure modes worth handling

| Symptom in `DataSourceImport` | Cause |
| --- | --- |
| `UnexpectedStatusCode` | feed returned 4xx/5xx |
| `Content-Type must contain 'text/xml' or 'application/xml'` | wrong header on `HEAD` |
| `XMLDoesNotMatchMD5Pattern` | missing/invalid `.md5` file |
| `XMLMD5DoesNoMatch` | checksum not computed from the served bytes |
| XSD validation error | schema mismatch, missing required element, non-HTTPS URL |
| Dataset imported but no resources | `extIdent` collisions or resources missing |
