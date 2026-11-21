# OSM / OpenAEDMap / Geoportal / CloudFerro: schemat danych AED

**Data badania:** 2026-11-21, ok. 19:00-19:15 CET
**Zakres:** dokładny schemat rekordów AED w OpenStreetMap, eksporty OpenAEDMap (w tym historyczne pliki CSV/GeoJSON z `aed.openstreetmap.org.pl`), usługi WMS Geoportal.gov.pl oraz oferta CloudFerro.
**Plik:** `AED/docs/research/raw/osm-ecosystem.md`

## Legenda weryfikacji

| Oznaczenie | Znaczenie |
| --- | --- |
| **VERIFIED** | Potwierdzone realnym zapytaniem HTTP/Overpass/API lub odczytem kodu źródłowego w dniu badania. |
| **VERIFIED (kod)** | Potwierdzone w publicznym kodzie źródłowym OpenAEDMap. |
| **NOT VERIFIED** | Nie udało się potwierdzić publicznie dostępnym zapytaniem albo źródło nie istnieje. |
| **N/A** | Nie dotyczy danego źródła. |

> Uwaga praktyczna: OSM nie jest rejestrem medycznym. Brak tagu nie oznacza, że AED nie istnieje, a obecność tagu nie potwierdza, że urządzenie nadal działa. Do celów mapy ratunkowej trzeba osobno modelować status i datę weryfikacji.

---

## 0. Streszczenie dla projektu

1. **OSM** jest jedynym źródłem w tym zestawieniu, które ma kompletny, udokumentowany i maszynowy schemat rekordów AED. Główny tag to `emergency=defibrillator` na **node**. W Polsce ok. **18,3 tys. rekordów** (taginfo, 2026-11-20).
2. **OpenAEDMap** publikuje dane OSM jako **GeoJSON per kraj**. Dla Polski: `https://openaedmap.org/api/v1/countries/PL.geojson`, **18 298 features**, ok. 7,1 MB, EPSG:4326, licencja ODbL 1.0. Eksport zawiera `@osm_type`, `@osm_id`, `@osm_version` oraz **wszystkie tagi OSM** jako stringi.
3. **Historyczny CSV** z `aed.openstreetmap.org.pl` miał 15 kolumn i 4 588 rekordów (snapshot 2023-01-07). Dziś domena przekierowuje na OpenAEDMap; CSV i metadata zwracają 404, GeoJSON przekierowuje na aktualny eksport.
4. **Geoportal.gov.pl** udostępnia WMS/WMTS dla danych referencyjnych (PRG, adresy, BDOT10k, ortofoto), ale **nie publikuje warstwy AED**. To nie jest źródło rekordów AED.
5. **CloudFerro** to dostawca chmury IaaS/PaaS i danych obserwacji Ziemi (CREODIAS). W publicznych materiałach **nie znaleziono zbioru AED ani usługi WMS z AED**. To nie jest źródło rekordów AED.
6. Do wspólnego schematu OSM wnosi: identyfikator, współrzędne, dostęp, godziny, opis miejsca, operatora, telefon, producenta/model, datę sprawdzenia i media. **Nie wnosi**: statusu działania, numeru seryjnego, daty ważności elektrod/baterii, pewności co do aktualności.

---

## 1. OpenStreetMap (OSM)

### 1.1 Model encji

W OSM AED to najczęściej **pojedynczy node** w punkcie rzeczywistej lokalizacji urządzenia. Node ma:

| Pole OSM API | Typ JSON | Znaczenie |
| --- | --- | --- |
| `type` | string | `"node"`, `"way"` lub `"relation"` |
| `id` | int64 | globalny identyfikator OSM |
| `lat` | double | szerokość geograficzna WGS84 |
| `lon` | double | długość geograficzna WGS84 |
| `timestamp` | string ISO 8601 | czas ostatniej edycji obiektu, **nie** data weryfikacji w terenie |
| `version` | int32 | kolejna wersja obiektu |
| `changeset` | int64 | identyfikator changesetu |
| `user` | string | nazwa użytkownika OSM |
| `uid` | int64 | identyfikator użytkownika OSM |
| `tags` | object string->string | wszystkie tagi, zawsze stringi |

**VERIFIED:** `GET https://api.openstreetmap.org/api/0.6/node/477958354.json` zwrócił dokładnie powyższy zestaw pól dla realnego AED.

Dla way/relation geometria jest inna (`nodes`, `members`, `bounds`, `center` przy `out center`). OpenAEDMap importuje **tylko node** (`node[emergency=defibrillator]`), więc w praktyce eksport AED to punkty. W Polsce taginfo odnotowuje 2 way z tym tagiem, ale nie trafiają one do OpenAEDMap.

### 1.2 Schemat tagów AED

Główny tag:

```text
emergency=defibrillator
```

Wartości tagów są **stringami**. Nawet `level=0` i `ref=594` są stringami. Średniki oznaczają listy, np. `opening_hours`, `phone`.

