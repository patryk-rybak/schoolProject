# Ekosystem OSM i źródła pochodne dla mapy AED

**Typ dokumentu:** research raw, materiał dowodowy dla wspólnego schematu danych AED  
**Zakres:** OpenStreetMap, OpenAEDMap (`aed.openstreetmap.org.pl`), Overpass API, Geoportal.gov.pl, CloudFerro  
**Data dostępu do źródeł:** 2026-11-21 (UTC, godziny 18:02-18:16, czasu lokalnego 19:02-19:16)  
**Autor lane:** `osm-ecosystem`  
**Zasada:** każdy fakt oznaczony jako **VERIFIED** ma podany URL, status HTTP i wynik zapytania. Brak potwierdzenia oznaczono **NOT VERIFIED** wraz z opisem prób.

---

## 0. Tabela statusów źródeł

| Źródło | Endpoint / plik | HTTP | Format | Status | Uwaga |
|---|---|---:|---|---|---|
| OSM Wiki, tagging AED | `https://wiki.openstreetmap.org/wiki/Tag:emergency%3Ddefibrillator` | 200 | HTML / wikitext | **VERIFIED** | strona zatwierdzonego schematu |
| OSM Wiki PL | `https://wiki.openstreetmap.org/wiki/Pl:Tag:emergency%3Ddefibrillator` | 200 | HTML / wikitext | **VERIFIED** | polskie konwencje i przykłady |
| OSM API, pojedynczy węzeł | `https://api.openstreetmap.org/api/0.6/node/10739764584.json` | 200 | JSON | **VERIFIED** | pełne metadane OSM, w tym `timestamp` |
| OpenAEDMap, eksport kraju | `https://openaedmap.org/api/v1/countries/PL.geojson` | 200 | GeoJSON | **VERIFIED** | 18 298 obiektów, 7 135 848 B |
| OpenAEDMap, eksport świata | `https://openaedmap.org/api/v1/countries/WORLD.geojson` | 200 (HEAD) | GeoJSON | **VERIFIED** | `feature_count` = 179 688 |
| OpenAEDMap, CSV | `https://openaedmap.org/api/v1/countries/PL.csv` | 404 | JSON błąd | **VERIFIED jako brak** | brak bieżącego eksportu CSV |
| OpenAEDMap, historyczny CSV | Wayback `20230107044845` / `aed_poland.csv` | 200 | CSV | **VERIFIED (archiwum)** | 4 588 wierszy, 15 kolumn |
| OpenAEDMap, historyczny GeoJSON | Wayback `20220118100904` / `aed_poland.geojson` | 200 | GeoJSON | **VERIFIED (archiwum)** | 3 622 features |
| OpenAEDMap, pojedynczy węzeł | `https://openaedmap.org/api/v1/node/9464587317` | 200 | JSON | **VERIFIED** | dodatkowe pola `@photo_*`, `@timezone_*` |
| Overpass API, główny | `https://overpass-api.de/api/interpreter` | 000 (timeout 120 s) | brak | **NOT VERIFIED** | sieć nie połączyła się z hostem |
| Overpass API, mirrory | `overpass.kumi.systems`, `overpass.private.coffee`, `maps.mail.ru`, `ovp.dresel.systems` | 000 (timeout) | brak | **NOT VERIFIED** | szczegóły w sekcji 3 |
| Overpass API, Szwajcaria | `https://overpass.osm.ch/api/interpreter` | 200 | JSON | **VERIFIED, ale tylko CH** | brak polskich danych, test kontrolny 3 348 AED |
| Taginfo API | `https://taginfo.openstreetmap.org/api/4/tag/stats?key=emergency&value=defibrillator` | 200 | JSON | **VERIFIED** | 179 680 obiektów globalnie, `data_until` 2026-11-21T00:59:08Z |
| Geoportal WMS, znana usługa PRG | `https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/StandardResolution?SERVICE=WMS&REQUEST=GetCapabilities` | 401 | HTML `Unauthorized.` | **VERIFIED jako 401** | także w Firefoksie, nie tylko curl |
| Geoportal, katalog usług | `https://www.geoportal.gov.pl/pl/usluga/wykaz-uslug/` | 200 | HTML | **VERIFIED** | brak warstwy „Defibrylatory” |
| Geoportal, wyszukiwanie WP | `https://www.geoportal.gov.pl/wp-json/wp/v2/search?search=defibrylator` | 200 | JSON `[]` | **VERIFIED jako brak** | brak treści o defibrylatorach |
| CloudFerro, WMS | `https://wms.cloudferro.com/`, `https://maps.cloudferro.com/` | brak DNS | brak | **NOT VERIFIED** | NXDOMAIN |
| CloudFerro, domena geo | `https://geo.cloudferro.com/` | 000 (timeout) | brak | **NOT VERIFIED** | host odpowiada na DNS, ale nie na HTTP z tej sieci |
| CloudFerro, sitemap | `https://www.cloudferro.com/sitemap.xml` | 200 | XML | **VERIFIED** | 131 URL, brak AED/WMS |

---

## 1. OpenStreetMap: tagging AED

### 1.1. Główny tag i status schematu

**VERIFIED**, strona wiki: `https://wiki.openstreetmap.org/wiki/Tag:emergency%3Ddefibrillator`, HTTP 200, rozmiar 7 630 B (wersja `action=raw`).

- Główny tag: `emergency=defibrillator`.
- Status w wiki: `status=approved`, powiązany z `Proposal:Automated external defibrillator`.
- Geometria: wyłącznie węzeł (`onNode=yes`, `onWay=no`, `onArea=no`, `onRelation=no`).
- Wiki wprost zabrania dodawania `emergency=defibrillator` do budynku lub punktu usługowego, bo znaczyłoby to, że budynek „jest” defibrylatorem. Alternatywa dla obiektu: `defibrillator=yes` na budynku/obiekcie.
- Wszystkie wartości tagów w OSM są **stringami**. Typy w tabelach poniżej oznaczają typ logiczny, nie typ JSON.

### 1.2. Tabela tagów według wiki

| Tag | Rola wg wiki | Typ logiczny | Wartości / uwagi |
|---|---|---|---|
| `emergency` | wymagany | string enum | zawsze `defibrillator` |
| `opening_hours` | ważny | string, składnia OSM | np. `24/7`, `Mo-Fr 07:30-15:30`, `Sa-Su, PH off` |
| `access` | ważny | string enum | `yes`, `customers`, `private`, `permit`, `permissive`, `no`; `access=emergency` jest przestarzałe i niepoprawne |
| `phone` | ważny | string | numer do podmiotu odpowiedzialnego za urządzenie |
| `emergency:phone` | ważny | string | numer ratunkowy regionu, w Polsce zwykle `112` |
| `defibrillator:location` | ważny | string, dowolny tekst | opis miejsca, np. „Na ścianie w jadalni” |
| `defibrillator:location:<lang>` | opcjonalny | string | np. `defibrillator:location:pl`, `defibrillator:location:en` |
| `defibrillator:code` | opcjonalny | string | kod do otwarcia skrzynki, semantyka niejednoznaczna, wiki sugeruje możliwy związek z `ref` / `defibrillator:ref` |
| `indoor` | ważny | string `yes`/`no` | czy urządzenie jest po wewnętrznej stronie ściany |
| `locked` | ważny | string `yes`/`no` | czy urządzenie lub skrzynka jest zamknięta |
| `level:ref` | opcjonalny | string | numer piętra tak, jak jest oznaczony lokalnie |
| `level` | opcjonalny | string | numer piętra według definicji OSM, nie według oznaczeń lokalnych |
| `description` | opcjonalny | string | cechy szczególne urządzenia |
| `manufacturer` | opcjonalny | string | producent defibrylatora |
| `model` | opcjonalny | string | model defibrylatora |
| `defibrillator:cabinet` | opcjonalny | string enum | `vertical_door`, `horizontal_door`, `twist`, `mechanical`, `no` |
| `defibrillator:cabinet:manufacturer` | opcjonalny | string | producent skrzynki |
| `defibrillator:cabinet:colour` | opcjonalny | string | kolor skrzynki |
| `ref:GB:the_circuit` | opcjonalny, UK | string | 32-znakowy identyfikator w bazie The Circuit |

