# Defibrylatory AED na terenie miasta Przemyśla - badanie źródła danych

- **Data badania:** 2026-11-21, godz. 18:02-18:14 UTC (19:02-19:14 czasu lokalnego, Europe/Warsaw)
- **Portal:** <https://dane.przemysl.eu/>
- **Zbiór:** `Defibrylatory AED na terenie miasta Przemyśla`
- **ID zbioru:** `13`, **ID zasobu:** `15`
- **Identyfikator zbioru:** `PRZ-DEFIBRYLATOR`
- **Wydawca:** Straż Miejska w Przemyślu
- **Licencja:** Creative Commons Uznanie autorstwa 4.0 Międzynarodowa (CC BY 4.0)
- **Wersja portalu:** Studio Otwartych Danych (SOD) `0.9.334.0`, OpenAPI 3.2.1, JSON Schema 2020-12

---

## 1. Podsumowanie wykonawcze

- Portal **nie jest CKAN**. Wywołanie `/api/3/action/package_search` zwraca stronę 404 WordPress. Portal działa na WordPressie z wtyczką **Studio Otwartych Danych (SOD)** i publicznym REST API pod `/wp-json/sod/v1`.
- Dane są dostępne jako **JSON, CSV i GeoJSON**, a także jako pełne eksporty `.data.json` i `.data.csv`, nieudokumentowany endpoint `/resources/15/structured` oraz metadane DCAT/JSON-LD i CSVW.
- Najlepszy pojedynczy endpoint tabelaryczno-przestrzenny to `GET /resources/15/structured`. Zwraca 21 wierszy i 19 kolumn, w tym `geometry`, `longitude` i `latitude`. Nie ma go w OpenAPI.
- API jest **publiczne, bez uwierzytelniania**, z limitem **120 żądań na minutę** (nagłówki `X-RateLimit-*`) i CORS `*`.
- Zasób zawiera **21 rekordów** i **21 punktów GeoJSON**. Wszystkie rekordy mają współrzędne w obrębie Przemyśla.
- Współrzędne są w kolejności `[longitude, latitude]`, bez deklaracji `crs`. Należy je traktować jako **EPSG:4326 (WGS 84)**, zgodnie z RFC 7946. Nie ma dowodu na inny układ.
- Największe ograniczenia danych: brak operatora, godzin dostępu, informacji o dostępności 24/7, modelu i numeru seryjnego urządzenia, daty instalacji i przeglądu. Numery AED są tylko fragmentem pola `name`.
- Występują błędy jakościowe: **duplikat numeru AED 7639** w dwóch rekordach, niespójny format numeru AED, literówki, puste numery budynku w dwóch rekordach oraz błędny link szkoły przy jednym rekordzie.
- Deklarowana częstotliwość to **„Na bieżąco (ciągła)”** (`CONT`), ale metadane aktualizacji są niespójne, a plik źródłowy w SkyCMS ma znacznik czasu **2024-11-05**. To raczej snapshot niż strumień.
- Eksport CSV jest **technicznie wadliwy**: zwraca `Content-Type: text/csv`, ale treść jest **literałem JSON string** z escapowanym BOM i `\n`, a nie czystym CSV. Do integracji lepiej używać JSON.
- Ten sam plik jest też w krajowym portalu `dane.gov.pl` jako **dataset 4581**, z deklaracją **CC0 1.0** i częstotliwością `Codziennie`. GeoJSON jest bit-identyczny, ale metadane są starsze.
- `format=geojson` ignoruje `limit`, `offset` i `bbox` i zawsze zwraca wszystkie 21 punktów. `format=kml` i `format=gpx` zwracają HTTP 200 z JSON zamiast błędu.

---

## 2. Identyfikacja zbioru i zasobu

| Pole | Wartość |
|---|---|
| Tytuł zbioru | `Defibrylatory AED na terenie miasta Przemyśla` |
| Tytuł EN (DCAT) | `AEDs in the City of Przemyśl` |
| `id` zbioru | `13` |
| `identifier` | `PRZ-DEFIBRYLATOR` |
| `id` zasobu | `15` |
| Format zasobu w metadanych | `geojson` |
| Strona zbioru | <https://dane.przemysl.eu/zbiory-danych/defibrylatory-aed-na-terenie-miasta-przemysla/> |
| Strona zasobu | <https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/> |
| `publisher` | `Straż Miejska w Przemyślu` |
| `dcat:contactPoint` | `vcard:fn`: `Straż Miejska w Przemyślu`, e-mail `sekretariat@smprzemysl.pl`, tel. `+48166752061` |
| `dcat:theme` | `JUST` - Wymiar sprawiedliwości, system prawny i bezpieczeństwo publiczne |
| Słowa kluczowe PL | `Bezpieczeństwo`, `Ochrona`, `Obrona Cywilna`, `AED`, `Defibrylatory`, `Pomoc`, `Ratowanie Życia`, `Dane`, `Lista`, `Mapa`, `Przemyśl` |
| `dct:spatial` | `Miasto Przemyśl` |
| `dct:temporal` | `OD 2021` |
| `accrual_periodicity` | `http://publications.europa.eu/resource/authority/frequency/CONT` |
| Etykieta częstotliwości | `Na bieżąco (ciągła)` |
| `version` | `1.1` |
| `lifecycle_status` | `active` |
| `is_archived` | `false` |
| `is_deprecated` | `false` |

Opis zbioru w API jest długi i marketingowo-użytkowy. Wskazuje dwa widoki danych: tabelaryczny i mapowy. Nie zawiera informacji o operatorze urządzeń ani o zasadach dostępu.

---

## 3. Adresy, statusy HTTP i typy odpowiedzi

Wszystkie poniższe żądania wykonano metodą `GET` w dniu **2026-11-21**. Rozmiary podano w bajtach odpowiedzi.

| Zasób | URL | HTTP | `Content-Type` | Rozmiar | Uwagi |
|---|---|---:|---|---:|---|
| Strona zbioru | `https://dane.przemysl.eu/zbiory-danych/defibrylatory-aed-na-terenie-miasta-przemysla/` | 200 | `text/html; charset=UTF-8` | 64208 | HTML WordPress |
| Strona zasobu | `https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/` | 200 | `text/html; charset=UTF-8` | 72841 | HTML WordPress |
| Metadane zbioru | `https://dane.przemysl.eu/wp-json/sod/v1/datasets/13` | 200 | `application/json; charset=UTF-8` | 3826 | Zawiera `resources[]` |
| Lista zasobów | `https://dane.przemysl.eu/wp-json/sod/v1/resources?dataset_id=13` | 200 | `application/json; charset=UTF-8` | 426 | Jeden zasób, `id=15` |
| Metadane zasobu | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15` | 200 | `application/json; charset=UTF-8` | 2985 | `source_url`, `api_data`, `geojson` |
| Dane JSON | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data` | 200 | `application/json; charset=utf-8` | 26908 | Domyślnie 10 z 21 wierszy |
| Dane JSON, wszystkie | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?limit=100` | 200 | `application/json; charset=utf-8` | 51036 | 21 wierszy |
| Dane CSV | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=csv` | 200 | `text/csv; charset=utf-8` | 20888 | Treść to JSON string, 10 wierszy |
| Dane CSV, wszystkie | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=csv&limit=1000` | 200 | `text/csv; charset=utf-8` | 43928 | JSON string, 21 wierszy |
| Dane GeoJSON | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=geojson` | 200 | `application/geo+json; charset=utf-8` | 56308 | 21 features, poprawne `geo+json` |
| GeoJSON zasobu | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/geojson` | 200 | `application/json; charset=UTF-8` | 56308 | Ten sam body, inny `Content-Type` |
| Structured, tabela + geometria | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/structured` | 200 | `application/json; charset=UTF-8` | 52632 | 21 wierszy, 19 kolumn, nie ma w OpenAPI |
| Pełny JSON | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15.data.json` | 200 | `application/json; charset=utf-8` | 140694 | 21 wierszy, inne typy |
| Pełny CSV | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15.data.csv` | 200 | `text/csv; charset=utf-8` | 43928 | JSON string, 21 wierszy |
| Metadane JSON-LD zasobu | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15.metadata.jsonld` | 200 | `application/ld+json; charset=utf-8` | 4844 | DCAT Dataset |
| Metadane CSVW | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15.data.csv-metadata.json` | 200 | `application/json; charset=utf-8` | 1063 | Schemat kolumn CSV |
| OpenAPI zasobu | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15.openapi.json` | 200 | `application/json; charset=utf-8` | 7208 | Poprawna ścieżka |
| Błędny OpenAPI zasobu | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/openapi.json` | 404 | `application/json; charset=UTF-8` | 135 | `rest_no_route` |
| OpenAPI globalne | `https://dane.przemysl.eu/wp-json/sod/v1/openapi.json` | 200 | `application/json; charset=UTF-8` | 20110 | OpenAPI 3.2.1 |
| Katalog DCAT JSON-LD | `https://dane.przemysl.eu/wp-json/sod/v1/dcat.jsonld` | 200 | `application/ld+json; charset=utf-8` | 673578 | 62 datasety |
| Katalog DCAT Turtle | `https://dane.przemysl.eu/wp-json/sod/v1/dcat.ttl` | 200 | `text/turtle; charset=utf-8` | 432926 | Na początku warning PHP |
| KML zasobu | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/kml` | 404 | `application/json; charset=UTF-8` | 93 | `sod_geo_missing` |
| SHP zasobu | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/shp.zip` | 404 | `application/json; charset=UTF-8` | 93 | `sod_geo_missing` |
| Nieznany format | `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=xml` | 400 | `application/json; charset=UTF-8` | 162 | `rest_invalid_param` |
| Źródło SkyCMS | `https://przemysl.skycms.com.pl/open-data/20/1730818801_b50R6UVxPgoVdBbq/geojson` | 200 | `application/json` | 48823 | Plik źródłowy, `Content-Disposition: attachment` |

