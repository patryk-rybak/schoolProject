# Core AED dataset

Ten katalog zawiera **surowce i zbudowany z nich rdzeń danych** dla projektu
„Misja AED / Dane na ratunek”. Rdzeń jest celowo oddzielony od aplikacji:
powstaje z plików `backend/ingest/sources/*.json`, surowych snapshotów w
`data/core/raw/` i wspólnego schematu `src/server/ingest/canonical.ts`.

## Zasada: raw-first

1. `data/core/raw/<source-id>.*` to **niezmieniony** response źródła.
2. `data/core/raw/<source-id>.meta.json` zapisuje URL, czas, HTTP, sha256,
   bytes, licencję i liczbę rekordów.
3. `bun run core:build` parsuje snapshoty, mapuje je na rekord kanoniczny,
   waliduje (m.in. bbox) i zapisuje produkty w `data/core/`.
4. Każdy rekord ma `source_id`, `source_record_id`, `field_provenance`,
   `verification_status` i `claim_status`. Nic nie jest „wymyślane”: brak
   współrzędnych to `address_only` albo `unresolved`, nie fałszywy punkt.

## Budowanie

```bash
bun run core:build
# tylko wybrane źródła:
bun run core:build -- --source openaedmap,przemysl,krosno,marki
# bez zapisu, tylko podgląd statystyk:
bun run core:build -- --no-write
```

Wymagane są snapshoty w `data/core/raw/`. Jeśli źródło jest zablokowane
(np. `warszawa` bez `WARSZAWA_API_TOKEN`), builder zapisze błąd w manifeście
i pominie źródło, zamiast tworzyć puste rekordy.

## Produkty

| plik | zawartość |
|---|---|
| `core.json` | wszystkie rekordy kanoniczne (także kwarantanna) |
| `core-public.json` | tylko `publish_state=published` |
| `core-internal.json` | rekordy niewidoczne publicznie (kwarantanna) |
| `core.geojson` | wszystkie rekordy z punktem |
| `core-public.geojson` | publiczne rekordy z punktem |
| `core-public-osm.geojson` | publiczne OSM/OpenAEDMap (ODbL-1.0) |
| `core-public-local.geojson` | publiczne źródła lokalne (CC0 / CC BY) |
| `core.csv` | płaska tabela do szybkiego podglądu |
| `core.sqlite` | tabele `source`, `aed_core`, `owner_claim` |
| `manifest.json` | źródła, licencje, hashe, liczby i błędy |

Podział `core-public-osm` / `core-public-local` jest celowy: ODbL ma
share-alike, a źródła lokalne są na CC0/CC BY. Nie mieszamy ich w jednym
pliku publicznym bez świadomej decyzji licencyjnej.

## Weryfikacja i „claiming”

- `verification_status` opisuje, skąd wiemy o rekordzie (`unverified`,
  `community`, `official`, ...).
- `claim_status` przyjmuje `unclaimed`, `pending`, `verified`, `rejected`.
- `owner_claim` w SQLite jest historią roszczeń: `record_id`, `claimed_by`,
  `status`, `created_at`, `verified_at`, `note`.
- Docelowo właściciel obiektu (urząd, szkoła, galeria) może „zaclaimować”
  punkt, potwierdzić adres i podmienić współrzędne. Do tego czasu rekord
  pozostaje przypisany do `source_id` i ma pełną proweniencję.

## Znane ograniczenia

- `warszawa`: brak tokena, snapshot zablokowany.
- `marki`: wiersz `Numer Id=7` ma współrzędne Krosna; bbox Marki przenosi go
  do kwarantanny, nie na mapę.
- KML-e (`zielona-gora`, `tczew`, `olsztyn`, `belchatow`, `lodz`,
  `pawlowice`) mają licencję `NOASSERTION`, więc pozostają wewnętrzne
  (`publish_state=quarantined`).
- Część KML placemarków nie ma nazwy; rekordy nadal mają geometrię i źródło.
