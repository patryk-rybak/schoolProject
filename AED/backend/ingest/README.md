# Backend · Pobieranie danych z rozproszonych źródeł

**Status:** działa (dev) · **Rejestr:** [`datasources-config.json`](./datasources-config.json)

## Cel

Zebrać dane o AED od wszystkich dysponentów: portale open-data miast, serwisy
organizacji, dane z OSM i inne dostępne źródła — wraz z **zakresem
referencyjnym** każdego źródła.

## Jeden rejestr źródeł

Wszystkie konfiguracje żyją w jednym pliku:
[`datasources-config.json`](./datasources-config.json). Ma on postać:

```json
{
  "version": 1,
  "sources": [
    {
      "source": { "id": "marki", "enabled": true, "...": "..." },
      "fetch": { "url": "https://...", "pagination": { "type": "none" } },
      "connector": { "family": "http_json", "parser": "json" },
      "...": "..."
    }
  ]
}
```

Loader (`src/server/ingest/config/loader.ts`) waliduje cały plik Zod-em i
zwraca jeden rejestr. Ścieżkę można nadpisać przez `AED_DATASOURCES_CONFIG`;
domyślnie jest to `backend/ingest/datasources-config.json` względem `AED/`.

### Bramka `source.enabled`

- `source.enabled` domyślnie oznacza `true`.
- Zwykły przebieg pobiera **tylko aktywne** źródła.
- `--all` (lub jawne `--source <id>`) włącza też źródła z
  `source.enabled: false`.
- Wyłączone źródło nietknięte przez `--all` jest pomijane bez zapisu snapshotu.

## Przebieg: raw-first

```bash
bun run ingest:run
```

Skrypt `scripts/ingest-run.ts` wykonuje trzy kroki:

1. Ładuje pojedynczy rejestr i wybiera źródła (domyślnie aktywne).
2. Pobiera każde źródło do **niezmienionego** snapshotu:
   - `.data/core/raw/<source-id>.<ext>` — surowa odpowiedź,
   - `.data/core/raw/<source-id>.meta.json` — `source_id`, `fetched_at`,
     `final_url`, `http_status`, `content_type`, `bytes`, `sha256`,
     `config_path`, `license_id`, `raw_file`, `record_count` i status
     `blocked`/`error` dla brakujących sekretów lub błędów HTTP.
3. Buduje wspólny zbiór kanoniczny (`buildCoreDataset`) i zapisuje go do
   `.data/core/` (`writeCoreDataset`).

Snapshoty i produkty core są ignorowane przez git (`.data/`). Dzięki temu
normalizacja nie wymaga sieci, a nieudane źródło nie nadpisuje ostatniego
dobrego pliku surowego.

### Opcje CLI

```bash
bun run ingest:run -- --source marki,krosno   # tylko wskazane źródła
bun run ingest:run -- --all                   # także source.enabled=false
bun run ingest:run -- --no-fetch              # użyj istniejących snapshotów
bun run ingest:run -- --no-write              # tylko podgląd statystyk
bun run ingest:run -- --out-dir .data/core --raw-dir .data/core/raw
```

Błędy pojedynczych źródeł (timeout, HTTP 4xx/5xx, brak zmiennej środowiskowej)
są raportowane w podsumowaniu i w manifeście, ale nie przerywają przebiegu.
Kod wyjścia jest niezerowy tylko dla błędu rejestru lub błędu zapisu.

### Obsługiwany fetch

`src/server/ingest/fetch/source-fetch.ts` obsługuje:

- `GET`/`POST`, `query`, `body`, własne `headers` i `user_agent`,
- `auth`: `none`, `bearer`, `header` (z `prefix`) oraz `basic`
  (`env` albo para `user_env`/`password_env`); brak sekretu zapisuje
  `blocked: true` w meta bez pliku surowego,
- `timeout_ms`, `max_bytes`, `max_redirects`, `retries`,
- `pagination`: `none`, `page` i `offset` (`page_param`, `limit_param`,
  `page_size`, `total_path`).

Dla paginacji strony są scalane w jeden dokument pod `records.path`, a
poszczególne strony trafiają do `.data/core/raw/<source-id>.page-<n>.<ext>`.
`cursor` i `link_header` nie są jeszcze obsługiwane.

## Produkty core

| plik | zawartość |
|---|---|
| `.data/core/core.json` | wszystkie rekordy kanoniczne |
| `.data/core/core-public.json` | tylko `publish_state=published` |
| `.data/core/core-internal.json` | rekordy niewidoczne publicznie |
| `.data/core/core.geojson` | wszystkie rekordy z punktem |
| `.data/core/core-public-osm.geojson` | publiczne OSM/OpenAEDMap (ODbL-1.0) |
| `.data/core/core-public-local.geojson` | publiczne źródła lokalne |
| `.data/core/core.csv` | płaska tabela do podglądu |
| `.data/core/core.sqlite` | tabele `source`, `aed_core`, `owner_claim` |
| `.data/core/manifest.json` | źródła, licencje, hashe, liczby i błędy |

Samo przebudowanie z istniejących snapshotów:

```bash
bun run core:build
# lub
bun run ingest:run -- --no-fetch
```

## Zależności

- [`../../src/server/ingest/config/`](../../src/server/ingest/config/README.md) —
  schemat, loader i metadane formularza,
- [`../../src/server/ingest/core/`](../../src/server/ingest/core/) — parsowanie,
  mapowanie, walidacja i zapis wspólnego zbioru,
- [`../store/`](../store/README.md) — docelowy zapis przebiegów pobierania.

Reguły mappingu, rodziny connectorów i wykrywanie dryfu opisuje
[`../../docs/ingest-source-config.md`](../../docs/ingest-source-config.md).