| Tag OSM | Typ wartości | Wymagany? | Dozwolone wartości / format | Pokrycie PL* | Znaczenie i uwagi |
| --- | --- | --- | --- | --- | --- |
| `emergency` | string enum | **TAK** | `defibrillator` | 100,0% | Główny tag. Bez niego obiekt nie jest AED. |
| `defibrillator` | string enum | NIE | `yes` (na budynku/obiekcie) | 1 użycie w PL (taginfo, nie w eksporcie AED) | Tag pomocniczy na obiekcie gospodarza. **Nie** jest głównym tagiem AED. Nie używać `defibrillator=*` zamiast `emergency=defibrillator`. |
| `defibrillator:location` | string (free text) | zalecany | np. `Na ścianie w jadalni` | 67,3% | Dokładny opis miejsca. Najważniejsze pole dla ratownika. |
| `defibrillator:location:pl` | string | opcjonalny | j.w., po polsku | 28,3% | Wariant językowy. |
| `defibrillator:location:en` | string | opcjonalny | j.w., po angielsku | 13,2% | Wariant językowy. |
| `defibrillator:location:<lang>` | string | opcjonalny | np. `:de`, `:fr`, `:pdt` | <0,1% | Inne języki. |
| `access` | string enum | zalecany | `yes`, `customers`, `private`, `permit`, `permissive`, `no`, `unknown` | 92,5% | Dostęp **prawny**. `access=emergency` jest przestarzałe; dostęp ratunkowy jest domyślny. |
| `opening_hours` | string (OSM OH) | zalecany | `24/7`, `Mo-Fr 07:30-15:30`, `Mo-Fr 08:00-16:00; Sa-Su, PH off` | 37,1% | Godziny dostępu. `24/7` = 4 136 rekordów (22,6% całości). |
| `indoor` | string enum | zalecany | `yes`, `no` | 87,3% | Czy urządzenie jest wewnątrz budynku. |
| `level` | string numeryczny | opcjonalny | `0`, `1`, `-1`, `0.5` | 20,2% | Kondygnacja wg OSM (0 = parter). |
| `level:ref` | string | opcjonalny | np. `B1`, `parter` | 1 rekord | Oznaczenie kondygnacji widoczne w budynku. |
| `location` | string enum | opcjonalny | `indoor`, `outdoor`, `vehicle` | 2,3% | Starszy, pomocniczy tag. Nie zastępuje `indoor`. |
| `locked` | string enum | opcjonalny | `yes`, `no` | 3 rekordy | Czy szafka/urządzenie jest fizycznie zamknięte. |
| `defibrillator:cabinet` | string enum | opcjonalny | `vertical_door`, `horizontal_door`, `twist`, `totem`, `no` | 0% w PL, 10 wartości globalnie | Typ szafki. |
| `defibrillator:cabinet:manufacturer` | string | opcjonalny | free text | 0% | Producent szafki. |
| `defibrillator:cabinet:colour` | string | opcjonalny | free text | 0% | Kolor szafki. |
| `defibrillator:code` | string | opcjonalny | free text | 0% | Niejasny tag; może oznaczać kod otwarcia. **Nie** utożsamiać z `ref`. |
| `ref` | string | opcjonalny | free text | 0,8% | Lokalny numer/referencja urządzenia. **Nie** jest globalnie unikalny: 150 rekordów, 140 unikalnych wartości. |
| `operator` | string | zalecany | free text | 32,8% | Podmiot odpowiedzialny za bieżące utrzymanie. 4 086 unikalnych wartości, wymaga normalizacji. |
| `operator:type` | string enum | opcjonalny | `government`, `ngo`, `private`, `public`, `school`, `religious` | 0,5% | Typ operatora. |
| `operator:wikidata` | string QID | opcjonalny | `Q...` | 1,0% | Najlepszy klucz do normalizacji operatora. |
| `operator:short` | string | opcjonalny | free text | 0,4% | Skrót nazwy operatora. |
| `phone` | string | zalecany | `+48 33 877 51 05` (E.164/E.123) | 24,5% | Telefon do miejsca/operatora. 208 rekordów ma `112`, co jest wątpliwe jako numer obiektowy. |
| `emergency:phone` | string | opcjonalny | np. `112`, `999` | 1,1% | Numer służb odpowiedzialnych za obszar. |
| `email` | string | opcjonalny | adres e-mail | 0,3% | Kontakt. |
| `website` | string URL | opcjonalny | `https://...` | 0,5% | Strona operatora/miejsca. |
| `manufacturer` | string | opcjonalny | `Philips`, `Zoll`, `CU Medical Systems`, `HeartSine` | 1,9% | Producent AED. 103 unikalne wartości, pisownia nieustandaryzowana. |
| `model` | string | opcjonalny | `FRx`, `AED Plus`, `iPAD CU-SP1`, `AED 3` | 0,8% | Model AED. 34 unikalne wartości. |
| `check_date` | string data | zalecany | `YYYY-MM-DD` | 32,7% | Data ostatniego sprawdzenia **istnienia** obiektu. Nie jest to data przeglądu technicznego. |
| `survey:date` | string data | opcjonalny | `YYYY-MM-DD`, `YYYY-MM`, `YYYY` | 0,1% | Data ostatniego badania w terenie. |
| `check_date:opening_hours` | string data | opcjonalny | `YYYY-MM-DD` | 3 rekordy | Data sprawdzenia godzin. |
| `source` | string | opcjonalny | `survey`, `email od ZUS`, URL | 7,9% | Sposób pozyskania danych. 455 unikalnych wartości. |
| `description` | string | opcjonalny | free text | 3,3% | Opis miejsca/urządzenia. |
| `description:pl`, `description:en` | string | opcjonalny | free text | 0,6%, 0,7% | Warianty językowe. |
| `name` | string | opcjonalny | free text | 0,6% | Nazwa obiektu/miejsca, nie urządzenia. |
| `wheelchair` | string enum | opcjonalny | `yes`, `limited`, `no`, `designated` | 2,5% | Dostępność dla wózków. |
| `image` | string URL | opcjonalny | URL | 11,9% | Zdjęcie urządzenia/miejsca. |
| `image:license` | string | opcjonalny | `CC0` | 7,6% | Licencja zdjęcia. W PL wszystkie 1 383 to `CC0`. |
| `wikimedia_commons` | string | opcjonalny | `File:...` lub URL | 0,5% | Zdjęcie w Wikimedia Commons. |
| `panoramax` | string | opcjonalny | UUID | 3 rekordy | Zdjęcie Panoramax. |
| `mapillary` | string | opcjonalny | image key | 5 rekordów | Zdjęcie Mapillary. |
| `fixme` | string | opcjonalny | free text | 3,5% | Zaznaczenie problemu do poprawy. |
| `note` | string | opcjonalny | free text | 1,3% | Notatka dla edytujących. |
| `addr:street` | string | opcjonalny | free text | 0,4% | Adres. |
| `addr:housenumber` | string | opcjonalny | free text | 0,6% | Adres. |
| `addr:postcode` | string | opcjonalny | `XX-XXX` | 0,2% | Adres. |
| `addr:city` | string | opcjonalny | free text | 0,4% | Adres. |
| `addr:place` | string | opcjonalny | free text | 0,1% | Adres. |
| `addr:floor` | string | opcjonalny | free text | 9 rekordów | Kondygnacja w adresie. |
| `start_date` | string data | opcjonalny | `YYYY-MM-DD` | 0,3% | Data instalacji/uruchomienia. |
| `ref:api-um-warszawa-pl` | string | opcjonalny | ID z API Warszawy | 0,6% | Źródłowy identyfikator miejski. |
| `ref:pkt-zycia-2023` | string | opcjonalny | ID programu | 0,2% | Źródłowy identyfikator programu. |

\* Pokrycie policzone na 18 298 rekordach z eksportu OpenAEDMap `PL.geojson` (2026-11-21). To nie jest pełna populacja OSM: taginfo dla Polski pokazuje 18 321 obiektów (18 319 node + 2 way). Różnica wynika z opóźnienia eksportu, usuniętych obiektów i pominięcia way.

**Ważne rozróżnienie:** `check_date` i `survey:date` to daty sprawdzenia przez człowieka. `timestamp` obiektu OSM to data ostatniej edycji, która może być zmianą kosmetyczną. Do pola `last_verified_at` nie wolno bezrefleksyjnie kopiować `timestamp`.

### 1.3 Realny przykład rekordu OSM

Node `477958354` (Schronisko PTTK Markowe Szczawiny), pobrany z OSM API:

```json
{
  "type": "node",
  "id": 477958354,
  "lat": 49.5878956,
  "lon": 19.5168185,
  "timestamp": "2022-08-29T12:06:23Z",
  "version": 12,
  "changeset": 125520683,
  "user": "☆Finvenkulo",
  "uid": 4128818,
  "tags": {
    "defibrillator:location": "Na ścianie w jadalni",
    "description": "Schronisko PTTK Markowe Szczawiny",
    "ele": "1180",
    "email": "markowe.szczawiny@op.pl",
    "emergency": "defibrillator",
    "indoor": "yes",
    "operator": "PTTK",
    "phone": "+48 33 877 51 05"
  }
}
```

**VERIFIED:** OSM API, 2026-11-21.

### 1.4 Overpass API: zapytanie i schemat odpowiedzi

Działające zapytanie (testowane na publicznym endpointcie `https://maps.mail.ru/osm/tools/overpass/api/interpreter`):

```overpassql
[out:json][timeout:60];
area["ISO3166-1"="PL"][admin_level=2]->.pl;
node["emergency"="defibrillator"](area.pl);
out meta 3;
```

Odpowiedź (skrót):

```json
{
  "version": 0.6,
  "generator": "Overpass API 0.7.62.4 2390de5a",
  "osm3s": {
    "timestamp_osm_base": "2026-11-21T18:02:50Z",
    "timestamp_areas_base": "2026-11-21T16:02:51Z",
    "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
  },
  "elements": [
    {
      "type": "node",
      "id": 477958354,
      "lat": 49.5878956,
      "lon": 19.5168185,
      "timestamp": "2022-08-29T12:06:23Z",
      "version": 12,
      "changeset": 125520683,
      "user": "☆Finvenkulo",
      "uid": 4128818,
      "tags": { "...": "..." }
    }
  ]
}
```

Schemat elementu:

| Pole | Typ | Jest w `out meta`? | Uwaga |
| --- | --- | --- | --- |
| `type` | string | tak | `node` |
| `id` | int64 | tak | OSM ID |
| `lat`, `lon` | double | tak | WGS84 |
| `timestamp` | string | tak | ostatnia edycja |
| `version` | int | tak | wersja obiektu |
| `changeset` | int64 | tak | changeset |
| `user` | string | tak | autor edycji |
| `uid` | int64 | tak | ID autora |
| `tags` | object | tak | tagi AED i kontekstowe |
| `center` | object | tylko `out center` dla way/relation | `{lat, lon}` |
| `nodes` | int64[] | dla way | lista node'ów |
| `members` | object[] | dla relation | członkowie |

**VERIFIED:** zapytanie zwróciło 3 rekordy i metadane. `overpass-api.de` z tej sieci odpowiadał timeoutem, dlatego użyto alternatywnego publicznego endpointu. `out count` na dużym obszarze Polski zwracał 504, więc liczebność potwierdzono przez taginfo, a nie przez licznik Overpass. To ograniczenie jest odnotowane, nie ukryte.

### 1.5 Licencja, aktualizacja, ograniczenia OSM

| Aspekt | Wartość | Status |
| --- | --- | --- |
| Licencja danych | **ODbL 1.0** (Open Data Commons Open Database License) | **VERIFIED** |
| Atrybucja | `© OpenStreetMap contributors`, link do `https://www.openstreetmap.org/copyright` | **VERIFIED** |
| Wymóg share-alike | Tak, dla zmodyfikowanej bazy danych | **VERIFIED** |
| Aktualizacja | ciągła, minutely replication; Overpass ma opóźnienie rzędu minut | **VERIFIED** |
| `timestamp_osm_base` | 2026-11-21T18:02:50Z w zapytaniu testowym | **VERIFIED** |
| Publiczny Overpass | limity: do 10 000 zapytań/dzień, 1 GB/dzień, 10 min łącznie; przy regularnym użyciu dzielić przez 100; wymagany User-Agent/Referer; brak równoległych skryptów | **VERIFIED** (wiki) |
| Overpass komercyjnie | zalecany self-hosted lub płatny dostawca | **VERIFIED** (wiki) |
| Kafelki OSM | nie są API do masowego pobierania; osobna Tile Usage Policy | **VERIFIED** |
| Jakość | brak gwarancji aktualności i poprawności; dane społecznościowe | **VERIFIED** (charakter projektu) |