### 1.3. Polskie konwencje (wiki PL)

**VERIFIED**, `https://wiki.openstreetmap.org/wiki/Pl:Tag:emergency%3Ddefibrillator`, HTTP 200, 6 796 B.

Polska strona wiki dodaje kontekst projektu „Mapa oraz rejestr urządzeń AED na terenie Polski” i opisuje:

- `access=yes`: urządzenie publiczne, bez ograniczeń, często kapsuła na zewnątrz budynku.
- `access=customers`: dostępne w godzinach otwarcia budynku, często wewnątrz.
- `access=private`: dostęp bardzo ograniczony, wymaga osoby trzeciej, np. AED w samochodzie OSP.
- `indoor=yes`: wewnątrz budynku.
- `indoor=no`: na zewnątrz budynku.
- `operator`: podmiot lub osoba odpowiedzialna za stan techniczny.
- `phone`: kontakt do podmiotu odpowiedzialnego za stan techniczny.
- `emergency:phone=112`: numer ratunkowy.
- `defibrillator:location` i `defibrillator:location:en`: opis miejsca po polsku i po angielsku.
- `level`: numer piętra.

### 1.4. Realny rekord OSM z API

**VERIFIED**, `https://api.openstreetmap.org/api/0.6/node/10739764584.json`, HTTP 200, 1 553 B.

```json
{
  "type": "node",
  "id": 10739764584,
  "lat": 54.1730415,
  "lon": 16.1931868,
  "timestamp": "2026-09-16T09:17:31Z",
  "version": 3,
  "changeset": 189099205,
  "user": "pedro's",
  "uid": 6423094,
  "tags": {
    "access": "yes",
    "check_date": "2026-09-16",
    "contact:facebook": "https://www.facebook.com/punktyzycia",
    "defibrillator:location": "Przed wejściem na cmentarz",
    "defibrillator:location:en": "Next to entrance E to the Communal Cemetery (from Kamieniarska Street).",
    "defibrillator:location:pl": "Obok wejścia E na Cmentarz Komunalny (od ul. Kamieniarskiej). Punkt Życia #2",
    "description:en": "Free-standing AED placed in a green, illuminated Rotaid capsule.",
    "description:pl": "Wolnostojące AED umieszczone w zielonej, podświatlanej kapsule Rotaid.",
    "email": "kontakt@budkazycia.pl",
    "emergency": "defibrillator",
    "indoor": "no",
    "level": "0",
    "manufacturer": "Philips",
    "model": "FRx",
    "note": "Projekt \"40 Punktów życia-defibrylatory AED w miejscach publicznych-bezpieczniejszy Koszalin\" ...",
    "opening_hours": "24/7",
    "operator": "Biuro Bezpieczeństwa i Zarządzania Kryzysowego Urzędu Miejskiego w Koszalinie",
    "phone": "+48 94 34 71 112",
    "ref:pkt-zycia-2023": "2",
    "source": "Urząd Miejski w Koszalinie",
    "website": "https://punktyzycia.pl/",
    "wheelchair": "yes"
  }
}
```

Rekord pokazuje, że OSM API zwraca także `timestamp`, `version`, `changeset`, `user`, `uid`, których **nie ma** w eksporcie GeoJSON OpenAEDMap.

### 1.5. Realny rekord z Warszawy, bogaty w media i identyfikator zewnętrzny

**VERIFIED**, `https://api.openstreetmap.org/api/0.6/node/9464587317.json`, HTTP 200, 1 256 B.

```json
{
  "type": "node",
  "id": 9464587317,
  "lat": 52.2313261,
  "lon": 21.010198,
  "timestamp": "2025-08-22T15:28:14Z",
  "version": 6,
  "changeset": 170838567,
  "tags": {
    "access": "customers",
    "check_date": "2023-02-19",
    "defibrillator:location": "W punkcie Obsługi Pasażerów Komunikacji Miejskiej na poziomie -1.",
    "defibrillator:location:en": "At Public Transport Service Point at -1 floor level.",
    "emergency": "defibrillator",
    "image": "https://openaedmap.org/api/v1/photos/view/bWPKgNA1SBEFRUdf0pV_Nw.webp",
    "image:license": "CC0",
    "indoor": "yes",
    "level": "-2",
    "location": "indoor",
    "manufacturer": "Philips",
    "model": "Heartstart HS1",
    "opening_hours": "Mo-Fr 07:00-20:00; Sa 08:00-15:00; Su off",
    "operator": "Metro Warszawskie",
    "ref:api-um-warszawa-pl": "1150",
    "source": "Miasto Stołeczne Warszawa; https://api.um.warszawa.pl (serwis Otwarte dane po warszawsku)"
  }
}
```

Ważne: `check_date=2023-02-19` jest datą sprawdzenia, a `timestamp=2025-08-22` jest datą ostatniej edycji OSM. To dwie różne rzeczy.

### 1.6. System współrzędnych, licencja, aktualizacja, auth, ograniczenia OSM

| Cecha | Wartość | Dowód |
|---|---|---|
| Układ współrzędnych | EPSG:4326, WGS 84, stopnie dziesiętne | OSM API `lat`/`lon`, GeoJSON `[lon, lat]` |
| Kolejność w GeoJSON | `[longitude, latitude]` | `ST_X` jako pierwszy element, `ST_Y` jako drugi w `export.sql` OpenAEDMap |
| Licencja danych | ODbL 1.0 | OSM API: `"license": "http://opendatacommons.org/licenses/odbl/1-0/"` |
| Atrybucja | `© OpenStreetMap contributors` | OSM API `attribution`, stopka OpenAEDMap |
| Aktualizacja | ciągła, replikacja minutowa OSM | `PLANET_REPLICA_URL=https://planet.openstreetmap.org/replication/minute/` w OpenAEDMap |
| Auth odczytu | brak | publiczne API i eksporty |
| Auth zapisu | OAuth 2.0 | upload zdjęć OpenAEDMap używa `Authorization: Bearer ...` |
| Ograniczenie geometrii | tylko węzły dla AED | wiki `onNode=yes`, `onWay=no`, `onArea=no` |
| Znane pułapki | `access=emergency` przestarzałe, `defibrillator:code` niejednoznaczny, `level` vs `level:ref`, brak statusu działania urządzenia | wiki |

---

## 2. OpenAEDMap (`aed.openstreetmap.org.pl`)

### 2.1. Adresy i przekierowanie

**VERIFIED:** `https://aed.openstreetmap.org.pl/` zwraca HTTP 200 po przekierowaniu na `https://openaedmap.org/pl/`. To ta sama aplikacja, domena historyczna nadal działa.