### Nagłówki odpowiedzi API

Dla `GET /wp-json/sod/v1/resources/15/data` zaobserwowano:

```http
HTTP/1.1 200 OK
Server: nginx
Content-Type: application/json; charset=utf-8
X-Robots-Tag: noindex
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Cache-Control: public, max-age=300, must-revalidate
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 1795284600
Allow: GET
```

`X-RateLimit-Reset` wskazuje koniec bieżącej minuty. OpenAPI deklaruje nagłówki `ETag` i `Last-Modified`, ale **w badanych odpowiedziach ich nie było**. To utrudnia warunkowe pobieranie.

---

## 4. Architektura API

- Bazowy URL: `https://dane.przemysl.eu/wp-json/sod/v1`
- Licznik katalogu ODE: `GET /wp-json/ode/v2/catalog` zwraca `{"datasets":62,"resources":120,"providers":11}`.
- Silnik: WordPress + wtyczka **Studio Otwartych Danych (SOD)**
- Specyfikacja: **OpenAPI 3.2.1**, `jsonSchemaDialect`: JSON Schema 2020-12
- Wersja API w `info.version`: **`0.9.334.0`**
- Strona dokumentacji `?ode_page=api` podaje jednak **`0.9.255.0`**. To niespójność wersji.
- Wszystkie operacje to `GET`.
- Brak `components.securitySchemes` i brak globalnego `security`. API jest publiczne.

### Endpointy istotne dla integracji

| Endpoint | Parametry | Przeznaczenie |
|---|---|---|
| `/datasets` | `limit`, `offset` | Lista zbiorów |
| `/datasets/{id}` | `id` | Metadane zbioru |
| `/resources` | `dataset_id`, `limit`, `offset` | Lista zasobów |
| `/resources/{id}` | `id` | Metadane zasobu |
| `/resources/{id}/data` | `format`, `fields`, `limit`, `offset`, `bbox` | Dane tabelaryczne lub GeoJSON |
| `/resources/{id}/geojson` | `id` | GeoJSON zasobu |
| `/resources/{id}/structured` | `page`, `per_page` | Tabela z geometrią, nieudokumentowany w OpenAPI |
| `/resources/{id}/kml` | `id` | KML, jeśli zasób ma warstwę GIS |
| `/resources/{id}/shp.zip` | `id` | SHP, jeśli zasób ma warstwę GIS |
| `/dataservices`, `/dataservices/{id}` | - | Usługi danych DCAT |
| `/dataservices.openapi.json` | - | OpenAPI usług danych |
| `/forms`, `/forms/{id}`, `/forms/{id}/data` | - | Formularze danych |
| `/openapi.json` | - | Globalny kontrakt OpenAPI |
| `/dcat.jsonld`, `/dcat.ttl` | - | Katalog DCAT |

### Parametry `/resources/{id}/data`

| Parametr | Typ | Wartości | Zachowanie zaobserwowane |
|---|---|---|---|
| `format` | string | `json`, `csv`, `geojson`, `kml`, `gpx`; domyślnie `json` | `kml` i `gpx` zwracają 200 z JSON, nie KML/GPX |
| `fields` | string | lista nazw kolumn po przecinku | Działa, zawęża `columns` i obiekty wierszy |
| `limit` | integer >= 1 | brak udokumentowanego maksimum | Domyślnie 10, `100` i `500` dają 21 |
| `offset` | integer >= 0 | indeks od 0 | Działa dla JSON |
| `bbox` | string | `minLon,minLat,maxLon,maxLat` | W testach ignorowany, także z `format=geojson` |

Dodatkowo, mimo braku w OpenAPI, działają `sort_by` i `sort_dir` (`asc`/`desc`). Przykład `sort_by=name&sort_dir=desc&limit=3` zwrócił posortowane rekordy i odzwierciedlił sortowanie w `pagination`.

### Paginacja

Domyślna odpowiedź JSON zawiera 10 wierszy i obiekt:

```json
{
  "limit": 10,
  "offset": 0,
  "total_rows": 21,
  "source_total_rows": 21,
  "complete": true,
  "sort_by": "",
  "sort_dir": "asc"
}
```

`limit=2&offset=1` zwrócił 2 wiersze od drugiego rekordu. `limit=100` i `limit=500` zwróciły wszystkie 21 wierszy. `format=csv` respektuje domyślny limit 10, więc bez `limit` eksportuje tylko 10 rekordów.

### Uwierzytelnianie i limity

- **Brak uwierzytelniania**. Nie ma klucza API, nagłówka `Authorization` ani `securitySchemes`.
- API jest tylko do odczytu, `Allow: GET`.
- Limit: **120 żądań na minutę** na podstawie `X-RateLimit-Limit: 120` i resetu w granicy minuty.
- CORS: `Access-Control-Allow-Origin: *`.
- Cache: `Cache-Control: public, max-age=300, must-revalidate`, bez zaobserwowanego `ETag`.
- Dokumentacja portalu wspomina o możliwym HTTP 429 po przekroczeniu limitu. Nie wywoływano 429 celowo.

---

## 5. Format JSON `/resources/15/data`

### 5.1. Koperta odpowiedzi

```json
{
  "resource": {
    "id": 15,
    "title": "Defibrylatory AED na terenie miasta Przemyśla",
    "permalink": "https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/",
    "format": "geojson",
    "dataset_id": 13,
    "dataset_title": "Defibrylatory AED na terenie miasta Przemyśla",
    "updated": "2026-05-15 11:59:03",
    "stars": 5,
    "api": {
      "json": "https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data",
      "csv": "https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=csv",
      "geojson": "https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=geojson",
      "openapi": "https://dane.przemysl.eu/wp-json/sod/v1/openapi.json"
    }
  },
  "data": {
    "columns": ["id", "name", "description", "category", "city", "street", "home_number", "postcode", "phone", "email", "www", "gallery", "attachments", "links"],
    "rows": [],
    "pagination": {}
  },
  "geo": {
    "points": [],
    "bbox": {},
    "count": 21
  }
}
```