Praktyczne ograniczenia:

- OSM nie ma pola „status urządzenia”. Brak tagu `operational_status`.
- `access` bywa nieaktualny; `opening_hours` nie gwarantuje, że budynek jest otwarty.
- `check_date` jest rzadkie (32,7%) i nie oznacza przeglądu technicznego.
- Adresy są prawie nieobecne (0,6% jakiegokolwiek `addr:*`).
- Część tagów to wolny tekst (`operator`, `defibrillator:location`, `manufacturer`), co utrudnia normalizację.
- 2 way z tagiem AED nie są importowane przez OpenAEDMap.

---

## 2. OpenAEDMap

### 2.1 Czym jest

OpenAEDMap to projekt Stowarzyszenia OpenStreetMap Polska. Backend importuje z OSM **wyłącznie node z `emergency=defibrillator`** i publikuje:

- kafelki wektorowe,
- GeoJSON per kraj,
- API pojedynczego node'a,
- zdjęcia i ich proxy.

**VERIFIED (kod):** `_OVERPASS_QUERY = 'node[emergency=defibrillator];out meta qt;'` w `services/aed_service.py`. Repozytorium: `https://github.com/openstreetmap-polska/openaedmap-backend`.

### 2.2 Endpointy

| Endpoint | Metoda | Format | Zawartość | Status |
| --- | --- | --- | --- | --- |
| `https://openaedmap.org/api/v1/countries/names?language=pl` | GET | JSON | lista krajów, `country_code`, `country_names`, `feature_count`, `data_path` | **VERIFIED** |
| `https://openaedmap.org/api/v1/countries/PL.geojson` | GET | GeoJSON | wszystkie AED w Polsce | **VERIFIED** |
| `https://openaedmap.org/api/v1/node/{id}` | GET | JSON (OSM-like) | pojedynczy node + zdjęcie + strefa czasowa | **VERIFIED** |
| `https://openaedmap.org/api/v1/countries/PL.csv` | GET | - | **404** | **VERIFIED** brak |
| `https://openaedmap.org/api/v1/countries/PL.json` | GET | - | **404** | **VERIFIED** brak |

Dla Polski `countries/names` zwróciło:

```json
{
  "country_code": "PL",
  "feature_count": 18298,
  "data_path": "/api/v1/countries/PL.geojson"
}
```

**VERIFIED:** 2026-11-21, 18:14 UTC.

### 2.3 GeoJSON: dokładny schemat

Nagłówki odpowiedzi `PL.geojson`:

```text
HTTP/2 200
content-type: application/geo+json; charset=utf-8
content-disposition: attachment
cache-control: public, max-age=3600, stale-while-revalidate=0
etag: W/"geojson-70c84d24f2730d9e-fc6011b4304fca29-..."
vary: Accept-Encoding, Accept-Encoding, Origin
```

Rozmiar: **7 135 848 B** (pierwszy pomiar) / **7 135 986 B** (pomiar późniejszy, dane żywe).
Liczba features: **18 298**.
CRS: **EPSG:4326** (GeoJSON domyślnie WGS84; brak pola `crs`).

Struktura:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [19.5168185, 49.5878956]
      },
      "properties": {
        "@osm_type": "node",
        "@osm_id": 477958354,
        "@osm_version": 12,
        "emergency": "defibrillator",
        "defibrillator:location": "Na ścianie w jadalni",
        "description": "Schronisko PTTK Markowe Szczawiny",
        "ele": "1180",
        "email": "markowe.szczawiny@op.pl",
        "indoor": "yes",
        "operator": "PTTK",
        "phone": "+48 33 877 51 05"
      }
    }
  ]
}
```

| Pole | Typ | Zawsze? | Znaczenie |
| --- | --- | --- | --- |
| `type` | string | tak | `"FeatureCollection"` |
| `features[].type` | string | tak | `"Feature"` |
| `features[].geometry.type` | string | tak | `"Point"` |
| `features[].geometry.coordinates` | `[number, number]` | tak | **`[lon, lat]`** w WGS84 |
| `features[].properties["@osm_type"]` | string | tak | `"node"` |
| `features[].properties["@osm_id"]` | int | tak | OSM node ID |
| `features[].properties["@osm_version"]` | int | tak | wersja node'a |
| `features[].properties["emergency"]` | string | tak | `"defibrillator"` |
| `features[].properties[...]` | string | nie | wszystkie pozostałe tagi OSM, bez konwersji typów |

**Czego nie ma w GeoJSON:**

- `@timestamp`, `@user`, `@changeset`, `@uid`: brak proweniencji edycji.
- `license`, `attribution`, `data_download_ts_utc`: brak metadanych licencji w treści i nagłówkach.
- `@photo_id`, `@photo_url`, `@photo_source`, `@timezone_name`, `@timezone_offset`: tylko w API node'a.
- `country_code`: brak w feature; kraj wynika z endpointu.
- CSV: brak.

**Ważne:** kolejność współrzędnych to `[lon, lat]`, zgodnie z GeoJSON. Przy imporcie do PostGIS trzeba jawnie zamienić na `POINT(lon lat)`.

### 2.4 API pojedynczego node'a: dodatkowe pola

`GET https://openaedmap.org/api/v1/node/477958354` zwróciło:

```json
{
  "version": 0.6,
  "copyright": "OpenStreetMap and contributors",
  "attribution": "https://www.openstreetmap.org/copyright",
  "license": "https://opendatacommons.org/licenses/odbl/1-0/",
  "elements": [
    {
      "@photo_id": null,
      "@photo_url": null,
      "@photo_source": null,
      "@timezone_name": "Europe/Warsaw",
      "@timezone_offset": "UTC+01:00",
      "type": "node",
      "id": 477958354,
      "lat": 49.5878956,
      "lon": 19.5168185,
      "tags": { "...": "..." },
      "version": 12
    }
  ]
}
```

| Pole dodatkowe | Typ | Znaczenie |
| --- | --- | --- |
| `@photo_id` | string/null | ID zdjęcia w OpenAEDMap |
| `@photo_url` | string/null | URL do zdjęcia lub proxy |
| `@photo_source` | string/null | źródło zdjęcia (np. Wikimedia, Panoramax) |
| `@timezone_name` | string/null | np. `Europe/Warsaw` |
| `@timezone_offset` | string/null | np. `UTC+01:00` |

**VERIFIED:** 2026-11-21. Cache nagłówka: `max-age=60`, `stale=300` (z kodu).

### 2.5 Historyczne pliki `aed.openstreetmap.org.pl`

Domena `aed.openstreetmap.org.pl` dziś przekierowuje na OpenAEDMap. Status bieżący:

| Ścieżka | Status | Cel przekierowania |
| --- | --- | --- |
| `/aed_poland.geojson` | **308** | `https://openaedmap.org/api/v1/countries/PL.geojson` (200) |
| `/aed_poland.csv` | **308** | `https://openaedmap.org/pl/aed_poland.csv` (**404**) |
| `/aed_poland_metadata.json` | **308** | `https://openaedmap.org/pl/aed_poland_metadata.json` (**404**) |

**VERIFIED:** `curl -I`, 2026-11-21.

Archiwalne pliki (Wayback Machine) pokazują dokładny dawny schemat.

#### 2.5.1 CSV, snapshot 2023-01-07

Plik: `https://aed.openstreetmap.org.pl/aed_poland.csv` (Wayback `20230107044845`).
Rozmiar: 524 644 B. Wiersze: **4 588** danych + nagłówek.

Dokładna kolejność i typy kolumn:

| Kolumna | Typ | Pokrycie | Uwagi |
| --- | --- | --- | --- |
| `access` | string enum | 85,5% | `private`, `customers`, `yes`, `permissive`, `permit`, `no`, `emergency` (1), wartości złożone |
| `defibrillator:location` | string | 81,7% | 2 395 unikalnych |
| `defibrillator:location:pl` | string | 3,7% | 159 unikalnych |
| `description` | string | 3,7% | 69 unikalnych |
| `indoor` | string enum | 63,4% | `yes` 2 216, `no` 691 |
| `latitude` | decimal | 100,0% | WGS84 |
| `location` | string enum | 8,6% | `indoor` 267, `outdoor` 119, `vehicle` 5, pojedyncze free text |
| `longitude` | decimal | 100,0% | WGS84 |
| `note` | string | 1,2% | 22 unikalne |
| `note:pl` | string | 0,1% | 3 |
| `opening_hours` | string | 30,0% | `24/7` 773 |
| `operator` | string | 56,8% | 2 036 unikalnych |
| `osm_id` | int64 | 100,0% | 4 588 unikalnych; **brak `osm_type`**, wszystkie to node |
| `phone` | string | 34,4% | 1 226 unikalnych |
| `wikimedia_commons` | string URL | 0,2% | 9 |

