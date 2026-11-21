# dane.przemysl.eu — „Defibrylatory AED na terenie miasta Przemyśla”

**Status:** zbadane realnymi zapytaniami HTTP, 2026-11-21 (UTC).
**Zakres:** katalog, metadane, API, formaty, schemat pól, CRS, licencja, aktualizacja, uwierzytelnianie, kompletność i mapowanie na wspólny schemat.
**Wersja portalu:** Studio Otwartych Danych (SOD) 0.9.334.0, OpenAPI 3.2.1 / JSON Schema 2020-12.
**Nie jest to CKAN.** Portal to WordPress z autorskim pluginem `sod/v1`; endpointy CKAN (`/api/3/...`) zwracają 404.

---

## 1. Identyfikacja zbioru

| Atrybut | Wartość |
| --- | --- |
| Tytuł (PL) | Defibrylatory AED na terenie miasta Przemyśla |
| Tytuł (EN, DCAT) | AEDs in the City of Przemyśl |
| Dataset ID (SOD) | `13` |
| Identifier | `PRZ-DEFIBRYLATOR` |
| Resource ID (SOD) | `15` |
| Identyfikator zasobu (JSON-LD) | `sod-resource-15` |
| Landing page | https://dane.przemysl.eu/zbiory-danych/defibrylatory-aed-na-terenie-miasta-przemysla/ |
| Resource page | https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/ |
| Wydawca | Straż Miejska w Przemyślu |
| Kontakt DCAT | sekretariat@smprzemysl.pl, tel. +48 16 675 20 61 |
| Temat DCAT | `JUST` — Wymiar sprawiedliwości, system prawny i bezpieczeństwo publiczne |
| Słowa kluczowe | Bezpieczeństwo, Ochrona, Obrona Cywilna, AED, Defibrylatory, Pomoc, Ratowanie Życia, Dane, Lista, Mapa, Przemyśl |
| Zasięg przestrzenny | Miasto Przemyśl |
| Wersja | 1.1 |
| Status cyklu życia | `active`, nie zarchiwizowany, nie wycofany |
| Licencja katalogu | CC BY 4.0 (`https://dane.przemysl.eu/creative-commons-cc-by-4-0/`) |
| Licencja mirroru krajowego | **CC0 1.0** (patrz §6 — rozbieżność) |
| Częstotliwość aktualizacji (deklaracja) | `CONT` — „Na bieżąco (ciągła)” |
| Faktyczna data pliku źródłowego | **2024-11-05 15:00:01 UTC** (`1730818801`) |
| Liczba rekordów | **21** |
| Geometria | `Point`, współrzędne lon/lat |
| CRS | **EPSG:4326 (WGS 84)** — inferowane z GeoJSON RFC 7946 i zakresu współrzędnych; brak jawnej deklaracji CRS w API |
| Uwierzytelnianie | **brak** — publiczne GET, bez klucza i bez nonce |
| Limit zapytań | **120 req/min** (`X-RateLimit-Limit: 120`) |

### Daty — rozbieżność metadanych

| Pole | Wartość | Interpretacja |
| --- | --- | --- |
| `dataset.updated` | `2026-01-20T17:58:39+00:00` | modyfikacja metadanych zbioru |
| `dataset.quality.freshness.last_updated` | `2026-05-15 13:59` | prawdopodobnie ostatni odczyt/odświeżenie cache |
| `resource.updated` (lista zasobów) | `2026-04-29T05:27:28+00:00` | metadana zasobu |
| `data.resource.updated` (envelope) | `2026-05-15 11:59:03` | metadana koperty danych |
| `resource.data_date` | `2026-01-01` | deklarowana data danych |
| `source_url` timestamp | `1730818801` = **2024-11-05 15:00:01 UTC** | faktyczny plik źródłowy |
| DCAT `dct:issued` | `2026-01-08T19:28:55+01:00` | publikacja w katalogu |
| DCAT `dct:modified` | `2026-01-20T17:58:39+01:00` | modyfikacja metadanych |