`geo.points[]` zawiera uproszczone obiekty `{ "lat": number, "lng": number, "title": string }`. `geo.bbox` zawiera `minLat`, `minLng`, `maxLat`, `maxLng`.

### 5.2. Schemat pól w `data.rows[]`

Wszystkie 21 rekordów mają ten sam zestaw 14 kolumn. W normalizowanej odpowiedzi JSON puste wartości są **pustymi stringami**, nie `null`.

| Pole | Typ JSON | Nullowalne | Wystąpienia niepuste | Przykład / uwagi |
|---|---|---:|---:|---|
| `id` | `integer` | nie | 21/21 | `744`-`765`, bez `750` |
| `name` | `string` | nie | 21/21 | `Defibrylator (AED 9485) w ADM Centrum` |
| `description` | `string` | nie | 21/21 | Długi, ogólny opis AED, powtarzany w rekordach |
| `category` | `string` | nie | 21/21 | Zawsze `Defibrylatory AED` |
| `city` | `string` | nie | 21/21 | Zawsze `Przemyśl` |
| `street` | `string` | nie | 21/21 | `Juliusza Słowackiego` |
| `home_number` | `string` | nie | 19/21 | `12`, `1`, `""` dla `id=753` i `id=755` |
| `postcode` | `string` | nie | 21/21 | Zawsze `37-700` |
| `phone` | `string` | nie | 1/21 | `+48166779500` przy `id=746` |
| `email` | `string` | nie | 2/21 | `lo1@um.przemysl.pl`, `sp6@um.przemysl.pl` |
| `www` | `string` | nie | 2/21 | `https://lo1.przemysl.edu.pl`, `https://sp6.przemysl.edu.pl` |
| `gallery` | `array<object>` | nie | 21/21 | Obiekty z `url`, `thumbUrl`, `thumbUrlMedium` |
| `attachments` | `array` | nie | 0/21 | Zawsze `[]` |
| `links` | `array<object>` | nie | 2/21 | Obiekty z `title`, `url`, `link_type` |

### 5.3. Przykładowy rekord, skrócony

```json
{
  "id": 744,
  "name": "Defibrylator (AED 9485) w ADM Centrum",
  "description": "Defibrylator AED (Automated External Defibrillator) to przenośne urządzenie medyczne... [obcięto]",
  "category": "Defibrylatory AED",
  "city": "Przemyśl",
  "street": "Juliusza Słowackiego",
  "home_number": "12",
  "postcode": "37-700",
  "phone": "",
  "email": "",
  "www": "",
  "gallery": [
    {
      "url": "https://przemysl.skycms.com.pl/download/156869/defibrylator-aed-9485-w-adm-centrum",
      "thumbUrl": "https://przemysl.skycms.com.pl/download/thumbnailCustom/156869/auto/120/defibrylator-aed-9485-w-adm-centrum",
      "thumbUrlMedium": "https://przemysl.skycms.com.pl/download/thumbnailCustom/156869/300/auto/defibrylator-aed-9485-w-adm-centrum"
    }
  ],
  "attachments": [],
  "links": []
}
```

Rekord z linkiem, `id=745`:

```json
{
  "id": 745,
  "name": "Defibrylator (AED 9556) w I Liecum Ogólnokształcącym w Przemyślu",
  "email": "lo1@um.przemysl.pl",
  "www": "https://lo1.przemysl.edu.pl",
  "links": [
    {
      "title": "Strona Internetowa Szkoły",
      "url": "https://sp6.przemysl.edu.pl",
      "link_type": "Oficjalna strona"
    }
  ]
}
```

Uwaga: link przy `id=745` prowadzi do strony SP 6, a nie I LO. To prawdopodobny błąd kopiowania.

### 5.4. Endpoint `/resources/15/structured`

`GET /resources/15/structured` zwraca HTTP 200, `application/json`, 52632 B. To **nieudokumentowany w OpenAPI** wariant tabeli z geometrią.

```json
{
  "resource_id": 15,
  "columns": [
    "id", "name", "description", "category", "city", "street",
    "home_number", "postcode", "phone", "email", "www",
    "youtube_url", "panorama_url", "gallery", "attachments", "links",
    "geometry", "longitude", "latitude"
  ],
  "total_rows": 21,
  "page": 1,
  "per_page": 100,
  "rows": []
}
```

Właściwości:

- 19 kolumn, w tym `geometry` (`Point`), `longitude` i `latitude`.
- `home_number` jest stringiem, puste wartości pozostają `""`.
- `gallery`, `attachments`, `links` są tablicami, tak jak w `/data?format=json`.
- `youtube_url` i `panorama_url` są obecne, ale zawsze puste.
- Paginacja przez `page` i `per_page`. `page=2&per_page=5` zwróciło 5 wierszy od `id=749`.
- To najlepszy pojedynczy endpoint, jeśli potrzebna jest tabela i geometria bez łączenia JSON z GeoJSON.

Uwaga na `fields`: `GET /resources/15/data?fields=latitude,longitude` zwraca kolumny `latitude` i `longitude`, ale ich wartości są `null`, ponieważ kanoniczna tabela `/data` nie zawiera współrzędnych. Współrzędne są dostępne w `/structured` oraz w GeoJSON.

---

## 6. Format CSV

### 6.1. Zachowanie

`GET /resources/15/data?format=csv` zwraca:

- HTTP 200
- `Content-Type: text/csv; charset=utf-8`
- treść zaczynającą się od bajtów `"\\ufeffid,name,description,...`
- **zero rzeczywistych znaków nowej linii** w body
- wszystkie `\n` i `\"` są escapowane

To oznacza, że serwer zwraca **JSON-owy literał stringa**, a nie czysty CSV. Po `json.loads` otrzymujemy dopiero właściwy tekst CSV z BOM i znakami nowej linii.

Przykład pierwszych bajtów:

```text
22 5c 75 66 65 66 66 69 64 2c 6e 61 6d 65 2c 64 ...
"  \  u  f  e  f  f  i  d  ,  n  a  m  e  ,  d ...
```

### 6.2. Liczba wierszy

| Wywołanie | Wiersze danych |
|---|---:|
| `?format=csv` | 10 |
| `?format=csv&limit=1000` | 21 |
| `?format=csv&limit=100` | 21 |

Domyślny limit 10 działa więc także dla CSV. Aby pobrać pełny zbiór, trzeba podać `limit` co najmniej 21.

### 6.3. Schemat CSVW

`GET /resources/15.data.csv-metadata.json` zwraca:

```json
{
  "@context": "http://www.w3.org/ns/csvw",
  "url": "https://dane.przemysl.eu/wp-json/sod/v1/resources/15.data.csv",
  "dialect": {
    "delimiter": ",",
    "encoding": "utf-8",
    "header": true,
    "lineTerminators": ["\r\n"]
  },
  "tableSchema": {
    "columns": [
      { "name": "id", "titles": ["id"], "datatype": "integer" },
      { "name": "name", "titles": ["name"], "datatype": "string" },
      { "name": "description", "titles": ["description"], "datatype": "string" },
      { "name": "category", "titles": ["category"], "datatype": "string" },
      { "name": "city", "titles": ["city"], "datatype": "string" },
      { "name": "street", "titles": ["street"], "datatype": "string" },
      { "name": "home_number", "titles": ["home_number"], "datatype": "integer" },
      { "name": "postcode", "titles": ["postcode"], "datatype": "string" },
      { "name": "phone", "titles": ["phone"], "datatype": "string" },
      { "name": "email", "titles": ["email"], "datatype": "string" },
      { "name": "www", "titles": ["www"], "datatype": "string" },
      { "name": "gallery", "titles": ["gallery"], "datatype": "string" },
      { "name": "attachments", "titles": ["attachments"], "datatype": "string" },
      { "name": "links", "titles": ["links"], "datatype": "string" }
    ]
  }
}
```

