# Audyt agregatorów i aplikacji mobilnych: dostęp maszynowy do danych AED

Data audytu: 2026-11-21
Zakres: 10 źródeł wskazanych w zadaniu oraz OpenAEDMap jako źródło bazowe.
Metoda: analiza publicznych stron, regulaminów i polityk prywatności, analiza odpowiedzi HTTP oraz publicznych bundle'i JavaScript. Testy HTTP wykonano z tego środowiska w godzinach 18:03-18:23 UTC. Nie dekompilowano APK ani IPA. Pola widoczne w aplikacjach mobilnych ustalono na podstawie opisów w sklepach, stron projektowych i publicznych interfejsów webowych.

## 1. Wnioski w skrócie

1. **Cztery źródła udostępniają dane AED w formie nadającej się do automatycznego pobrania:**
   - OpenAEDMap, kanoniczna warstwa OSM, eksport krajowy `PL.geojson` (18 298 punktów), API kafelkowe MVT i API pojedynczego węzła,
   - SOS DAE, publiczne, wersjonowane pliki JSON i shardy gzip,
   - InfoRatunek, publiczne `/api/aed` oraz duży plik `aed.geojson.gz`,
   - Ratuj z Sercem, nieudokumentowany endpoint `DBProxy.aspx`, który zwraca JSON i HTML.

2. **Tylko OSM i OpenAEDMap mają jednoznaczną, otwartą licencję (ODbL).**
   - aedmapa.pl i mapa Ratujemy.com.pl są pochodnymi OSM, więc ich dane można legalnie pozyskać z OSM, a nie z ich interfejsów.
   - SOS DAE korzysta z OSM, ale jego regulamin zakazuje masowego wyciągania skompilowanej bazy w celu odsprzedaży lub budowy konkurencyjnej usługi.
   - Ratuj z Sercem nie ma otwartej licencji. Ich zastrzeżenie mówi, że korzystanie z treści wymaga zgody autorów i oznaczenia źródła.
   - InfoRatunek ma warstwę OSM z ODbL, ale własne 16 rekordów nie ma widocznego regulaminu ani licencji.
   - Pierwszy Ratownik, Fundacja Ratuj Życie i Staying Alive są zamknięte lub nieudokumentowane.

3. **Dwa źródła z listy nie są agregatorami AED:**
   - aplikacja Ratunek (Polkomtel / Paga Solutions) służy do przekazywania lokalizacji dzwoniącego do GOPR, TOPR, WOPR i MOPR, nie zawiera mapy AED,
   - mojeIKP zawiera poradnik pierwszej pomocy i telefony alarmowe, ale nie zawiera mapy AED.

4. **Rekomendowana kolejność integracji:**
   1. OSM / OpenAEDMap jako źródło podstawowe i referencyjne.
   2. InfoRatunek `aed.geojson.gz` jako wygodny snapshot OSM do porównań, z obowiązkową atrybucją OSM.
   3. SOS DAE wyłącznie po uzyskaniu zgody lub przez ponowne wykorzystanie danych OSM, nie przez masowy scraping ich bazy.
   4. Ratuj z Sercem wyłącznie po pisemnej zgodzie, z powodu braku otwartej licencji.
   5. Pozostałe źródła: kontakt partnerski, bez automatycznego pobierania.

## 2. Skala oceny wiarygodności

| Ocena | Znaczenie |
| --- | --- |
| Wysoka | Działa publiczny, maszynowy dostęp, znana licencja lub pochodzenie, dane możliwe do zweryfikowania w OSM. |
| Średnia | Dane dostępne publicznie lub półpublicznie, ale bez jasnej licencji, bez dokumentacji, o nieznanej kompleksowości albo z ograniczeniami technicznymi. |
| Niska | Brak publicznego eksportu lub API, dane tylko w aplikacji, niejasne pochodzenie i licencja. |
| Brak | Źródło nie zawiera danych AED. |

## 3. Odniesienie do wspólnego schematu

Docelowy model kanoniczny jest zdefiniowany w [`AED/docs/aed-data-sources-common-schema.md`](../../aed-data-sources-common-schema.md), zwłaszcza w sekcjach 6-8. Ten raport nie definiuje konkurencyjnego modelu. Poniżej znajduje się skrót nazw pól używanych w tabelach mapowania.

| Obszar | Pola kanoniczne |
| --- | --- |
| Identyfikacja i źródło | `aed_id`, `public_code`, `ext_ident`, `source`, `source_record_id`, `source_url`, `license_id`, `attribution` |
| Lokalizacja | `name`, `facility_type`, `lat`, `lon`, `coord_precision_m`, `country_code`, `voivodeship`, `county`, `commune`, `city`, `district`, `street`, `house_number`, `postcode`, `address_text`, `teryt_voivodeship`, `teryt_county`, `teryt_commune`, `simc`, `ulic`, `indoor`, `level`, `room`, `entrance_description` |
| Dostęp | `access_type`, `opening_hours`, `is_24_7`, `requires_dispatcher`, `fee`, `wheelchair_access` |
| Urządzenie | `label`, `manufacturer`, `model`, `serial_number`, `device_type`, `pads_type`, `installed_at`, `battery_expiry`, `pads_expiry`, `last_inspection_at`, `next_inspection_at` |
| Status i weryfikacja | `status`, `status_reason`, `verification_status`, `confidence`, `last_verified_at`, `last_seen_at`, `is_public` |
| Operator i kontakt | `operator_id`, `operator_name`, `operator_type`, `phone`, `email`, `website` |
| Media i metadane | `photo_url`, `photo_license`, `source_payload_sha256`, `fetched_at`, `source_updated_at`, `updated_at` |

Przykład rekordu w tym modelu:

```json
{
  "source": "openaedmap",
  "source_record_id": "node/13891134601",
  "source_url": "https://www.openstreetmap.org/node/13891134601",
  "license_id": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors",
  "name": "Kaufland Tomaszów Mazowiecki",
  "facility_type": "shop",
  "lat": 51.534101,
  "lon": 20.0105291,
  "city": "Tomaszów Mazowiecki",
  "street": "Konstytucji 3 Maja",
  "house_number": "1/3",
  "entrance_description": "Na przeciwko kas samoobsługowych, na ścianie przy wejściu do pomieszczeń socjalnych.",
  "indoor": true,
  "level": "0",
  "access_type": "permit",
  "opening_hours": null,
  "device_type": "public_aed",
  "status": "unknown",
  "last_verified_at": "2026-05-28",
  "photo_url": null
}
```