**Wniosek:** metadane „odświeżają się” częściej niż same dane. SHA-256 pliku źródłowego jest identyczny z plikiem z 2024-11-05 i z kopią w dane.gov.pl. Nie ma dowodu na dodanie nowych punktów AED po 2024-11-05. Do aplikacji należy pobierać dane i porównywać checksum, a nie ufać polu `updated`.

---

## 2. Architektura API

Bazowy URL:

```
https://dane.przemysl.eu/wp-json/sod/v1
```

Specyfikacje:

| Dokument | URL |
| --- | --- |
| OpenAPI całego API | https://dane.przemysl.eu/wp-json/sod/v1/openapi.json |
| OpenAPI (alias) | https://dane.przemysl.eu/wp-json/sod/v1/openapi |
| OpenAPI zasobu 15 | https://dane.przemysl.eu/wp-json/sod/v1/resources/15.openapi.json |
| OpenAPI usług danych | https://dane.przemysl.eu/wp-json/sod/v1/dataservices.openapi.json |
| DCAT JSON-LD | https://dane.przemysl.eu/wp-json/sod/v1/dcat.jsonld |
| Katalog ODE (liczby) | https://dane.przemysl.eu/wp-json/ode/v2/catalog |

### Endpointy istotne dla AED

| Metoda | Endpoint | Wynik (realny) |
| --- | --- | --- |
| GET | `/datasets?limit=100&offset=0` | 200, 61 zbiorów; `count`, `limit`, `offset`; **`search`/`q`/`per_page` są ignorowane**. ODE podaje 62 — prawdopodobnie jeden zbiór bez aktywnych zasobów |
| GET | `/datasets/13` | 200, metadane zbioru + zagnieżdżony zasób 15 |
| GET | `/resources?dataset_id=13` | 200, lista 1 zasobu |
| GET | `/resources/15` | 200, metadane zasobu, `source_url`, `license_url`, `data_date`, linki do formatów |
| GET | `/resources/15/data` | 200, koperta JSON: `resource`, `data{columns,rows,pagination}`, `geo{points,bbox,count}` |
| GET | `/resources/15/data?format=csv` | 200, `text/csv`, **ale treść to string JSON** (escapowane `\n`, `\"`, `\uXXXX`), nie poprawny CSV; domyślnie **10 wierszy**, `limit=100` → 21 |
| GET | `/resources/15/data?format=geojson` | 200, `application/geo+json`, FeatureCollection 21 punktów |
| GET | `/resources/15/geojson` | 200, `application/json` (nie `geo+json`), FeatureCollection 21 punktów |
| GET | `/resources/15/structured` | 200, 19 kolumn, w tym `geometry`, `longitude`, `latitude`; **endpoint nieopisany w OpenAPI** |
| GET | `/resources/15/kml` | 404 `sod_geo_missing` — „Resource has no linked geo layer” |
| GET | `/resources/15/shp.zip` | 404 (brak warstwy GIS) |
| GET | `/resources/15.data.json` | 200, pełna tabela JSON (14 kolumn) |
| GET | `/resources/15.data.csv` | 200, `text/csv`, **ta sama wada**: treść jako string JSON; 21 wierszy |
| GET | `/resources/15.metadata.jsonld` | 200, DCAT JSON-LD zasobu |
| GET | `/resources/15.data.csv-metadata.json` | 200, CSVW Table Schema |

### Parametry `/resources/15/data`

| Parametr | Obserwacja |
| --- | --- |
| `format` | `json` (domyślnie), `csv`, `geojson` działają. `gpx` jest **po cichu ignorowany** i zwraca JSON. `kml`/`shp` wymagają warstwy GIS. |
| `limit` / `offset` | Działają. `pagination={limit,offset,total_rows,source_total_rows,complete,sort_by,sort_dir}`. **Domyślny limit zależy od formatu:** JSON i GeoJSON zwracają 21, CSV tylko 10. Zawsze podawaj `limit`. |
| `fields` | Działa zawężanie kolumn, ale `latitude`/`longitude` zwracają `null`, bo kanoniczna tabela ich nie zawiera. |
| `bbox` | **Ignorowany** — z `bbox` zawężającym do fragmentu miasta nadal zwrócono 21/21 feature’ów. |