**VERIFIED:** `https://openaedmap.org/` to frontend MapLibre, backend pod `https://openaedmap.org/api/v1/`. W JS bundle występuje `var Dg = "https://openaedmap.org"`.

### 2.2. Eksport GeoJSON, potwierdzony

**VERIFIED**, `https://openaedmap.org/api/v1/countries/PL.geojson`, żądanie GET, HTTP/2 200.

Nagłówki odpowiedzi:

```text
content-type: application/geo+json; charset=utf-8
content-disposition: attachment
cache-control: public, max-age=3600, stale-while-revalidate=0
etag: W/"geojson-70c84d24f2730d9e-fc6011b4304fca29-5533"
x-version: 14c30d775d6283f968e44347513be5c78cb4c2c6
age: 3251
server: cloudflare
via: 2.0 Caddy
date: Sat, 21 Nov 2026 18:06:11 GMT
```

Rozmiar pliku: **7 135 848 B**. Liczba obiektów: **18 298**. Wszystkie geometrie to `Point`, wszystkie `@osm_type` to `node`.

Eksport światowy: `https://openaedmap.org/api/v1/countries/WORLD.geojson`, HEAD 200, ten sam `content-type`, `feature_count` z API krajów wynosi **179 688**. Taginfo dla tego samego dnia podaje **179 680** obiektów `emergency=defibrillator` globalnie, w tym 179 644 węzły, 35 way i 1 relację. Różnica jest spójna ze snapshotem i z filtrem „tylko węzły” w OpenAEDMap.

Lista krajów: `https://openaedmap.org/api/v1/countries/names?language=PL`, HTTP 200, `application/json; charset=utf-8`, 26 671 B. Rekord dla Polski:

```json
{
  "country_code": "PL",
  "country_names": {"PL": "Polska"},
  "feature_count": 18298,
  "data_path": "/api/v1/countries/PL.geojson"
}
```

### 2.3. Eksport CSV, nie istnieje

**VERIFIED jako brak:** `https://openaedmap.org/api/v1/countries/PL.csv` zwraca HTTP 404 i treść `{"detail":"Not Found"}`. To samo dla `PL.json`.

Dodatkowo w backendzie OpenAEDMap jedyny eksport to `GeoJSONResponse`, a w SQL `sql/export.sql` budowany jest `FeatureCollection`. W frontendzie nie ma odwołań do CSV. **OpenAEDMap nie udostępnia bieżącego eksportu CSV.** CSV można natomiast uzyskać z Overpass API przez `[out:csv(...)]`, ale to osobne źródło, nie plik OpenAEDMap.

Historyczny CSV jednak istniał i został zweryfikowany w Wayback Machine, patrz sekcja 2.9. To materiał archiwalny, nie aktualny.

### 2.4. Przykładowy rekord GeoJSON (przycięty)

**VERIFIED**, pochodzi z `PL.geojson`, obiekt `@osm_id=9464587317`.

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [21.010198, 52.2313261]
  },
  "properties": {
    "access": "customers",
    "check_date": "2023-02-19",
    "defibrillator:location": "W punkcie Obsługi Pasażerów Komunikacji Miejskiej na poziomie -1.",
    "defibrillator:location:en": "At Public Transport Service Point at -1 floor level.",
    "@osm_id": 9464587317,
    "@osm_type": "node",
    "@osm_version": 6,
    "emergency": "defibrillator",
    "image": "https://openaedmap.org/api/v1/photos/view/bWPKgNA1SBEFRUdf0pV_Nw.webp",
    "image:license": "CC0",
    "indoor": "yes",
    "level": "-2",
    "location": "indoor",
    "manufacturer": "Philips",
    "model": "Heartstart HS1",
    "opening_hours": "Mo-Fr 07:00-20:00; Sa 08:00-15:00; Su off",
    "operator": "Metro Warszawskie",
    "ref:api-um-warszawa-pl": "1150",
    "source": "Miasto Stołeczne Warszawa; https://api.um.warszawa.pl (serwis Otwarte dane po warszawsku)"
  }
}
```

### 2.5. Pole `@osm_id` i identyfikatory

- `@osm_id` jest liczbą całkowitą, identyfikatorem węzła OSM. W przykładzie `9464587317`.
- `@osm_type` ma zawsze wartość `"node"`.
- `@osm_version` jest liczbą całkowitą, wersją obiektu OSM. W przykładzie `6`.
- Brak `@osm_timestamp`, `@changeset`, `@user`. To luka dla audytu i weryfikacji.
- Identyfikatory zewnętrzne występują jako zwykłe tagi, np. `ref:api-um-warszawa-pl=1150`, `ref:pkt-zycia-2023=2`, `ref:GB:the_circuit=...`. Nie ma jednego standardu.

### 2.6. Słownik pól eksportu, częstości w Polsce

Liczebności policzone na `PL.geojson` z 2026-11-21, `n=18 298`. Wartości są stringami, nawet jeśli wyglądają na liczby.

| Pole | Typ logiczny | Obecność | Przykład / wartości | Uwagi |
|---|---|---:|---|---|
| `@osm_type` | string enum | 18 298 (100%) | `node` | zawsze węzeł |
| `@osm_id` | integer int64 | 18 298 (100%) | `9464587317` | klucz źródłowy |
| `@osm_version` | integer | 18 298 (100%) | `6` | wersja OSM, nie data |
| `emergency` | string enum | 18 298 (100%) | `defibrillator` | stała |
| `access` | string enum | 16 918 (92,5%) | `yes` 7 806, `customers` 4 684, `private` 3 045, `permit` 1 198, `permissive` 132, `no` 47, `unknown` 6 | `no` i `unknown` wymagają ostrożności |
| `indoor` | string `yes`/`no` | 15 970 (87,3%) | `yes` 10 482, `no` 5 488 | strona ściany, nie piętro |
| `defibrillator:location` | string | 12 318 (67,3%) | `Samochód ratowniczo-gaśniczy` 766, `na wyposażeniu jednostki` 187 | 8 084 różnych wartości |
| `defibrillator:location:pl` | string | 5 173 (28,3%) | opis polski | wariant językowy |
| `defibrillator:location:en` | string | 2 407 (13,2%) | opis angielski | wariant językowy |
| `opening_hours` | string, OSM syntax | 6 781 (37,1%) | `24/7` 4 136, `Mo-Fr 07:30-15:30` 106 | nie jest ISO 8601 |
| `operator` | string | 6 007 (32,8%) | `ZUS` 177, `InPost` 95, `Tauron` 69 | 4 086 różnych wartości |
| `check_date` | string ISO 8601 date | 5 982 (32,7%) | `2023-02-19`, `2026-09-30` | data sprawdzenia, nie status |
| `phone` | string | 4 481 (24,5%) | `112`, `+48 58 778 60 00` | format nieujednolicony |
| `level` | string | 3 701 (20,2%) | `0` 3 049, `1` 407, `-1` 29, `0.5` 10 | może być ułamkowe lub lista |
| `image` | string URL | 2 169 (11,9%) | `https://openaedmap.org/api/v1/photos/view/...webp` | może wskazywać zewnętrzny host |
| `image:license` | string | 1 383 (7,6%) | tylko `CC0` | brak dla 786 obiektów z `image` |
| `source` | string / URL | 1 445 (7,9%) | `email od ZUS`, `https://api.um.warszawa.pl` | 455 różnych wartości |
| `manufacturer` | string | 347 (1,9%) | `Philips` 74, `Zoll` 48, `CU Medical Systems` 23 | niespójna kapitalizacja |
| `model` | string | 146 (0,8%) | `FRx` 32, `AED Plus` 22 | niespójne nazwy |
| `ref` | string | 150 (0,8%) | `AED-3100`, `Defibrylator AED`, adresy | semantyka niejednolita |
| `locked` | string `yes`/`no` | 3 (0,02%) | tylko `no` | bardzo rzadkie |
| `wheelchair` | string enum | 463 (2,5%) | `yes` 304, `limited` 97, `no` 54 | dostępność wózka |
| `description` | string | 599 (3,3%) | dowolny tekst | |
| `note` | string | 241 (1,3%) | dowolny tekst | często wymóg licencyjny źródła |
| `fixme` | string | 632 (3,5%) | dowolny tekst | oznacza problem z danymi |
| `emergency:phone` | string | 200 (1,1%) | `112` | numer ratunkowy |
| `operator:type` | string enum | 86 (0,5%) | `ngo` 39, `government` 21, `public` 11, `private` 7, `school` 4 | |
| `operator:wikidata` | string Q-id | 188 (1,0%) | np. `Q...` | identyfikator Wikidata |
| `addr:street` | string | 81 (0,4%) | ulica | adres bardzo rzadki |
| `addr:housenumber` | string | 105 (0,6%) | numer | |
| `addr:postcode` | string | 37 (0,2%) | kod pocztowy | |
| `addr:city` | string | 76 (0,4%) | miasto | |
| `addr:place` | string | 22 (0,1%) | miejscowość | |
| `addr:floor` | string | 9 (0,05%) | piętro | |
| `survey:date` | string data lub `YYYY-MM` | 17 (0,1%) | `2025-04-16`, `2026-07` | może być niepełna data |
| `start_date` | string | 59 (0,3%) | data uruchomienia | |
| `ele` | string, metry | 4 (0,02%) | `1180` | wysokość |
| `wikimedia_commons` | string | 84 (0,5%) | nazwa pliku lub URL | media |
| `mapillary` | string | 5 (0,03%) | ID obrazu | media |
| `panoramax` | string | 3 (0,02%) | ID obrazu | media |
| `contact:facebook` | string URL | 38 (0,2%) | profil | kontakt |
| `website` | string URL | 99 (0,5%) | strona | kontakt |
| `email` | string | 61 (0,3%) | e-mail | kontakt |
| `ref:api-um-warszawa-pl` | string | 113 (0,6%) | `1150` | ID z API Warszawy |
| `ref:pkt-zycia-2023` | string | 32 (0,2%) | `2` | ID programu Koszalin |
| `defibrillator:cabinet` | string enum | 0 w PL | `vertical_door`, ... | tag z wiki, niewykorzystany |
| `defibrillator:code` | string | 0 w PL | kod skrzynki | tag z wiki, niewykorzystany |

