# Publiczny kontrakt API i mapy oraz filtry

| | |
| --- | --- |
| Wersja | 1.0 |
| Baza | [`../aed-data-sources-common-schema.md`](../aed-data-sources-common-schema.md), sekcje 7, 8, 14 |
| Dotyczy | `src/routes/api/v1/**`, `src/components/map/**`, `src/routes/index.tsx` |
| Status | projekt kontraktu do implementacji |

## 1. Zasady kontraktu

1. **Tylko odczyt.** Publiczne API nie przyjmuje zapisów. Zgłoszenia idą osobną trasą opisaną w panelu.
2. **Wersjonowanie w ścieżce.** `/api/v1` jest zamrożone w zakresie pól i znaczeń. Nowe pola mogą się pojawiać, ale istniejące nie zmieniają typu ani znaczenia w ramach `v1`.
3. **Bez sesji.** Autoryzacja nie jest wymagana. API nie ustawia ciasteczek i nie czyta ciasteczek sesyjnych.
4. **Jeden model odpowiedzi.** JSON, GeoJSON i CSV pochodzą z tej samej projekcji kanonicznej. Różni się opakowanie, nie treść.
5. **Proweniencja zawsze obecna.** Każdy rekord ma `source`, `license_id`, `attribution`, `source_url`, `last_verified_at` (jeśli znane).
6. **Brak danych jawnie oznaczony.** Wartości nieznane to `null` lub `"unknown"`, nigdy domyślne `false`/`"active"`.
7. **Pola ograniczone nigdy nie wychodzą.** `serial_number`, kody dostępu, telefon dyspozytora, prywatne e-maile i adresy osób fizycznych są wykluczone z projekcji publicznej.
8. **Wydajność przez geometrię.** Zapytania przestrzenne korzystają z `bbox` i indeksu, nie z pełnego skanu.

## 2. Zasoby i endpointy

| Metoda | Ścieżka | Format | Opis |
| --- | --- | --- | --- |
| GET | `/api/v1/aed` | JSON | lista rekordów z filtrami i paginacją |
| GET | `/api/v1/aed/:public_code` | JSON | pojedynczy rekord po kodzie publicznym |
| GET | `/api/v1/aed.geojson` | GeoJSON | FeatureCollection dla mapy i GIS |
| GET | `/api/v1/aed.csv` | CSV | eksport dla arkuszy i harwestera |
| GET | `/api/v1/sources` | JSON | rejestr źródeł publicznych z licencjami |
| GET | `/api/v1/stats` | JSON | liczniki dla dashboardu i prezentacji |
| GET | `/api/v1/health` | JSON | minimalny stan publiczny |
| GET | `/api/health/ready` | JSON | szczegółowy stan dla ops, bez danych wrażliwych |

Aliasy czytelnościowe: `/api/v1/nearest` przekierowuje 302 na `/api/v1/aed?near=...`, `/api/v1/export.geojson` na `/api/v1/aed.geojson`. Aliasy nie są częścią gwarancji `v1`, ale są tanie w utrzymaniu.

### 2.1 Kody odpowiedzi

| Kod | Kiedy | Treść |
| --- | --- | --- |
| 200 | poprawne zapytanie | dane |
| 304 | `If-None-Match` zgodny | brak treści |
| 400 | zły parametr, sprzeczne filtry | problem+json z `errors[]` |
| 404 | brak rekordu | problem+json |
| 410 | rekord usunięty i oznaczony `removed` | problem+json z `public_code` |
| 413 | zbyt duży `bbox` lub `limit` | problem+json |
| 429 | limit żądań | problem+json + `Retry-After` |
| 503 | baza niedostępna | problem+json + `Retry-After` |

## 3. `GET /api/v1/aed`

### 3.1 Parametry filtrów

Wszystkie parametry są opcjonalne. Nieznany parametr jest błędem `400 UNKNOWN_PARAM`, a nie ignorowany po cichu. Puste `?status=` jest błędem.