Klucz integracyjny: `source` + `source_record_id`. Dla źródeł opartych na OSM `source_record_id` powinien być identyfikatorem węzła, np. `node/13891134601`, żeby umożliwić deduplikację i weryfikację w OSM. Brak danych zapisujemy jako `null` lub `unknown`, nigdy jako `false` lub `removed`.

## 4. OpenAEDMap, źródło bazowe

### 4.1 Identyfikacja

- Strona: https://openaedmap.org/pl/
- Projekt frontendu: https://github.com/openstreetmap-polska/openaedmap-frontend
- Operator: społeczność OpenStreetMap Polska.
- Aplikacja mobilna "Mapa AED" korzysta z tego samego ekosystemu.

### 4.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://openaedmap.org/pl/` | 200, `text/html` |
| `GET https://openaedmap.org/api/v1/countries/names` | 200, `application/json`, 928 534 B |
| `GET https://openaedmap.org/api/v1/countries/PL.geojson` | 200, `application/geo+json`, 7 135 986 B, 18 298 obiektów |
| `GET https://openaedmap.org/api/v1/node/13891134601` | 200, `application/json`, 672 B |
| `GET https://openaedmap.org/api/v1/tile/14/9148/5394.mvt` | 200, `application/vnd.mapbox-vector-tile`, 2 586 B, 106 obiektów |
| `GET https://openaedmap.org/api/v1/node/123` | 404, `text/plain` |
| `GET https://api.openstreetmap.org/api/0.6/node/13891134601.json` | 200, `application/json`, 721 B |

Eksport krajowy `PL.geojson` jest najlepszym punktem startowym do jednorazowego importu. Zawiera 18 298 obiektów, bounding box Polski (14.1441255, 49.1558231, 24.0370249, 54.8349221) i pełne tagi OSM. Kafelek MVT ma warstwę `defibrillators` i klucze: `node_id`, `point_count`, `point_count_abbreviated`, `access`. Pełne tagi są dostępne przez `/api/v1/node/{id}` albo przez OSM API.

### 4.3 Pola

API węzła zwraca pełne tagi OSM, m.in.:

- `@photo_id`, `@photo_url`, `@photo_source`,
- `@timezone_name`, `@timezone_offset`,
- `type`, `id`, `lat`, `lon`, `version`,
- `tags`: `emergency=defibrillator`, `name`, `access`, `indoor`, `level`, `opening_hours`, `operator`, `phone`, `defibrillator:location:*`, `check_date`, `manufacturer`, `model`, `image`, `image:license`, `description`, `fixme`, `source`, `ref:api-um-warszawa-pl`.

### 4.4 Licencja i pochodzenie

- Dane: OpenStreetMap, licencja ODbL 1.0.
- Atrybucja: "© OpenStreetMap contributors".
- Pochodzenie: w 100% OSM, uzupełniane przez społeczność i importy z otwartych rejestrów.

### 4.5 Ocena

**Wysoka.** Kanoniczne źródło, otwarta licencja, publiczne API, pełne tagi, możliwość weryfikacji każdego rekordu w OSM.

### 4.6 Mapowanie

| Pole źródłowe | Pole wspólne |
| --- | --- |
| `id` / `@osm_id` | `source_record_id` jako `node/{id}` |
| `lat`, `lon` | `lat`, `lon` |
| `tags.name` | `name` |
| `tags.access` | `access_type` |
| `tags.indoor` | `indoor` |
| `tags.level` | `level` |
| `tags.room` | `room` |
| `tags.defibrillator:location:*` | `entrance_description` |
| `tags.opening_hours` | `opening_hours`, `is_24_7` |
| `tags.operator` | `operator_name` |
| `tags.operator:type` | `operator_type` |
| `tags.phone` / `emergency:phone` | `phone` |
| `tags.manufacturer`, `tags.model` | `manufacturer`, `model` |
| `tags.ref` | `label` |
| `tags.serial_number` | `serial_number` |
| `tags.check_date` | `last_verified_at` |
| `tags.image`, `@photo_url` | `photo_url` |
| `version` | `source_updated_at` lub `raw.version` |
| `tags.fixme`, `tags.description` | `entrance_description` lub `raw` |

## 5. SOS DAE

### 5.1 Identyfikacja

- Strona: https://sosdae.com/pl/
- Mapa: https://sosdae.com/map/pl/
- Aplikacje: iOS i Android, pakiet Android `com.defibrillatoridae.app`.
- Operator: niezależny projekt, autor "Andi Arapi", infrastruktura Vercel i Supabase.

### 5.2 Dostęp maszynowy i testy HTTP

Bardzo dobry dostęp: publiczne, wersjonowane pliki danych, bez logowania.

| Test | Wynik |
| --- | --- |
| `GET https://sosdae.com/` | 307 do `/en/` |
| `GET https://sosdae.com/pl/` | 200, `text/html`, 135 763 B |
| `GET https://sosdae.com/data/v/2e81f4932d64/dae_meta.json` | 200, `application/json`, 37 387 B |
| `GET https://sosdae.com/data/v/2e81f4932d64/dae_oh.json` | 200, `application/json`, 559 183 B |
| `GET https://sosdae.com/data/v/2e81f4932d64/dae_index.bin` | 200, `application/octet-stream`, 2 163 582 B |
| `GET https://sosdae.com/data/v/2e81f4932d64/shards/0498.json.gz` | 200, `application/gzip`, 37 985 B |
| `GET https://sosdae.com/data/dae_community.json` | 200, `application/json`, 750 B |
| `GET https://sosdae.com/en/condizioni/` | 200, `text/html` |

`dae_meta.json` zawiera:

- `versione`: `2026-09-18`,
- `estratto_il`: `2026-07-23`,
- `totale`: 549 681,
- `shardSize`: 1024,
- `coordScale`: 100000,
- `shards`: 537 bounding boxów,
- `paesi`: 119 krajów.

Shardy są mapami `id -> rekord`. Przykład rekordu z shardu 0498 (Warszawa):

```json
{
  "id": "node/13947419501",
  "posizione": {"pl": "AED dostępne w Apteka z Uśmiechem czynnej 24/h"},
  "telefono": "+48 728 481 724",
  "ultima_verifica": "2026-06-17"
}
```

Przykład z shardu 0452 (Katowice):