### 2.7. Endpoint pojedynczego węzła i media

**VERIFIED**, `https://openaedmap.org/api/v1/node/9464587317`, HTTP 200, `application/json; charset=utf-8`, 1 268 B.

```json
{
  "version": 0.6,
  "copyright": "OpenStreetMap and contributors",
  "attribution": "https://www.openstreetmap.org/copyright",
  "license": "https://opendatacommons.org/licenses/odbl/1-0/",
  "elements": [
    {
      "@photo_id": "bWPKgNA1SBEFRUdf0pV_Nw",
      "@photo_url": "/api/v1/photos/view/bWPKgNA1SBEFRUdf0pV_Nw.webp",
      "@photo_source": null,
      "@timezone_name": "Europe/Warsaw",
      "@timezone_offset": "UTC+01:00",
      "type": "node",
      "id": 9464587317,
      "lat": 52.2313261,
      "lon": 21.010198,
      "tags": {"...": "..."},
      "version": 6
    }
  ]
}
```

Pola `@photo_id`, `@photo_url`, `@photo_source`, `@timezone_name`, `@timezone_offset` występują **tylko** w endpointcie `/node/{id}`, nie w eksporcie GeoJSON.

Upload zdjęć: `POST https://openaedmap.org/api/v1/photos/upload`, pola formularza `node_id`, `file_license`, `file`, `oauth2_credentials`. Backend akceptuje wyłącznie `file_license=CC0`, obrazy JPEG/PNG/WebP do 2 MB i 6 MP, wymaga ważnego tokenu OAuth 2.0 OSM (`Authorization: Bearer`), a po uploadzie aktualizuje tagi `image` i `image:license` w OSM.

### 2.8. Aktualizacja, cache, auth, licencja, ograniczenia OpenAEDMap

| Cecha | Wartość | Dowód |
|---|---|---|
| Źródło danych | replikacja planet OSM, zapytanie `node[emergency=defibrillator];out meta qt;` | `services/aed_service.py` |
| Kadencja aplikacji | `AED_UPDATE_DELAY = 30 s` | `config.py` |
| Kadencja eksportów krajowych | `COUNTRY_UPDATE_DELAY = 1 dzień` | `config.py` |
| Cache HTTP eksportu | `max-age=3600`, `stale-while-revalidate=0` | nagłówki |
| Wersjonowanie cache | ETag z `map_revision`, np. `...-5533` | `export_service.py` |
| Auth odczytu | brak | publiczne GET |
| Auth uploadu | OAuth 2.0 OSM, Bearer token | `api/v1/photos.py` |
| Licencja danych | ODbL 1.0, atrybucja `© OpenStreetMap contributors` | OSM API i stopka frontendu |
| Licencja zdjęć | tylko CC0 przy uploadzie, `image:license` przy zewnętrznych | `photos.py` |
| Ograniczenia eksportu | 4 aktywne eksporty, 64 czytelników, `503` z `Retry-After: 5` | `export_service.py` |
| Cache CDN | Cloudflare, `age` do 3 251 s w chwili pobrania | nagłówki |
| Znane pułapki | tylko węzły, brak bieżącego CSV, brak `@osm_timestamp`, brak `user`/`changeset`, brak deduplikacji fizycznych urządzeń, `access=no` jest w danych | analiza PL.geojson i SQL |

### 2.9. Historyczne eksporty CSV i GeoJSON (Wayback)

**VERIFIED (archiwum):** `https://web.archive.org/web/20230107044845id_/https://aed.openstreetmap.org.pl/aed_poland.csv` zwraca HTTP 200, `text/csv`, **524 644 B**, **4 588 wierszy danych** i **15 kolumn**. To snapshot z 2023-01-07.

Dokładny nagłówek CSV, w kolejności:

```text
access,defibrillator:location,defibrillator:location:pl,description,indoor,latitude,location,longitude,note,note:pl,opening_hours,operator,osm_id,phone,wikimedia_commons
```

| Kolumna | Typ | Wypełnione | Uwagi |
|---|---|---:|---|
| `access` | string enum | 3 922 | w tym pojedyncze `emergency` i wartości złożone |
| `defibrillator:location` | string | 3 750 | 2 395 unikalnych |
| `defibrillator:location:pl` | string | 169 | wariant polski |
| `description` | string | 170 | |
| `indoor` | string `yes`/`no` | 2 907 | `yes` 2 216, `no` 691 |
| `latitude` | decimal | 4 588 | WGS84 |
| `location` | string enum | 395 | `indoor`, `outdoor`, `vehicle`, free text |
| `longitude` | decimal | 4 588 | WGS84 |
| `note` | string | 57 | |
| `note:pl` | string | 3 | |
| `opening_hours` | string | 1 378 | `24/7` 773 |
| `operator` | string | 2 604 | 2 036 unikalnych |
| `osm_id` | int64 | 4 588 | brak `osm_type`, wszystkie to node |
| `phone` | string | 1 576 | 1 226 unikalnych |
| `wikimedia_commons` | string | 9 | |