| Parametr | Typ | Domyślnie | Zakres / reguły | Znaczenie |
| --- | --- | --- | --- | --- |
| `bbox` | string | brak | `minLon,minLat,maxLon,maxLat` w WGS84 | prostokąt; max powierzchnia 4 stopnie kwadratowe |
| `near` | string | brak | `lat,lon` | punkt odniesienia; wymaga `radius_m` lub domyślnie 2000 |
| `radius_m` | int | 2000 | 50 do 50000 | promień dla `near` |
| `voivodeship` | string | brak | kod lub nazwa z §4.1 | województwo |
| `teryt_commune` | string | brak | 7 cyfr | gmina |
| `city` | string | brak | 1 do 80 znaków | miejscowość, dopasowanie bez wielkości liter |
| `status` | CSV | brak | `active`, `out_of_service`, `removed`, `planned`, `unknown` | status urządzenia |
| `access_type` | CSV | brak | `public`, `permissive`, `customers`, `private`, `key`, `code`, `dispatcher`, `unknown` | dostęp |
| `verification_status` | CSV | brak | `confirmed`, `probable`, `unverified`, `stale`, `disputed`, `candidate`, `removed` | pewność |
| `source` | CSV | brak | slug z `/sources` | źródło |
| `device_type` | CSV | brak | `public_aed`, `trainer`, `unknown` | typ urządzenia |
| `is_24_7` | bool | brak | `true`/`false` | tylko jawnie potwierdzone |
| `indoor` | bool | brak | `true`/`false` | wewnątrz budynku |
| `min_confidence` | float | brak | 0 do 1 | dolna granica pewności |
| `q` | string | brak | 2 do 80 znaków | nazwa, adres, operator, `public_code` |
| `updated_since` | datetime | brak | ISO 8601 | rekordy zmienione po dacie |
| `include_removed` | bool | `false` | `true`/`false` | dołącza `removed` do wyników |
| `sort` | enum | `relevance` | `relevance`, `distance`, `updated`, `confidence`, `name` | sortowanie |
| `limit` | int | 100 | 1 do 500 | rozmiar strony |
| `cursor` | string | brak | opaque | kursor następnej strony |

Reguły łączenia:

- wszystkie filtry łączą się przez AND, wartości w jednym filtrze CSV przez OR,
- `near` i `bbox` mogą wystąpić razem: najpierw `bbox`, potem promień,
- `sort=distance` wymaga `near`, inaczej `400 MISSING_NEAR`,
- `sort=relevance` bez `q` zachowuje się jak `updated` malejąco,
- `include_removed=true` wymaga `status` zawierającego `removed` lub braku `status`.

### 3.2 Przykłady

Najbliższe AED w promieniu 1,5 km:

```http
GET /api/v1/aed?near=52.2297,21.0122&radius_m=1500&sort=distance&limit=20
```

AED publiczne, czynne 24/7, w Warszawie:

```http
GET /api/v1/aed?city=Warszawa&access_type=public&is_24_7=true&verification_status=confirmed,probable&limit=100
```

Kwadrat dla mapy:

```http
GET /api/v1/aed.geojson?bbox=20.85,52.10,21.20,52.35&source=openaedmap,przemysl
```

### 3.3 Koperta JSON

```json
{
  "data": [
    {
      "aed_id": "0192f3c4-5b6c-7d8e-9f01-23456789abcd",
      "public_code": "PL-AED-14-7K3M9Q2",
      "name": "AED w Urzędzie Dzielnicy",
      "facility_type": "municipal_office",
      "location": {
        "lat": 52.2297,
        "lon": 21.0075,
        "coord_precision_m": 15,
        "indoor": true,
        "level": "0",
        "entrance_description": "wejście główne, hol",
        "address": {
          "city": "Warszawa",
          "district": "Śródmieście",
          "street": "aleja Solidarności",
          "house_number": "1",
          "postcode": "00-001",
          "address_text": "aleja Solidarności 1, 00-001 Warszawa",
          "teryt_commune": "1465011"
        }
      },
      "access": {
        "type": "public",
        "opening_hours": "Mo-Fr 08:00-16:00",
        "is_24_7": false,
        "requires_dispatcher": null,
        "fee": null,
        "wheelchair_access": "yes"
      },
      "device": {
        "label": "AED 1234",
        "manufacturer": "ZOLL",
        "model": "AED Plus",
        "device_type": "public_aed",
        "pads_type": "adult"
      },
      "status": {
        "state": "active",
        "reason": null,
        "verification_status": "probable",
        "confidence": 0.72,
        "last_verified_at": "2025-11-22T00:00:00Z",
        "last_seen_at": "2026-11-21T18:00:00Z"
      },
      "operator": {
        "name": "m.st. Warszawa",
        "type": "municipality",
        "phone": "+48 22 000 00 00",
        "website": "https://um.warszawa.pl"
      },
      "provenance": {
        "source": "openaedmap",
        "source_record_id": "openaedmap:13323246101",
        "source_url": "https://www.openstreetmap.org/node/13323246101",
        "license_id": "ODbL-1.0",
        "attribution": "© OpenStreetMap contributors",
        "fetched_at": "2026-11-21T18:00:00Z"
      },
      "links": { "self": "/api/v1/aed/PL-AED-14-7K3M9Q2" }
    }
  ],
  "meta": {
    "count": 1,
    "total": 183,
    "limit": 100,
    "next_cursor": null,
    "generated_at": "2026-11-21T19:45:00Z",
    "bbox": null,
    "license": "ODbL-1.0",
    "attributions": [
      "© OpenStreetMap contributors",
      "Miasto Przemyśl (CC BY 4.0)"
    ],
    "filters_applied": {
      "city": "Warszawa",
      "is_24_7": true
    }
  },
  "links": {
    "self": "/api/v1/aed?city=Warszawa&is_24_7=true",
    "geojson": "/api/v1/aed.geojson?city=Warszawa&is_24_7=true",
    "csv": "/api/v1/aed.csv?city=Warszawa&is_24_7=true",
    "sources": "/api/v1/sources"
  }
}
```

