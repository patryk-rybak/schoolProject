# Kanoniczne konfiguracje 12 źródeł tabularnych AED

Ten katalog zawiera wyłącznie źródła, które dają rekordy wierszowe albo
punktowe bez ręcznej transkrypcji. Wszystkie pliki są ładowane przez
`src/server/ingest/config/loader.ts` i walidowane tym samym schematem Zod.
Rejestr jest pamięciowy; po edycji pliku użyj
`loadSourceConfigs({ force: true })`.

Rozkład aktywnych rodzin:

| Rodzina / parser | Liczba |
| --- | ---: |
| `google_my_maps_kml` / `kml` | 6 |
| `file_static` / `csv` | 2 |
| `http_json` / `json` | 2 |
| `file_static` / `geojson` | 1 |
| `pdf_table` / `pdf_table` | 1 |

Wszystkie 12 źródeł ma współrzędne (`withCoordinates=12`), więc rejestr nie
potrzebuje geokodowania adresowego. GUGiK UUG pozostaje skonfigurowany w
schematach źródeł wyłączonych, które można przywrócić po uzupełnieniu danych.

`source.enabled=true` mają tylko cztery źródła z otwartą licencją:
OpenAEDMap, Przemyśl, Krosno i Marki. Warszawa ma otwartą licencję, ale
pozostaje wyłączona do potwierdzenia tokena i trybu listowania. Pozostałe
źródła KML są wyłączone do decyzji licencyjnej.

## Źródła wyłączone

57 źródeł, których dane są tylko w JPG/PNG, DOCX/PDF prose, HTML,
JavaScriptowej e-mapie albo w prozie bez stabilnych wierszy, przeniesiono do
`backend/ingest/sources-excluded/`. Pliki nie zostały usunięte. Manifest
`backend/ingest/sources-excluded/excluded.json` zawiera powód wyłączenia, a
`README.md` w tym katalogu zawiera tabelę. Aby przywrócić źródło, przenieś
JSON z powrotem do `backend/ingest/sources/` i uruchom `bun run config:normalize`.

## Pięć źródeł referencyjnych

Ten katalog zawiera pełne, kanoniczne konfiguracje JSON dla pięciu źródeł
klasy A, które nie są mapami KML:

| Plik | Źródło | Connector | Licencja |
| --- | --- | --- | --- |
| `openaedmap.json` | OpenAEDMap / OSM PL | `file_static` / `geojson` | ODbL 1.0 |
| `przemysl.json` | Przemyśl SOD `/structured` | `http_json` / `json` | CC BY 4.0 |
| `krosno.json` | Krosno, CSV dane.gov.pl | `file_static` / `csv` | CC0 1.0 |
| `marki.json` | Marki, CSV dane.gov.pl | `file_static` / `csv` | CC BY 4.0 |
| `warszawa.json` | Warszawa, POST JSON API | `http_json` / `json` | CC BY 4.0 |

`backend/ingest/examples/*.yaml` pozostaje czytelnym formatem importu.
`backend/ingest/sources/*.json` jest niezmienną formą kanoniczną zapisywaną
w `source_config_version.config_json`. Klucze są sortowane, więc ten sam
dokument z YAML i JSON ma ten sam `config_sha256`.

```bash
cd AED
bun scripts/build-source-configs.ts     # YAML -> kanoniczny JSON
bun scripts/validate-source-configs.ts  # schema, parity, quirks, gates
```

## 1. Tożsamość rekordu i klucze deduplikacji

`record_key = source_id + ":" + source_record_id`. Klucz musi być stabilny
między snapshotami. Numer etykiety AED nie jest kluczem, jeśli źródło ma
własne `id`.

| Źródło | `source_record_id` | Klucz `records.dedupe` | Uwagi |
| --- | --- | --- | --- |
| OpenAEDMap | `{@osm_type}/{@osm_id}` | `@osm_type`, `@osm_id` | Wynik `node/<id>`, małe litery, bez zer wiodących. To ten sam `external_ids.osm`, co OSM, więc OpenAEDMap jest pochodną OSM, nie niezależnym potwierdzeniem. |
| Przemyśl | `przemysl:15:{id}` | `id` | `id` zasobu to 15. Numer AED 7639 jest duplikatem etykiety w rekordach 757 i 764, ale nie duplikatem `id`; nie odrzucamy rekordu. |
| Krosno | `krosno:{Numer Id}` | `Numer Id` | `Nazwa` to zawsze „Defibrylator”, więc etykieta pochodzi z `Numer Id`, nie z `Nazwa`. |
| Marki | `marki:{Numer Id}` | `Numer Id` | Analogicznie do Krosna. Wiersz `Numer Id=7` zostaje w zbiorze, ale idzie do review przez bbox. |
| Warszawa | `warszawa:{properties.defibrillator_id}` | `properties.defibrillator_id` | Token i tryb listowania nie zmieniają tożsamości rekordu. |