**VERIFIED (archiwum):** `https://web.archive.org/web/20230107045919id_/https://aed.openstreetmap.org.pl/aed_poland_metadata.json` zwraca HTTP 200, 78 B:

```json
{"data_download_ts_utc":"2023-01-07T04:11:51+00:00","number_of_elements":4588}
```

**VERIFIED (archiwum):** `https://web.archive.org/web/20220118100904id_/https://aed.openstreetmap.org.pl/aed_poland.geojson` zwraca HTTP 200, 925 099 B, **3 622 features**, wszystkie `Point`. Pola `properties`: `access`, `defibrillator:location`, `defibrillator:location:pl`, `description`, `indoor`, `location`, `note`, `note:pl`, `opening_hours`, `operator`, `osm_id`, `phone`, `wikimedia_commons`. Brak `@osm_type`, `@osm_version` i pełnego zestawu tagów.

Historyczny CSV był eksportem „pod mapę”, nie pełnym dumpem tagów. Brak w nim `osm_version`, `check_date`, `survey:date`, `manufacturer`, `model`, `ref`, `emergency:phone`, `image`, `image:license`, `wheelchair`, `addr:*` i `level`. **Nie używać archiwum jako aktualnego źródła.**

### 2.10. Jakość danych w Polsce, liczby

- 18 298 obiektów, z czego 10 893 ma `@osm_version=1`, czyli większość to importy jednorazowe.
- 12 299 obiektów (67,2%) nie ma ani `check_date`, ani `survey:date`.
- 1 336 obiektów ma `check_date` lub `survey:date` starsze niż 2025.
- Adres strukturalny (`addr:street` lub `addr:housenumber`) ma mniej niż 1% obiektów.
- `manufacturer` ma 1,9%, `model` 0,8%, `locked` 0,02%.
- `image` ma 11,9%, ale tylko 7,6% ma `image:license`, co oznacza, że część zdjęć nie ma jasnej licencji w tagach.

---

## 3. Overpass API

### 3.1. Endpoint i status z tej sieci

**VERIFIED jako niedostępne z tej sieci:**

| Endpoint | Wynik |
|---|---|
| `https://overpass-api.de/api/status` | HTTP 000, timeout 30 s |
| `https://overpass-api.de/api/interpreter` (GET, małe zapytanie) | HTTP 000, timeout 25 s |
| `https://overpass-api.de/api/interpreter` (IPv4, timeout 120 s) | HTTP 000, timeout 120 s |
| `https://overpass.kumi.systems/api/status` | HTTP 000, timeout 12 s |
| `https://overpass.kumi.systems/api/interpreter` | HTTP 000, timeout 8 s |
| `https://z.overpass-api.de/api/status` | HTTP 000, timeout 12 s |
| `https://overpass.private.coffee/api/interpreter` | HTTP 000, timeout 8 s |
| `https://overpass.openstreetmap.ru/api/interpreter` | HTTP 000, timeout 8 s |
| `https://maps.mail.ru/osm/tools/overpass/api/interpreter` | HTTP 000, timeout 20 s |
| `https://ovp.dresel.systems/api/interpreter` | HTTP 000, timeout 20 s |
| `https://overpass.nchc.org.tw/api/interpreter` | DNS nie rozwiązuje się |
| `https://overpass.osm.jp/api/interpreter` | DNS nie rozwiązuje się |

Wniosek: **Overpass API jako endpoint nie został zweryfikowany w tym środowisku.** To nie znaczy, że usługa nie działa globalnie. To znaczy, że z tej sieci nie udało się uzyskać odpowiedzi.

### 3.2. Jedyny działający mirror, test kontrolny

**VERIFIED, ale z ograniczeniem:** `https://overpass.osm.ch/api/interpreter` odpowiada HTTP 200, `generator` = `Overpass API 0.7.62.4 2390de5a`, `timestamp_osm_base` = `118638` (wartość nietypowa, prawdopodobnie licznik godzin).

Test kontrolny dla Szwajcarii:

```overpassql
[out:json][timeout:45];
node["emergency"="defibrillator"](46,7,47,9);
out count;
```

Wynik: `nodes=3348`, `ways=0`, `relations=0`, `total=3348`.

Test dla Polski:

```overpassql
[out:json][timeout:45];
node["emergency"="defibrillator"](50,14,55,24);
out count;
```

Wynik: `nodes=0`, `ways=0`, `relations=0`, `total=0`.

Test znanego polskiego węzła `477958354`: `elements` puste.

Wniosek: ten mirror **nie zawiera danych Polski**, prawdopodobnie jest to ekstrakt Szwajcarii. Nie nadaje się do weryfikacji polskich danych.

### 3.3. Poprawne zapytania do użycia

Zapytanie o wszystkie AED w Polsce, tylko węzły, z metadanymi:

```overpassql
[out:json][timeout:180];
area["ISO3166-1"="PL"][admin_level=2]->.pl;
node["emergency"="defibrillator"](area.pl);
out meta;
```

Zapytanie o jeden węzeł:

```overpassql
[out:json][timeout:25];
node(477958354);
out meta;
```

Eksport CSV z Overpass, jeśli potrzebny jest plik tabelaryczny:

```overpassql
[out:csv(::type,::id,::lat,::lon,emergency,access,indoor,"defibrillator:location",operator,check_date;true;"|")][timeout:180];
area["ISO3166-1"="PL"][admin_level=2]->.pl;
node["emergency"="defibrillator"](area.pl);
out meta;
```

### 3.4. Format, licencja, limity, auth

| Cecha | Wartość | Źródło |
|---|---|---|
| Formaty wyjścia | JSON (`[out:json]`), XML (`[out:xml]`), CSV (`[out:csv(...)]`) | wiki Overpass API |
| GeoJSON | brak natywnego `[out:geojson]`, trzeba konwertować z JSON lub `out geom` | wiki |
| Geometria | `out meta` daje `lat`/`lon` dla węzłów, `out geom` daje geometrię dla way/relation | wiki |
| Licencja danych | ODbL 1.0, pole `osm3s.copyright` w odpowiedzi | odpowiedź JSON |
| Auth | brak dla publicznych instancji | wiki |
| Limit głównej instancji | 10 000 zapytań/dzień, 1 GB/dzień, łącznie 10 min przetwarzania/dzień, brak równoległych skryptów | wiki Overpass API, FOSSGIS |
| Wymagany nagłówek | `User-Agent` lub `Referer` identyfikujący aplikację | wiki |
| Błędy 429/406 | odczekać 30 s przed kolejnym zapytaniem | wiki |
| Komercyjne użycie | self-hosting lub płatna instancja | wiki |

Najważniejsza pułapka: odpowiedź Overpass JSON **nie jest** GeoJSON. Ma własny format `{"version":0.6,"elements":[...]}`, a współrzędne węzła są w `lat`/`lon`, nie w `coordinates`.

---

## 4. Geoportal.gov.pl, usługa „Defibrylatory” WMS

### 4.1. Co udało się sprawdzić