Uwagi do koperty:

- `total` to liczba rekordów spełniających filtr, nie liczba zwrócona.
- `next_cursor` jest nieprzezroczystym ciągiem; klient nie może go składać ani modyfikować.
- `meta.license` to licencja dominująca w wyniku. Jeśli wynik zawiera wiele licencji, `license` ma wartość `"mixed"`, a `attributions` wymienia wszystkie.
- `filters_applied` odzwierciedla znormalizowane wartości, nie surowe wejście.

### 3.4 Pojedynczy rekord

`GET /api/v1/aed/:public_code` zwraca ten sam obiekt w `data` plus pełniejszy `provenance` (wszystkie źródła i `match_method`) oraz `history` z maks. 10 ostatnich obserwacji. Nie zawiera pól ograniczonych.

Jeśli rekord ma `status=removed`, endpoint zwraca `200` z `status.state="removed"` i nagłówkiem `Deprecation: true`, nie `404`. `404` tylko dla nieznanego kodu.

### 3.5 GeoJSON

```json
{
  "type": "FeatureCollection",
  "name": "aed-pl",
  "license": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors",
  "generated_at": "2026-11-21T19:45:00Z",
  "features": [
    {
      "type": "Feature",
      "id": "PL-AED-14-7K3M9Q2",
      "geometry": { "type": "Point", "coordinates": [21.0075, 52.2297] },
      "properties": {
        "name": "AED w Urzędzie Dzielnicy",
        "facility_type": "municipal_office",
        "operator_name": "m.st. Warszawa",
        "access_type": "public",
        "is_24_7": false,
        "status": "active",
        "verification_status": "probable",
        "confidence": 0.72,
        "last_verified_at": "2025-11-22T00:00:00Z",
        "source": "openaedmap",
        "source_url": "https://www.openstreetmap.org/node/13323246101",
        "license_id": "ODbL-1.0",
        "attribution": "© OpenStreetMap contributors"
      }
    }
  ]
}
```

Zasady GeoJSON:

- współrzędne zawsze `[lon, lat]` w EPSG:4326,
- `id` feature to `public_code`, nie UUID, żeby był czytelny w GIS,
- brak `crs` (RFC 7946 wymusza WGS84),
- `bbox` w kolekcji tylko gdy zapytanie miało `bbox` lub wynik jest niepusty,
- `properties` płaskie, zgodne z listą z sekcji 5.

### 3.6 CSV

Nagłówek i kolejność kolumn zgodne z sekcją 14.1 dokumentu bazowego. Dodatkowe reguły:

- UTF-8 z BOM, separator `,`, CRLF,
- `null` to puste pole,
- `true`/`false` małymi literami,
- `confidence` z kropką dziesiętną,
- daty ISO 8601 UTC,
- brak `serial_number`, kodów dostępu i prywatnych e-maili,
- pierwszy wiersz komentarza zaczynający się od `#` z licencją i atrybucją jest dozwolony i zalecany,
- `Content-Disposition: attachment; filename="aed-pl-2026-11-21.csv"`.