```json
{
  "id": "node/10704395504",
  "posizione": {"default": "Portiernia budynku C"},
  "ente": "Uniwersytet Ekonomiczy w Katowicach",
  "piano": "1"
}
```

### 5.3 Pola

- `id`: identyfikator OSM, np. `node/...`,
- `nome`: nazwa,
- `posizione`: obiekt tłumaczeń, np. `pl`, `en`, `default`,
- `ente`: operator lub instytucja,
- `telefono`: telefon,
- `piano`: piętro,
- `foto`: URL zdjęcia,
- `ultima_verifica`: data ostatniej weryfikacji,
- godziny otwarcia w osobnym pliku `dae_oh.json`,
- współrzędne w binarnym `dae_index.bin`, skala `coordScale=100000`,
- nakładka społeczności `dae_community.json`: `id`, `lat`, `lon`, status, data, atrybuty, np. `{"a":"public"}`.

### 5.4 Licencja i pochodzenie

- `fonte` w metadanych wymienia OSM oraz otwarte rejestry m.in. Wenecji, Singapuru, Hongkongu, Tajwanu, Francji, Hiszpanii i Włoch.
- Dane defibrylatorów: OSM, ODbL.
- Regulamin z 11 sierpnia 2026 r. mówi wprost: dane pochodzą z OSM i OpenAEDMap, są rozpowszechniane na licencji ODbL, ale masowe wyciąganie bazy w celu odsprzedaży lub budowy konkurencyjnej usługi jest zabronione.
- Prawo włoskie.

### 5.5 Ocena

**Wysoka technicznie, średnia prawnie.** Publiczny, dobrze zorganizowany eksport, ale regulamin ogranicza masowe wykorzystanie skompilowanej bazy. Bezpieczna ścieżka to użycie danych OSM/OpenAEDMap, na których SOS DAE bazuje, albo uzyskanie zgody.

### 5.6 Mapowanie

| Pole źródłowe | Pole wspólne |
| --- | --- |
| `id` (`node/...`) | `source_record_id` |
| `nome` | `name` |
| `posizione.pl` / `posizione.default` | `entrance_description` |
| `ente` | `operator_name` |
| `telefono` | `phone` |
| `piano` | `level` |
| `foto` | `photo_url` |
| `ultima_verifica` | `last_verified_at` |
| `dae_oh.json` (indeks shardu) | `opening_hours`, `is_24_7` |
| `dae_index.bin` | `lat`, `lon` |
| `dae_community.json` `a` | `access_type` |
| `dae_community.json` status | `status` |

## 6. InfoRatunek

### 6.1 Identyfikacja

- Strona: https://inforatunek.pl/
- Mapa AED: https://inforatunek.pl/znajdz-pomoc/aed
- Aplikacje: iOS i Android, w opisie: karta ratunkowa, alarm SOS, mapy AED, SOR i schronów.
- Operator: portal informacyjny InfoRatunek.

### 6.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://inforatunek.pl/` | 200, `text/html`, 34 734 B |
| `GET https://inforatunek.pl/znajdz-pomoc/aed` | 200, `text/html`, 6 977 B |
| `GET https://inforatunek.pl/api/aed` | 200, `application/json`, 4 145 B, 16 rekordów |
| `GET https://inforatunek.pl/api/aed?lat=52.23&lon=21.01&radius=10` | 200, ten sam zestaw, parametry ignorowane |
| `GET https://inforatunek.pl/data/aed.geojson` | 404 |
| `GET https://inforatunek.pl/data/aed.geojson.gz` | 200, `application/gzip`, 1 040 308 B, po dekompresji 11 409 127 B |
| `GET https://inforatunek.pl/regulamin` | 404 |
| `GET https://inforatunek.pl/polityka-prywatnosci` | 404 |
| `GET https://inforatunek.pl/terms` | 404 |
| `GET https://inforatunek.pl/privacy` | 404 |

Własny endpoint `/api/aed` zwraca 16 rekordów, wszystkie z okolic Białegostoku. Pola:

```json
{
  "id": "2fe17f02-e04a-468d-ad1f-d5a7cc89c30d",
  "name": "Armii Krajowej 7 przy wejściu do Spółdzielni",
  "address": "Armii Krajowej 7 przy wejściu do Spółdzielni",
  "lat": 53.12864,
  "lng": 23.09538,
  "availability": "",
  "indoor": true,
  "location_pl": "Armii Krajowej 7 przy wejściu do Spółdzielni"
}
```

Zewnętrzny plik `aed.geojson.gz` to warstwa OSM:

- 16 214 obiektów,
- bounding box Polski: 14.1441255, 49.1558231, 24.0370249, 54.8349221,
- klucze: `@osm_type`, `@osm_id`, `@osm_version`, `emergency`, `access`, `indoor`, `defibrillator:location`, `opening_hours`, `operator`, `check_date`, `phone`, `level`, `manufacturer`, `model`, `image`, `image:license`, `source`, `fixme`, `description`, `name`.

### 6.3 Licencja i pochodzenie

- Warstwa `aed.geojson.gz`: OSM, ODbL, atrybucja "© OpenStreetMap contributors".
- Własne 16 rekordów: brak widocznego regulaminu, polityki prywatności i licencji danych. Wszystkie testowane ścieżki prawnicze zwracają 404.
- Strona nie eksponuje wyraźnej atrybucji OSM w widocznym tekście, mimo że dane są z OSM. To ryzyko compliance przy ponownym użyciu.

### 6.4 Ocena

**Wysoka dla warstwy OSM, średnia dla danych własnych.** Duży snapshot OSM (16 214 punktów) jest użyteczny, ale jest starszy niż obecny eksport OpenAEDMap (18 298 punktów), więc do importu lepiej wybrać OpenAEDMap. Własna baza jest mała i bez ram prawnych.

### 6.5 Mapowanie

Dla `/api/aed`:

| Pole źródłowe | Pole wspólne |
| --- | --- |
| `id` (UUID) | `source_record_id` |
| `name` | `name` |
| `address` | `address_text` lub `entrance_description` |
| `lat`, `lng` | `lat`, `lon` |
| `availability` | `opening_hours` lub `raw.availability` |
| `indoor` | `indoor` |
| `location_pl` | `entrance_description` |

Dla `aed.geojson.gz`: mapowanie jak OSM/OpenAEDMap, z `source_record_id` = `@osm_type + "/" + @osm_id`.

## 7. Ratuj z Sercem