### Nagłówki HTTP (realne)

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8   # /data
Content-Type: application/geo+json; charset=utf-8 # /data?format=geojson
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Cache-Control: public, max-age=300, must-revalidate
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: <epoch>
```

Dokumentacja obiecuje `ETag` i `Last-Modified`, ale **nie zaobserwowano ich** na `/data` ani `/geojson`. Nie można polegać na warunkowych requestach; trzeba używać własnego checksum.

**Rate limit:** 120 zapytań/minutę. Przekroczenie → HTTP 429 (zgodnie z dokumentacją). Zalecany harmonogram i backoff.

**Uwierzytelnianie:** brak. `security` i `securitySchemes` w OpenAPI są puste. Nagłówki `Authorization`/`X-WP-Nonce` są dozwolone w CORS, ale nie są wymagane. API jest w trybie publicznym.

---

## 3. Schemat danych

### 3.1 Kanoniczna tabela (`/data` JSON, CSV, `/structured`)

Kolejność kolumn w `/data` i CSV (14):

```
id, name, description, category, city, street, home_number, postcode,
phone, email, www, gallery, attachments, links
```

`/structured` zwraca dodatkowo 5 kolumn (19 łącznie):

```
youtube_url, panorama_url, geometry, longitude, latitude
```

**Ważne:** CSV i `/data?format=csv` **nie zawierają współrzędnych**. Aby pobrać lokalizacje z CSV, trzeba użyć `/geojson`, `/structured` albo pliku źródłowego.

**Ważne 2:** oba endpointy CSV (`/data?format=csv` i `/resources/15.data.csv`) zwracają nagłówek `text/csv`, ale **treść jest stringiem JSON**: zaczyna się od `"\ufeffid,..."`, a znaki nowej linii i cudzysłowy są escapowane (`\n`, `\"`), podobnie polskie znaki (`\u015b`). To nie jest poprawny CSV dla parsera. Należy najpierw wykonać `json.loads(body)`, a dopiero potem parsować CSV. Dodatkowo `/data?format=csv` bez `limit` zwraca tylko **10 z 21** wierszy.

### 3.2 Typy i wypełnienie (21 rekordów)

| Pole | Typ JSON | Wypełnione | Uwagi |
| --- | --- | --- | --- |
| `id` | integer | 21/21 | 744–765 bez 750; stabilne w źródle |
| `name` | string | 21/21 | Zawiera numer AED, np. `Defibrylator (AED 9485) w ADM Centrum` |
| `description` | string | 21/21 | **Tylko 3 unikalne wartości** — boilerplate o AED, nie opis lokalizacji |
| `category` | string | 21/21 | Zawsze `Defibrylatory AED` |
| `city` | string | 21/21 | Zawsze `Przemyśl` |
| `street` | string | 21/21 | Nazwa ulicy/placu |
| `home_number` | string | 19/21 | Brak dla `753`, `755` |
| `postcode` | string | 21/21 | Zawsze `37-700` |
| `phone` | string | **1/21** | `+48166779500` (id 746) |
| `email` | string | **2/21** | id 745, 746 |
| `www` | string | **2/21** | id 745, 746 |
| `youtube_url` | string | 0/21 | tylko `/structured` |
| `panorama_url` | string | 0/21 | tylko `/structured` |
| `gallery` | array<object> | 21/21 | `{url, thumbUrl, thumbUrlMedium}`; zawsze ≥1 zdjęcie |
| `attachments` | array | 0/21 | puste |
| `links` | array<object> | 2/21 | `{title, url, link_type}` |
| `geometry` | object | 21/21 | `{type:"Point", coordinates:[lon,lat]}` |
| `longitude` | float | 21/21 | 22.7482498–22.7912987 |
| `latitude` | float | 21/21 | 49.7781797–49.7972693 |

### 3.3 GeoJSON