**VERIFIED:** `https://www.geoportal.gov.pl/pl/usluga/wykaz-uslug/` zwraca HTTP 200 i 72 396 B. W treści nie ma ciągu `defibryl`, `defibrylator` ani `AED`. Lista zawiera usługi WMS/WMTS, WFS, WCS, ATOM, CSW, OpenLS i API, ale nie warstwę defibrylatorów.

**VERIFIED:** `https://www.geoportal.gov.pl/wp-json/wp/v2/search?search=defibrylator&per_page=20` zwraca HTTP 200 i pustą tablicę `[]`. Zapytanie `search=AED` zwraca tylko przypadkowe treści, m.in. „XVI Podlaskie Forum GIS” i „OpenLS service”, bez warstwy AED.

**VERIFIED:** strona `https://www.geoportal.gov.pl/pl/usluga/uslugi-przegladania-wms-i-wmts/` zwraca HTTP 200 i 212 320 B. Występują tam endpointy WMS m.in. `https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/...`, `https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaNumeracjiAdresowej`, `https://mapy.geoportal.gov.pl/wss/ext/KGSG/CzasowyZakazPrzebywania`, ale **żadna warstwa nie nazywa się „Defibrylatory”**.

### 4.2. Próby GetCapabilities

**VERIFIED:** każde zapytanie do `mapy.geoportal.gov.pl` z tej sieci kończy się HTTP 401:

```text
GET https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/StandardResolution?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0
HTTP 401
content-type: text/html;charset=UTF-8
<html><head><title>Unauthorized.</title></head><body><h1>Unauthorized.</h1><p></p></body></html>
```

To samo dla `VERSION=1.1.1`, dla `http://` i `https://`, dla `wss/service/pub/guest/ComposableWebService/ows`. To samo w Firefoksie, nie tylko w `curl`. Zatem host wymaga autoryzacji, sesji lub blokuje to środowisko na poziomie WAF. Nie można przez to pobrać `GetCapabilities` żadnej warstwy.

### 4.3. Wniosek

**NOT VERIFIED:** nie potwierdzono istnienia publicznej usługi WMS „Defibrylatory” na `Geoportal.gov.pl`.

Co próbowano:
1. `GetCapabilities` znanej usługi PRG, HTTP 401.
2. Przegląd oficjalnego katalogu usług GUGiK, brak wpisu.
3. Wyszukiwanie w WordPress REST API Geoportal, brak wpisu.
4. Przegląd listy endpointów WMS/WMTS, brak warstwy AED.
5. Wyszukiwarki zewnętrzne (Google, Bing, DuckDuckGo, Mojeek, Brave) były zablokowane captcha albo zwracały wyniki niepowiązane, więc nie stanowią dowodu.

Jeżeli taka usługa istnieje, jest to prawdopodobnie usługa niepubliczna, wymagająca klucza, sesji albo umowy. Dla projektu nie należy na niej opierać się bez potwierdzenia u dostawcy. Ewentualny układ współrzędnych Geoportal to zwykle EPSG:2180 (PUWG 1992) lub EPSG:4326, ale **tego nie zweryfikowano**, bo nie udało się pobrać capabilities.

---

## 5. CloudFerro WMS

### 5.1. Co udało się sprawdzić

**VERIFIED:** CloudFerro to dostawca chmury IaaS, nie publiczny serwis geospatial z warstwą AED.

- `https://wms.cloudferro.com/` -> DNS NXDOMAIN, brak rekordu A.
- `https://maps.cloudferro.com/` -> DNS NXDOMAIN.
- `https://geoserver.cloudferro.com/` -> DNS NXDOMAIN.
- `https://geo.cloudferro.com/` -> rekord A `64.225.133.163`, ale połączenie HTTP timeout 12 s.
- `https://www.cloudferro.com/sitemap.xml` -> HTTP 200, 131 URL w sitemapach `post`, `page`, `case-studies`. Po filtrze `aed|defib|wms|map|health|med|gis|geoportal` nie ma żadnego trafienia.
- W JS OpenAEDMap widnieje stopka „hosted by CloudFerro” i link `https://cloudferro.com/`. CloudFerro jest partnerem hostingowym OpenAEDMap, obok UMW, CEZ, PW i GUGiK.

### 5.2. Wniosek

**NOT VERIFIED:** nie istnieje publiczny „CloudFerro WMS” z danymi AED, przynajmniej nie pod typowymi hostami i nie w oficjalnym katalogu CloudFerro.

Co próbowano:
1. DNS dla `wms`, `maps`, `geoserver`, `geo` subdomen.
2. HTTP HEAD/GET dla działającej domeny `geo.cloudferro.com`.
3. Sitemap CloudFerro i filtr tematyczny.
4. Analiza stopki OpenAEDMap, gdzie CloudFerro występuje jako hosting partner.

Rekomendacja: traktować CloudFerro jako **infrastrukturę hostingu OpenAEDMap**, a nie jako źródło danych AED. Nie ma czego mapować na wspólny schemat poza metadanymi provenance.

---

## 6. Tabela mapowania na wspólny schemat AED

Kolumna „Pokrycie PL” dotyczy eksportu OpenAEDMap `PL.geojson` z 2026-11-21. „Wymagane” oznacza rekomendację dla naszego schematu, nie wymóg OSM.

### 6.1. Identyfikatory i provenance

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| ID obiektu | `id` | `@osm_type` + `/` + `@osm_id` | string | tak | 100% | np. `node/9464587317`, stabilne w OSM |
| ID źródła | `source_id` | `@osm_id` | int64 | tak | 100% | bez typu node |
| Wersja źródła | `source_version` | `@osm_version` | int | tak | 100% | do wykrywania zmian |
| Typ źródła | `source_type` | `@osm_type` | enum | tak | 100% | zawsze `node` |
| Znacznik czasu źródła | `source_timestamp` | brak w GeoJSON, jest `timestamp` w OSM API | ISO 8601 | tak | 0% w GeoJSON | luka eksportu |
| Rewizja zmian | `source_changeset` | brak w GeoJSON, jest `changeset` w OSM API | int64 | nie | 0% | audyt |
| Autor zmiany | `source_user` | brak w GeoJSON, jest `user` w OSM API | string | nie | 0% | audyt |
| URL źródła | `source_url` | `https://www.openstreetmap.org/node/{@osm_id}` | URL | tak | 100% (pochodna) | budować z ID |
| Licencja | `license` | ODbL 1.0 | string | tak | 100% (pochodna) | `ODbL-1.0` |
| Atrybucja | `attribution` | `© OpenStreetMap contributors` | string | tak | 100% (pochodna) | wymagana |
| Data pobrania | `retrieved_at` | data żądania | ISO 8601 | tak | 100% (pochodna) | dodać w ETL |
| ID zewnętrzny | `external_ids` | `ref:api-um-warszawa-pl`, `ref:pkt-zycia-2023`, `ref:GB:the_circuit`, `ref` | object/array | nie | <1% | brak standardu |