### 7.1 Identyfikacja

- Strona: https://www.ratujzsercem.pl/
- Mapa: https://www.ratujzsercem.pl/Map.aspx
- Operator: 2KMM Sp. z o.o., Katowice.
- Technologia: ASP.NET / DotNetNuke, Google Maps JavaScript API.

### 7.2 Dostęp maszynowy i testy HTTP

Mapa korzysta z nieudokumentowanego, ale publicznego endpointu `DBProxy.aspx`.

| Test | Wynik |
| --- | --- |
| `GET https://www.ratujzsercem.pl/` | 200, `text/html`, 29 217 B |
| `GET https://www.ratujzsercem.pl/Map.aspx` | 200, `text/html`, 25 098 B |
| `GET https://www.ratujzsercem.pl/DBProxy.aspx?method=GetPoints&sw=50.20:18.95&ne=50.30:19.10` | 200, `application/json`, 7 829 B, 112 punktów |
| `GET https://www.ratujzsercem.pl/DBProxy.aspx?method=GetPoints&sw=49.0:14.0&ne=55.0:24.5` | 200, `application/json`, 222 295 B, 3 149 punktów |
| `GET https://www.ratujzsercem.pl/DBProxy.aspx?method=GetPointInfo&id=168` | 200, `text/html`, 1 301 B |
| `GET https://www.ratujzsercem.pl/DBProxy.aspx?method=GetPointInfo&id=205` | 200, `text/html` |

Lista punktów ma postać:

```json
{"Id":168,"IconId":0,"Type":16,"Lat":50.280875,"Lng":19.0168228}
```

Szczegóły punktu są zwracane jako HTML, nie JSON. Przykład dla `id=168`:

- nazwa: `BOMBADIER TRANSPORTATION (ZWUS) POLSKA Sp. z o.o`,
- miasto i ulica: `Katowice, MODELARSKA 12`,
- telefon: `(32) 730 51 06`,
- dokładne miejsce: `na ścianie po prawej stronie od wejścia głównego w okolicy recepcji`,
- dostępność: `Całodobowo`,
- zdjęcia: lista URL-i.

Pole `Type` to bitmaska. Z kodu `map.js`:

| Bit | Znaczenie |
| --- | --- |
| 16 | dostęp całodobowy |
| 8 | dostęp w godzinach |
| 4 | personel / pracownik |
| 2 | AED mobilne |
| 1 | niedostępne |

Przykładowe wartości w danych: 16 (1085 punktów), 12 (689), 4 (273), 18 (191), 8 (168), 20 (165), 22 (122), 14 (121). Kombinacje należy rozkładać na `access_type`, `is_24_7`, `raw.mobile`, `opening_hours`.

### 7.3 Pola widoczne

- nazwa obiektu,
- miasto,
- ulica i numer,
- telefon do obsługi AED,
- dokładne miejsce,
- dostępność,
- zdjęcia,
- typ dostępu z bitmaski,
- współrzędne.

### 7.4 Licencja i pochodzenie

- Brak otwartej licencji.
- Zastrzeżenie prawne: dane pochodzą z wielu źródeł, autorzy nie odpowiadają za kompletność, a korzystanie z treści jest bezpłatne, ale wymaga zgody autorów i zaznaczenia źródła.
- Pochodzenie: własna baza i zgłoszenia użytkowników, geokodowanie Google Maps. Brak deklaracji OSM.

### 7.5 Ocena

**Średnia.** Publiczny endpoint działa i zwraca pełny zbiór krajowy, ale jest nieudokumentowany, bez wersjonowania, bez licencji i bez gwarancji stabilności. Do produkcji wymagana pisemna zgoda i ustalenie warunków użycia.

### 7.6 Mapowanie

| Pole źródłowe | Pole wspólne |
| --- | --- |
| `Id` | `source_record_id` |
| `Lat`, `Lng` | `lat`, `lon` |
| `Type & 16` | `is_24_7` |
| `Type & 8` | `opening_hours` lub `raw.availability` |
| `Type & 4` | `raw.staffed` |
| `Type & 2` | `raw.mobile` |
| `Type & 1` | `status=unknown` lub `access_type=private` |
| nazwa z HTML | `name` |
| `miasto, ulica` | `city`, `street` |
| telefon | `phone` |
| dokładne miejsce | `entrance_description` |
| dostępność | `opening_hours` lub `is_24_7` |
| zdjęcia | `photo_url` |

## 8. Fundacja Ratuj Życie

### 8.1 Identyfikacja

- Strona: https://fundacjaratujzycie.eu/
- Mapa: https://fundacjaratujzycie.eu/mapa/
- Zgłoś AED: https://fundacjaratujzycie.eu/zglos-aed/
- Aplikacja: "Staying Alive", link do App Store i Google Play.
- Operator: Fundacja Ratuj Życie, Kraków, ul. św. Sebastiana 11A/7.

### 8.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://fundacjaratujzycie.eu/` | 200, `text/html`, 78 610 B |
| `GET https://fundacjaratujzycie.eu/mapa/` | 200, `text/html`, 75 038 B |
| `GET https://fundacjaratujzycie.eu/zglos-aed/` | 200, `text/html`, 38 838 B |
| `GET https://fundacjaratujzycie.eu/wp-json/wp/v2/types` | 200, `application/json` |
| `GET https://fundacjaratujzycie.eu/aplikacja/` | 200, `text/html`, 36 638 B |

Strona mapy ładuje Google Maps i `gmaps.js`, ale funkcja `initAddresses()` jest pusta. W badanym HTML nie ma tablicy markerów ani wywołań `codeAddress(...)`. Oznacza to, że publiczna mapa nie prezentuje obecnie żadnych rekordów AED. Nie ma publicznego API ani eksportu.

### 8.3 Pola formularza zgłoszenia

Formularz `Contact Form 7` zbiera:

- kraj,
- miasto,
- kod pocztowy,
- ulica,
- numer budynku,
- numer lokalu,
- nazwa firmy lub miejsca,
- opis lokalizacji (piętro, budynek, punkt charakterystyczny, wewnątrz/z zewnątrz, recepcja),
- godziny dostępności,
- telefon kontaktowy,
- koordynaty GPS,
- kategoria: publiczne, mobilne, firmowe,
- zdjęcie JPG/JPEG do 1 MB,
- zgody RODO i newsletter.

### 8.4 Licencja i pochodzenie