**Czego brak w CSV:** `osm_version`, `check_date`, `survey:date`, `manufacturer`, `model`, `ref`, `emergency:phone`, `image`, `image:license`, `wheelchair`, `addr:*`, `level`. To był eksport „pod mapę”, nie pełny dump tagów.

#### 2.5.2 GeoJSON, snapshot 2022-01-18

Plik: `https://aed.openstreetmap.org.pl/aed_poland.geojson` (Wayback `20220118100904`).
Rozmiar: 192 982 B. Features: **882**. Typ geometrii: `Point`.

Schemat był uboższy niż obecny:

- `properties.osm_id` (int, 100%),
- tylko wybrane tagi, i tylko gdy istniały: `defibrillator:location` (549), `access` (499), `indoor` (468), `opening_hours` (302), `location` (240), `phone` (61), `note` (35), `note:pl` (36), `description` (16), `defibrillator:location:pl` (8), `wikimedia_commons` (1).
- Brak `@osm_type`, `@osm_version`, brak pełnego zestawu tagów.

To archiwum ma wartość historyczną. **Nie** należy używać go jako aktualnego źródła.

#### 2.5.3 Metadata, snapshot 2023-01-07

Plik: `https://aed.openstreetmap.org.pl/aed_poland_metadata.json` (Wayback `20230107045919`):

```json
{"data_download_ts_utc":"2023-01-07T04:11:51+00:00","number_of_elements":4588}
```

To jedyne pole metadanych: data pobrania i liczba elementów. Brak licencji, wersji schematu, bounding box, listy pól.

### 2.6 Licencja, aktualizacja, ograniczenia OpenAEDMap

| Aspekt | Wartość | Status |
| --- | --- | --- |
| Licencja | **ODbL 1.0** (w API node: `https://opendatacommons.org/licenses/odbl/1-0/`) | **VERIFIED** |
| Atrybucja | `OpenStreetMap and contributors`, link do copyright | **VERIFIED** |
| Aktualizacja bazy | OSM minute replication; `AED_UPDATE_DELAY = 30 s` | **VERIFIED (kod)** |
| Baseline | Overpass `node[emergency=defibrillator];out meta qt;` | **VERIFIED (kod)** |
| Cache eksportu | `max-age=3600`, ETag z rewizją | **VERIFIED** (nagłówki) |
| Format eksportu | tylko GeoJSON per kraj | **VERIFIED** |
| CSV | brak | **VERIFIED** |
| Zakres | tylko node, bez way/relation | **VERIFIED (kod)** |
| Licencja w GeoJSON | brak w treści/nagłówkach | **VERIFIED** |

Ograniczenia:

- Eksport nie zawiera informacji o czasie wygenerowania ani o wersji OSM base. ETag pomaga wykryć zmianę, ale nie mówi kiedy.
- Brak licencji w pliku oznacza, że konsument musi znać warunki ODbL z dokumentacji, a nie z samego pliku.
- Brak CSV utrudnia analizę w Excelu; trzeba konwertować GeoJSON.
- Tylko node: 2 way w Polsce są pomijane.
- `feature_count` może różnić się od taginfo o kilkadziesiąt rekordów z powodu opóźnienia i usunięć.

### 2.7 Porównanie liczb

| Źródło | Zakres | Liczba | Data | Status |
| --- | --- | --- | --- | --- |
| taginfo global | wszystkie `emergency=defibrillator` | 179 680 (179 644 node, 35 way, 1 relation) | 2026-11-21T00:59:08Z | **VERIFIED** |
| taginfo Polska (Geofabrik) | wszystkie | 18 321 (18 319 node, 2 way) | 2026-11-20T21:20:13Z | **VERIFIED** |
| OpenAEDMap `PL.geojson` | tylko node | 18 298 | 2026-11-21 | **VERIFIED** |
| Historyczny CSV | tylko node | 4 588 | 2023-01-07 | **VERIFIED** (Wayback) |
| Historyczny GeoJSON | tylko node | 882 | 2022-01-18 | **VERIFIED** (Wayback) |

Różnica 18 321 vs 18 298 = 23. Składają się na nią 2 way (nieimportowane) oraz ok. 21 node'ów z lagu/usunięć. To szacunek, nie twardy bilans.

---

## 3. Geoportal.gov.pl: usługi WMS

### 3.1 Najważniejszy wniosek

**Geoportal nie publikuje warstwy AED.** W katalogu usług WMS/WMTS (`https://www.geoportal.gov.pl/pl/usluga/uslugi-przegladania-wms-i-wmts/`) nie ma warstwy defibrylatorów. Przeszukanie GetCapabilities usługi PRG (52 warstwy) nie znalazło nazw zawierających `defibryl` ani `aed`.

Geoportal jest przydatny jako **źródło referencyjne** do:

- granic administracyjnych (PRG),
- punktów adresowych i ulic (Krajowa Integracja Numeracji Adresowej),
- ortofotomapy i danych topograficznych jako podkładu.

Nie jest źródłem rekordów AED. Nie ma pola „operator AED”, „model”, „status”.

### 3.2 GetCapabilities: struktura XML

Przykład:

```text
https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/AdministrativeBoundaries?SERVICE=WMS&REQUEST=GetCapabilities
```

Odpowiedź: `200 text/xml; charset=UTF-8`, 126 647 B, `WMS_Capabilities version="1.3.0"`.

Główne elementy:

| Element XML | Znaczenie | Przykład |
| --- | --- | --- |
| `WMS_Capabilities@version` | wersja WMS | `1.3.0` |
| `Service/Name` | typ usługi | `WMS` |
| `Service/Title` | nazwa usługi | `Usługa przeglądania Państwowego Rejestru Granic` |
| `Service/Abstract` | opis | `Usługa WMS publikująca jednostki podziału terytorialnego Polski...` |
| `Service/ContactInformation` | kontakt | `Główny Urząd Geodezji i Kartografii` |
| `Capability/Request/GetCapabilities/Format` | formaty capabilities | `text/xml` |
| `Capability/Request/GetMap/Format` | formaty map | `image/png`, `image/jpeg`, `image/tiff`, `application/pdf`, `image/svg+xml`, `application/json`, `application/x-protobuf` |
| `Capability/Exception/Format` | formaty błędów | `XML`, `INIMAGE`, `BLANK` |
| `Capability/Layer/Name` | nazwa warstwy | `A00_Granice_panstwa`, `A01_Granice_wojewodztw` |
| `Capability/Layer/Title` | tytuł warstwy | `A00_Granice_panstwa` |
| `Capability/Layer/CRS` | układy współrzędnych | `EPSG:2176` ... `EPSG:2180`, `EPSG:3857`, `EPSG:4326` |
| `Capability/Layer/EX_GeographicBoundingBox` | zasięg geograficzny | Polska |
| `Capability/Layer/BoundingBox` | zasięg w danym CRS | zależny od CRS |
| `Capability/Layer/Style` | styl | `default` |

**VERIFIED:** pobrane GetCapabilities, 2026-11-21.

### 3.3 Konkretne usługi i warstwy

#### PRG (Państwowy Rejestr Granic)

```text
https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/AdministrativeBoundaries
```

- `Service/Title`: `Usługa przeglądania Państwowego Rejestru Granic`
- 52 warstwy, m.in.:
  - `A00_Granice_panstwa`
  - `A01_Granice_wojewodztw`
  - `A02_Granice_powiatow`
  - `A03_Granice_gmin`
  - `A04_Granice_miast`
  - `A05_Granice_jednostek_ewidencyjnych`
  - `A06_Granice_obrebow_ewidencyjnych`
  - warstwy sądów, prokuratur, policji, obwodów spisowych
- CRS: `EPSG:2176`, `EPSG:2177`, `EPSG:2178`, `EPSG:2179`, `EPSG:2180`, `EPSG:3857`, `EPSG:4326`
- `AccessConstraints`: `NONE`
- `Fees`: `NONE`

**VERIFIED.** Brak warstwy AED.

#### Adresy

```text
https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaNumeracjiAdresowej
```