`/resources/15/geojson` i `/data?format=geojson` zwracają:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 744,
      "geometry": { "type": "Point", "coordinates": [22.7750936, 49.7812096] },
      "properties": {
        "id": 744,
        "name": "Defibrylator (AED 9485) w ADM Centrum",
        "description": "...",
        "category": "Defibrylatory AED",
        "city": "Przemyśl",
        "street": "Juliusza Słowackiego",
        "home_number": "12",
        "postcode": "37-700",
        "phone": "",
        "email": "",
        "www": "",
        "youtube_url": "",
        "panorama_url": "",
        "gallery": [ { "url": "...", "thumbUrl": "...", "thumbUrlMedium": "..." } ],
        "attachments": [],
        "links": [],
        "geometry": { "type": "Point", "coordinates": [22.7750936, 49.7812096] },
        "longitude": 22.7750936,
        "latitude": 49.7812096
      }
    }
  ]
}
```

Uwagi:
- `id` występuje **dwukrotnie**: na poziomie Feature i w `properties.id`.
- `geometry` jest **zduplikowana**: na poziomie Feature i w `properties.geometry` (plus `longitude`/`latitude`).
- Brak `bbox` na poziomie FeatureCollection; `bbox` jest tylko w `geo.bbox` koperty `/data`.
- Kolejność współrzędnych: **`[longitude, latitude]`** (zgodnie z RFC 7946).
- Precyzja: większość 6–7 miejsc po przecinku; rekordy 753 i 755 mają 15 miejsc (wynik przeliczeń, nie błąd).

### 3.4 Koperta `/data` — dodatkowy blok `geo`

```json
"geo": {
  "points": [ { "lat": 49.7812096, "lng": 22.7750936, "title": "Defibrylator (AED 9485) w ADM Centrum" } ],
  "bbox": { "minLat": 49.7781797, "minLng": 22.7482498,
            "maxLat": 49.7972693, "maxLng": 22.7912987 },
  "count": 21
}
```

`geo.points` to wygodna, zdenormalizowana reprezentacja do szybkiego rysowania mapy, ale `title` jest obciętym `name`; brak tam adresu i numeru AED w osobnych polach.

### 3.5 CSVW (typy kolumn)

`/resources/15.data.csv-metadata.json` deklaruje:
`id` → `integer`; `home_number` → `integer`; pozostałe 12 kolumn → `string`.
To uproszczenie: `home_number` bywa puste i może zawierać wartości niecałkowite w przyszłości; w JSON jest stringiem. Po zdekodowaniu body (`json.loads`) CSV ma BOM UTF-8 i terminator `\r\n`, 21 wierszy i 14 kolumn. Surowe body jest stringiem JSON, nie CSV — patrz §3.1.

---

## 4. Przykładowe rekordy (skrócone)

| id | name | street | home | lat | lon | phone / email |
| --- | --- | --- | --- | --- | --- | --- |
| 744 | Defibrylator (AED 9485) w ADM Centrum | Juliusza Słowackiego | 12 | 49.7812096 | 22.7750936 | — |
| 745 | Defibrylator (AED 9556) w I Liecum Ogólnokształcącym w Przemyślu | Juliusza Słowackiego | 21 | 49.7806393 | 22.7771083 | lo1@um.przemysl.pl |
| 746 | Defibrylator (AED 9579) w Szkole Podstawowej Nr 6 w Przemyślu | Generała Mieczysława Boruty Spiechowicza | 1 | 49.7972693 | 22.7582092 | +48166779500 / sp6@um.przemysl.pl |
| 753 | Defibrylator (AED 9480) Plac Konstytucji 3 Maja 19 (Szalety Miejskie) | Plac Konstytucji 3 Maja | — | 49.785488428961415 | 22.76658728175353 | — |
| 755 | Defibrylator (AED 9479) - Przystanek Autobusowy (ul. Jagiellońska / pl. Pileckiego) | Jagiellońska | — | 49.783946716458324 | 22.771487178504195 | — |
| 757 | Defibrylator (AED7639) Biblioteka Szkolna (ul. Aleksandra Dworskiego 98) | Aleksandra Dworskiego | 98 | 49.7781797 | 22.7912987 | — |
| 764 | Defibrylator (AED 7639) Grunwaldzka 81 (Szkoła Podstawowa Nr 16 w Przemyslu) | Grunwaldzka | 81 | 49.7844038 | 22.7549412 | — |

Pełny zbiór: `przemysl/resource-15-structured.json` i `przemysl/resource-15.geojson` w tym katalogu.

---

## 5. CRS / EPSG

- API **nie deklaruje** `crs` ani `EPSG` w GeoJSON, JSON-LD, CSVW ani OpenAPI.
- GeoJSON RFC 7946 definiuje domyślnie **WGS 84 / EPSG:4326** i zabrania innych układów; serwer nie dodaje członu `crs`, więc obowiązuje 4326.
- Potwierdzenie empiryczne: wszystkie 21 punktów mieści się w prostokącie `22.7482498–22.7912987 E`, `49.7781797–49.7972693 N`, co odpowiada Przemyślowi.
- Kolejność: `[lon, lat]`, stopnie dziesiętne.
- Zalecenie: przy imporcie walidować zakres (`lon` 22.7–22.8, `lat` 49.7–49.8) i oznaczyć `srid=4326` w bazie; nie reprojektować.

---

## 6. Licencja i atrybucja

### Portal miejski
- Wszystkie dane: **CC BY 4.0** (jeśli nie wskazano inaczej).
- Wymagane oznaczenie: nazwa instytucji (`Miasto Przemyśl`), nazwa zbioru, `CC BY 4.0`, link do portalu lub zbioru.
- Przykład: `Źródło: Miasto Przemyśl – Portal Otwartych Danych, licencja CC BY 4.0.`
- Wyłączenia: dane osobowe (RODO), informacje prawnie chronione, herby/logotypy.
- Dane „as is”; miasto nie gwarantuje kompletności ani aktualności.

### Mirror krajowy dane.gov.pl (ten sam plik)
- Dataset 4581: „Lokalizacje AED – Automatycznych Defibrylatorów Zewnętrznych w Przemyślu”.
- Deklarowana licencja: **CC0 1.0**.
- `update_frequency`: „Codziennie”; `modified`: 2024-11-06; `verified`: 2024-11-20.
- Plik GeoJSON: **bit-identyczny** z plikiem źródłowym portalu miejskiego, SHA-256 `2f49fe5394c1eb9e841ad5921b19c1cade6b843278d7283534658f0caba01797`.

**Ryzyko prawne:** ta sama treść ma dwie różne deklaracje licencji (CC BY 4.0 vs CC0 1.0). Bezpieczniej stosować **CC BY 4.0 i atrybucję**, bo jest bardziej restrykcyjna i pochodzi z portalu, który wskazuje jako źródło. Rozbieżność zgłosić wydawcy.

---

## 7. Aktualizacja i wersjonowanie

- Deklaracja: `CONT` / „Na bieżąco (ciągła)”; portal krajowy: „Codziennie”.
- Faktyczny plik: `1730818801_b50R6UVxPgoVdBbq.geojson`, timestamp `1730818801` → 2024-11-05 15:00:01 UTC.
- `source_mode: "url"`: portal miejski pobiera plik z `https://przemysl.skycms.com.pl/open-data/20/1730818801_b50R6UVxPgoVdBbq/geojson`.
- Ten sam SHA-256 co kopia krajowa z 2024-11-06 i co plik źródłowy. **Brak śladu nowszych danych.**
- Wersja zbioru `1.1`; wersja zasobu pusta.
- Brak `ETag`/`Last-Modified` w odpowiedziach; `Cache-Control: max-age=300`.