- Stopka: "Wszelkie prawa zastrzeżone".
- Brak otwartej licencji na dane.
- Dane pochodzą ze zgłoszeń użytkowników i wolontariuszy Fundacji, a następnie są wykorzystywane w aplikacji "Staying Alive".
- Brak deklaracji OSM.

### 8.5 Ocena

**Niska.** Brak API, brak eksportu, publiczna mapa bez danych. Wartościowe są tylko pola formularza, które pokazują oczekiwany zakres danych. Ewentualna integracja wyłącznie przez kontakt z Fundacją.

### 8.6 Mapowanie

Formularz można mapować następująco:

| Pole formularza | Pole wspólne |
| --- | --- |
| kraj | `country_code` |
| miasto | `city` |
| kod pocztowy | `postcode` |
| ulica | `street` |
| numer budynku | `house_number` |
| numer lokalu | `raw.unit` |
| nazwa firmy/miejsca | `name` |
| opis lokalizacji | `entrance_description` |
| godziny dostępności | `opening_hours` |
| telefon | `phone` |
| koordynaty GPS | `lat`, `lon` |
| kategoria | `access_type`, `raw.mobile`, `raw.category` |
| zdjęcie | `photo_url` |

## 9. aedmapa.pl

### 9.1 Identyfikacja

- Strona: https://aedmapa.pl/
- Aplikacje: iOS `id1638495701`, Android `pl.enteam.aed_map`.
- Autor: Mateusz Woźniak.
- Technologia: Nuxt, hosting Netlify.

### 9.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://aedmapa.pl/` | 200, `text/html`, 56 085 B |
| `GET https://aedmapa.pl/_payload.json` | 200, `application/json`, 11 018 B |
| `GET https://aedmapa.pl/terms` | 301 do `/terms/`, następnie 200, 30 440 B |
| `GET https://aedmapa.pl/privacy` | 301, następnie 200 |

Własna aplikacja nie przechowuje danych AED. W bundle'u występuje tylko `https://openaedmap.org/api/v1/countries/names` oraz linki do OpenAEDMap i OSM. Nie ma własnego endpointu z defibrylatorami.

### 9.3 Pola widoczne

Aplikacja pokazuje:

- najbliższy AED,
- odległość,
- czas dojścia,
- trasę pieszą,
- lokalizację na mapie,
- możliwość dodania lub edycji punktu po zalogowaniu do OSM,
- zdjęcia (trafiają do OpenAEDMap na licencji CC0).

Pola danych są więc polami OSM/OpenAEDMap.

### 9.4 Licencja i pochodzenie

- Regulamin z 15 października 2026 r.
- Dane: OSM i OpenAEDMap, ODbL.
- Atrybucja: "© współtwórcy OpenStreetMap, ODbL".
- Edycja wymaga konta OSM.

### 9.5 Ocena

**Wysoka jako pochodna OSM, ale nie jest niezależnym źródłem.** Do integracji należy użyć OpenAEDMap/OSM, nie scrapować aedmapa.pl.

### 9.6 Mapowanie

Brak własnych pól. Mapowanie identyczne jak OSM/OpenAEDMap.

## 10. Ratujemy.com.pl

### 10.1 Identyfikacja

- Strona: https://ratujemy.com.pl/
- Mapa: https://ratujemy.com.pl/mapa-aed-polska/
- Osadzona mapa: https://ratujemy.com.pl/mapa-aed/
- Operator: Ratujemy.com.pl, szkolenia pierwszej pomocy.

### 10.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://ratujemy.com.pl/` | 200, `text/html`, 297 214 B |
| `GET https://ratujemy.com.pl/mapa-aed-polska/` | 200, `text/html`, 146 961 B |
| `GET https://ratujemy.com.pl/mapa-aed/` | 200, `text/html`, 30 469 B |
| `GET https://ratujemy.com.pl/polityka-prywatnosci/` | 200, `text/html`, 136 425 B |
| `GET https://ratujemy.com.pl/regulamin-strony/` | 200, `text/html`, 147 554 B |
| `POST https://overpass-api.de/api/interpreter` (test małego bbox) | timeout 60 s z tego środowiska |

Mapa jest statycznym HTML-em z Leaflet 1.9.4. W kodzie widoczne jest zapytanie:

```js
fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  body: 'data=' + encodeURIComponent(q)
})
```

Nie ma własnego API ani eksportu. Dane są pobierane bezpośrednio z Overpass API, czyli z OSM.

### 10.3 Pola widoczne

- nazwa,
- godziny otwarcia,
- informacja "wewnątrz budynku" / "na zewnątrz",
- operator,
- telefon,
- współrzędne,
- nawigacja.

### 10.4 Licencja i pochodzenie

- Dane: OSM, ODbL.
- Strona ma własny regulamin i politykę prywatności, ale nie roszczą sobie praw do danych OSM.
- Pochodzenie: OSM przez Overpass.

### 10.5 Ocena

**Średnia.** Brak własnego API, ale źródło jest w pełni otwarte i dostępne przez Overpass. Do produkcji lepiej korzystać z OSM bezpośrednio niż z tej strony.

### 10.6 Mapowanie

Mapowanie jak OSM. Pola UI (`godziny`, `indoor`, `operator`, `phone`) odpowiadają tagom `opening_hours`, `indoor`, `operator`, `phone`.

## 11. Pierwszy Ratownik / Reanimator

### 11.1 Identyfikacja

- Strona: https://pierwszyratownik.pl/
- Aplikacja: https://pierwszyratownik.pl/aplikacja/
- Android: `com.homersafe.pierwszyratownik`.
- Operator: Związek Ochotniczych Straży Pożarnych RP (ZOSP RP).
- Wykonawca: HomerSafe Sp. z o.o.
- "Reanimator" to wcześniejsza aplikacja HomerSafe, obecnie niedostępna w Google Play. Testy ID `com.homersafe.reanimator`, `pl.homersafe.reanimator` i wariantów zwróciły 404.

### 11.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://pierwszyratownik.pl/` | 200, `text/html`, 86 324 B |
| `GET https://pierwszyratownik.pl/aplikacja/` | 200, `text/html`, 67 387 B |
| `GET https://play.google.com/store/apps/details?id=com.homersafe.pierwszyratownik` | 200 |
| `GET https://pierwszyratownik.pl/api/` | 404, `text/html` |
| `GET https://1r.zosprp.pl/` | 200, `text/html` |
| `GET https://play.google.com/store/apps/details?id=com.homersafe.reanimator` | 404 |