- `Service/Title`: `Krajowa Integracja Numeracji Adresowej`
- warstwy: `Punkty adresowe`, `Ulice`, `Ulice - obiekty liniowe`
- CRS: `EPSG:2176`, `EPSG:2177`, `EPSG:2178`, `EPSG:2179`, `EPSG:2180`, `EPSG:3857`, `EPSG:4326`, `EPSG:900913`
- `AccessConstraints`/`Fees`: do potwierdzenia w GetCapabilities; usługa publiczna
- Zastosowanie w projekcie: geokodowanie adresów, uzupełnianie `addr:*`, przypisanie TERYT.

**VERIFIED** dla listy warstw i CRS (GetCapabilities).

#### Ortofotomapa

```text
https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution
```

- `Service/Title`: `ORTOFOTOMAPA`
- warstwa: `Raster`, styl `default`
- CRS: `CRS:84`, `EPSG:2176` ... `EPSG:2180`, `EPSG:3857`, `EPSG:4326`
- `AccessConstraints`: `Wykorzystanie usługi nie podlega żadnym ograniczeniom z wyłączeniem automatycznego pobierania i kolekcjonowania obrazów (tzw. harvesting)...`
- `Fees`: `Brak opłat`

**VERIFIED.** To podkład, nie AED.

### 3.4 Przykład GetMap

```text
https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/AdministrativeBoundaries
  ?SERVICE=WMS
  &VERSION=1.3.0
  &REQUEST=GetMap
  &LAYERS=A01_Granice_wojewodztw
  &STYLES=
  &CRS=EPSG:4326
  &BBOX=49.0,14.0,55.0,24.5
  &WIDTH=1024
  &HEIGHT=768
  &FORMAT=image/png
  &TRANSPARENT=TRUE
```

Uwaga: w WMS 1.3.0 dla `EPSG:4326` obowiązuje kolejność osi **lat,lon** (`BBOX=minLat,minLon,maxLat,maxLon`). Dla `EPSG:2180` i `EPSG:3857` kolejność jest `x,y`. To częste źródło błędów.

### 3.5 Licencja, aktualizacja, ograniczenia Geoportal WMS

| Aspekt | Wartość | Status |
| --- | --- | --- |
| Format | WMS 1.3.0, raster + opcjonalnie JSON/GML/protobuf | **VERIFIED** |
| CRS | 2176-2180, 3857, 4326; adresy dodatkowo 900913 | **VERIFIED** |
| AED | brak warstwy | **VERIFIED** |
| `AccessConstraints` PRG | `NONE` | **VERIFIED** |
| `Fees` PRG | `NONE` | **VERIFIED** |
| `AccessConstraints` ORTO | zakaz harvestingu, poza tym bez ograniczeń | **VERIFIED** |
| `Fees` ORTO | brak opłat | **VERIFIED** |
| Częstotliwość aktualizacji | **NOT VERIFIED** w GetCapabilities; zależy od źródła (PRG/adresy/ORTO) | **NOT VERIFIED** |
| Licencja prawna danych | wymaga analizy regulaminu Geoportal; metadane WMS nie są licencją | **NOT VERIFIED** |
| CORS | **NOT VERIFIED** (nie testowano z przeglądarki) | **NOT VERIFIED** |
| GetFeatureInfo | zależy od warstwy; **NOT VERIFIED** dla wszystkich | **NOT VERIFIED** |

Ograniczenia:

- WMS zwraca obraz, nie rekordy AED. Do danych atrybutowych potrzebny byłby WFS, ale AED i tak nie ma.
- Brak maszynowego rejestru AED.
- Nie nadaje się do masowego harvestingu kafelków (szczególnie ORTO).
- Nie zastępuje OSM w zakresie lokalizacji AED.

---

## 4. CloudFerro

### 4.1 Czym jest CloudFerro

CloudFerro S.A. to europejski dostawca chmury obliczeniowej (IaaS/PaaS), m.in. dla sektora kosmicznego i obserwacji Ziemi. Oferuje:

- CloudFerro Cloud (compute, storage, Kubernetes, AI/ML),
- CREODIAS (cloud services + Earth Observation data access),
- dostęp do danych Sentinel, Landsat, MODIS, SMOS itd.

**VERIFIED:** `https://creodias.eu/` i `https://docs.cloudferro.com/` (2026-11-21).

### 4.2 Czy CloudFerro publikuje AED?

**Nie znaleziono.** W publicznych materiałach CloudFerro i CREODIAS:

- brak zbioru danych AED,
- brak warstwy WMS z AED,
- brak API rekordu AED,
- brak słownika pól AED.

Przeszukane: strona główna CloudFerro, dokumentacja `docs.cloudferro.com`, CREODIAS, katalog usług. Fraza `defibryl`/`AED` nie występuje w kontekście danych.

**Status: NOT VERIFIED jako źródło AED.** To nie znaczy, że CloudFerro „nie może” hostować takiego zbioru w przyszłości. Na dzień badania nie ma publicznej oferty.

### 4.3 Czy CloudFerro ma WMS?

CloudFerro jako dostawca chmury może hostować dowolne WMS-y swoich klientów, ale nie jest to publiczna usługa krajowa z AED. CREODIAS udostępnia dane EO, nie AED.

Jeżeli w projekcie potrzebny jest WMS referencyjny dla Polski, właściwym źródłem jest **Geoportal.gov.pl** (PRG, adresy, ortofoto), a nie CloudFerro.

**Status: NOT VERIFIED** dla publicznego WMS CloudFerro z AED.

### 4.4 Schemat pól

Brak schematu AED. Nie ma czego mapować.

| Aspekt | Wartość | Status |
| --- | --- | --- |
| Format | brak publicznego formatu AED | **NOT VERIFIED** |
| CRS | N/A dla AED; dane EO zwykle EPSG:4326 | **N/A** |
| Licencja | zależy od zbioru EO; nie dotyczy AED | **N/A** |
| Aktualizacja | N/A dla AED | **N/A** |

---

## 5. Porównanie źródeł

| Cecha | OSM API / Overpass | OpenAEDMap GeoJSON | Historyczny CSV | Geoportal WMS | CloudFerro |
| --- | --- | --- | --- | --- | --- |
| Format | JSON / XML | GeoJSON | CSV | XML + raster | cloud/EO |
| CRS | EPSG:4326 | EPSG:4326 | EPSG:4326 | 2176-2180, 3857, 4326 | N/A |
| Rekordy AED w PL | 18 321 | 18 298 | 4 588 (2023) | **0** | **0** |
| Pełne tagi | tak | tak | nie (15 kolumn) | nie | nie |
| `osm_version` | tak | tak | nie | nie | nie |
| `check_date` | tak | tak | nie | nie | nie |
| Status urządzenia | nie | nie | nie | nie | nie |
| Licencja | ODbL 1.0 | ODbL 1.0 | ODbL 1.0 | open/no fees (WMS metadata) | EO license |
| Aktualizacja | minutely | ~30 s + cache 1 h | archiwum | zależna od warstwy | N/A |
| Ograniczenia | limity Overpass | tylko node, brak CSV | nieaktualne | brak AED | brak AED |

---

## 6. Mapowanie na wspólny schemat AED

### 6.1 Zasady

1. **Identyfikator globalny** budujemy jako `osm:{osm_type}/{osm_id}`. Nie używamy `ref` jako klucza globalnego.
2. **Współrzędne** zawsze w EPSG:4326, `geometry` jako `Point(lon lat)`. Walidujemy bbox Polski: `lat 49.0-55.0`, `lon 14.0-24.5` (z marginesem na granice).
3. **Brak wartości** to `null` lub `unknown`, nigdy domyślne `yes`/`no`.
4. **Status** domyślnie `unknown`. Nie wnioskujemy „działa” z obecności tagu.
5. **`access`** mapujemy na zamknięty enum. `access=emergency` traktujemy jako niepoprawne/do przeglądu.
6. **`last_verified_at`** bierzemy tylko z `check_date`/`survey:date`, nie z `timestamp`.
7. **`operator`** normalizujemy, ale nie scalamy po samej nazwie. Preferowany klucz: `operator:wikidata`.
8. **Prawa autorskie** zawsze zachowujemy: `license`, `attribution`, `source_url`, `raw_tags`.