**Zalecenie:** traktować `source_url` + SHA-256 jako prawdę; przy każdym imporcie porównywać checksum i zapisywać `fetched_at`; nie używać `updated` jako dowodu zmiany danych.

---

## 8. Jakość danych — obserwacje

Mocne strony:
- 100% rekordów ma geometrię, nazwę, adres (ulica), miasto i kod pocztowy.
- 100% ma co najmniej jedno zdjęcie.
- Stabilne `id` i numer AED w `name` (21/21 parsowalne regexem `AED\s*-?\s*(\d{4,5})`).
- Spójny zasięg miejski i kod pocztowy.

Problemy:
1. **Zduplikowany numer AED 7639** w rekordach 757 (Dworskiego 98) i 764 (Grunwaldzka 81). Jeden z nich może być błędny albo urządzenie przeniesiono bez zmiany numeru.
2. **Brak numeru domu** w 2/21 (`753`, `755`); lokalizacje opisane placem/przystankiem.
3. **Opis jest boilerplate** — 3 unikalne wartości na 21 rekordów; nie zawiera informacji o wejściu, piętrze, dostępności.
4. **Kontakt rzadki** — telefon 1/21, e-mail 2/21, WWW 2/21.
5. **Brak pól operacyjnych**: godziny dostępu, 24/7, indoor/outdoor, operator, model/producent, data przeglądu, dostępność dla wózka, dokładne wejście.
6. **Brak współrzędnych w CSV** — pozornie „tabelaryczny” format nie wystarcza do mapy.
7. Literówki w nazwach: „Liecium” (powinno „Liceum”), „Urzedu”, „Przemyslu”, „Ogólnoksztalcące”; podwójne spacje.
8. `home_number` w CSVW jako `integer`, choć w JSON jest stringiem i bywa puste — ryzyko przy imporcie.
9. `bbox` ignorowany; `fields=latitude,longitude` daje `null`; `format=gpx` cicho zwraca JSON — API nie sygnalizuje części błędów.
10. **CSV jest zepsute na poziomie transportu**: `Content-Type: text/csv`, ale body to JSON-encoded string (`\n`, `\"`, `\uXXXX`). Dodatkowo domyślny limit CSV to 10, więc bez `limit=100` importer dostanie połowę danych. To najpoważniejsza pułapka integracyjna poza brakami pól.