Brak publicznego API i eksportu. Strona podaje 10 000+ zarejestrowanych AED, 27 000+ użytkowników i 6 500+ aktywnych ratowników. Aplikacja ma bazę AED i nawigację do najbliższego urządzenia. FAQ mówi, że dodawanie AED jest "aktualnie niedostępne".

### 11.3 Pola widoczne

- lokalizacja najbliższego AED,
- nawigacja do AED,
- odległość i czas,
- lokalizacja zdarzenia,
- dane ratowników,
- zgłoszenia zdarzeń.

Brak publicznego opisu pól rekordu AED.

### 11.4 Licencja i pochodzenie

- Regulamin z 4 lutego 2026 r. Właściciel: ZOSP RP. Operator: HomerSafe.
- Brak otwartej licencji danych.
- Strona mówi o "ogólnopolskiej otwartej bazie", ale nie definiuje licencji ani API.
- Pochodzenie: własna baza ZOSP RP i zgłoszenia użytkowników. Brak deklaracji OSM.

### 11.5 Ocena

**Średnia/Niska.** Duży zbiór deklarowany, ale zamknięty, bez API, bez eksportu i bez licencji. Do integracji wyłącznie po porozumieniu z ZOSP RP.

### 11.6 Mapowanie

Brak dostępnych pól do mapowania. Znane są tylko pojęcia: lokalizacja AED, nawigacja, odległość. Nie ma publicznego schematu rekordu.

## 12. Staying Alive

### 12.1 Identyfikacja

- Strona: https://stayingalive.org/
- Aplikacja: Android `com.mobilehealth.cardiac`, iOS przez link `https://onelink.to/stayingalive`.
- Operator: Association Staying Alive, Paryż, Francja.
- Aplikacja promowana w Polsce przez Fundację Ratuj Życie.

### 12.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://stayingalive.org/` | 200, `text/html`, 617 769 B |
| `HEAD https://onelink.to/stayingalive` | 307 do `https://stayingalive.org/` |
| `GET https://stayingalive.org/api/` | 404 |
| `GET https://api.stayingalive.org/` | błąd DNS, host nie istnieje |
| `GET https://stayingalive.org/wp-json/` | 200, `application/json`, 341 181 B |
| `GET https://stayingalive.org/mentions-legales/` | 200, `text/html` |

Namespaces WordPressa nie zawierają endpointu AED (`wp/v2`, `listeo/v1`, `contact-form-7/v1` itd.). Publiczne API AED nie istnieje. Aplikacja ma własną bazę, niedostępną publicznie.

### 12.3 Pola widoczne

Z opisu aplikacji:

- lokalizacja AED,
- odległość,
- trasa,
- dodawanie, edycja i zgłaszanie defibrylatorów,
- baza przekazywana bezpłatnie służbom ratowniczym,
- "największa baza AED na świecie" (deklaracja producenta).

Brak publicznego schematu pól.

### 12.4 Licencja i pochodzenie

- Wszelkie prawa zastrzeżone. Strona zastrzega, że reprodukcja, adaptacja i wykorzystanie wymagają pisemnej zgody.
- Dane: własna baza społecznościowa i partnerska, nie OSM.
- Brak licencji otwartej.

### 12.5 Ocena

**Niska.** Brak API, brak eksportu, zamknięta licencja. Wartościowe jako partner, nie jako źródło maszynowe.

### 12.6 Mapowanie

Brak dostępnych pól do mapowania. Znane pojęcia: lokalizacja, odległość, trasa, dostępność.

## 13. Ratunek

### 13.1 Identyfikacja

- Strona: https://www.ratunek.eu/
- Android: `com.pagasolutions.emergencycall_pl`.
- Operator aplikacji: Polkomtel Sp. z o.o.
- Usługodawca w regulaminie: Paga Solutions Sp. z o.o., Kraków.

### 13.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://www.ratunek.eu/` | 200, `text/html` |
| `GET https://www.ratunek.eu/regulamin` | 301 do `/regulamin/` |
| `GET https://www.ratunek.eu/regulamin/` | 200, `text/html`, 93 162 B |
| `GET https://play.google.com/store/apps/details?id=com.pagasolutions.emergencycall_pl` | 200 |

Brak API AED. Aplikacja wysyła lokalizację dzwoniącego SMS-em do GOPR, TOPR, WOPR lub MOPR. Nie zawiera mapy defibrylatorów.

### 13.3 Pola

- lokalizacja urządzenia,
- numer telefonu,
- wybrana służba ratownicza,
- treść zgłoszenia.

Brak pól AED.

### 13.4 Licencja i pochodzenie

- Regulamin z 12 sierpnia 2014 r., obecne brzmienie z 28 czerwca 2021 r.
- Brak danych AED, brak licencji danych AED.
- Pochodzenie: dane lokalizacyjne użytkownika.

### 13.5 Ocena

**Brak.** To nie jest agregator AED.

### 13.6 Mapowanie

Brak mapowania. Nie uwzględniać w zbiorze AED.

## 14. mojeIKP

### 14.1 Identyfikacja

- Strona: https://pacjent.gov.pl/aplikacja-mojeikp
- Android: `pl.gov.cez.mojeikp`.
- iOS: `id1557426960`.
- Operator: Ministerstwo Zdrowia / Centrum e-Zdrowia.

### 14.2 Dostęp maszynowy i testy HTTP

| Test | Wynik |
| --- | --- |
| `GET https://pacjent.gov.pl/aplikacja-mojeikp` | 200, `text/html`, 1 705 353 B |
| `GET https://play.google.com/store/apps/details?id=pl.gov.cez.mojeikp` | 200 |
| `GET https://pacjent.gov.pl/polityka-prywatnosci-aplikacji-mojeikp` | 200, `text/html`, 85 357 B |
| `GET https://www.gov.pl/web/e-zdrowie/mojeikp` | 200, `text/html`, 39 967 B |

Brak publicznego API AED. Aplikacja ma funkcję "na ratunek" z poradnikiem pierwszej pomocy i telefony alarmowe, ale nie ma mapy AED.

### 14.3 Pola

- dane medyczne użytkownika,
- e-recepty, e-skierowania, EDM,
- poradnik pierwszej pomocy,
- telefony opieki zdrowotnej.

Brak pól AED.

### 14.4 Licencja i pochodzenie