Niespójność: CSVW deklaruje `home_number` jako `integer`, ale w danych pole jest tekstowe i może być puste. `gallery`, `attachments` i `links` są w CSV stringami zawierającymi JSON.

---

## 7. Format GeoJSON

### 7.1. Struktura

`GET /resources/15/data?format=geojson` zwraca `FeatureCollection` z 21 obiektami `Feature`.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 744,
      "geometry": {
        "type": "Point",
        "coordinates": [22.7750936, 49.7812096]
      },
      "properties": {
        "id": 744,
        "name": "Defibrylator (AED 9485) w ADM Centrum",
        "description": "... [obcięto]",
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
        "gallery": [
          {
            "url": "https://przemysl.skycms.com.pl/download/156869/defibrylator-aed-9485-w-adm-centrum",
            "thumbUrl": "https://przemysl.skycms.com.pl/download/thumbnailCustom/156869/auto/120/defibrylator-aed-9485-w-adm-centrum",
            "thumbUrlMedium": "https://przemysl.skycms.com.pl/download/thumbnailCustom/156869/300/auto/defibrylator-aed-9485-w-adm-centrum"
          }
        ],
        "attachments": [],
        "links": [],
        "geometry": {
          "type": "Point",
          "coordinates": [22.7750936, 49.7812096]
        },
        "longitude": 22.7750936,
        "latitude": 49.7812096
      }
    }
  ]
}
```

### 7.2. Pola dodatkowe względem JSON

GeoJSON ma 19 pól w `properties`. Względem `data.rows[]` dochodzą:

| Pole | Typ | Wartość w 21 rekordach |
|---|---|---|
| `youtube_url` | `string` | Zawsze `""` |
| `panorama_url` | `string` | Zawsze `""` |
| `geometry` | `object` | `{ "type": "Point", "coordinates": [lon, lat] }` |
| `longitude` | `number` | `22.7482498`-`22.7912987` |
| `latitude` | `number` | `49.7781797`-`49.7972693` |

Pole `id` występuje zarówno na poziomie `Feature.id`, jak i w `properties.id`.

### 7.3. Układ współrzędnych i EPSG

- Brak pola `crs` w GeoJSON.
- Kolejność współrzędnych to `[longitude, latitude]`, zgodnie z RFC 7946.
- Zakresy: długość `22.7482498`-`22.7912987`, szerokość `49.7781797`-`49.7972693`.
- To wartości typowe dla Przemyśla we **WGS 84**.
- Wniosek: **EPSG:4326 (WGS 84)**, układ odwzorowany jako „inferred”, bez deklaracji w danych.
- `geo.bbox`: `minLat=49.7781797`, `minLng=22.7482498`, `maxLat=49.7972693`, `maxLng=22.7912987`.
- 21 punktów, brak zduplikowanych współrzędnych na poziomie 6 miejsc po przecinku.

### 7.4. Różnice między endpointami GeoJSON

| Cecha | `/resources/15/data?format=geojson` | `/resources/15/geojson` |
|---|---|---|
| HTTP | 200 | 200 |
| `Content-Type` | `application/geo+json; charset=utf-8` | `application/json; charset=UTF-8` |
| Body | identyczne | identyczne |
| SHA-256 body | `051376d9ad94ad0e6c52631e3398219c595b438449b24aa7308c90b1f16f594a` | ten sam |
| Paginacja | ignorowana | brak parametrów |

`format=geojson` **ignoruje** `limit`, `offset` i `bbox`. Testy `limit=2&offset=1` oraz `bbox=22.75,49.78,22.77,49.79` zwróciły wszystkie 21 features. Prawdopodobna przyczyna: `geo_layer` zasobu ma wartość `null`, a geometrie są tylko osadzone w eksporcie.

---

## 8. Pełne eksporty `.data.json` i `.data.csv`

### 8.1. `.data.json`

`GET /resources/15.data.json` zwraca 21 wierszy, ale w innym kontrakcie niż `/data?format=json`:

```json
{
  "columns": ["id", "name", "description", "...", "links"],
  "rows": [ ... 21 obiektów ... ],
  "items": [ ... 21 obiektów, te same dane ... ],
  "total_rows": 21,
  "jsonapi": { "version": "1.0" },
  "data": [ ... 21 obiektów ... ],
  "meta": {
    "resource_id": 15,
    "count": 21,
    "generated_at": "2026-11-21T19:07:14+01:00",
    "schema": {
      "fields": [
        { "name": "id", "title": "id" },
        { "name": "name", "title": "name" }
      ]
    }
  }
}
```

Różnice typów względem `/data?format=json`:

| Pole | `/data?format=json` | `.data.json` |
|---|---|---|
| `home_number` | `string`, np. `"12"` lub `""` | `integer` lub `null` |
| `phone`, `email`, `www` | `string`, puste `""` | `string` lub `null` |
| `gallery` | `array<object>` | `string` z JSON |
| `attachments` | `array` | `string` z JSON |
| `links` | `array<object>` | `string` z JSON |

To ważne: `.data.json` nie jest zamiennikiem `/data?format=json` bez dodatkowej normalizacji.

### 8.2. `.data.csv`

`GET /resources/15.data.csv` ma ten sam problem co `format=csv`: HTTP 200, `text/csv`, ale body to JSON string z escapowanym CSV. Zwraca 21 wierszy.

---

## 9. DCAT i JSON-LD

Portal publikuje katalog DCAT w JSON-LD oraz Turtle. Katalog **nie jest CKAN**. To DCAT generowany przez SOD.

### 9.1. Katalog

| Pole DCAT | Wartość |
|---|---|
| `@id` | `https://dane.przemysl.eu/wp-json/sod/v1/dcat.jsonld` |
| `@type` | `dcat:Catalog` |
| `dct:title` | `Katalog danych` |
| `dct:description` | `Katalog danych publikowanych w portalu otwartych danych.` |
| `dct:language` | `pl` |
| `dcat:dataset` | tablica **62** wpisów |
| `dct:publisher` | obiekt wydawcy katalogu |
| `dct:issued`, `dct:modified` | daty katalogu |
| `dcat:service` | usługi danych |

Uwaga: `/datasets?limit=100` zwróciło **61** zbiorów, a DCAT zawiera **62**. Różnica może wynikać z widoczności lub statusu cyklu życia jednego zbioru.

### 9.2. Wpis zbioru AED w DCAT

| Pole DCAT | Wartość |
|---|---|
| `@id` | `https://dane.przemysl.eu/zbiory-danych/defibrylatory-aed-na-terenie-miasta-przemysla/` |
| `@type` | `dcat:Dataset` |
| `dct:title` | `["Defibrylatory AED na terenie miasta Przemyśla", {"@value":"AEDs in the City of Przemyśl","@language":"en"}]` |
| `dct:description` | dwujęzyczna tablica PL/EN |
| `dct:issued` | `2026-01-08T19:28:55+01:00` |
| `dct:modified` | `2026-01-20T17:58:39+01:00` |
| `dcat:landingPage` | strona zbioru |
| `dcat:version` | `1.1` |
| `dct:publisher` | `{"@type":"foaf:Agent","foaf:name":"Straż Miejska w Przemyślu","dct:identifier":"650254467"}` |
| `dcat:contactPoint` | `{"@type":"vcard:Kind","vcard:fn":"Straż Miejska w Przemyślu","vcard:hasEmail":"mailto:sekretariat@smprzemysl.pl","vcard:hasTelephone":"tel:+48166752061"}` |
| `dct:identifier` | `PRZ-DEFIBRYLATOR` |
| `dcat:keyword` | 11 wartości PL + 7 wartości EN |
| `dcat:theme` | `JUST` |
| `dct:license` | `{"@id":"https://dane.przemysl.eu/creative-commons-cc-by-4-0/"}` |
| `dct:accrualPeriodicity` | `{"@id":"http://publications.europa.eu/resource/authority/frequency/CONT"}` |
| `dct:spatial` | `Miasto Przemyśl` |
| `dct:temporal` | `OD 2021` |
| `dct:conformsTo` | `{"@id":"https://spec.openapis.org/oas/v3.0.3"}` |
| `dct:provenance` | `Dane pochodzą z interaktywnej mapy Miasta Przemyśla i aktualizowane są w systemie zewnętrznym, przekazywane za pomocą API.` |
| `dcat:service` | `https://dane.przemysl.eu/uslugi-danych/api-dane-zasobu/` |