## 4. Słowniki i walidacja

### 4.1 Województwa

Akceptowane są nazwy i kody TERYT województw: `02` dolnośląskie, `04` kujawsko-pomorskie, `06` lubelskie, `08` lubuskie, `10` łódzkie, `12` małopolskie, `14` mazowieckie, `16` opolskie, `18` podkarpackie, `20` podlaskie, `22` pomorskie, `24` śląskie, `26` świętokrzyskie, `28` warmińsko-mazurskie, `30` wielkopolskie, `32` zachodniopomorskie.

### 4.2 Walidacja współrzędnych

- `lat` 49,00 do 54,90; `lon` 14,10 do 24,20,
- `bbox`: `minLon < maxLon`, `minLat < maxLat`, powierzchnia maks. 4 stopnie kwadratowe,
- `near`: punkt w granicach Polski lub w promieniu 50 km od granicy,
- wartości `NaN`, `Infinity`, puste i nieliczbowe dają `400 INVALID_COORDINATE`.

### 4.3 Format błędów (RFC 9457)

```json
{
  "type": "https://aed.example/errors/unknown-parameter",
  "title": "Nieznany parametr",
  "status": 400,
  "detail": "Parametr 'statuss' nie istnieje. Najbliższy znany parametr to 'status'.",
  "instance": "/api/v1/aed?statuss=active",
  "errors": [
    { "parameter": "statuss", "code": "UNKNOWN_PARAM", "suggestion": "status" }
  ]
}
```

Kody błędów: `UNKNOWN_PARAM`, `INVALID_COORDINATE`, `BBOX_TOO_LARGE`, `MISSING_NEAR`, `INVALID_RADIUS`, `INVALID_DATETIME`, `INVALID_BOOL`, `INVALID_ENUM`, `LIMIT_TOO_LARGE`, `INVALID_CURSOR`, `NOT_FOUND`, `RATE_LIMITED`.

## 5. Widoczność pól

| Pole | API JSON | GeoJSON | CSV | Uwaga |
| --- | --- | --- | --- | --- |
| `aed_id`, `public_code` | TAK | tylko `public_code` jako `id` | TAK | identyfikatory publiczne |
| `name`, `facility_type` | TAK | TAK | TAK | |
| `lat`, `lon`, `coord_precision_m` | TAK | geometria + `coord_precision_m` | TAK | |
| adres i TERYT | TAK | wybrane pola | TAK | bez numeru mieszkania osoby fizycznej |
| `access_*`, `status`, `verification_*`, `confidence` | TAK | TAK | TAK | |
| `operator_name`, `operator_type`, kontakt organizacyjny | TAK | `operator_name` | TAK | tylko kontakt instytucji |
| `device.label`, `manufacturer`, `model`, `device_type`, `pads_type` | TAK | TAK | TAK | bez `serial_number` |
| `photo_url`, `photo_license` | TAK | TAK | TAK | tylko zdjęcia z licencją |
| `provenance` | TAK | spłaszczone | spłaszczone | |
| `serial_number`, kody dostępu, telefon dyspozytora, e-mail osoby fizycznej | NIE | NIE | NIE | pola ograniczone |
| `source_payload_sha256` | NIE | NIE | NIE | wewnętrzne |
| `history` | tylko pojedynczy rekord | NIE | NIE | maks. 10 wpisów |

Projekcja publiczna jest jednym modułem (`publicProjection`), używanym przez wszystkie trzy formaty i przez harwester. Test kontraktu pilnuje, żeby żadne pole z listy zabronionych nie pojawiło się w odpowiedzi.

## 6. Cache, limity i bezpieczeństwo

### 6.1 Cache

- `ETag` liczony z `sha256` treści + wersji projekcji,
- `Last-Modified` z maksimum `updated_at` w wyniku,
- `Cache-Control: public, max-age=60, stale-while-revalidate=300` dla list,
- `Cache-Control: public, max-age=300` dla pojedynczego rekordu,
- `Cache-Control: public, max-age=3600` dla `/sources` i `/stats`,
- `304` przy zgodnym `If-None-Match`,
- `Vary: Accept-Encoding`.

### 6.2 Limity