- Polityka prywatności aplikacji mojeIKP.
- Brak danych AED, brak licencji danych AED.
- Pochodzenie: dane pacjenta i treści Ministerstwa Zdrowia.

### 14.5 Ocena

**Brak.** To nie jest agregator AED. W obecnych materiałach nie ma potwierdzenia produkcyjnej mapy AED. Gdyby taka funkcja powstała, najbardziej prawdopodobnym zapleczem byłaby warstwa OpenAEDMap/OSM, ale to wymaga odrębnego potwierdzenia u wydawcy.

### 14.6 Mapowanie

Brak mapowania. Nie uwzględniać w zbiorze AED.

## 15. Zestawienie zbiorcze

| Źródło | Dane AED | Dostęp maszynowy | Główne pola | Licencja | OSM | Ocena |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAEDMap | tak, 18 298 punktów w `PL.geojson` | GeoJSON kraju + MVT + node API | pełne tagi OSM | ODbL | tak | Wysoka |
| SOS DAE | tak, 549 681 globalnie | JSON + shardy gzip + binarny indeks | id, nazwa, lokalizacja, operator, telefon, piętro, zdjęcie, weryfikacja, godziny | ODbL, ale zakaz masowego wyciągania bazy | tak | Wysoka technicznie, średnia prawnie |
| InfoRatunek | tak, 16 własnych + 16 214 OSM (starszy snapshot niż 18 298 w OpenAEDMap) | `/api/aed`, `aed.geojson.gz` | id, nazwa, adres, lat/lng, dostępność, indoor, OSM tags | ODbL dla OSM, brak dla własnych | tak, warstwa zewnętrzna | Wysoka dla OSM, średnia dla własnych |
| Ratuj z Sercem | tak, 3 149 punktów | `DBProxy.aspx` JSON + HTML | id, lat/lng, typ, nazwa, miasto, ulica, telefon, miejsce, dostępność, zdjęcia | brak otwartej, zgoda autorów | nie | Średnia |
| Fundacja Ratuj Życie | brak publicznej mapy | brak API | formularz: kraj, miasto, kod, ulica, budynek, lokal, nazwa, opis, godziny, telefon, GPS, kategoria, zdjęcie | wszystkie prawa zastrzeżone | nie | Niska |
| aedmapa.pl | tak, pochodne OSM | brak własnego API | OSM/OpenAEDMap | ODbL | tak | Wysoka jako pochodna |
| Ratujemy.com.pl | tak, OSM przez Overpass | brak własnego API, Overpass w przeglądarce | nazwa, godziny, indoor, operator, telefon, współrzędne | ODbL | tak | Średnia |
| Pierwszy Ratownik / Reanimator | tak, 10 000+ deklarowane | brak API | lokalizacja AED, nawigacja, odległość | brak otwartej | nie | Średnia/Niska |
| Staying Alive | tak, własna baza | brak API | lokalizacja, odległość, trasa, dodawanie/edycja | wszystkie prawa zastrzeżone | nie | Niska |
| Ratunek | nie | brak API AED | lokalizacja dzwoniącego, służba, zgłoszenie | regulamin usługi | nie | Brak |
| mojeIKP | nie | brak API AED | dane medyczne, poradnik pierwszej pomocy | polityka prywatności | nie | Brak |

## 16. Dziennik testów HTTP

Wszystkie testy wykonano 2026-11-21, godziny UTC. Rozmiary podano dla treści odpowiedzi po ewentualnej dekompresji, jeśli nie zaznaczono inaczej.