Niespójność: `dct:conformsTo` wskazuje OpenAPI **3.0.3**, a faktyczna specyfikacja to **3.2.1**.

### 9.3. Dystrybucja w DCAT

| Pole DCAT Distribution | Wartość |
|---|---|
| `@id` | `https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/` |
| `@type` | `dcat:Distribution` |
| `dct:title` | `Defibrylatory AED na terenie miasta Przemyśla` |
| `dct:modified` | `2026-04-29T05:27:28+02:00` |
| `dct:format` | `geojson` |
| `dcat:mediaType` | `application/geo+json` |
| `dcat:accessURL` | `https://przemysl.skycms.com.pl/open-data/20/1730818801_b50R6UVxPgoVdBbq/geojson` |
| `dct:license` | `https://dane.przemysl.eu/creative-commons-cc-by-4-0/` |
| `spdx:checksum` | `{"@type":"spdx:Checksum","spdx:checksumValue":"2f49fe5394c1eb9e841ad5921b19c1cade6b843278d7283534658f0caba01797"}` |
| `dcat:accessService` | `https://dane.przemysl.eu/uslugi-danych/api-dane-zasobu/` |

Suma SHA-256 źródła została zweryfikowana: pobrany plik SkyCMS ma dokładnie `2f49fe5394c1eb9e841ad5921b19c1cade6b843278d7283534658f0caba01797`.

### 9.4. Metadane JSON-LD zasobu

`GET /resources/15.metadata.jsonld` zwraca `dcat:Dataset` z:

- `dct:identifier`: `sod-resource-15`
- `dct:issued`: `2026-01-08T20:34:15+01:00`
- `dct:modified`: `2026-04-29T05:27:28+00:00`
- `dct:license`: CC BY 4.0
- `dct:publisher`: `Otwarte Dane Przemyśl`
- `dct:isPartOf`: zbiór `13`
- `dcat:keyword`: 7 wartości
- `dcat:distribution`: trzy dystrybucje:
  - `15.data.csv` (`text/csv`, CSVW)
  - `15.data.json` (`application/json`)
  - `15.data.csv-metadata.json` (`application/json`)
- `dct:conformsTo`: DCAT 2 i Tabular Data Model
- `schema:mainEntityOfPage`: `15.openapi.json`

### 9.5. DCAT Turtle

`GET /dcat.ttl` zwraca HTTP 200 i `text/turtle`, ale body zaczyna się od ostrzeżenia PHP:

```html
<br /> <b>Warning</b>: Array to string conversion in <b>/home/users/umprzemysl/public_html/dane/wp-content/plugins/studio-otwartych-danych/includes/class-sod-dcat.php</b> on line <b>1395</b><br /> "@...
```

To czyni eksport Turtle **niepoprawnym składniowo** bez wstępnego oczyszczenia. JSON-LD jest wiarygodniejszy.

---

## 10. Źródło upstream SkyCMS

Zasób ma `source_mode: "url"` i `source_url`:

```text
https://przemysl.skycms.com.pl/open-data/20/1730818801_b50R6UVxPgoVdBbq/geojson
```

| Cecha | Wartość |
|---|---|
| HTTP | 200 |
| `Content-Type` | `application/json` |
| `Content-Disposition` | `attachment; filename=1730818801_b50R6UVxPgoVdBbq.geojson` |
| Rozmiar | 48823 B |
| SHA-256 | `2f49fe5394c1eb9e841ad5921b19c1cade6b843278d7283534658f0caba01797` |
| `features` | 21 |
| `crs` | brak |
| `Feature.id` | brak na poziomie feature, tylko `properties.id` |
| Typ geometrii | `Point`, `[lon, lat]` |

Pola `properties` w źródle:

```text
id, name, description, category, city, street, home_number, postcode,
phone, email, www, youtube_url, panorama_url, gallery, attachments, links
```

Różnice względem API SOD:

- `id` w źródle jest **stringiem**, w API SOD jest **integerem**.
- `gallery`, `attachments`, `links` w źródle są **stringami z JSON**, w `/data?format=json` są już tablicami.
- Źródło ma `youtube_url` i `panorama_url`, których nie ma w `data.rows[]`, ale są w GeoJSON.
- Źródło nie ma `geometry` ani `longitude`/`latitude` w `properties`, tylko standardowe `geometry` na poziomie feature.
- Źródło nie ma `Feature.id`.

Znacznik w nazwie pliku `1730818801` odpowiada **2024-11-05T15:00:01Z**. To sugeruje, że sam plik źródłowy powstał w listopadzie 2024, mimo późniejszych dat metadanych. Istniejąca kopia `AED/docs/research/raw/przemysl/upstream-2024-11-05.geojson` ma identyczną sumę SHA-256.

---

## 11. Licencja

| Element | Wartość |
|---|---|
| Deklaracja portalu | Creative Commons Uznanie autorstwa 4.0 Międzynarodowa (**CC BY 4.0**) |
| Strona licencji | <https://dane.przemysl.eu/creative-commons-cc-by-4-0/> |
| Treść licencji | <https://creativecommons.org/licenses/by/4.0/deed.pl> |
| `license_uri` w API | `https://dane.przemysl.eu/creative-commons-cc-by-4-0/` |
| `license_page` | `316` |
| `license` w API zbioru | **pusty string** `""` |
| `dct:license` w DCAT | `https://dane.przemysl.eu/creative-commons-cc-by-4-0/` |

Licencja wymaga atrybucji. Zalecany zapis: „Źródło: Straż Miejska w Przemyślu / Otwarte Dane Przemyśl, CC BY 4.0”.

Pole `license` w odpowiedzi `/datasets/13` jest puste, mimo że `license_uri` i DCAT wskazują CC BY 4.0. W integracji należy używać `license_uri`, a nie `license`.

---

## 12. Aktualizacja i świeżość danych

### 12.1. Deklaracja

- `accrual_periodicity`: `http://publications.europa.eu/resource/authority/frequency/CONT`
- Etykieta: `Na bieżąco (ciągła)`
- `dct:accrualPeriodicity`: `CONT`
- `dct:temporal`: `OD 2021`

### 12.2. Zaobserwowane znaczniki czasu

| Źródło | Pole | Wartość | Interpretacja |
|---|---|---|---|
| API zbioru | `updated` | `2026-01-20T17:58:39+00:00` | Ostatnia zmiana metadanych zbioru |
| API zasobu | `updated` | `2026-05-15 11:59:03` | Ostatnia zmiana zasobu, bez strefy |
| API jakości | `quality.freshness.last_updated` | `2026-05-15 13:59` | Prawdopodobnie czas lokalny +02:00 |
| API zasobu | `data_date` | `2026-01-01` | Deklarowana data danych, sprzeczna z resztą |
| DCAT dataset | `dct:modified` | `2026-01-20T17:58:39+01:00` | Ten sam wall clock co API, inny offset |
| DCAT distribution | `dct:modified` | `2026-04-29T05:27:28+02:00` | Ostatnia modyfikacja dystrybucji |
| JSON-LD zasobu | `dct:modified` | `2026-04-29T05:27:28+00:00` | Ten sam wall clock, inny offset |
| `.data.json` | `meta.generated_at` | `2026-11-21T19:07:14+01:00` | Czas wygenerowania eksportu |
| Nazwa pliku źródłowego | `1730818801` | `2024-11-05T15:00:01Z` | Znacznik snapshotu upstream |
| Nagłówki HTTP | `Last-Modified` | brak | Nie można użyć warunkowego pobierania |