---

## 9. Mapowanie na wspólny schemat (propozycja)

Poniższy wspólny schemat jest propozycją dla warstwy `normalize` (do uzgodnienia z koordynatorem; w repo nie ma jeszcze zatwierdzonego pliku schematu).

| Pole wspólne | Typ | Źródło w dane.przemysl.eu | Transformacja | Pokrycie |
| --- | --- | --- | --- | --- |
| `id` | string | `id` | `"przemysl:" + id` | 21/21 |
| `source` | string | stała | `"dane.przemysl.eu"` | 21/21 |
| `source_dataset_id` | string | `dataset.id` | `"13"` | 21/21 |
| `source_identifier` | string | `dataset.identifier` | `"PRZ-DEFIBRYLATOR"` | 21/21 |
| `source_record_id` | string | `id` | `String(id)` | 21/21 |
| `name` | string | `name` | trim, normalizacja spacji | 21/21 |
| `description` | string \| null | `description` | trim; odrzucić boilerplate lub oznaczyć `is_generic=true` | 21/21 (treść mało użyteczna) |
| `device_identifier` | string \| null | `name` | regex `AED\s*-?\s*(\d{4,5})` → `"9485"` | 21/21 |
| `device_model` | string \| null | — | brak | 0/21 |
| `location_name` | string \| null | `name` | usuń prefiks „Defibrylator (AED …)” i adres w nawiasie | ~21/21 |
| `latitude` | number | `geometry.coordinates[1]` lub `latitude` | walidacja zakresu | 21/21 |
| `longitude` | number | `geometry.coordinates[0]` lub `longitude` | walidacja zakresu | 21/21 |
| `geometry_type` | string | `geometry.type` | `"Point"` | 21/21 |
| `srid` | integer | stała | `4326` | 21/21 |
| `address_city` | string | `city` | trim | 21/21 |
| `address_street` | string | `street` | trim | 21/21 |
| `address_number` | string \| null | `home_number` | trim; `""` → null | 19/21 |
| `postal_code` | string | `postcode` | normalizacja `37-700` | 21/21 |
| `country_code` | string | stała | `"PL"` | 21/21 |
| `phone` | string \| null | `phone` | normalizacja E.164 | 1/21 |
| `email` | string \| null | `email` | lowercase | 2/21 |
| `website` | string \| null | `www` albo `links[0].url` | preferuj `www` | 2/21 |
| `image_url` | string \| null | `gallery[0].url` | pierwsze zdjęcie | 21/21 |
| `operator` | string \| null | — | brak; ewentualnie inferencja z `name` | 0/21 |
| `indoor_outdoor` | string \| null | — | brak | 0/21 |
| `access_hours` | string \| null | — | brak | 0/21 |
| `is_24_7` | boolean \| null | — | brak | 0/21 |
| `is_public` | boolean \| null | — | brak (domyślnie true dla miejsc publicznych) | 0/21 |
| `last_verified_at` | string \| null | `resource.updated` | ISO 8601; traktować jako metadaną, nie weryfikację terenową | 21/21 (technicznie) |
| `source_license` | string | stała | `"CC BY 4.0"` (+ notatka CC0 mirror) | 21/21 |
| `attribution` | string | stała | `"Miasto Przemyśl – Portal Otwartych Danych, CC BY 4.0"` | 21/21 |
| `source_url` | string | `resource.source_url` | zachowaj | 21/21 |
| `raw` | object | cały rekord | JSON | 21/21 |