### 6.2. Lokalizacja i adres

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| Szerokość | `location.lat` | `geometry.coordinates[1]` lub OSM `lat` | float | tak | 100% | EPSG:4326 |
| Długość | `location.lon` | `geometry.coordinates[0]` lub OSM `lon` | float | tak | 100% | EPSG:4326 |
| Geometria | `location.geometry` | `geometry` | GeoJSON Point | tak | 100% | `[lon, lat]` |
| Opis miejsca | `location.description` | `defibrillator:location` | string | tak | 67,3% | brak dla 1/3 |
| Opis PL | `location.description_pl` | `defibrillator:location:pl` | string | nie | 28,3% | |
| Opis EN | `location.description_en` | `defibrillator:location:en` | string | nie | 13,2% | |
| Wewnątrz/zewnątrz | `location.indoor` | `indoor` | bool | tak | 87,3% | `yes`/`no` |
| Piętro | `location.level` | `level` | string | nie | 20,2% | może być `-2`, `0.5` |
| Piętro lokalne | `location.level_ref` | `level:ref` | string | nie | ~0% | oznaczenia lokalne |
| Ulica | `location.address.street` | `addr:street` | string | nie | 0,4% | prawie brak |
| Numer | `location.address.housenumber` | `addr:housenumber` | string | nie | 0,6% | |
| Kod pocztowy | `location.address.postcode` | `addr:postcode` | string | nie | 0,2% | |
| Miasto | `location.address.city` | `addr:city` | string | nie | 0,4% | |
| Miejscowość | `location.address.place` | `addr:place` | string | nie | 0,1% | |
| Piętro adresowe | `location.address.floor` | `addr:floor` | string | nie | 0,05% | |
| Wejście | `location.entrance` | `entrance` | string | nie | ~0% | |
| Dostępność wózka | `location.wheelchair` | `wheelchair` | enum | nie | 2,5% | `yes`/`limited`/`no` |
| Wysokość | `location.elevation_m` | `ele` | float | nie | 0,02% | metry |

### 6.3. Dostęp

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| Typ dostępu | `access.type` | `access` | enum | tak | 92,5% | `yes`, `customers`, `private`, `permit`, `permissive`, `no`, `unknown` |
| Godziny dostępu | `access.opening_hours` | `opening_hours` | string OSM | tak | 37,1% | nie ISO 8601 |
| Zamknięcie | `access.locked` | `locked` | bool | nie | 0,02% | prawie brak |
| Kod do skrzynki | `access.code` | `defibrillator:code` | string | nie | 0% | niejednoznaczne, dane wrażliwe |
| Uwagi o dostępie | `access.note` | `access:note`, `note:access` | string | nie | ~0% | |
| Dostępność 24/7 | `access.24_7` | `opening_hours=24/7` | bool (pochodna) | nie | 22,6% | 4 136 z 18 298 |
| Dostęp publiczny | `access.is_public` | pochodna z `access` | bool | tak | 92,5% (pochodna) | `yes`/`permissive` = publiczny, `private`/`no` = nie |

### 6.4. Urządzenie

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| Producent | `device.manufacturer` | `manufacturer`, `defibrillator:brand` | string | nie | 1,9% | kapitalizacja nieujednolicona |
| Model | `device.model` | `model` | string | nie | 0,8% | nazwy nieujednolicone |
| Typ skrzynki | `device.cabinet.type` | `defibrillator:cabinet` | enum | nie | 0% | `vertical_door`, `horizontal_door`, `twist`, `mechanical`, `no` |
| Producent skrzynki | `device.cabinet.manufacturer` | `defibrillator:cabinet:manufacturer` | string | nie | 0% | |
| Kolor skrzynki | `device.cabinet.colour` | `defibrillator:cabinet:colour` | string | nie | 0% | |
| Przenośny | `device.portable` | `portable` | bool | nie | ~0% | |
| Numer referencyjny | `device.ref` | `ref` | string | nie | 0,8% | semantyka niejednolita, nie numer seryjny |
| Numer seryjny | `device.serial` | brak standardu OSM | string | nie | 0% | **brak w źródle** |
| Numer krajowy | `device.national_id` | brak standardu OSM | string | nie | 0% | **brak w źródle** |

### 6.5. Status i weryfikacja

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| Data sprawdzenia | `verification.last_checked_at` | `check_date` | ISO 8601 date | tak | 32,7% | nie jest statusem |
| Data pomiaru | `verification.survey_date` | `survey:date` | ISO 8601 date lub `YYYY-MM` | nie | 0,1% | może być niepełna |
| Status działania | `verification.status` | brak | enum | tak | 0% | **brak w źródle** |
| Wynik inspekcji | `verification.result` | brak | string | nie | 0% | **brak w źródle** |
| Problem do naprawy | `verification.fixme` | `fixme` | string | nie | 3,5% | sygnał problemu |
| Notatka | `verification.note` | `note` | string | nie | 1,3% | często wymóg licencyjny |
| Wersja OSM | `verification.osm_version` | `@osm_version` | int | tak | 100% | pochodna |
| Znacznik edycji | `verification.osm_timestamp` | brak w GeoJSON, jest w OSM API | ISO 8601 | tak | 0% | luka |
| Świeżość | `verification.age_days` | pochodna z `check_date` | int | tak | 32,7% | obliczać w ETL |
| Termin ważności elektrod | `verification.pad_expiry` | brak | date | nie | 0% | **brak w źródle** |
| Termin ważności baterii | `verification.battery_expiry` | brak | date | nie | 0% | **brak w źródle** |
| Dostępność w czasie rzeczywistym | `verification.realtime_available` | brak | bool | nie | 0% | **brak w źródle** |

### 6.6. Operator i kontakt

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| Nazwa operatora | `operator.name` | `operator` | string | tak | 32,8% | 4 086 różnych wartości |
| Typ operatora | `operator.type` | `operator:type` | enum | nie | 0,5% | `ngo`, `government`, `public`, `private`, `school`, `religious` |
| ID Wikidata | `operator.wikidata` | `operator:wikidata` | string Q-id | nie | 1,0% | |
| Wikipedia | `operator.wikipedia` | `operator:wikipedia` | string | nie | 0,3% | |
| Krótka nazwa | `operator.short_name` | `operator:short`, `short_operator` | string | nie | 0,5% | |
| Telefon | `operator.phone` | `phone`, `contact:phone`, `phone:mobile` | string | tak | 24,5% | format nieujednolicony |
| Telefon ratunkowy | `operator.emergency_phone` | `emergency:phone`, `emergency_telephone_code` | string | tak | 1,1% | w Polsce `112` |
| E-mail | `operator.email` | `email` | string | nie | 0,3% | |
| Strona | `operator.website` | `website`, `url`, `contact:facebook` | URL | nie | 0,5% | |
| Marka | `operator.brand` | `brand`, `defibrillator:brand` | string | nie | ~0,1% | |

### 6.7. Media

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| Główne zdjęcie | `media.primary_url` | `image` | URL | nie | 11,9% | może być zewnętrzny host |
| Licencja zdjęcia | `media.license` | `image:license` | string | tak, jeśli jest zdjęcie | 7,6% | tylko `CC0` w PL |
| Źródło zdjęcia | `media.source` | `@photo_source`, `image` | URL | nie | 0% w GeoJSON | tylko `/node/{id}` |
| ID zdjęcia OpenAEDMap | `media.photo_id` | `@photo_id` | string | nie | 0% w GeoJSON | tylko `/node/{id}` |
| URL zdjęcia OpenAEDMap | `media.photo_url` | `@photo_url` | URL | nie | 0% w GeoJSON | tylko `/node/{id}` |
| Wikimedia Commons | `media.wikimedia_commons` | `wikimedia_commons` | string | nie | 0,5% | |
| Mapillary | `media.mapillary` | `mapillary` | string | nie | 0,03% | |
| Panoramax | `media.panoramax` | `panoramax` | string | nie | 0,02% | |
| Flickr | `media.flickr` | `flickr` | string | nie | ~0% | |

### 6.8. Metadane i licencja