### 12.3. Wniosek

Deklaracja „na bieżąco” nie jest potwierdzona przez spójne znaczniki czasu. W praktyce dostępny jest **snapshot**, którego plik źródłowy powstał w 2024-11-05, a metadane były modyfikowane w 2026. Brak `ETag` i `Last-Modified` uniemożliwia niezawodne wykrywanie zmian. Należy pobierać cyklicznie i porównywać sumę SHA-256 albo `updated` z metadanych.

---

## 13. Jakość danych i zaobserwowane problemy

### 13.1. Błędy i niespójności

1. **Duplikat numeru AED 7639**:
   - `id=757`: `Defibrylator (AED7639) Biblioteka Szkolna (ul. Aleksandra Dworskiego 98)`
   - `id=764`: `Defibrylator (AED 7639) Grunwaldzka 81 (Szkoła Podstawowa Nr 16 w Przemyslu)`
   - Jeden z rekordów jest prawdopodobnie błędny. Nie można rozstrzygnąć który bez weryfikacji terenowej.
2. **Niespójny format numeru AED** w `name`: `AED 9485`, `AED7639`, `AED 7639`.
3. **Brak numeru budynku** w `home_number` dla `id=753` (`Plac Konstytucji 3 Maja`) i `id=755` (`Jagiellońska`). Dla `id=753` numer `19` występuje tylko w `name`.
4. **Błędny link** przy `id=745`: `links[0].url` prowadzi do `https://sp6.przemysl.edu.pl`, mimo że rekord dotyczy I LO i ma `www` ustawione na `https://lo1.przemysl.edu.pl`.
5. **Literówki i brak diakrytyków** w `name`: `I Liecum`, `Urzedu`, `Przemyslu`, `Ogólnoksztalcące`, podwójne spacje.
6. **Opis `description` jest ogólny i powtarzany**. Nie opisuje konkretnej lokalizacji, nie zawiera instrukcji dojścia ani informacji o dostępności.
7. **Brak operatora**. `publisher` zbioru to Straż Miejska, ale nie ma pola operatora ani zarządcy konkretnego urządzenia.
8. **Brak danych operacyjnych**: godziny dostępu, 24/7, piętro, wejście, indoor/outdoor, status, data instalacji, data przeglądu, model, producent, numer seryjny.
9. **CSV jest zepsuty technicznie**: `text/csv` z JSON-owym stringiem.
10. **KML/GPX fałszywie zwracają 200**: `format=kml` i `format=gpx` dają JSON, nie KML/GPX.
11. **`format=geojson` ignoruje paginację i bbox**.
12. **`format=kml` i `format=gpx` nie są odrzucane**, mimo że zasób nie ma `geo_layer`.
13. **Brak `ETag` i `Last-Modified`** w odpowiedziach, mimo deklaracji w OpenAPI.
14. **DCAT Turtle zawiera warning PHP** i nie jest poprawnym Turtle.
15. **Niespójne wersje**: dokumentacja `0.9.255.0`, OpenAPI `0.9.334.0`, `dct:conformsTo` OpenAPI 3.0.3, faktycznie 3.2.1.
16. **Niespójne offsety czasu**: API `+00:00`, DCAT `+01:00` dla tego samego wall clock.
17. **`data_date=2026-01-01`** nie zgadza się z `updated=2026-05-15` ani ze znacznikiem źródła 2024-11-05.
18. **Katalog DCAT ma 62 datasety, API listuje 61**.

### 13.2. Co działa dobrze

- Publiczny, stabilny REST API bez klucza.
- Czytelny podział na zbiór, zasób i dystrybucje.
- GeoJSON z poprawną geometrią punktową i pełnym zestawem atrybutów.
- Spójne `id` rekordu między JSON, CSV i GeoJSON.
- Kompletne współrzędne dla 21/21 rekordów.
- Dobra dostępność metadanych DCAT i CSVW.
- Licencja jasno określona jako CC BY 4.0.
- Możliwość filtrowania kolumn przez `fields` i sortowania.
- Nieudokumentowany `/resources/15/structured` daje tabelę i geometrię w jednym requestcie.

---

## 14. Mapowanie na wspólny schemat AED

Poniższa tabela mapuje pola źródłowe na proponowany kanoniczny model danych AED. Model jest niezależny od implementacji i może być użyty w warstwie normalizacji.

### 14.1. Identyfikacja i lokalizacja

| Koncept kanoniczny | Typ | Pole źródłowe | Transformacja | Wymagane | Uwagi |
|---|---|---|---|---|---|
| `source.dataset_id` | string | `dataset.id` | `"przemysl:" + id` | tak | `13` |
| `source.resource_id` | string | `resource.id` | `"przemysl:resource:" + id` | tak | `15` |
| `source.record_id` | string | `id` | `String(id)` | tak | `744`-`765` |
| `source.url` | string | `resource.source_url` | bez zmian | tak | SkyCMS |
| `source.license` | string | `license_uri` | bez zmian | tak | CC BY 4.0 |
| `name` | string | `name` | trim, usuń podwójne spacje | tak | Zawiera numer AED |
| `description` | string | `description` | trim, normalizuj CRLF | nie | Ogólny tekst |
| `category` | string | `category` | mapowanie 1:1 | tak | Zawsze `Defibrylatory AED` |
| `address.city` | string | `city` | trim | tak | `Przemyśl` |
| `address.street` | string | `street` | trim | tak | |
| `address.house_number` | string | `home_number` | trim, `""` -> `null` | nie | Zachowaj typ tekstowy |
| `address.postcode` | string | `postcode` | trim, walidacja `^\d{2}-\d{3}$` | tak | `37-700` |
| `address.district` | string | - | `null` | nie | Brak w źródle |
| `location.lat` | number | `latitude` lub `geometry.coordinates[1]` | `round(..., 6)` | tak | Tylko GeoJSON |
| `location.lon` | number | `longitude` lub `geometry.coordinates[0]` | `round(..., 6)` | tak | Tylko GeoJSON |
| `location.geometry` | object | `geometry` | zachowaj `Point` | tak | GeoJSON |
| `location.crs` | string | - | stała `EPSG:4326` | tak | Wartość wnioskowana |
| `location.bbox` | object | `geo.bbox` | bez zmian | nie | Poziom zbioru |

### 14.2. Kontakt i media

| Koncept kanoniczny | Typ | Pole źródłowe | Transformacja | Wymagane | Uwagi |
|---|---|---|---|---|---|
| `contact.phone` | string | `phone` | trim, `""` -> `null`, walidacja E.164 | nie | 1/21 |
| `contact.email` | string | `email` | trim, lowercase, `""` -> `null` | nie | 2/21 |
| `contact.website` | string | `www` | trim, walidacja URL | nie | 2/21 |
| `media.images[]` | array<object> | `gallery` | mapuj `url`, `thumbUrl`, `thumbUrlMedium` | nie | 21/21 |
| `media.video_url` | string | `youtube_url` | trim, `""` -> `null` | nie | Tylko GeoJSON, 0/21 |
| `media.panorama_url` | string | `panorama_url` | trim, `""` -> `null` | nie | Tylko GeoJSON, 0/21 |
| `media.attachments[]` | array<object> | `attachments` | bez zmian | nie | 0/21 |
| `links[]` | array<object> | `links` | mapuj `title`, `url`, `link_type` | nie | 2/21 |

### 14.3. Urządzenie i dostępność