### Czego nie da się wypełnić bez innych źródeł

`device_model`, `operator`, `indoor_outdoor`, `access_hours`, `is_24_7`, `is_public`, dokładne wejście, piętro, informacja o dostępności sprzętu, data przeglądu, status „czynny/awaria”. To luka dla aplikacji nawigacyjnej: użytkownik widzi punkt, ale nie wie, czy sprzęt jest dostępny i gdzie dokładnie wejść.

### Rekomendowana strategia importu

1. Pobieraj `GET /wp-json/sod/v1/resources/15/data?format=geojson&limit=100` (jeden request, 21 punktów).
2. Alternatywnie pobieraj `source_url` i weryfikuj SHA-256 `2f49fe...1797`.
3. Nie polegaj na `updated`/`data_date`; zapisuj `sha256` i `fetched_at`.
4. Klucz idempotencji: `source_record_id` (`id`). Dodatkowo wykrywaj duplikaty po `device_identifier` (tu: 7639 → 2 rekordy).
5. Waliduj `lon`/`lat` i obecność `geometry`.
6. Dla CSV: najpierw `json.loads(body)` (body to string JSON), potem `csv.reader`; pamiętaj o BOM, braku współrzędnych i domyślnym limicie 10. Do tabel użyj `/structured` lub GeoJSON.
7. Ustaw atrybucję CC BY 4.0 w UI i w eksportach.
8. Obsłuż 429 (backoff), 404 (`sod_geo_missing`), 400 (format nieobsługiwany).

---

## 10. Ocena kompletności

| Wymiar | Ocena | Uzasadnienie |
| --- | --- | --- |
| Lokalizacja podstawowa | **100%** | 21/21 geometria + ulica + miasto + kod |
| Identyfikacja urządzenia | **100%** (parsowalna) | numer AED w `name`; brak osobnego pola |
| Adres kompletny | **90%** | 19/21 numer domu |
| Kontakt | **~14%** | telefon 1/21, e-mail 2/21 |
| Opis użytkowy | **niska** | 3 unikalne opisy boilerplate |
| Dostępność / godziny / 24-7 | **0%** | brak pól |
| Operator / model / przegląd | **0%** | brak pól |
| Zdjęcia | **100%** | ≥1 zdjęcie na rekord |
| Świeżość | **wątpliwa** | plik z 2024-11-05; metadane odświeżane |
| Legalność | **dobra, ale niespójna** | CC BY 4.0 vs CC0 1.0 dla tego samego pliku |
| Użyteczność „na już” | **średnia** | dobre punkty na mapie; słabe informacje operacyjne |

**Kompletność względem wspólnego schematu:** ok. **55–60%** pól wypełnionych bezpośrednio; po derywacji numeru AED i lokalizacji ok. **65–70%**. Krytyczne braki dotyczą dostępności i operatora, nie geometrii.

---

## 11. Powiązany mirror krajowy (dane.gov.pl)