### 6.2 Tabela mapowania: identyfikatory

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `aed_id` | string | **TAK** | `osm:{type}/{id}` | `osm:{@osm_type}/{@osm_id}` | Klucz główny. Stabilny dopóki OSM ID istnieje. |
| `source` | enum | **TAK** | `osm` | `openaedmap` | Źródło importu. |
| `source_record_id` | string | **TAK** | `{type}/{id}` | `{@osm_type}/{@osm_id}` | Identyfikator w źródle. |
| `osm_type` | enum | **TAK** | `type` | `@osm_type` | `node`/`way`/`relation`; w praktyce `node`. |
| `osm_id` | int64 | **TAK** | `id` | `@osm_id` | Globalny ID OSM. |
| `osm_version` | int32 | opcjonalne | `version` | `@osm_version` | Wersja obiektu. |
| `osm_changeset` | int64 | opcjonalne | `changeset` | brak | Tylko Overpass/OSM API. |
| `osm_user` | string | opcjonalne | `user` | brak | Proweniencja edycji. |
| `osm_uid` | int64 | opcjonalne | `uid` | brak | Proweniencja edycji. |
| `osm_timestamp` | timestamptz | opcjonalne | `timestamp` | brak | Ostatnia edycja, **nie** weryfikacja. |
| `ref` | string | opcjonalne | `ref` | `ref` | Lokalny numer; nie unikalny globalnie. |
| `operator_ref` | string | opcjonalne | `ref:api-um-warszawa-pl`, `ref:pkt-zycia-2023` | j.w. | Identyfikator źródłowy operatora. |
| `country_code` | char(2) | **TAK** | derived | endpoint kraju | `PL` na podstawie geometrii/endpointu. |
| `teryt` | string | opcjonalne | derived | brak | Wymaga geokodowania/PRG, nie z OSM. |

### 6.3 Tabela mapowania: lokalizacja i adres

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `lat` | double | **TAK** | `lat` | `geometry.coordinates[1]` | WGS84. |
| `lon` | double | **TAK** | `lon` | `geometry.coordinates[0]` | WGS84. |
| `geometry` | Point | **TAK** | derived | `geometry` | `SRID=4326;POINT(lon lat)`. |
| `location_description` | text | zalecane | `defibrillator:location` | j.w. | Najważniejsze dla ratownika. |
| `location_description_pl` | text | opcjonalne | `defibrillator:location:pl` | j.w. | Wariant PL. |
| `location_description_en` | text | opcjonalne | `defibrillator:location:en` | j.w. | Wariant EN. |
| `indoor` | enum | zalecane | `indoor` | j.w. | `yes`/`no`/`unknown`. |
| `level` | text | opcjonalne | `level` | j.w. | Zachować string; parsować numerycznie. |
| `level_ref` | text | opcjonalne | `level:ref` | j.w. | Etykieta kondygnacji. |
| `address_street` | text | opcjonalne | `addr:street` | j.w. | Pokrycie 0,4%. |
| `address_housenumber` | text | opcjonalne | `addr:housenumber` | j.w. | Pokrycie 0,6%. |
| `address_postcode` | text | opcjonalne | `addr:postcode` | j.w. | Pokrycie 0,2%. |
| `address_city` | text | opcjonalne | `addr:city` | j.w. | Pokrycie 0,4%. |
| `address_place` | text | opcjonalne | `addr:place` | j.w. | Pokrycie 0,1%. |
| `address_floor` | text | opcjonalne | `addr:floor` | j.w. | 9 rekordów. |
| `description` | text | opcjonalne | `description` | j.w. | 3,3%. |
| `name` | text | opcjonalne | `name` | j.w. | Nazwa miejsca, nie urządzenia. |

### 6.4 Tabela mapowania: dostęp

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `access` | enum | **TAK** | `access` | `access` | `yes`->`public`, `permissive`->`public_tolerated`, `customers`->`customers`, `private`->`private`, `permit`->`permit`, `no`->`no`, brak->`unknown`. |
| `access_note` | text | opcjonalne | `access:note` | j.w. | 1 rekord. |
| `opening_hours` | text | zalecane | `opening_hours` | j.w. | Zachować surowy string OSM OH. |
| `opening_hours_24_7` | bool | opcjonalne | derived | derived | `true` tylko dla dokładnie `24/7`. |
| `locked` | bool | opcjonalne | `locked` | j.w. | Tylko 3 rekordy. |
| `lock_code` | text | opcjonalne | `defibrillator:code` | j.w. | Wrażliwe; nie publikować bez potrzeby. |
| `wheelchair` | enum | opcjonalne | `wheelchair` | j.w. | 2,5%. |
| `indoor` | enum | zalecane | `indoor` | j.w. | Patrz lokalizacja. |

### 6.5 Tabela mapowania: urządzenie

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `device_type` | enum | **TAK** | `emergency=defibrillator` | `emergency` | Zawsze `AED`. |
| `manufacturer` | text | opcjonalne | `manufacturer` | j.w. | 1,9%; normalizować pisownię. |
| `model` | text | opcjonalne | `model` | j.w. | 0,8%. |
| `serial_number` | text | opcjonalne | brak | brak | **Brak w OSM.** Nie mylić z `ref`. |
| `cabinet` | enum | opcjonalne | `defibrillator:cabinet` | j.w. | 0% w PL. |
| `cabinet_manufacturer` | text | opcjonalne | `defibrillator:cabinet:manufacturer` | j.w. | 0%. |
| `cabinet_colour` | text | opcjonalne | `defibrillator:cabinet:colour` | j.w. | 0%. |
| `battery_expiry` | date | opcjonalne | brak | brak | **Brak w OSM.** |
| `electrode_expiry` | date | opcjonalne | brak | brak | **Brak w OSM.** |
| `device_condition` | enum | opcjonalne | brak | brak | **Brak w OSM.** |

### 6.6 Tabela mapowania: status i weryfikacja

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `status` | enum | **TAK** | brak | brak | `operational`/`out_of_order`/`unknown`; domyślnie `unknown`. |
| `status_source` | enum | opcjonalne | brak | brak | `survey`/`operator`/`osm_note`/`unknown`. |
| `last_verified_at` | date | zalecane | `check_date`, `survey:date` | j.w. | Wybierz nowszą z dat; nie używaj `timestamp`. |
| `check_date` | date | opcjonalne | `check_date` | j.w. | 32,7%. |
| `survey_date` | date | opcjonalne | `survey:date` | j.w. | 0,1%. |
| `source_date` | date | opcjonalne | `source:date` | j.w. | 0%. |
| `fixme` | text | opcjonalne | `fixme` | j.w. | 3,5%; sygnał problemu. |
| `note` | text | opcjonalne | `note` | j.w. | 1,3%. |
| `confidence` | enum | opcjonalne | derived | derived | `high`/`medium`/`low`; reguły niżej. |

Sugerowane reguły `confidence`:

- `high`: `check_date` lub `survey:date` w ciągu 12 miesięcy **oraz** `access` i `defibrillator:location` obecne.
- `medium`: `check_date`/`survey:date` w ciągu 36 miesięcy **lub** komplet pól dostępowych, ale brak daty.
- `low`: brak daty weryfikacji **lub** brak `access` **lub** brak opisu miejsca **lub** `fixme`.

### 6.7 Tabela mapowania: operator i kontakt

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `operator` | text | zalecane | `operator` | j.w. | 32,8%; 4 086 unikalnych. |
| `operator_type` | enum | opcjonalne | `operator:type` | j.w. | 0,5%. |
| `operator_wikidata` | string | opcjonalne | `operator:wikidata` | j.w. | 1,0%; najlepszy klucz normalizacji. |
| `operator_short` | text | opcjonalne | `operator:short` | j.w. | 0,4%. |
| `phone` | text | zalecane | `phone` | j.w. | 24,5%; normalizować E.164, zachować raw. |
| `emergency_phone` | text | opcjonalne | `emergency:phone` | j.w. | 1,1%; często `112`. |
| `email` | text | opcjonalne | `email` | j.w. | 0,3%. |
| `website` | text | opcjonalne | `website` | j.w. | 0,5%. |
| `contact_facebook` | text | opcjonalne | `contact:facebook` | j.w. | 0,2%. |
| `owner` | text | opcjonalne | brak | brak | **Brak w OSM**; operator != właściciel. |

### 6.8 Tabela mapowania: media

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `image_url` | text | opcjonalne | `image` | j.w. | 11,9%; URL może wygasnąć. |
| `image_license` | text | opcjonalne | `image:license` | j.w. | 7,6%; w PL wszystkie `CC0`. |
| `wikimedia_commons` | text | opcjonalne | `wikimedia_commons` | j.w. | 0,5%. |
| `panoramax` | text | opcjonalne | `panoramax` | j.w. | 3 rekordy. |
| `mapillary` | text | opcjonalne | `mapillary` | j.w. | 5 rekordów. |
| `photo_id` | text | opcjonalne | brak | `@photo_id` (node API) | Tylko API node'a. |
| `photo_url` | text | opcjonalne | brak | `@photo_url` (node API) | Proxy OpenAEDMap. |
| `photo_source` | text | opcjonalne | brak | `@photo_source` (node API) | Źródło zdjęcia. |

### 6.9 Tabela mapowania: metadane i licencja