Zasady:

1. `records.identity.stable: true` dla wszystkich pięciu źródeł.
2. `aed_alias` używa pary `(source_id, source_record_id)` jako klucza głównego.
3. Deduplikacja w obrębie przebiegu nie zastępuje deduplikacji kanonicznej.
   `on_duplicate` opisuje tylko zachowanie parsera przy powtórzonym kluczu.
4. Dla OSM i OpenAEDMap klucz `osm` jest exact identity I2. Dla źródeł
   lokalnych exact identity to ten sam `source_record_id`, a nie podobieństwo
   nazwy.
5. `id` Przemyśla nie jest globalnym identyfikatorem. Zawsze kwalifikujemy je
   prefiksem `przemysl:15:`.

## 2. Znane pułapki i sposób ich obsługi

| Źródło | Pułapka | Rozwiązanie w configu |
| --- | --- | --- |
| OpenAEDMap | `name` ma tylko 0,6% rekordów, `defibrillator:location` 67,3%, `operator` 32,8%. Wymaganie `name` odrzuciłoby większość kraju. | `coalesce` z `name`, `defibrillator:location:pl`, `defibrillator:location`, `operator` i końcowym `"Defibrylator AED"`. |
| OpenAEDMap | GeoJSON ma `[lon, lat]`, a tagi z dwukropkiem (`addr:*`, `defibrillator:*`) są kluczami obiektu. | `coord.format: geojson`; ścieżki pól w cudzysłowie; `records.path: /features`. |
| OpenAEDMap | `access=permit` i `locked=yes` nie są tym samym co `public`. | `locked=yes -> key`; brak dopasowania `access` daje `unknown`, nie `public`. |
| OpenAEDMap | Brak statusu, adresy `addr:*` ok. 0,4%, `check_date` 32,7%. | `status: unknown`; `verification_status` z wieku `check_date`, nigdy `confirmed`. |
| Przemyśl | `format=csv` zwraca JSON-owy literał stringa, a domyślny limit to 10 z 21 wierszy. | Używamy `/structured`, `records.path: /rows`, `pagination.total_path: /total_rows`, `page_size: 100`. |
| Przemyśl | Duplikat etykiety AED 7639 w rekordach 757 i 764. | Dedupe po `id`; duplikat etykiety to sygnał jakościowy, nie odrzucenie. |
| Przemyśl | CC0 w mirrorze dane.gov.pl, CC BY 4.0 w portalu lokalnym. | Wybieramy CC BY 4.0 jako bardziej restrykcyjną licencję i dokumentujemy wybór. |
| Krosno | UTF-8 z BOM i cztery nagłówki z wiodącą spacją. | `encoding: utf-8-sig`, `trim_headers: true`. |
| Krosno | Kolumny to `Długość geograficzna, Szerokość geograficzna`, dane w kolejności `lon, lat`. | `lat` czyta `Szerokość geograficzna`, `lon` czyta `Długość geograficzna`. |
| Marki | Każdy wiersz jest owinięty w cudzysłów, a wewnętrzne cudzysłowy są podwojone. | `unwrap_outer_quotes: true`, `repair_double_quotes: true`. |
| Marki | Nagłówek deklaruje `lon, lat`, ale 7 z 8 wierszy ma `lat, lon`. | `lat` czyta kolumnę `Długość geograficzna`, `lon` kolumnę `Szerokość geograficzna`. |
| Marki | `Numer Id=7` ma współrzędne Krosna. | Wąski bbox Marki i `on_invalid: review`; rekord nie trafia na mapę. |
| Warszawa | API wymaga tokena; bez niego HTTP 403. | `auth.type: header`, `auth.env: WARSZAWA_API_TOKEN`; brak wartości w configu. |
| Warszawa | `geometry.coordinates` bywa `[lon, lat]` albo `[[lon, lat]]`. | `coord.unwrap_single: true`. |
| Warszawa | `device_public_access` ma polskie wartości, np. `Publiczny`. | `lower` + przypadki `publiczny`/`prywatny`; brak dopasowania daje `unknown`. |
| Warszawa | `device_availability` jest opisowe, np. „Ograniczona”; nie jest booleanem. | `is_24_7` czyta prozę `device_access_description` tylko dla `24`/`całodob`; reszta zostaje `null`. |
| Warszawa | Tryb listowania i token nie są potwierdzone. | `source.enabled: false`, `publish.enabled: false`; to bramka operacyjna, nie licencyjna. |