| Atrybut | Wartość |
| --- | --- |
| API | `https://api.dane.gov.pl/1.4/datasets/4581` |
| Tytuł | Lokalizacje AED – Automatycznych Defibrylatorów Zewnętrznych w Przemyślu |
| Instytucja | Urząd Miejski w Przemyślu (id 145) |
| Licencja | CC0 1.0 |
| Aktualizacja | „Codziennie”; `modified` 2024-11-06 |
| Format zasobów | CSV, GeoJSON, JSON, GML/XML |
| GeoJSON | `https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson` |
| SHA-256 | identyczny z `source_url` portalu miejskiego |
| Uwaga | mirror krajowy ma **starsze** metadane (2024), ale ten sam plik; nie zawiera nowszych punktów |

---

## 12. Reprodukcja

```bash
BASE=https://dane.przemysl.eu/wp-json/sod/v1
curl -sS "$BASE/datasets/13" | jq .
curl -sS "$BASE/resources?dataset_id=13" | jq .
curl -sS "$BASE/resources/15" | jq .
curl -sS "$BASE/resources/15/data" | jq '.data.pagination, .geo.bbox'
curl -sS "$BASE/resources/15/data?format=geojson" | jq '.features | length'
curl -sS "$BASE/resources/15/data?format=csv&limit=100" | \
  python3 -c 'import json,sys; sys.stdout.write(json.load(sys.stdin))' | head
curl -sS "$BASE/resources/15.data.csv" | \
  python3 -c 'import json,sys; sys.stdout.write(json.load(sys.stdin))' | head
curl -sS "$BASE/resources/15/structured" | jq '.columns, .total_rows'
curl -sS "$BASE/resources/15/geojson" | sha256sum
curl -sS "$BASE/resources/15/kml" -w '\n%{http_code}\n'   # 404 sod_geo_missing
curl -sS -D - -o /dev/null "$BASE/resources/15/data"      # nagłówki, rate limit
```

Pliki dowodowe w tym katalogu (`przemysl/` = surowe odpowiedzi API):

| Plik | Zawartość |
| --- | --- |
| `przemysl/dataset-13.json` | metadane zbioru 13 |
| `przemysl/resources-dataset-13.json` | lista zasobów zbioru |
| `przemysl/resource-15.json` | metadane zasobu 15 |
| `przemysl/resource-15-structured.json` | 21 rekordów, 19 kolumn (z geometrią) |
| `przemysl/resource-15.geojson` | FeatureCollection 21 punktów |
| `przemysl/resource-15.csv` | CSV 21 rekordów, 14 kolumn (bez współrzędnych; **po dekodowaniu** body) |
| `przemysl/resource-15.csv.raw-body` | surowe body CSV z `/data?format=csv` (string JSON, 10 wierszy) — dowód wady |
| `przemysl/resource-15.decoded.csv` | zdekodowany CSV z `/resources/15.data.csv` (21 wierszy) |
| `przemysl/resource-15.csv-metadata.json` | CSVW |
| `przemysl/resource-15.metadata.jsonld` | DCAT JSON-LD zasobu |
| `przemysl/resource-15.openapi.json` | OpenAPI zasobu |
| `przemysl/sod-openapi.json` | OpenAPI całego API |
| `przemysl/upstream-2024-11-05.geojson` | plik źródłowy, SHA-256 `2f49fe...1797` |
| `http-log.txt` | log realnych zapytań i odpowiedzi |

---

## 13. Otwarte pytania do wydawcy

1. Dlaczego ten sam plik ma CC BY 4.0 w portalu miejskim i CC0 1.0 w dane.gov.pl?
2. Czy po 2024-11-05 dodano/przeniesiono punkty AED? Metadane sugerują aktualizacje, checksum nie.
3. Czy numer AED 7639 w rekordach 757 i 764 to duplikat, czy dwa urządzenia?
4. Czy można udostępnić pola: operator, godziny dostępu, 24/7, indoor/outdoor, model, data przeglądu?
5. Czy `bbox` i `fields=latitude,longitude` mają działać? Obecnie `bbox` jest ignorowany, a współrzędne w `/data` są niedostępne.
6. Czy `updated`/`data_date` mogą odzwierciedlać faktyczną weryfikację danych, a nie odświeżenie cache?