| Pole kanoniczne | Typ | Wymagane | OSM | OpenAEDMap | Transformacja / uwagi |
| --- | --- | --- | --- | --- | --- |
| `license` | string | **TAK** | `ODbL-1.0` | `ODbL-1.0` | Stała dla OSM/OpenAEDMap, mimo braku w GeoJSON. |
| `attribution` | string | **TAK** | `© OpenStreetMap contributors` | j.w. | Wymagane przez ODbL. |
| `source_url` | text | **TAK** | `https://www.openstreetmap.org/{type}/{id}` | derived | Link do obiektu. |
| `source_updated_at` | timestamptz | opcjonalne | `timestamp` | brak | Ostatnia edycja OSM. |
| `export_generated_at` | timestamptz | opcjonalne | brak | brak | Brak w GeoJSON; historyczny CSV miał `data_download_ts_utc`. |
| `raw_tags` | jsonb | **TAK** | `tags` | `properties` bez `@*` | Pełna proweniencja i możliwość re-normalizacji. |
| `imported_at` | timestamptz | **TAK** | ingest | ingest | Czas importu do naszego systemu. |
| `updated_at` | timestamptz | **TAK** | ingest | ingest | Czas ostatniej zmiany rekordu. |
| `timezone_name` | text | opcjonalne | brak | `@timezone_name` (node API) | Tylko API node'a. |
| `timezone_offset` | text | opcjonalne | brak | `@timezone_offset` (node API) | Tylko API node'a. |

### 6.10 Pola obowiązkowe wspólnego schematu

Minimalny rekord do publikacji:

| Pole | Uzasadnienie |
| --- | --- |
| `aed_id` | stabilna tożsamość |
| `source` | proweniencja |
| `source_record_id` | możliwość ponownego pobrania |
| `country_code` | zakres terytorialny |
| `lat`, `lon`, `geometry` | lokalizacja |
| `device_type` | typ obiektu |
| `access` | czy można użyć; `unknown` dozwolone, ale jawne |
| `status` | `unknown` dozwolone, ale jawne |
| `license`, `attribution`, `source_url` | zgodność z ODbL |
| `raw_tags` | audyt i re-normalizacja |
| `imported_at`, `updated_at` | operacyjne |

**Nie** są obowiązkowe, bo OSM ich nie gwarantuje: `location_description`, `operator`, `phone`, `manufacturer`, `model`, `check_date`, `opening_hours`, `indoor`, `level`, `ref`, `image_url`.

### 6.11 Czego brakuje w OSM i co trzeba dodać

| Brakujące pole | Dlaczego ważne | Możliwe źródło |
| --- | --- | --- |
| `status` (działa/nie działa) | AED może być uszkodzony lub wyłączony | zgłoszenia operatora, formularz, weryfikacja terenowa |
| `last_verified_at` | `check_date` pokrywa tylko 32,7% | formularz, import od operatora |
| `serial_number` | identyfikacja egzemplarza | operator, tabliczka znamionowa |
| `battery_expiry` | pewność działania | operator/serwis |
| `electrode_expiry` | pewność działania | operator/serwis |
| `owner` | odpowiedzialność prawna | operator/JST |
| `access` dla 7,5% | czy ratownik wejdzie | weryfikacja terenowa |
| `location_description` dla 32,7% | znalezienie w budynku | weryfikacja terenowa |
| adres (`addr:*`) dla 99,4% | geokodowanie, TERYT | Geoportal adresy, operator |
| `opening_hours` dla 62,9% | czy dostępne w nocy | operator |
| `level` dla 79,8% | piętro w budynku | operator |
| `image` dla 88,1% | rozpoznanie miejsca | OpenAEDMap photos, Wikimedia |

### 6.12 Normalizacja wartości

#### `access`

| OSM | Kanoniczne | Uwaga |
| --- | --- | --- |
| `yes` | `public` | domyślny publiczny |
| `permissive` | `public_tolerated` | formalnie niepubliczny, ale tolerowany |
| `customers` | `customers` | tylko klienci/klienci obiektu |
| `private` | `private` | prywatny |
| `permit` | `permit` | wymagane pozwolenie |
| `no` | `no` | brak dostępu |
| `unknown` lub brak | `unknown` | nie zgadujemy |
| `emergency` | `invalid` | przestarzałe; do przeglądu |

#### `indoor`

| OSM | Kanoniczne |
| --- | --- |
| `yes` | `indoor` |
| `no` | `outdoor` |
| brak | `unknown` |

`location=indoor/outdoor/vehicle` traktować jako dodatkową wskazówkę, nie nadrzędne.

#### `opening_hours`

- Zachować surowy string.
- `24/7` -> `opening_hours_24_7 = true`.
- Puste -> `null` (nie `24/7`).
- Parsować biblioteką wspierającą OSM OH; przy błędzie zapisać `raw` i `parse_error`.

#### `phone`

- Zachować `raw_phone`.
- Znormalizować do E.164, jeśli możliwe.
- `112`, `999`, `998` traktować jako `emergency_phone`, nie `phone` obiektowy; oznaczyć do przeglądu.

#### `operator`

- Trim, scal whitespace, ujednolić `sp. z o.o.` itp.
- Nie scalać rekordów tylko po nazwie.
- Jeśli `operator:wikidata` istnieje, użyć QID jako klucza encji.
- `operator` może być puste przy `operator:wikidata`.

#### `manufacturer` / `model`

- Zachować raw.
- Utworzyć słownik aliasów (`PHILIPS`/`Philips`, `ZOLL`/`Zoll`).
- `model` nie powinien zawierać nazwy producenta.

#### `ref`

- Zachować jako `source_ref`.
- Nie używać jako `aed_id`.
- Jeśli `ref` wygląda na numer seryjny, **nie** przenosić automatycznie do `serial_number` bez potwierdzenia.

### 6.13 Przykładowy rekord kanoniczny

Dla node `477958354`:

```json
{
  "aed_id": "osm:node/477958354",
  "source": "osm",
  "source_record_id": "node/477958354",
  "osm_type": "node",
  "osm_id": 477958354,
  "osm_version": 12,
  "osm_changeset": 125520683,
  "osm_user": "☆Finvenkulo",
  "osm_uid": 4128818,
  "osm_timestamp": "2022-08-29T12:06:23Z",
  "country_code": "PL",
  "lat": 49.5878956,
  "lon": 19.5168185,
  "geometry": { "type": "Point", "coordinates": [19.5168185, 49.5878956] },
  "location_description": "Na ścianie w jadalni",
  "location_description_pl": null,
  "location_description_en": null,
  "indoor": "indoor",
  "level": null,
  "level_ref": null,
  "address_street": null,
  "address_housenumber": null,
  "address_postcode": null,
  "address_city": null,
  "address_place": null,
  "description": "Schronisko PTTK Markowe Szczawiny",
  "access": "unknown",
  "opening_hours": null,
  "opening_hours_24_7": null,
  "locked": null,
  "wheelchair": null,
  "device_type": "AED",
  "manufacturer": null,
  "model": null,
  "serial_number": null,
  "cabinet": null,
  "status": "unknown",
  "status_source": null,
  "last_verified_at": null,
  "check_date": null,
  "survey_date": null,
  "confidence": "low",
  "operator": "PTTK",
  "operator_type": null,
  "operator_wikidata": null,
  "phone": "+48 33 877 51 05",
  "emergency_phone": null,
  "email": "markowe.szczawiny@op.pl",
  "website": null,
  "image_url": null,
  "image_license": null,
  "wikimedia_commons": null,
  "license": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors",
  "source_url": "https://www.openstreetmap.org/node/477958354",
  "source_updated_at": "2022-08-29T12:06:23Z",
  "export_generated_at": null,
  "raw_tags": {
    "defibrillator:location": "Na ścianie w jadalni",
    "description": "Schronisko PTTK Markowe Szczawiny",
    "ele": "1180",
    "email": "markowe.szczawiny@op.pl",
    "emergency": "defibrillator",
    "indoor": "yes",
    "operator": "PTTK",
    "phone": "+48 33 877 51 05"
  },
  "imported_at": "2026-11-21T19:00:00Z",
  "updated_at": "2026-11-21T19:00:00Z"
}
```

Uwagi do przykładu:

- `access` jest `unknown`, bo tag nie występuje. To poprawne, nie „public”.
- `status` jest `unknown`, bo OSM nie ma statusu.
- `confidence` jest `low`, bo brak `check_date`/`survey:date` i brak `access`.
- `indoor` zmapowano z `indoor=yes` na `indoor`.

### 6.14 Deduplikacja

- W obrębie OSM: `osm_type + osm_id` jest unikalny. Nie deduplikować po współrzędnych.
- Między źródłami: dopiero po normalizacji, z jawnym progiem:
  - odległość < 30-50 m,
  - ten sam typ urządzenia,
  - podobny operator (QID lub znormalizowana nazwa),
  - podobny adres/opis miejsca,
  - różne `aed_id` -> zapisać jako `same_as`/`merged_into`, nie usuwać.