Walidacja `validate.required` jest minimalna: `lat`, `lon` i `name` (po
fallbacku). Dla Marki błąd pojedynczego rekordu daje `review`, nie zatrzymuje
całego źródła. Dla Krosna, Przemyśla i OpenAEDMap niepoprawne współrzędne są
odrzucane, bo źródło ma poprawne geometrie i błąd oznacza uszkodzony rekord.

## 3. Bramki licencyjne i publikacyjne

Każda konfiguracja ma blok `publish` będący częścią wersji konfiguracji, więc
rollback przywraca także stan prawny.

| Pole | Znaczenie |
| --- | --- |
| `publish.license_id` | Musi być równe `source.license.id`; eksport nie może po cichu zmienić licencji. |
| `publish.attribution` | Wymagane dla CC BY i ODbL; dla CC0 opcjonalne, ale zachowane. |
| `publish.allowed_for_ingest` | Zezwolenie na zapis danych kanonicznych. Wymaga `license_id`, atrybucji (jeśli wymagana), `terms_hash` i świeżego `terms_checked_at`. |
| `publish.allowed_for_export` | Zezwolenie na eksport i feed. Może być `false`, gdy ingest jest dozwolony. |
| `publish.terms_url` | Adres dokumentu licencji/regulaminu, nie adres danych. |
| `publish.terms_hash` | SHA-256 dokumentu licencji/regulaminu, nie payloadu. |
| `publish.terms_checked_at` | Data sprawdzenia przez człowieka; starsza niż 90 dni blokuje ingest. |
| `publish.permission_document_url`, `publish.approved_by` | Wymagane dla licencji zamkniętych lub niejasnych; nie używane dla pięciu źródeł otwartych. |
| `publish.redact` | `serial_number` i `phone` są redagowane w eksporcie, jeśli źródło je publikuje. |

Wartości bramek dla pięciu źródeł:

| Źródło | Ingest | Eksport | `publish.enabled` | Uzasadnienie |
| --- | --- | --- | --- | --- |
| OpenAEDMap | tak | tak | tak | ODbL 1.0, share-alike; eksport OSM musi zachować ODbL i atrybucję. |
| Przemyśl | tak | tak | tak | CC BY 4.0 z portalu lokalnego; wybrana jako bardziej restrykcyjna niż CC0 w mirrorze. |
| Krosno | tak | tak | tak | CC0 1.0. |
| Marki | tak | tak | tak | CC BY 4.0; jeden wiersz idzie do review, nie do eksportu. |
| Warszawa | tak | tak | nie | Licencja CC BY 4.0 jest potwierdzona, ale brak potwierdzonego trybu listowania i tokena. |

Zasady dodatkowe:

1. `allowed_for_ingest` i `allowed_for_export` są decyzją licencyjną.
   `source.enabled` i `publish.enabled` są decyzją operacyjną. Warszawa ma
   pierwszą bramkę otwartą, a drugą zamkniętą.
2. `NOASSERTION` lub brak `license_id` nigdy nie daje `allowed_for_export=true`.
3. ODbL ma share-alike. Nie wolno eksportować rekordów OSM w pliku
   deklarowanym wyłącznie jako CC BY.
4. `terms_hash` w tym zestawie to SHA-256 strony licencji pobranej
   2026-11-21. Zmiana dokumentu wymaga nowej rewizji konfiguracji.
5. Token Warszawy żyje wyłącznie w `WARSZAWA_API_TOKEN`. Wartość nie może
   trafić do JSON, YAML, snapshotu, logu ani odpowiedzi API.
6. Źródło pochodne OSM (OpenAEDMap) nie jest niezależnym potwierdzeniem
   w deduplikacji. Jego rekord jest aliasem OSM, mimo innego `source_id`.