| Koncept kanoniczny | Typ | Pole źródłowe | Transformacja | Wymagane | Uwagi |
|---|---|---|---|---|---|
| `device.aed_number` | string | `name` | regex `AED\s*(\d+)` | nie | Tylko z nazwy, może być błędny |
| `device.manufacturer` | string | - | `null` | nie | Brak |
| `device.model` | string | - | `null` | nie | Brak |
| `device.serial_number` | string | - | `null` | nie | Brak |
| `device.installation_date` | date | - | `null` | nie | Brak |
| `device.last_inspection` | date | - | `null` | nie | Brak |
| `operator.name` | string | - | `null` | nie | `publisher` nie jest operatorem |
| `operator.contact` | object | - | `null` | nie | Brak |
| `access.public` | boolean | - | `null` | nie | Brak deklaracji |
| `access.24_7` | boolean | - | `null` | nie | Brak |
| `access.hours` | string | - | `null` | nie | Brak |
| `access.indoors` | boolean | - | `null` | nie | Brak |
| `access.floor` | string | - | `null` | nie | Brak |
| `access.notes` | string | - | `null` | nie | Brak |
| `status.active` | boolean | - | `null` | nie | Brak |
| `status.verified_at` | date | - | `null` | nie | Brak |

### 14.4. Metadane pochodzenia

| Koncept kanoniczny | Typ | Pole źródłowe | Transformacja | Wymagane | Uwagi |
|---|---|---|---|---|---|
| `source.title` | string | `dataset.title` | bez zmian | tak | |
| `source.identifier` | string | `dataset.identifier` | bez zmian | tak | `PRZ-DEFIBRYLATOR` |
| `source.publisher` | string | `dataset.publisher` | bez zmian | tak | Straż Miejska |
| `source.updated_at` | datetime | `resource.updated` | parsuj jako Europe/Warsaw | tak | Bez strefy w źródle |
| `source.retrieved_at` | datetime | - | czas pobrania | tak | `2026-11-21T19:xx+01:00` |
| `source.checksum` | string | `dcat:distribution.spdx:checksumValue` | bez zmian | nie | SHA-256 źródła |
| `source.accrual_periodicity` | string | `accrual_periodicity` | mapuj `CONT` -> `continuous` | tak | |
| `source.license` | string | `license_uri` | bez zmian | tak | CC BY 4.0 |

---

## 15. Ocena kompletności

### 15.1. Kompletność pól źródłowych

| Pole | Pokrycie | Ocena |
|---|---:|---|
| `id` | 21/21 (100%) | Pełne |
| `name` | 21/21 (100%) | Pełne, ale zawiera numer AED i literówki |
| `description` | 21/21 (100%) | Pełne, ale ogólne i nieprzydatne operacyjnie |
| `category` | 21/21 (100%) | Stała wartość |
| `city` | 21/21 (100%) | Stała wartość |
| `street` | 21/21 (100%) | Pełne |
| `home_number` | 19/21 (90,5%) | Braki dla `id=753`, `id=755` |
| `postcode` | 21/21 (100%) | Stała wartość |
| `phone` | 1/21 (4,8%) | Prawie brak |
| `email` | 2/21 (9,5%) | Prawie brak |
| `www` | 2/21 (9,5%) | Prawie brak |
| `gallery` | 21/21 (100%) | Jest przynajmniej jedno zdjęcie |
| `attachments` | 0/21 (0%) | Brak |
| `links` | 2/21 (9,5%) | Prawie brak |
| `geometry` / `latitude` / `longitude` | 21/21 (100%) | Tylko w GeoJSON |
| `youtube_url` | 0/21 (0%) | Brak |
| `panorama_url` | 0/21 (0%) | Brak |

### 15.2. Kompletność konceptów kanonicznych

| Obszar | Status | Komentarz |
|---|---|---|
| Identyfikacja rekordu | Pełna | `id` stabilne w JSON, CSV i GeoJSON |
| Nazwa i kategoria | Pełna | `name`, `category` |
| Adres | Dobra | Brak numeru w 2 rekordach, brak dzielnicy |
| Współrzędne | Pełna | 21/21, EPSG:4326 |
| Kontakt | Słaba | Telefon 1/21, e-mail 2/21, WWW 2/21 |
| Media | Dobra | Zdjęcia 21/21, ale bez atrybucji i opisu |
| Operator | Brak | Nie ma pola operatora |
| Dostępność i godziny | Brak | Nie ma 24/7, godzin, piętra, wejścia |
| Urządzenie | Brak | Brak modelu, producenta, numeru seryjnego, daty instalacji |
| Status i weryfikacja | Brak | Brak daty przeglądu i statusu aktywności |
| Metadane pochodzenia | Dobra | DCAT, licencja, checksum, ale niespójne daty |

### 15.3. Ocena końcowa

- **Do mapy i wyszukiwania lokalizacji:** dobra. 21 punktów, pełne współrzędne, czytelne nazwy, zdjęcia.
- **Do planowania rozmieszczenia AED:** średnia. Brak operatora, godzin dostępu i statusu urządzeń.
- **Do celów ratowniczych i dyspozytorskich:** niewystarczająca. Brak potwierdzenia aktywności, dostępności 24/7, numeru seryjnego i daty przeglądu.
- **Kompletność metadanych wg portalu:** `100/100`, poziom `wysoka`. To jednak kompletność **metadanych**, nie kompletność **danych operacyjnych**.
- **Ogólna ocena wiarygodności:** średnia. Dane są użyteczne jako warstwa referencyjna, ale wymagają weryfikacji terenowej i uzupełnienia pól operacyjnych.

---

## 16. Rekomendacje integracyjne

1. **Główne źródło danych:** `GET /wp-json/sod/v1/resources/15/structured?per_page=100`. To najbardziej spójny format: 21 wierszy, 19 kolumn, `id` jako integer, `gallery`/`links` jako tablice oraz `geometry`, `longitude` i `latitude` w jednym payloadzie.
2. **Alternatywa bez geometrii:** `GET /wp-json/sod/v1/resources/15/data?format=json&limit=100`. Puste wartości jako `""`, `gallery`/`links` jako tablice.
3. **Geometria:** `GET /wp-json/sod/v1/resources/15/data?format=geojson`. Użyj `geometry.coordinates` i zaokrąglij do 6 miejsc po przecinku. Nie polegaj na `limit` ani `bbox`.
4. **Nie używaj CSV** bez naprawy. Body jest JSON stringiem. Jeśli musisz, zrób `json.loads(body)`, a potem parsuj CSV. Alternatywnie użyj prawdziwego CSV z mirroru `dane.gov.pl`, ale ma inny separator i inny zestaw kolumn.
5. **Nie używaj `.data.json`** bez normalizacji typów. `home_number` może być `int`/`null`, a `gallery`/`links` są stringami z JSON.
6. **Klucz deduplikacji:** `source.record_id` (`id`). Nie deduplikuj po `name` ani numerze AED. Oznacz duplikat AED 7639 do weryfikacji.
7. **Numer AED** wyciągaj z `name` regexem `AED\s*(\d+)`, ale traktuj jako pole pomocnicze, nie jako klucz.
8. **Zachowaj `home_number` jako string**, bo może być pusty i może zawierać formaty typu `12A`.
9. **Zapisuj `source.updated_at` i `retrieved_at`**, ponieważ brak `ETag` i `Last-Modified`.
10. **Stosuj backoff i limit 120 req/min**. Nie wykonuj równoległych burstów.
11. **Weryfikuj checksum** `2f49fe...` przy pobieraniu źródła SkyCMS. To potwierdza integralność snapshotu.
12. **Nie zakładaj aktualności** na podstawie `accrual_periodicity=CONT`. Polling dzienny lub tygodniowy jest bezpieczniejszy.
13. **Atrybucja:** „Straż Miejska w Przemyślu / Otwarte Dane Przemyśl, CC BY 4.0”.
14. **Dla celów ratowniczych** oznacz dane jako „referencyjne, niezweryfikowane operacyjnie” i dodaj link do źródła oraz datę pobrania.

---

## 17. Reprodukcja badania