- Nie scalać automatycznie rekordów o różnych `operator:wikidata`.
- Nie scalać tylko dlatego, że `ref` jest taki sam: `ref` nie jest globalny.

### 6.15 Braki i ryzyka

| Ryzyko | Wpływ | Mitygacja |
| --- | --- | --- |
| Brak statusu | mapa pokazuje niedziałające AED | status `unknown`, zbieranie zgłoszeń |
| Brak daty weryfikacji | fałszywe poczucie aktualności | eksponować `last_verified_at`, nie `timestamp` |
| `access=private` 16,6% | ratownik może nie wejść | wyraźny filtr „publiczne” |
| `opening_hours` 37,1% | dostęp nocny nieznany | pole `unknown`, nie domyślne 24/7 |
| Adresy 0,6% | trudna nawigacja | Geoportal adresy + opis miejsca |
| `operator` 4 086 unikalnych | trudna agregacja | `operator:wikidata` + słownik |
| Brak licencji w GeoJSON | ryzyko naruszenia ODbL | własna atrybucja i link do licencji |
| Tylko node | 2 way pominięte | świadomie zaakceptowane lub własny import OSM |

---

## 7. Reprodukcja badań

```bash
# 1. OSM API: pojedynczy rekord
curl -sS https://api.openstreetmap.org/api/0.6/node/477958354.json | jq .

# 2. Overpass: 3 rekordy z metadanymi
curl -sS --data-urlencode 'data=[out:json][timeout:60];
area["ISO3166-1"="PL"][admin_level=2]->.pl;
node["emergency"="defibrillator"](area.pl);
out meta 3;' \
  https://maps.mail.ru/osm/tools/overpass/api/interpreter | jq .

# 3. Taginfo: liczebność Polski
curl -sS 'https://taginfo.geofabrik.de/europe:poland/api/4/tag/stats?key=emergency&value=defibrillator' | jq .

# 4. OpenAEDMap: liczba i eksport
curl -sS 'https://openaedmap.org/api/v1/countries/names?language=pl' | jq '.[] | select(.country_code=="PL")'
curl -sS -o PL.geojson 'https://openaedmap.org/api/v1/countries/PL.geojson'
python3 -c 'import json; d=json.load(open("PL.geojson")); print(len(d["features"]))'

# 5. OpenAEDMap: pojedynczy node
curl -sS 'https://openaedmap.org/api/v1/node/477958354' | jq .

# 6. Historyczny CSV/GeoJSON (Wayback)
curl -sSL 'https://web.archive.org/web/20230107044845id_/https://aed.openstreetmap.org.pl/aed_poland.csv' -o aed_poland.csv
head -1 aed_poland.csv
curl -sSL 'https://web.archive.org/web/20220118100904id_/https://aed.openstreetmap.org.pl/aed_poland.geojson' -o aed_poland.geojson

# 7. Geoportal: GetCapabilities
curl -sS 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/AdministrativeBoundaries?SERVICE=WMS&REQUEST=GetCapabilities' -o prg.xml
grep -ioE 'defibryl|aed' prg.xml || echo 'brak warstwy AED'

# 8. CloudFerro: brak publicznego AED
curl -sSL 'https://creodias.eu/' | grep -ioE 'defibryl|aed' || echo 'brak AED w CREODIAS'
```

---

## 8. Wnioski dla wzorcowego zakresu danych

1. **OSM jest dobrym źródłem lokalizacji i opisu miejsca**, ale nie statusu i nie danych technicznych.
2. **OpenAEDMap to wygodny eksport OSM**, ale nie zastępuje OSM API: brak CSV, brak metadanych czasu, tylko node.
3. **Geoportal i CloudFerro nie są źródłami AED.** Trzeba to jasno powiedzieć w dokumentacji projektu, żeby nie obiecywać integracji, której nie ma.
4. **Wspólny schemat powinien mieć jawne `unknown`** dla dostępu i statusu. To lepsze niż fałszywe `yes`.
5. **Pola obowiązkowe** to tożsamość, lokalizacja, typ, licencja i proweniencja. Reszta jest „best effort”.
6. **Brakujące pola** (status, numer seryjny, ważność elektrod, właściciel) muszą pochodzić z formularza/operatora, nie z OSM.
7. **`last_verified_at` musi być oddzielone od `osm_timestamp`**, inaczej raport będzie fałszywie „świeży”.

---

## 9. Statusy weryfikacji: skrót

| Twierdzenie | Status |
| --- | --- |
| `emergency=defibrillator` jest głównym tagiem AED | **VERIFIED** (wiki + dane) |
| W Polsce jest ok. 18,3 tys. AED w OSM | **VERIFIED** (taginfo + OpenAEDMap) |
| OpenAEDMap eksportuje 18 298 node'ów dla PL | **VERIFIED** (API) |
| OpenAEDMap GeoJSON ma `@osm_type`, `@osm_id`, `@osm_version` i tagi | **VERIFIED** (plik) |
| OpenAEDMap nie ma CSV | **VERIFIED** (404) |
| Historyczny CSV miał 15 kolumn i 4 588 rekordów | **VERIFIED** (Wayback) |
| Historyczny GeoJSON miał 882 features | **VERIFIED** (Wayback) |
| Geoportal WMS nie ma warstwy AED | **VERIFIED** (GetCapabilities, 52 warstwy) |
| Geoportal PRG WMS ma EPSG:2176-2180, 3857, 4326 | **VERIFIED** |
| CloudFerro nie ma publicznego AED | **NOT VERIFIED jako źródło AED** (brak znalezionych dowodów) |
| CloudFerro ma publiczny WMS z AED | **NOT VERIFIED** (brak) |
| Częstotliwość aktualizacji warstw Geoportal | **NOT VERIFIED** (brak w GetCapabilities) |
| Licencja prawna danych Geoportal | **NOT VERIFIED** (wymaga regulaminu) |

---

## 10. Źródła

| Źródło | URL | Wykorzystanie |
| --- | --- | --- |
| OSM Wiki, `Tag:emergency=defibrillator` | https://wiki.openstreetmap.org/wiki/Tag:emergency%3Ddefibrillator | schemat tagów AED, rekomendacje |
| OSM Wiki, `Key:defibrillator:location` | https://wiki.openstreetmap.org/wiki/Key:defibrillator:location | opis pola lokalizacji |
| OSM Wiki, `Key:check_date`, `Key:survey:date` | https://wiki.openstreetmap.org/wiki/Key:check_date | semantyka dat weryfikacji |
| OSM copyright | https://www.openstreetmap.org/copyright | ODbL 1.0, atrybucja |
| Overpass API Wiki | https://wiki.openstreetmap.org/wiki/Overpass_API | limity, składnia, publiczne endpointy |
| OSM API 0.6 | https://api.openstreetmap.org/api/0.6/ | schemat node'a |
| Taginfo Polska | https://taginfo.geofabrik.de/europe:poland/ | liczebność i wartości tagów |
| OpenAEDMap API | https://openaedmap.org/api/v1/ | GeoJSON, node, lista krajów |
| OpenAEDMap backend | https://github.com/openstreetmap-polska/openaedmap-backend | import tylko node, interwał 30 s, ODbL |
| Historyczny CSV (Wayback) | https://web.archive.org/web/20230107044845id_/https://aed.openstreetmap.org.pl/aed_poland.csv | 15 kolumn, 4 588 rekordów |
| Historyczny GeoJSON (Wayback) | https://web.archive.org/web/20220118100904id_/https://aed.openstreetmap.org.pl/aed_poland.geojson | 882 features |
| Historyczne metadata (Wayback) | https://web.archive.org/web/20230107045919id_/https://aed.openstreetmap.org.pl/aed_poland_metadata.json | data pobrania, liczba elementów |
| Geoportal, WMS/WMTS | https://www.geoportal.gov.pl/pl/usluga/uslugi-przegladania-wms-i-wmts/ | katalog usług, brak AED |
| Geoportal, PRG WMS | https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/AdministrativeBoundaries | GetCapabilities, warstwy, EPSG |
| Geoportal, adresy WMS | https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaNumeracjiAdresowej | warstwy adresowe |
| CREODIAS | https://creodias.eu/ | dane EO, brak AED |
| CloudFerro docs | https://docs.cloudferro.com/ | katalog usług, brak AED/WMS AED |

---

*Dokument badawczy. Nie jest poradą prawną. Przed publikacją danych w dane.gov.pl należy zweryfikować warunki ODbL i regulamin Geoportal.*