| Zakres | Limit | Nagłówki |
| --- | --- | --- |
| anonimowy klient | 120 żądań/min na IP | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| eksport CSV/GeoJSON | 10 żądań/min na IP | j.w. + `Retry-After` |
| harwester dane.gov.pl | wyjątek po `User-Agent`, bez limitu do 6 żądań/min | j.w. |

Po przekroczeniu: `429` i `Retry-After`. Limity są liczone po `CF-Connecting-IP` lub `X-Forwarded-For`, z fallbackiem na adres gniazda.

### 6.3 CORS

`Access-Control-Allow-Origin: *` dla `GET` i `OPTIONS` na `/api/v1/*` z wyjątkiem `/api/v1/health`. Bez cookies, bez nagłówków uwierzytelniających. `Access-Control-Max-Age: 86400`.

### 6.4 Nagłówki licencyjne

Każda odpowiedź zawiera:

```http
X-Data-License: ODbL-1.0
X-Data-Attribution: © OpenStreetMap contributors
Link: <https://opendatacommons.org/licenses/odbl/1-0/>; rel="license"
```

Dla wyniku mieszanego: `X-Data-License: mixed` i `Link` z wieloma relacjami `license`. Treść atrybucji jest też w `meta.attributions`.

## 7. Publiczna mapa: kontrakt UI

### 7.1 Układ

Desktop: mapa na pełną szerokość, panel filtrów po lewej (320 px), panel szczegółów po prawej (360 px), lista wyników w panelu bocznym. Mobile 360 px: mapa na 45vh, pod nią przełącznik `Mapa | Lista | Filtry`, panel szczegółów jako dolna szuflada.

### 7.2 Stan w URL

Filtry są w URL, żeby linki były użyteczne i testowalne:

```text
/?bbox=20.85,52.10,21.20,52.35&access_type=public&is_24_7=true&status=active&sort=relevance&q=urząd
```

| Parametr URL | Mapowanie API | Zachowanie |
| --- | --- | --- |
| `bbox` | `bbox` | aktualizowany po przesunięciu mapy, z debounce 400 ms |
| `near`, `radius_m` | `near`, `radius_m` | ustawiane przez „blisko mnie” |
| `access_type` | `access_type` | multiselect |
| `is_24_7`, `indoor` | `is_24_7`, `indoor` | przełączniki trójstanowe: dowolny, tak, nie |
| `status` | `status` | multiselect |
| `verification_status` | `verification_status` | multiselect |
| `source` | `source` | multiselect |
| `q` | `q` | pole tekstowe, debounce 300 ms |
| `sort` | `sort` | select |
| `selected` | brak | `public_code` otwartego panelu, nie wpływa na API |

Zmiana filtra nie przeładowuje strony. `history.replaceState` aktualizuje URL, a `popstate` przywraca stan.

### 7.3 Filtry w UI

Sekcje panelu, w kolejności:

1. **Szukaj** (tekst, 1 pole).
2. **Dostęp** (`public`, `permissive`, `customers`, `key`, `code`, `dispatcher`, `unknown`; domyślnie wszystkie oprócz `private`).
3. **Czynne 24/7** (przełącznik).
4. **Status** (`active`, `out_of_service`, `unknown`, `planned`; `removed` ukryte za „pokaż usunięte”).
5. **Pewność** (`confirmed`, `probable`, `unverified`, `stale`; `candidate` i `disputed` domyślnie ukryte).
6. **Źródło** (lista z `/api/v1/sources`, z licznikami).
7. **Lokalizacja** (województwo, miejscowość; na mobile zamiast `bbox`).
8. **W pobliżu** (przycisk „Użyj mojej lokalizacji”, promień 500 m, 1 km, 2 km, 5 km).

Na górze paska: liczba wyników, przycisk „Wyczyść filtry”, informacja o ostatniej aktualizacji danych.

### 7.4 Znaczniki i kolory

| Stan | Kolor | Wzór | Znaczenie |
| --- | --- | --- | --- |
| `active` + `public`/`permissive` | zielony | pełne koło | potwierdzone, ogólnodostępne |
| `active` + `customers`/`key`/`code`/`dispatcher` | żółty | pełne koło | dostęp ograniczony |
| `unknown` status | szary | koło z obwódką | brak potwierdzenia |
| `out_of_service` | czerwony | koło z przekątną | czasowo wyłączone |
| `removed` | szary | ikona kosza | tylko po włączeniu „pokaż usunięte” |
| `candidate` | niebieski | koło z kropką | kandydat, niepotwierdzony |