```bash
# Metadane zbioru i zasobu
curl -sS https://dane.przemysl.eu/wp-json/sod/v1/datasets/13
curl -sS 'https://dane.przemysl.eu/wp-json/sod/v1/resources?dataset_id=13'
curl -sS https://dane.przemysl.eu/wp-json/sod/v1/resources/15

# Dane JSON, wszystkie 21 wierszy
curl -sS 'https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?limit=100'

# GeoJSON
curl -sS 'https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=geojson'

# Tabela z geometrią, 21 wierszy, 19 kolumn
curl -sS 'https://dane.przemysl.eu/wp-json/sod/v1/resources/15/structured?per_page=100'

# CSV, wszystkie 21 wierszy, treść to JSON string
curl -sS 'https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=csv&limit=1000'

# Metadane DCAT/CSVW/OpenAPI
curl -sS https://dane.przemysl.eu/wp-json/sod/v1/resources/15.metadata.jsonld
curl -sS https://dane.przemysl.eu/wp-json/sod/v1/resources/15.data.csv-metadata.json
curl -sS https://dane.przemysl.eu/wp-json/sod/v1/resources/15.openapi.json
curl -sS https://dane.przemysl.eu/wp-json/sod/v1/openapi.json
curl -sS https://dane.przemysl.eu/wp-json/sod/v1/dcat.jsonld

# Źródło upstream i checksum
curl -sS -L 'https://przemysl.skycms.com.pl/open-data/20/1730818801_b50R6UVxPgoVdBbq/geojson' \
  | sha256sum

# Mirror krajowy
curl -sS 'https://api.dane.gov.pl/1.4/datasets/4581'
curl -sS 'https://api.dane.gov.pl/1.4/datasets/4581/resources'
curl -sS -L 'https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson' \
  | sha256sum
curl -sS -L 'https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.csv' \
  | head -n 2
```

Oczekiwany checksum źródła:

```text
2f49fe5394c1eb9e841ad5921b19c1cade6b843278d7283534658f0caba01797
```

---

## 18. Załączniki w repozytorium

W katalogu `AED/docs/research/raw/przemysl/` znajdują się kopie odpowiedzi HTTP:

| Plik | Opis |
|---|---|
| `dataset-13.json` | Metadane zbioru `13` |
| `resources-dataset-13.json` | Lista zasobów zbioru `13` |
| `resource-15.json` | Metadane zasobu `15` |
| `resource-15-structured.json` | Znormalizowane 21 wierszy z geometrią |
| `resource-15.csv` | CSV w postaci JSON stringa |
| `resource-15.csv-metadata.json` | CSVW |
| `resource-15.geojson` | GeoJSON, 21 features |
| `resource-15.metadata.jsonld` | DCAT JSON-LD zasobu |
| `resource-15.openapi.json` | OpenAPI zasobu |
| `sod-openapi.json` | Globalne OpenAPI |
| `upstream-2024-11-05.geojson` | Plik źródłowy SkyCMS, SHA-256 zgodny z DCAT |

---

## 19. Powiązany mirror krajowy dane.gov.pl

Ten sam plik jest opublikowany w krajowym portalu otwartych danych jako **dataset 4581**. To nie jest alternatywne źródło treści, tylko mirror tego samego pliku, z innymi metadanymi licencji i częstotliwości.

`GET https://api.dane.gov.pl/1.4/datasets/4581` i `GET .../4581/resources` zwracają HTTP 200 oraz `application/vnd.api+json`.

### 19.1. Metadane mirroru

| Pole | Wartość |
|---|---|
| API datasetu | `https://api.dane.gov.pl/1.4/datasets/4581` |
| API zasobów | `https://api.dane.gov.pl/1.4/datasets/4581/resources` |
| Tytuł | `Lokalizacje AED – Automatycznych Defibrylatorów Zewnętrznych w Przemyślu` |
| Instytucja | `Urząd Miejski w Przemyślu`, `id=145` |
| Licencja | **`CC0 1.0`** (`license_name`) |
| Częstotliwość | `Codziennie` |
| `modified` | `2024-11-06T06:42:45Z` |
| `verified` | `2024-11-20T09:40:20Z` |
| Formaty | `csv`, `geojson`, `json`, `xml` |
| URL | `https://przemysl.pl/45/mapa-interaktywna.html#/map?category=54` |

### 19.2. Zasoby mirroru

| ID | Format | Rozmiar | `data_date` | `modified` | URL pliku |
|---|---|---:|---|---|---|
| `62092` | `xml` (GML) | 49361 | 2024-11-06 | 2024-11-06T06:42:29Z | `https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.gml` |
| `62093` | `geojson` | 48823 | 2024-11-06 | 2024-11-06T06:45:11Z | `https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson` |
| `62094` | `json` | 48468 | 2024-11-06 | 2024-11-06T06:47:30Z | `https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.json` |
| `62095` | `csv` | 39237 | 2024-11-06 | 2024-11-06T06:50:29Z | `https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.csv` |
| `62424` | `xml` (GML) | 49361 | 2024-11-20 | 2024-11-20T09:40:20Z | `https://api.dane.gov.pl/media/resources/20241120/1730818801_b50R6UVxPgoVdBbq.gml` |

### 19.3. Porównanie plików

- GeoJSON z mirroru ma **48823 B** i **identyczny SHA-256**: `2f49fe5394c1eb9e841ad5921b19c1cade6b843278d7283534658f0caba01797`.
- Liczba features: **21**. Struktura JSON jest identyczna jak w źródle SkyCMS.
- CSV z mirroru jest **prawdziwym CSV**, a nie JSON stringiem. Ma **39237 B**, separator `;`, BOM UTF-8 i 17 kolumn:

```text
id;name;description;category;city;street;home_number;postcode;phone;email;www;youtube_url;panorama_url;geometry;gallery;attachments;links
```

- CSV mirroru zawiera `youtube_url`, `panorama_url` i `geometry`, ale nie zawiera osobnych `longitude`/`latitude`.
- Mirror nie zawiera nowszych danych. To ten sam snapshot z 2024-11-05/06.

### 19.4. Ryzyko licencyjne

Ta sama treść ma dwie deklaracje:

- portal miejski `dane.przemysl.eu`: **CC BY 4.0**,
- mirror `dane.gov.pl`: **CC0 1.0**.

Bezpieczniej stosować **CC BY 4.0 i atrybucję**, ponieważ jest to bardziej restrykcyjna deklaracja i pochodzi z portalu wskazanego jako źródło. Rozbieżność warto zgłosić wydawcy.

---

## 20. Źródła

1. Strona zbioru: <https://dane.przemysl.eu/zbiory-danych/defibrylatory-aed-na-terenie-miasta-przemysla/>
2. Strona zasobu: <https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/>
3. API zbioru: <https://dane.przemysl.eu/wp-json/sod/v1/datasets/13>
4. API zasobu: <https://dane.przemysl.eu/wp-json/sod/v1/resources/15>
5. OpenAPI: <https://dane.przemysl.eu/wp-json/sod/v1/openapi.json>
6. OpenAPI zasobu: <https://dane.przemysl.eu/wp-json/sod/v1/resources/15.openapi.json>
7. DCAT JSON-LD: <https://dane.przemysl.eu/wp-json/sod/v1/dcat.jsonld>
8. DCAT Turtle: <https://dane.przemysl.eu/wp-json/sod/v1/dcat.ttl>
9. Dokumentacja API portalu: <https://dane.przemysl.eu/?ode_page=api>
10. Licencja CC BY 4.0: <https://dane.przemysl.eu/creative-commons-cc-by-4-0/>
11. Źródło SkyCMS: <https://przemysl.skycms.com.pl/open-data/20/1730818801_b50R6UVxPgoVdBbq/geojson>
12. Structured: <https://dane.przemysl.eu/wp-json/sod/v1/resources/15/structured>
13. Mirror krajowy, dataset: <https://api.dane.gov.pl/1.4/datasets/4581>
14. Mirror krajowy, GeoJSON: <https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson>
15. Mirror krajowy, CSV: <https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.csv>