| Koncept kanoniczny | Kandydat pola | Źródło OSM / OpenAEDMap | Typ | Wymagane | Pokrycie PL | Uwagi |
|---|---|---|---|---:|---:|---|
| Pierwotne źródło | `provenance.source` | `source`, `source:url`, `source:addr` | string | tak | 7,9% | 455 różnych wartości |
| Licencja danych | `provenance.license` | ODbL 1.0 | string | tak | 100% (pochodna) | |
| Atrybucja | `provenance.attribution` | `© OpenStreetMap contributors` | string | tak | 100% (pochodna) | |
| URL obiektu | `provenance.url` | `https://www.openstreetmap.org/node/{id}` | URL | tak | 100% (pochodna) | |
| Data pobrania | `provenance.retrieved_at` | data ETL | ISO 8601 | tak | 100% (pochodna) | |
| Wersja danych | `provenance.dataset_version` | ETag lub `x-version` | string | nie | 100% (pochodna) | np. `5533` |
| Strefa czasowa | `provenance.timezone` | `@timezone_name` | string IANA | nie | 0% w GeoJSON | tylko `/node/{id}` |
| Offset czasu | `provenance.timezone_offset` | `@timezone_offset` | string | nie | 0% w GeoJSON | tylko `/node/{id}` |

---

## 7. Pola obowiązkowe, pokrycie i luki

### 7.1. Co jest obowiązkowe w OSM

W OSM obowiązkowy jest tylko `emergency=defibrillator`. Wszystkie pozostałe tagi są opcjonalne, choć wiki nazywa niektóre „important”. To oznacza, że **schemat OSM nie gwarantuje** żadnego z pól potrzebnych do bezpiecznego korzystania z mapy AED.

### 7.2. Co powinno być obowiązkowe w naszym schemacie

Minimalny zestaw dla mapy:

1. `id` i `source_id`, `source_type`, `source_version`.
2. `location.lat`, `location.lon`, `location.geometry`.
3. `access.type` i `access.is_public`.
4. `verification.last_checked_at` lub jawne `verification.status`.
5. `provenance.source`, `provenance.license`, `provenance.attribution`, `provenance.retrieved_at`.

### 7.3. Największe braki w źródle

| Brak | Konsekwencja | Obecność w PL |
|---|---|---:|
| `verification.status` (działa / nie działa) | nie można oznaczyć awarii | 0% |
| `verification.osm_timestamp` w GeoJSON | nie wiadomo, kiedy obiekt był edytowany | 0% |
| `device.serial` / `device.national_id` | brak identyfikacji fizycznego urządzenia | 0% |
| `verification.pad_expiry` / `battery_expiry` | brak informacji o gotowości do użycia | 0% |
| strukturalny adres | brak możliwości adresowego wyszukiwania | <1% |
| `operator.name` | brak kontaktu do właściciela | 32,8% |
| `access.opening_hours` | brak informacji, kiedy podejść | 37,1% |
| `image:license` przy każdym zdjęciu | ryzyko prawne przy mediach | 7,6% |

### 7.4. Rekomendacje mapowania

1. Budować `id` jako `node/{@osm_id}`, a `source_version` brać z `@osm_version`.
2. Nie traktować `check_date` jako statusu. To tylko data ostatniego sprawdzenia. Osobno liczyć `verification.age_days`.
3. `access` mapować na zamknięty enum, a `access=no` i `access=unknown` oznaczać jako „niedostępny publicznie” z flagą do weryfikacji.
4. `opening_hours` przechowywać jako string OSM i dodatkowo parsować do `access.is_24_7`.
5. `level` i `level:ref` trzymać osobno, bo mają różne znaczenie.
6. Media bez `image:license` oznaczać jako `license=unknown` i nie publikować bez wyjaśnienia.
7. Dołożyć własne `verification.status`, `verification.last_verified_by` i `verification.source`, bo OSM ich nie ma.
8. Przy imporcie zapisywać `provenance.retrieved_at` i ETag eksportu, bo plik GeoJSON nie ma znacznika czasu danych.
9. Nie używać CloudFerro ani Geoportal jako źródła danych AED, dopóki nie zostaną potwierdzone publiczne endpointy i warunki licencji.
10. Jeśli potrzebny jest CSV, generować go z Overpass `[out:csv(...)]` lub z naszego ETL, nie szukać CSV w OpenAEDMap.

---

## 8. Dokładne komendy użyte do weryfikacji

```bash
# OSM Wiki
curl -sS -L "https://wiki.openstreetmap.org/w/index.php?title=Tag:emergency%3Ddefibrillator&action=raw"

# OSM API, realny węzeł
curl -sS "https://api.openstreetmap.org/api/0.6/node/10739764584.json"

# OpenAEDMap, eksport kraju
curl -sS -L -D headers.txt \
  "https://openaedmap.org/api/v1/countries/PL.geojson" -o PL.geojson

# OpenAEDMap, CSV, oczekiwany 404
curl -sS -L "https://openaedmap.org/api/v1/countries/PL.csv"

# OpenAEDMap, pojedynczy węzeł
curl -sS "https://openaedmap.org/api/v1/node/9464587317"

# Taginfo
curl -sS "https://taginfo.openstreetmap.org/api/4/tag/stats?key=emergency&value=defibrillator"

# Overpass, główny endpoint, test z tej sieci
curl -sS --max-time 120 -G "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:90];node["emergency"="defibrillator"](52.229,21.011,52.232,21.015);out meta 2;'

# Overpass, mirror szwajcarski, test kontrolny
curl -sS -G "https://overpass.osm.ch/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:45];node["emergency"="defibrillator"](46,7,47,9);out count;'

# Geoportal, GetCapabilities
curl -sS -L -A "Mozilla/5.0" \
  "https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/StandardResolution?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0"

# Geoportal, katalog usług
curl -sS -L "https://www.geoportal.gov.pl/pl/usluga/wykaz-uslug/"

# CloudFerro, DNS i sitemap
getent hosts wms.cloudferro.com
curl -sS -L "https://www.cloudferro.com/sitemap.xml"
```

---

## 9. Podsumowanie decyzji

- **OpenStreetMap** jest jedynym w pełni zweryfikowanym, otwartym źródłem danych AED dla Polski. Licencja ODbL 1.0, geometria EPSG:4326, tagging `emergency=defibrillator`.
- **OpenAEDMap** jest gotowym, wygodnym eksportem OSM. Bieżący GeoJSON jest potwierdzony, bieżący CSV nie istnieje, ale historyczny CSV z 2023-01-07 jest dostępny w Wayback. Dane są świeże (replikacja 30 s, cache 1 h), ale eksport gubi `timestamp`, `changeset` i `user`.
- **Overpass API** jest właściwym narzędziem do zapytań ad hoc i CSV, ale z tego środowiska główne instancje były nieosiągalne. Do produkcji trzeba zapewnić własną instancję, płatny dostęp lub stabilny mirror.
- **Geoportal.gov.pl** nie ma potwierdzonej publicznej warstwy „Defibrylatory”. Wszystkie znane endpointy WMS zwracają 401, a katalog usług nie zawiera takiej warstwy.
- **CloudFerro** to hosting OpenAEDMap, nie źródło danych AED. Nie ma publicznego WMS z AED.
- Do wspólnego schematu trzeba dodać pola, których OSM nie ma: status działania, wynik inspekcji, identyfikator fizycznego urządzenia, terminy ważności elektrod i baterii oraz znacznik czasu źródła.