Kolor nigdy nie jest jedynym nośnikiem informacji. Legenda ma tekst, a znaczniki mają `aria-label` z nazwą i statusem. Klastry pokazują liczbę; powyżej 50 znaczników włączamy klastrowanie.

### 7.5 Panel szczegółów

Zawartość:

1. Nazwa i typ obiektu.
2. Status i dostęp, słownie: „Czynne, dostęp publiczny”, „Brak potwierdzenia działania”.
3. Adres i opis wejścia (`entrance_description`, `level`, `room`).
4. Godziny i `is_24_7`, z rozróżnieniem „nieznane”.
5. „Ostatnia weryfikacja: data” i „Źródło: nazwa”, link do `source_url`.
6. Licencja i atrybucja, link do licencji.
7. Akcje: „Pokaż trasę” (link do zewnętrznej nawigacji), „Zadzwoń 112” (tylko informacyjnie), „Zgłoś błąd”.
8. Ostrzeżenie prawne: „W nagłym zatrzymaniu krążenia dzwoń pod 112. Nie opóźniaj pomocy, aby szukać AED.”

Nie pokazujemy numeru seryjnego, kodu do skrzynki ani prywatnego telefonu.

### 7.6 „Najbliższy AED”

1. Przycisk „Blisko mnie” wywołuje `navigator.geolocation.getCurrentPosition`.
2. Zgoda: zapytanie `near`, `radius_m=5000`, `sort=distance`, `status=active`.
3. Wynik: maks. 5 najbliższych, z odległością w metrach i czasem pieszo (opcjonalnie, z zewnętrznego API lub pominięte).
4. Odmowa zgody: komunikat „Nie możemy ustalić lokalizacji. Wpisz adres lub wskaż punkt na mapie.” i pole adresu.
5. Brak wyników: „W promieniu 5 km nie mamy potwierdzonego AED. Zadzwoń pod 112.”
6. Błąd API: komunikat z `Retry`, bez ukrywania mapy.

### 7.7 Lista dostępna z klawiatury

Ta sama kolekcja wyników jako tabela:

| Kolumna | Treść |
| --- | --- |
| Nazwa | link do szczegółów |
| Adres | miejscowość i ulica |
| Dostęp | słownie, z ikoną i tekstem |
| Status | słownie |
| Weryfikacja | data lub „brak danych” |
| Odległość | jeśli `near` |

Tabela ma sortowanie, paginację i fokus widoczny. Na mobile domyślnie widoczna jest lista, nie mapa, jeśli użytkownik preferuje redukcję ruchu (`prefers-reduced-motion`) lub ma włączony czytnik ekranu.

### 7.8 Stany

| Stan | UI |
| --- | --- |
| ładowanie | szkielet mapy i listy, `aria-busy="true"`, bez migającego spinnera |
| brak wyników | komunikat, powód (filtry vs. brak danych), przycisk „Wyczyść filtry” |
| błąd sieci | alert z kodem i „Spróbuj ponownie”, zachowanie filtrów |
| błąd mapy | istniejący alert, lista nadal działa |
| wolne połączenie | lista ładuje się przed kafelkami, znaczniki bez animacji |

### 7.9 Wydajność i dostępność mapy

- 20 000 rekordów w bazie: `GET /aed?bbox=...` p95 poniżej 300 ms, pierwsze znaczniki poniżej 2 s na 4G.
- Klastrowanie od 50 znaczników, `maxzoom` klastra 14.
- Kontrast tekstu 4.5:1, fokus 3:1, cel dotykowy min. 44×44 px.
- Mapa nie przechwytuje klawiatury bez wyjścia: `Esc` zamyka panel, `Tab` wychodzi z mapy.
- `prefers-reduced-motion`: bez animacji lotu do punktu.

## 8. `GET /api/v1/sources`

```json
{
  "data": [
    {
      "id": "openaedmap",
      "name": "OpenAEDMap",
      "publisher": "OpenAEDMap / OSM PL",
      "homepage_url": "https://openaedmap.org/",
      "access_type": "api",
      "license_id": "ODbL-1.0",
      "license_url": "https://opendatacommons.org/licenses/odbl/1-0/",
      "attribution": "© OpenStreetMap contributors",
      "reliability_tier": "community",
      "update_frequency": "daily",
      "last_success_at": "2026-11-21T18:00:00Z",
      "record_count": 18298,
      "allowed_for_export": true
    }
  ],
  "meta": { "count": 5, "generated_at": "2026-11-21T19:45:00Z" }
}
```