| Czas | Źródło | Żądanie | Status | Content-Type | Rozmiar / wynik |
| --- | --- | --- | --- | --- | --- |
| 18:03:05 | SOS DAE | `GET https://sosdae.com/` | 307 | `text/plain` | redirect do `/en/` |
| 18:03:06 | Ratuj z Sercem | `GET https://www.ratujzsercem.pl/` | 200 | `text/html` | 29 217 B |
| 18:03:07 | aedmapa.pl | `GET https://aedmapa.pl/` | 200 | `text/html` | 56 085 B |
| 18:03:08 | Ratujemy | `GET https://www.ratujemy.com.pl/` | 301 | `text/html` | redirect do `https://ratujemy.com.pl/` |
| 18:03:08 | Ratujemy | `GET https://ratujemy.com.pl/` | 200 | `text/html` | 297 214 B |
| 18:04:24 | aedmapa.pl | `GET https://aedmapa.pl/_payload.json` | 200 | `application/json` | 11 018 B |
| 18:05:23 | Ratuj z Sercem | `GET /DBProxy.aspx?method=GetPoints&sw=50.20:18.95&ne=50.30:19.10` | 200 | `application/json` | 7 829 B, 112 punktów |
| 18:05:29 | Ratuj z Sercem | `GET /DBProxy.aspx?method=GetPointInfo&id=168` | 200 | `text/html` | 1 301 B |
| 18:06:22 | OpenAEDMap | `GET /api/v1/tile/14/8836/5536.mvt` | 200 | `application/vnd.mapbox-vector-tile` | 23 B, kafelek pusty |
| 18:06:22 | OpenAEDMap | `GET /api/v1/node/123` | 404 | `text/plain` | 18 B |
| 18:06:23 | OpenAEDMap | `GET /api/v1/countries/names` | 200 | `application/json` | 928 534 B |
| 18:07:22 | SOS DAE | `GET /data/v/2e81f4932d64/dae_meta.json` | 200 | `application/json` | 37 387 B |
| 18:07:23 | SOS DAE | `GET /data/v/2e81f4932d64/dae_oh.json` | 200 | `application/json` | 559 183 B |
| 18:07:23 | SOS DAE | `GET /data/v/2e81f4932d64/dae_index.bin` | 200 | `application/octet-stream` | 2 163 582 B |
| 18:07:22 | SOS DAE | `GET /data/dae_community.json` | 200 | `application/json` | 750 B, 9 rekordów |
| 18:07:30 | SOS DAE | `GET /data/v/2e81f4932d64/shards/0000.json.gz` | 200 | `application/gzip` | 30 142 B |
| 18:07:31 | SOS DAE | `GET /data/v/2e81f4932d64/shards/0498.json.gz` | 200 | `application/gzip` | 37 985 B |
| 18:07:31 | SOS DAE | `GET /data/v/2e81f4932d64/shards/0452.json.gz` | 200 | `application/gzip` | 32 974 B |
| 18:08:43 | OpenAEDMap | `GET /api/v1/node/5799469954` | 200 | `application/json` | 890 B |
| 18:08:44 | OpenAEDMap | `GET /api/v1/tile/14/9148/5394.mvt` | 200 | `application/vnd.mapbox-vector-tile` | 2 586 B, 106 obiektów |
| 18:12:22 | InfoRatunek | `GET https://inforatunek.pl/data/aed.geojson` | 404 | `text/html` | 0 B |
| 18:13:50 | InfoRatunek | `GET https://inforatunek.pl/api/aed` | 200 | `application/json` | 4 145 B, 16 rekordów |
| 18:13:50 | InfoRatunek | `GET https://inforatunek.pl/api/aed?lat=52.23&lon=21.01&radius=10` | 200 | `application/json` | 4 145 B, parametry ignorowane |
| 18:18:15 | InfoRatunek | `GET https://inforatunek.pl/data/aed.geojson.gz` | 200 | `application/gzip` | 1 040 308 B, po dekompresji 11 409 127 B |
| 18:18:21 | Staying Alive | `GET https://stayingalive.org/api/` | 404 | `text/html` | brak API |
| 18:18:21 | Staying Alive | `GET https://api.stayingalive.org/` | błąd DNS | brak | host nie istnieje |
| 18:18:21 | Pierwszy Ratownik | `GET https://pierwszyratownik.pl/api/` | 404 | `text/html` | brak API |
| 18:18:21 | Pierwszy Ratownik | `GET https://1r.zosprp.pl/` | 200 | `text/html` | panel lub strona programu |
| 18:18:22 | Ratunek | `GET https://www.ratunek.eu/` | 200 | `text/html` | strona usługi |
| 18:18:22 | Ratunek | `GET https://www.ratunek.eu/regulamin` | 301 | `text/html` | redirect do `/regulamin/` |
| 18:18:23 | Fundacja Ratuj Życie | `GET https://fundacjaratujzycie.eu/mapa/` | 200 | `text/html` | 75 038 B, brak markerów |
| 18:18:24 | Fundacja Ratuj Życie | `GET https://fundacjaratujzycie.eu/wp-json/wp/v2/types` | 200 | `application/json` | brak typu AED |
| 18:18:25 | Ratuj z Sercem | `GET /DBProxy.aspx?method=GetPoints&sw=49.0:14.0&ne=55.0:24.5` | 200 | `application/json` | 222 295 B, 3 149 punktów |
| 18:18:44 | OSM | `GET https://api.openstreetmap.org/api/0.6/node/13891134601.json` | 200 | `application/json` | 721 B |
| 18:18:45 | OpenAEDMap | `GET /api/v1/node/13891134601` | 200 | `application/json` | 672 B |
| 18:20:09 | OSM / Overpass | `POST https://overpass.kumi.systems/api/interpreter` i `https://overpass-api.de/api/interpreter` | timeout | brak | test małego bbox nie zakończył się w 35 s |
| 18:22:29 | OpenAEDMap | `GET /api/v1/countries/PL.geojson` | 200 | `application/geo+json` | 7 135 986 B, 18 298 obiektów |

Uwaga: nieudany test Overpass nie podważa pochodzenia danych Ratujemy.com.pl. Kod strony wprost wywołuje Overpass API, a dane OSM są dostępne przez inne kanały (np. OpenAEDMap i OSM API).

## 17. Rekomendacje integracyjne

1. **Warstwa podstawowa: OpenAEDMap/OSM.**
   - Pobrać krajowy `PL.geojson` (18 298 punktów) jako snapshot startowy, a następnie synchronizować MVT lub pojedyncze węzły przez API.
   - Deduplikować po `node/{id}`.
   - Zachować `version` i `check_date` do oceny świeżości.
   - Atrybucja: "© OpenStreetMap contributors", licencja ODbL.

2. **Warstwa porównawcza: InfoRatunek `aed.geojson.gz`.**
   - 16 214 punktów OSM w jednym pliku, wygodne do jednorazowego porównania.
   - Traktować jako snapshot OSM, nie jako niezależne źródło.
   - Nie używać ich własnych 16 rekordów bez zgody i bez ustalenia licencji.

3. **SOS DAE: tylko po uzgodnieniu.**
   - Dane są bogate (operator, telefon, piętro, godziny, zdjęcia), ale regulamin ogranicza masowe wyciąganie bazy.
   - Bezpieczniej odtworzyć te same pola z OSM/OpenAEDMap.
   - Jeśli potrzebny jest ich eksport, wystąpić o pisemną zgodę.

4. **Ratuj z Sercem: tylko po pisemnej zgodzie.**
   - Endpoint jest publiczny, ale nie ma licencji ani dokumentacji.
   - Dane są cenne, bo zawierają telefon i dokładny opis miejsca, których często nie ma w OSM.
   - Nie scrapować masowo bez umowy.

5. **Fundacja Ratuj Życie i Staying Alive: kontakt partnerski.**
   - Brak API i eksportu.
   - Formularz Fundacji pokazuje przydatny zakres pól, ale nie jest źródłem maszynowym.
   - Staying Alive ma własną bazę i nie udostępnia jej publicznie.

6. **Pierwszy Ratownik / Reanimator: kontakt partnerski.**
   - Deklarowane 10 000+ AED, ale brak API i licencji.
   - Zapytać ZOSP RP o możliwość udostępnienia bazy lub eksportu.

7. **Ratunek i mojeIKP: wyłączyć z zakresu AED.**
   - Nie zawierają mapy defibrylatorów.
   - Mogą być źródłem kontekstu dla pierwszej pomocy, ale nie dla rekordu AED.

## 18. Ograniczenia audytu

- Nie dekompilowano aplikacji mobilnych. Pola widoczne w aplikacjach opisano na podstawie sklepów, stron projektowych i publicznych interfejsów webowych.
- Część endpointów jest nieudokumentowana i może się zmienić bez zapowiedzi.
- Nie weryfikowano jakości merytorycznej każdego rekordu AED w terenie.
- Nie wykonano analizy prawnej regulaminów. To materiał badawczy, nie opinia prawna.
- Testy HTTP odzwierciedlają stan z 2026-11-21 i mogą nie być powtarzalne w przyszłości.
- Overpass API nie odpowiedział w założonym czasie z tego środowiska. Pochodzenie danych Ratujemy.com.pl potwierdzono przez analizę kodu strony, nie przez udany test Overpass.