Nie ujawniamy `allowed_for_ingest`, `terms_hash`, `approved_by` ani wewnętrznych notatek. Ujawniamy `record_count` i `last_success_at`, bo budują zaufanie.

## 9. `GET /api/v1/stats`

```json
{
  "generated_at": "2026-11-21T19:45:00Z",
  "aed_total": 18420,
  "by_status": { "active": 12100, "unknown": 6100, "out_of_service": 200, "removed": 20 },
  "by_access": { "public": 9000, "customers": 5000, "unknown": 4000, "other": 420 },
  "by_verification": { "confirmed": 1200, "probable": 8000, "unverified": 7000, "stale": 2200 },
  "by_source": { "openaedmap": 18298, "przemysl": 21, "krosno": 21, "marki": 8, "warszawa": 0 },
  "by_voivodeship": { "14": 3200, "12": 1500, "24": 1700 },
  "freshness": { "lt_6m": 5000, "lt_12m": 3000, "lt_24m": 4000, "gt_24m": 6420 },
  "coverage_communes": { "with_data": 210, "total": 2477 }
}
```

Statystyki nie zawierają danych osobowych i są cache'owane na godzinę.

## 10. Kontrakt z eksportem dane.gov.pl

- `/api/v1/aed.csv` i `/api/v1/aed.geojson` są tymi samymi plikami, które serwuje harwester pod `/data/aed.csv` i `/data/aed.geojson`.
- Feed XML opisuje zbiór i zasoby, nie rekordy.
- `extIdent` zbioru: `aed-pl` (7 znaków, limit 36).
- `updateFrequency`: `daily`.
- `hasDynamicData`: `true`.
- `dataDate` i `lastUpdateDate` pochodzą z `meta.generated_at` i maksimum `updated_at`.
- Licencja zasobu jest zgodna z `meta.license`; przy `mixed` publikujemy dwa zasoby z osobnymi licencjami, nie jeden z niejasną.
- Portal nie może zobaczyć `localhost`; walidacja odbywa się na lokalnej instancji z przekierowaniem hosta lub tunelem, ale adresy w feedzie muszą być publiczne.

## 11. Testy kontraktu

1. Każdy parametr z tabeli ma test poprawnego i błędnego wejścia.
2. Nieznany parametr daje `400`, nie jest ignorowany.
3. `bbox` o powierzchni większej niż 4 stopnie daje `413`.
4. `sort=distance` bez `near` daje `400 MISSING_NEAR`.
5. `include_removed=false` nigdy nie zwraca `status=removed`.
6. Odpowiedź JSON, GeoJSON i CSV dla tego samego filtra ma tę samą liczbę rekordów.
7. Żadne pole z listy zabronionych nie występuje w odpowiedziach (test rekurencyjny po kluczach).
8. `ETag` zmienia się po zmianie rekordu i nie zmienia się przy identycznym wyniku.
9. `304` nie zawiera treści.
10. `X-Data-License` i `meta.attributions` są obecne w każdej odpowiedzi z danymi.
11. Kursor jest nieprzezroczysty i stabilny przy powtórzeniu.
12. Limit 500 jest górną granicą; 501 daje `400 LIMIT_TOO_LARGE`.

## 12. Zadania implementacyjne

| ID | Zadanie | Zależność |
| --- | --- | --- |
| P1 | Moduł `publicProjection` i test zabronionych pól | model kanoniczny |
| P2 | Zapytanie `queryAed` z filtrami, kursorem i sortowaniem | P1, indeksy |
| P3 | Trasy `/api/v1/aed`, `/:code`, `.geojson`, `.csv` | P2 |
| P4 | `sources` i `stats` | P1 |
| P5 | ETag, cache, limity, CORS, problem+json | P3 |
| P6 | Warstwa AED na mapie, klastrowanie, legenda | P3 |
| P7 | Panel filtrów i synchronizacja URL | P6 |
| P8 | Panel szczegółów i „blisko mnie” | P6 |
| P9 | Widok listy i dostępność klawiaturowa | P7 |
| P10 | Testy kontraktu i wydajności | P3 do P9 |
| P11 | Podłączenie eksportu do feedu harwestera | P3, gov-api |
