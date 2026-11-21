# Miejskie zbiory AED: inwentaryzacja źródeł i schematów

**Data badania:** 2026-11-21, godz. 18:00-19:30 UTC (19:00-20:30 czasu lokalnego, Europe/Warsaw)

**Zakres:** Warszawa, Wrocław, Słupsk, Włocławek, Gliwice (MSIP) oraz dodatkowo zweryfikowane gminy: Przemyśl, Krosno, Marki.

**Metoda:** bezpośrednie zapytania HTTP (`curl`) do portali i API, analiza plików pobranych z `api.dane.gov.pl`, analiza drzewa warstw MSIP Gliwice (`init.json`) oraz stron geoportali. Kody HTTP podano z dnia badania.

**Powiązane pliki:**

- [`przemysl-open-data.md`](./przemysl-open-data.md) - pełne badanie API i schematu Przemyśla.
- [`docs/aed-data-sources-common-schema.md`](../../aed-data-sources-common-schema.md) - model kanoniczny, słowniki i schemat SQLite.

> **Ważne:** „NOT VERIFIED” oznacza, że w dostępnych, publicznych źródłach nie udało się potwierdzić zbioru AED o wymaganych parametrach. To nie dowodzi, że dane nie istnieją w systemach wewnętrznych urzędu.

> **Stan repozytorium:** wspólny schemat AED nie jest jeszcze zaimplementowany. `src/db/schema.ts` zawiera wyłącznie tabelę `todos`. Ten dokument jest zbiorem dowodów i propozycją mapowania.

---

## 1. Podsumowanie tabelaryczne

### 1.1. Zbiory maszynowe

| Gmina / źródło | Strona zbioru | Plik / API | HTTP | Format | EPSG | Licencja | Aktualizacja | Auth |
|---|---|---|---|---|---|---|---|---|
| **Warszawa** | https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed | `POST https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow` | 403 bez tokena, 200 dla plików dokumentacji | JSON | prawdop. EPSG:4326 (lon/lat), brak deklaracji | CC BY 4.0 | codziennie (źródło CKAN) | **token API** |
| **Przemyśl** | https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn | https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.csv (także `.geojson`, `.json`, `.gml`) | 200 | CSV (`;`), GeoJSON, JSON, GML/XML | EPSG:4326 (GeoJSON) | CC0 1.0 w dane.gov.pl, CC BY 4.0 w portalu lokalnym | deklarowane codziennie, plik z 2024-11-06 | brak |
| **Krosno** | https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno | https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv | 200 | CSV (`,`), UTF-8 | EPSG:4326 (wnioskowane z lon/lat) | CC0 1.0 | „Nie dotyczy”, plik z 2024-02-19 | brak |
| **Marki** | https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miasta-markI | https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.csv (także `.xlsx`) | 200 | CSV (`,`), UTF-8/CRLF, wadliwe cytowanie | EPSG:4326 (wnioskowane) | CC BY 4.0 | jednorazowe, plik z 2025-07-10 | brak |

### 1.2. Miasta bez maszynowego zbioru AED

| Miasto | Co jest dostępne | Format | Licencja | Współrzędne | API |
|---|---|---|---|---|---|
| **Słupsk** | strona HTML z tabelą 25 lokalizacji | HTML | NOT VERIFIED | brak | brak |
| **Wrocław** | artykuł HTML z listą 38 stacji Helpbox 365 przy paczkomatach InPost oraz portal open-data i geoportal bez potwierdzonej warstwy AED | HTML, GIS | brak licencji na treść artykułu | brak w artykule | brak |
| **Włocławek** | geoportal z WMS/WFS tylko dla EGiB, GESUT, BDOT500, BDSOG i RCN, bez AED | WMS/WFS, HTML | NOT VERIFIED | brak warstwy AED | brak |
| **Gliwice** | artykuł HTML z tabelą 95 lokalizacji oraz MSIP z konfiguracją `init.json`, bez potwierdzonej warstwy AED w profilu 1000 | HTML, WMS/JSON | NOT VERIFIED | brak w artykule, EPSG:2177 w UI MSIP | brak publicznego API AED |

### 1.3. Wniosek

Na dzień 2026-11-21 w dane.gov.pl są tylko **cztery** zbiory AED: Warszawa, Przemyśl, Krosno i Marki. Tylko Przemyśl ma w pełni otwarte, udokumentowane API bez klucza. Warszawa ma najlepszy schemat opisowy, ale wymaga tokenu. Krosno i Marki to minimalne zbiory „punkt + adres”. Słupsk, Wrocław, Włocławek i Gliwice publikują dane wyłącznie w HTML lub w mapie, bez maszynowego zbioru.

---

## 2. Metodyka i powtarzalność

Sprawdzono następujące kanały:

1. API portalu dane.gov.pl: `GET https://api.dane.gov.pl/1.4/datasets?q=defibrylator&per_page=50`.
2. API portalu dane.gov.pl: `GET https://api.dane.gov.pl/1.4/datasets?q=defibrylatory&per_page=50`.
3. API portalu dane.gov.pl: `GET https://api.dane.gov.pl/1.4/datasets?q=AED&per_page=20`.
4. API instytucji Gmina Wrocław: `GET https://api.dane.gov.pl/1.4/institutions/46/datasets`.
5. Katalog otwartych danych Wrocławia: `https://open-data.cui.wroclaw.pl/hdb/katalog_f/`.
6. Portal otwartych danych Gliwic: `https://open-data-gliwice.hub.arcgis.com/api/search/v1/collections/all/items?q=defibrylator`.
7. Konfiguracja MSIP Gliwice: `https://geoportal.gliwice.eu/app-gpt-configurator/rest/service/init.json?profile=1000&deviceType=desktop&version=7.0.0`.
8. Strony i geoportale miast: `wroclaw.pl`, `slupsk.pl`, `wloclawek.eu`, `geoportal.wloclawek.eu`, `geoportal.gliwice.eu`, `msip.gliwice.eu`.
9. Pliki źródłowe i odpowiedzi API pobrane do analizy pól.

Powtórzenie badania:

```bash
curl -s 'https://api.dane.gov.pl/1.4/datasets?q=defibrylatory&per_page=50' | jq '.data[].attributes | {title,formats,license_name,update_frequency}'
curl -s 'https://open-data.cui.wroclaw.pl/hdb/katalog_f/' | grep -oi 'defibryl\|AED' | sort | uniq -c
curl -s 'https://open-data-gliwice.hub.arcgis.com/api/search/v1/collections/all/items?q=defibrylator&limit=50' | jq '.numberMatched'
curl -s 'https://geoportal.gliwice.eu/app-gpt-configurator/rest/service/init.json?profile=1000&deviceType=desktop&version=7.0.0' | grep -oi 'AED\|defib' | sort | uniq -c
```

Wynik kontrolny z 2026-11-21:

- dane.gov.pl: 4 zbiory AED, bez Wrocławia, Słupska, Włocławka i Gliwic.
- katalog Wrocławia `open-data.cui.wroclaw.pl`: 0 wystąpień `defibryl`, `AED`, `helpbox`, `paczkomat`, `inpost`.
- portal otwartych danych Gliwic: 0 wyników dla `defibrylator`, 0 dla `helpbox`, 5 niepowiązanych wyników dla `aed` (dopasowania tekstowe w innych zbiorach).
- MSIP Gliwice, profil 1000: 0 wystąpień `AED`, `defib`, `ratown`, `medycz` w `init.json`.

---

## 3. Warszawa

### 3.1. Identyfikacja i dostęp

- **Strona zbioru (dane.gov.pl):** https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed - HTTP **200**.
- **Strona katalogowa (Otwarte Dane Warszawy):** https://dane.um.warszawa.pl/pl/catalogue/7bc32ffc-c2ac-4d32-83c9-b6f7a0b38de8 - HTTP **200**.
- **API (POST):** `https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow`
  - bez nagłówka `Authorization` -> HTTP **403**, treść: `{"message":"Access denied: Nieautoryzowany: brak ważnego tokena lub API key"}`,
  - wymagany nagłówek: `Authorization: token_uzytkownika` (nazwa nagłówka według dokumentacji, wartość tokena trzeba uzyskać z UM),
  - opcjonalny parametr JSON: `{"defibrillator_id": "622"}`.
- **Pliki dokumentacji API (HTTP 200):**
  - `https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pa.json` - opis parametrów i pól,
  - `https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pw.json` - przykłady wywołań i odpowiedzi.
- **Format:** JSON (tablica obiektów), nie CSV/GeoJSON.
- **Licencja:** CC BY 4.0.
- **Aktualizacja:** w metadanych dane.gov.pl `update_frequency = null`, ale `source.type = ckan`, `source.title = "Otwarte dane Warszawy"`, `source.update_frequency = "codziennie"`. Metadata `modified = 2026-06-01T08:00:08Z`.
- **EPSG:** współrzędne w kolejności `[lon, lat]` (np. `21.0148..., 52.2086...`), co odpowiada EPSG:4326. Dokumentacja nie deklaruje układu wprost.

### 3.2. Dokładne nazwy pól

Obiekt odpowiedzi ma dwa korzenie: `geometry` i `properties`.

`geometry`:

- `type`
- `coordinates`

`properties`:

- `defibrillator_id`
- `device_access_description`
- `device_availability`
- `device_location`
- `device_manufacturer`
- `device_public_access`
- `location_building`
- `location_city`
- `location_description`
- `location_object_name`
- `location_postcode`
- `location_street`
- `attachment` (Base64 zdjęcia, według dokumentacji tylko w szczegółowym pobraniu)

### 3.3. Przykładowy rekord (skrócony, za dokumentacją API)

```json
{
  "geometry": { "coordinates": [[21.0148748892902, 52.2086170695684]], "type": "Point" },
  "properties": {
    "defibrillator_id": "622",
    "device_access_description": "Poniedziałek: godz. 8:00-18:00; Wtorek-Piątek: godz. 8:00-16:00",
    "device_availability": "Ograniczona",
    "device_location": "Wewnątrz budynku",
    "device_manufacturer": "Medtronic",
    "device_public_access": "Publiczny",
    "location_building": "25/27",
    "location_city": "Warszawa",
    "location_description": "Przy wejściu na półpiętrze.",
    "location_object_name": "Urząd Dzielnicy Mokotów m.st. Warszawy",
    "location_postcode": "02-517",
    "location_street": "Rakowiecka"
  }
}
```

### 3.4. Uwagi

- To najbardziej kompletny schemat miejski z badanych: ma identyfikator, adres, współrzędne, typ lokalizacji, dostępność, producenta i dostęp publiczny.
- Brak: statusu urządzenia, modelu (jest tylko producent), numeru seryjnego, dat instalacji i przeglądu, danych opiekuna i kontaktu.
- `device_availability` przyjmuje wartości opisowe (`Ograniczona`), a `device_access_description` zawiera godziny. Wymaga parsowania, nie można mapować `Ograniczona` na `false`.
- `attachment` może znacząco zwiększać rozmiar odpowiedzi. Pobierać tylko w razie potrzeby.
- W przykładzie `coordinates` jest tablicą zagnieżdżoną (`[[lon, lat]]`), a nie płaską (`[lon, lat]`). Trzeba obsłużyć oba warianty.

---

## 4. Przemyśl

### 4.1. Identyfikacja i dostęp

- **Strona zbioru:** https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn - HTTP **200**.
- **Portal lokalny:** https://dane.przemysl.eu/zbiory-danych/defibrylatory-aed-na-terenie-miasta-przemysla/
- **API lokalne:** `https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data` - publiczne, bez klucza, limit 120 żądań/min.
- **Pliki bezpośrednie (HTTP 200):**
  - CSV: https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.csv
  - GeoJSON: https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson
  - JSON: https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.json
  - GML/XML: https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.gml
- **Format:** CSV rozdzielany średnikiem (`;`), UTF-8 z BOM. GeoJSON `FeatureCollection` z 21 obiektami. GML.
- **Licencja:** CC0 1.0 w dane.gov.pl, CC BY 4.0 w portalu lokalnym. To niespójność do rozstrzygnięcia przez wydawcę.
- **Aktualizacja:** deklarowana `Codziennie`, ale `data_date` pliku to **2024-11-06**. Portal lokalny deklaruje „Na bieżąco (ciągła)”, a plik źródłowy ma znacznik 2024-11-05.
- **EPSG:** GeoJSON bez członu `crs`, współrzędne `[lon, lat]` -> **EPSG:4326** (RFC 7946).
- **Auth:** brak.

### 4.2. Dokładne nazwy pól

CSV (nagłówek):

`id`, `name`, `description`, `category`, `city`, `street`, `home_number`, `postcode`, `phone`, `email`, `www`, `youtube_url`, `panorama_url`, `geometry`, `gallery`, `attachments`, `links`

GeoJSON `properties`: `id`, `name`, `description`, `category`, `city`, `street`, `home_number`, `postcode`, `phone`, `email`, `www`, `youtube_url`, `panorama_url`, `geometry`, `gallery`, `attachments`, `links` (te same co CSV).

Pole `geometry` w CSV to **string JSON** o nietypowej strukturze:

```json
{"type":"Point","coordinates":{"lat":"49.7812096","long":"22.7750936"}}
```

W GeoJSON geometria jest poprawna: `{"type":"Point","coordinates":[22.7750936,49.7812096]}`.

### 4.3. Przykładowy rekord (skrócony)

```csv
id;name;description;category;city;street;home_number;postcode;phone;email;www;...
744;Defibrylator (AED 9485) w ADM Centrum;Defibrylator AED (...) ...;Defibrylatory AED;Przemyśl;Juliusza Słowackiego;12;37-700;;;;...
```

```json
{
  "id": 744,
  "name": "Defibrylator (AED 9485) w ADM Centrum",
  "category": "Defibrylatory AED",
  "city": "Przemyśl",
  "street": "Juliusza Słowackiego",
  "home_number": "12",
  "postcode": "37-700",
  "geometry": {"type": "Point", "coordinates": [22.7750936, 49.7812096]}
}
```

### 4.4. Uwagi

- `name` zawiera numer urządzenia (np. `AED 9485`), ale nie ma osobnego pola modelu ani producenta.
- `description` jest długim tekstem marketingowo-informacyjnym, powtarzanym w każdym rekordzie. Nie nadaje się do klasyfikacji bez NLP.
- `category` ma jedną wartość `Defibrylatory AED`.
- Brak pól: typ lokalizacji (wewnątrz/zewnątrz), dostępność, status, daty przeglądów, opiekun.
- `gallery`, `attachments`, `links` to struktury tekstowe przypominające serializowane tablice, nie JSON.
- Występuje duplikat numeru AED 7639 i niespójny format numeru w `name`.
- Eksport CSV z API lokalnego jest technicznie wadliwy: zwraca JSON string zamiast czystego CSV. Do integracji lepiej używać JSON lub GeoJSON.
- Szczegółowe badanie: [`przemysl-open-data.md`](./przemysl-open-data.md).

---

## 5. Krosno

### 5.1. Identyfikacja i dostęp

- **Strona zbioru:** https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno - HTTP **200**.
- **Plik:** https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv - HTTP **200**, 2 787 B.
- **Format:** CSV, przecinek, UTF-8.
- **Licencja:** CC0 1.0.
- **Aktualizacja:** `Nie dotyczy`, `data_date = 2024-02-19`.
- **EPSG:** brak deklaracji, kolumny to długość i szerokość geograficzna w stopniach dziesiętnych -> praktycznie **EPSG:4326**.
- **Auth:** brak.

### 5.2. Dokładne nazwy pól

`Długość geograficzna`, `Szerokość geograficzna`, ` Nazwa`, ` Lokalizacja`, ` Adres`, ` Numer Id`

> Uwaga: nazwy ` Nazwa`, ` Lokalizacja`, ` Adres`, ` Numer Id` mają **wiodącą spację** w nagłówku. To częsty błąd integracyjny.

### 5.3. Przykładowy rekord (skrócony)

```csv
Długość geograficzna,Szerokość geograficzna, Nazwa, Lokalizacja, Adres, Numer Id
21.72034402175176,49.718809346153336,"Defibrylator","Zespół  Krytych Pływalni","ul. Jasna, 38-400 Krosno","1"
```

### 5.4. Uwagi

- 21 rekordów (22 linie z nagłówkiem).
- Brak: dostępności, typu lokalizacji, kontaktu, statusu, modelu.
- `Nazwa` zawsze `Defibrylator`. Faktyczna nazwa obiektu jest w `Lokalizacja`.
- Adres łączony (ulica + kod + miasto) w jednym polu.
- Licencja CC0 jest najłagodniejsza z całego zestawu.

---

## 6. Marki

### 6.1. Identyfikacja i dostęp

- **Strona zbioru:** https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miasta-markI - HTTP **200**.
- **Pliki (HTTP 200):**
  - CSV: https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.csv
  - XLSX: https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.xlsx
- **Format:** CSV, przecinek, UTF-8, CRLF.
- **Licencja:** CC BY 4.0.
- **Aktualizacja:** `Jednorazowe udostępnienie`, `data_date = 2025-07-10`.
- **EPSG:** brak deklaracji. Wartości `52.32..., 21.10...` -> **EPSG:4326** (szerokość, długość).
- **Auth:** brak.

### 6.2. Dokładne nazwy pól (zamierzone)

`Długość geograficzna`, `Szerokość geograficzna`, `Nazwa`, `Lokalizacja`, `Adres`, `Numer Id`

### 6.3. Przykładowy rekord (skrócony)

Plik jest **wadliwie zacytowany**: cały nagłówek i cały wiersz są ujęte w jeden cudzysłów, a wewnętrzne cudzysłowy są podwojone. Standardowy parser CSV widzi **jedną kolumnę**:

```text
"Długość geograficzna,Szerokość geograficzna, Nazwa, Lokalizacja, Adres, Numer Id"
"52.326697, 21.107557,""Defibrylator"",""Urząd Miasta Marki "",""Al.. Piłsudskiego 95, 05-270 Marki"",""1"""
```

Po ręcznym naprawieniu cytowania rekord ma postać:

```csv
52.326697, 21.107557, "Defibrylator", "Urząd Miasta Marki ", "Al.. Piłsudskiego 95, 05-270 Marki", "1"
```

### 6.4. Uwagi

- 8 rekordów (9 linii).
- Kolejność współrzędnych w danych to **szerokość, długość**, mimo nagłówka `Długość geograficzna, Szerokość geograficzna`. To niespójność względem Krosna i większości źródeł.
- Rekord `Numer Id = 7` ma współrzędne Krosna (`21.720344, 49.718809`), a adres Marki. To oczywisty błąd kopiowania.
- Literówka w adresie: `Al..` zamiast `Al.`.
- Brak pól: dostępność, typ lokalizacji, kontakt, status.

---

## 7. Słupsk

### 7.1. Identyfikacja i dostęp

- **Strona:** https://www.slupsk.pl/mieszkaniec/zdrowie-i-sprawy-spoleczne/defibrylatory-aed - HTTP **200**.
- **Format:** **wyłącznie HTML** z tabelą. Brak linków do CSV, JSON, GeoJSON, XLSX, WMS/WFS.
- **API:** brak.
- **Licencja:** NOT VERIFIED (regulamin serwisu, brak wyraźnej licencji otwartej).
- **Aktualizacja:** brak deklaracji, wygląda na ręcznie utrzymywaną stronę.
- **EPSG:** nie dotyczy, brak współrzędnych.
- **Auth:** brak.

### 7.2. Dokładne nazwy pól (nagłówki tabeli HTML)

`Lp`, `Nazwa instytucji`, `Adres`, `Lokalizacja AED`, `Dostępność`

### 7.3. Przykładowy rekord (skrócony)

| Lp | Nazwa instytucji | Adres | Lokalizacja AED | Dostępność |
|---|---|---|---|---|
| 1 | Park Wodny „Trzy Fale” | ul. Grunwaldzka 8A, 76-200 Słupsk | Wewnątrz budynku | AED znajduje się przy basenie sportowym, dostępne w godzinach 7-22 w dni funkcjonowania obiektu |

### 7.4. Uwagi

- 25 rekordów.
- `Adres` skleja ulicę, numer i kod pocztowy bez separatora (np. `8A76-200`), co utrudnia parsowanie.
- `Dostępność` to długi opis słowny, nie ustrukturyzowane godziny.
- Brak współrzędnych, identyfikatora urządzenia, modelu, statusu, dat przeglądów.
- **Nie jest to źródło maszynowe.** Do celów projektu wymaga scrapingu i geokodowania adresów.
- `Lp` nie jest stabilnym identyfikatorem. Zmiana kolejności wierszy zmienia ID.

---

## 8. Wrocław

### 8.1. Co sprawdzono

- **Oficjalny portal otwartych danych:** https://www.wroclaw.pl/open-data
  - `curl` -> HTTP **403** (strona blokady FortiADC),
  - przeglądarka -> pusta strona (`document.body.innerText` pusty), prawdopodobnie WAF/bot protection.
- **Katalog CUI:** https://open-data.cui.wroclaw.pl/hdb/katalog_f/ - HTTP **200**, 0 wystąpień `defibryl`, `AED`, `helpbox`, `paczkomat`, `inpost`.
- **Geoportal miejski:** https://geoportal.wroclaw.pl/ - HTTP **200**.
- **Instytucja „Gmina Wrocław” w API dane.gov.pl:** https://api.dane.gov.pl/1.4/institutions/46/datasets - 3 zbiory, **żaden nie dotyczy AED** (transport, wydarzenia, DGA).
- **Przeszukanie 40 publicznych stron mapowych** geoportalu (`/mapy/...`) pod kątem `defib`, `AED` - **0 trafień**.
- **Artykuł miejski z listą AED:** https://www.wroclaw.pl/dla-mieszkanca/aed-we-wroclawiu-paczkomaty-inpost-adresy-lista - HTTP **200**, data publikacji 2025-11-21.

### 8.2. Co zawiera artykuł

Lista 38 stacji Helpbox 365 przy paczkomatach InPost, dostępnych całodobowo, wyposażonych w AED i apteczkę. Format pozycji:

```text
WRO14BAPP - Dokerska 2
WRO08BAPP - Lotnicza 139
WRO22BAPP - Piechoty 12
WRO10BAPP - Miodowa 107
```

Dostępne informacje:

| Informacja | Przykład | Mapowanie |
|---|---|---|
| Kod stacji | `WRO14BAPP` | `source_record_id` |
| Ulica i numer | `Dokerska 2` | `street`, `house_number` |
| Miasto | `Wrocław` (stałe) | `city` |
| Typ lokalizacji | stacja Helpbox 365 przy paczkomacie InPost | `facility_type = parcel_locker`, `indoor = false` |
| Dostępność | całodobowo | `is_24_7 = true` |
| Wyposażenie | AED i apteczka | `description` |

### 8.3. Przykładowy rekord

```text
source_record_id = WRO14BAPP
name = Stacja Helpbox 365 przy paczkomacie InPost
street = Dokerska
house_number = 2
city = Wrocław
facility_type = parcel_locker
is_24_7 = true
indoor = false
description = AED i podręczna apteczka, dostęp całodobowy
```

### 8.4. Wniosek

- **Miejski zbiór AED: NOT VERIFIED.**
- Nie udało się potwierdzić ani strony zbioru, ani pliku/API, ani schematu pól.
- Portal `www.wroclaw.pl/open-data` jest niedostępny dla automatów, więc nie można wykluczyć istnienia zbioru po stronie WAF.
- Artykuł jest źródłem cennym operacyjnie, ale nie jest zbiorem otwartych danych: brak licencji, brak współrzędnych, brak API.
- Ewentualne dane zastępcze: OpenAEDMap / OSM (poza zakresem „miejskie open data”, wymagają osobnej weryfikacji).

---

## 9. Włocławek

### 9.1. Co sprawdzono

- **Geoportal:** https://geoportal.wloclawek.eu/ - HTTP **200**.
- Strona deklaruje usługi:
  - WMS: `https://geoportal.wloclawek.eu/map/geoportal/wmse.php` (EGiB), `wmsg.php` (GESUT), `wmsb.php` (BDOT500), `wmso.php` (BDSOG), `wmsr.php` (RCN),
  - WFS: `wfse.php` (EGiB), `wfso.php` (BDSOG), `wfsr.php` (RCN).
- **Brak warstwy AED** w wykazie usług i w treści strony.
- Próby typowych endpointów ArcGIS/GeoServer (`/arcgis/rest/services`, `/geoserver/web/`, `/wms?`) -> HTTP **404** (nie są to właściwe ścieżki tego portalu).
- dane.gov.pl: brak zbioru AED dla Włocławka.
- Brak działających domen `gis.wloclawek.eu`, `mapa.wloclawek.eu`, `sip.wloclawek.eu`, `msip.wloclawek.eu`.

### 9.2. Wniosek

- **Miejski zbiór AED: NOT VERIFIED.**
- Geoportal udostępnia wyłącznie dane katastralne i infrastrukturalne, nie AED.
- Brak potwierdzonego pliku, API i schematu pól.
- Miasto pojawia się w kontekście AED wyłącznie w artykułach i lokalnych akcjach, bez listy lokalizacji i współrzędnych.

---

## 10. Gliwice i MSIP

### 10.1. Co sprawdzono

- **Portal MSIP:** https://geoportal.gliwice.eu/gpt4/?profile=1000 - HTTP **200** (aplikacja ExtJS/OpenLayers, „Geoportal inwestora”).
- **Konfiguracja profilu (JSON, HTTP 200):**
  `https://geoportal.gliwice.eu/app-gpt-configurator/rest/service/init.json?profile=1000&deviceType=desktop&version=7.0.0`
- **Serwer map:** `https://geoportal.gliwice.eu/app-gpt-configurator/rest/service/map` (WMS `GetMap` działa, HTTP 200, `GetCapabilities` -> **501 Unsupported request**).
- **Drzewo warstw:** 114 warstw, m.in. arkusze sekcyjne, EGiB, uzbrojenie, MPZP, ortofotomapy, obszary administrowane.
- **Wyszukiwanie w `init.json`:** `AED` = 0, `defib` = 0, `ratown` = 0, `medycz` = 0.
- **Układ współrzędnych w UI:** `ETRS89 / Poland CS2000 zone 6 (EPSG:2177)`.
- **Oficjalny artykuł miejski:** https://gliwice.eu/aktualnosci/bezpieczne-gliwice/aed-w-gliwicach-gdzie-sprawdzic-lokalizacje-i-jak-skorzystac-z - HTTP **200**, data publikacji 2026-07-07. Artykuł twierdzi, że warstwa „Lokalizacja defibrylatorów AED” jest dostępna w MSIP oraz w aplikacji GAMA.
- **Portal otwartych danych:** https://open-data-gliwice.hub.arcgis.com - 0 wyników dla `defibrylator`, 0 dla `helpbox`, 5 niepowiązanych wyników dla `aed`.

### 10.2. Rozbieżność

Oficjalny artykuł mówi, że warstwa AED jest w MSIP. Sprawdzenie profilu 1000 w `init.json` nie wykazało takiej warstwy. Możliwe wyjaśnienia:

1. warstwa jest w innym profilu, np. `756` („Geoportal mieszkańca”),
2. warstwa wymaga zalogowania lub uprawnień,
3. artykuł jest nieaktualny,
4. warstwa jest dodawana dynamicznie po stronie klienta, poza `init.json`.

Do rozstrzygnięcia przez kontakt z Centrum Ratownictwa Gliwice lub wydziałem GIS. Nie należy twierdzić, że warstwa nie istnieje, ani że jest publicznie dostępna.

### 10.3. Tabela w artykule

Artykuł zawiera 95 wierszy. Pola:

| Kolumna | Przykład | Mapowanie |
|---|---|---|
| `LP.` | `1` | `source_record_id` (niestabilny) |
| `LOKALIZACJA DEFIBRYLATORA AED` | `Przedsiębiorstwo Energetyki Cieplnej - GLIWICE Sp. z o.o.` | `name` |
| `DZIELNICA` | `Baildona` | `district` |
| `ADRES` | `Królewskiej Tamy 135` | `street`, `house_number` |
| `SZCZEGÓŁY LOKALIZACJI` | `wewnątrz budynku - przy głównym wejściu, portiernia` | `indoor`, `entrance_description` |
| `INFORMACJE O DOSTĘPNOŚCI` | `całodobowo` | `opening_hours`, `is_24_7` |

### 10.4. Przykładowy rekord

```text
LP. = 1
LOKALIZACJA DEFIBRYLATORA AED = Przedsiębiorstwo Energetyki Cieplnej - GLIWICE Sp. z o.o.
DZIELNICA = Baildona
ADRES = Królewskiej Tamy 135
SZCZEGÓŁY LOKALIZACJI = wewnątrz budynku - przy głównym wejściu, portiernia
INFORMACJE O DOSTĘPNOŚCI = całodobowo
```

### 10.5. Wniosek

- **Miejski zbiór AED: NOT VERIFIED w open data.**
- MSIP jest użyteczny operacyjnie, ale nie ma potwierdzonego publicznego API danych AED.
- Tabela w artykule ma 95 lokalizacji, w tym urządzenia mobilne w wozach bojowych i pojazdach Straży Miejskiej. Dla takich rekordów nie ma stałego adresu, więc `facility_type = mobile` i brak geometrii.
- Część wierszy ma `x` w polu dzielnicy lub adresu.
- `LP.` jest niestabilne. Brak osobnego identyfikatora urządzenia.

---

## 11. Inne zweryfikowane gminy

| Gmina | Zbiór | Format | Rekordy | Licencja | Ograniczenia |
|---|---|---|---|---|---|
| Przemyśl | `lokalizacje-aed-automatycznych-defibrylatorow-zewn` (ID 4581) | CSV, GeoJSON, JSON, GML | 21 | CC0 1.0 (mirror), CC BY 4.0 (portal lokalny) | brak dostępności, typu i statusu. `geometry` w CSV jako string z `lat`/`long` |
| Krosno | `defibrylatory-zlokalizowane-w-miescie-krosno` (ID 3624) | CSV | 21 | CC0 1.0 | wiodące spacje w nagłówkach, brak dostępności |
| Marki | `defibrylatory-zlokalizowane-na-terenie-miasta-markI` (ID 4955) | CSV, XLSX | 8 | CC BY 4.0 | wadliwe cytowanie CSV, odwrócona kolejność współrzędnych |

To jedyne dodatkowe gminy z kompletnymi, maszynowymi zbiorami AED, jakie udało się potwierdzić w `api.dane.gov.pl` w dniu badania.

Poza dane.gov.pl istnieją też źródła pozarządowe i społecznościowe, np. OpenAEDMap i OSM. Nie są to źródła gminne i nie spełniają kryterium „dysponenta danych” z zadania. Mogą służyć jako warstwa porównawcza lub uzupełnienie brakujących współrzędnych, ale nie jako podstawa wzorcowego zakresu danych.

---

## 12. Wspólny schemat rekordu AED

Pełny model kanoniczny, słowniki kontrolowane i schemat SQLite znajdują się w [`docs/aed-data-sources-common-schema.md`](../../aed-data-sources-common-schema.md), sekcje 6-8. Poniżej wersja skrócona z nazwami pól kanonicznymi oraz mapowanie źródeł gminnych.

### 12.1. Pola kanoniczne

| Grupa | Pole | Typ | Wymagane | Opis |
|---|---|---|---|---|
| Identyfikacja | `aed_id` | UUID | tak | wewnętrzny identyfikator urządzenia |
| Identyfikacja | `public_code` | string(32) | tak | czytelny kod publiczny |
| Identyfikacja | `ext_ident` | string(36) | tak | identyfikator dla dane.gov.pl |
| Pochodzenie | `source` | string | tak | slug źródła, np. `warszawa`, `przemysl` |
| Pochodzenie | `source_record_id` | string | tak | identyfikator rekordu w źródle |
| Pochodzenie | `source_url` | string | nie | link do rekordu lub zbioru |
| Pochodzenie | `license_id` | string | tak | SPDX lub alias licencji |
| Pochodzenie | `attribution` | string | tak | tekst atrybucji |
| Pochodzenie | `source_updated_at` | datetime | nie | data aktualizacji podana przez źródło |
| Pochodzenie | `fetched_at` | datetime | tak | data pobrania |
| Pochodzenie | `source_payload_sha256` | string | tak | suma kontrolna rekordu źródłowego |
| Opis | `name` | string | tak | nazwa obiektu lub urządzenia |
| Opis | `facility_type` | enum | tak | typ obiektu, np. `public_building`, `school`, `parcel_locker` |
| Opis | `address_text` | string | nie | pełny adres do wyświetlenia |
| Adres | `city` | string | nie | miejscowość |
| Adres | `street` | string | nie | ulica |
| Adres | `house_number` | string | nie | numer budynku, typ tekstowy |
| Adres | `postcode` | string | nie | kod pocztowy `NN-NNN` |
| Adres | `district` | string | nie | dzielnica lub osiedle |
| Adres | `teryt_voivodeship` | string(2) | nie | kod TERYT województwa |
| Adres | `teryt_county` | string(4) | nie | kod TERYT powiatu |
| Adres | `teryt_commune` | string(7) | nie | kod TERYT gminy |
| Lokalizacja | `lat` | float | tak | szerokość geograficzna WGS84 |
| Lokalizacja | `lon` | float | tak | długość geograficzna WGS84 |
| Lokalizacja | `coord_precision_m` | float | nie | szacowana precyzja w metrach |
| Lokalizacja | `indoor` | bool/null | nie | czy wewnątrz budynku |
| Lokalizacja | `level` | string | nie | piętro |
| Lokalizacja | `room` | string | nie | pomieszczenie |
| Lokalizacja | `entrance_description` | string | nie | opis wejścia |
| Dostęp | `access_type` | enum | tak | `public`, `permissive`, `customers`, `private`, `key`, `unknown` |
| Dostęp | `opening_hours` | string | nie | godziny w składni OSM lub tekst |
| Dostęp | `is_24_7` | bool/null | nie | czy dostępne całą dobę |
| Dostęp | `requires_dispatcher` | bool/null | nie | czy wymaga zgłoszenia dyspozytora |
| Dostęp | `fee` | bool/null | nie | czy wymaga opłaty |
| Dostęp | `wheelchair_access` | enum | nie | `yes`, `limited`, `no`, `unknown` |
| Urządzenie | `label` | string | nie | numer lub etykieta urządzenia |
| Urządzenie | `manufacturer` | string | nie | producent |
| Urządzenie | `model` | string | nie | model |
| Urządzenie | `serial_number` | string | nie | numer seryjny, nie do publicznego eksportu |
| Urządzenie | `device_type` | enum | tak | `public_aed`, `trainer`, `unknown` |
| Urządzenie | `installed_at` | date | nie | data instalacji |
| Urządzenie | `last_inspection_at` | date | nie | data ostatniego przeglądu |
| Status | `status` | enum | tak | `active`, `out_of_service`, `removed`, `planned`, `unknown` |
| Status | `verification_status` | enum | tak | `confirmed`, `reported`, `candidate`, `stale`, `unknown` |
| Status | `confidence` | float 0-1 | tak | pewność rekordu |
| Status | `last_verified_at` | datetime | nie | data ostatniego potwierdzenia |
| Status | `last_seen_at` | datetime | nie | ostatnie wystąpienie w źródle |
| Operator | `operator_name` | string | nie | nazwa podmiotu odpowiedzialnego |
| Operator | `operator_type` | enum | nie | typ operatora |
| Kontakt | `phone` | string | nie | telefon organizacyjny |
| Kontakt | `email` | string | nie | e-mail organizacyjny |
| Kontakt | `website` | string | nie | strona WWW |
| Media | `photo_url` | string | nie | zdjęcie główne |
| Media | `photo_license` | string | nie | licencja zdjęcia |

### 12.2. Macierz pokrycia źródeł

Legenda: **T** = pole bezpośrednie, **P** = częściowe lub wymaga parsowania, **N** = wymaga normalizacji wartości, **-** = brak.

| Pole kanoniczne | Warszawa | Przemyśl | Krosno | Marki | Wrocław | Słupsk | Gliwice |
|---|---|---|---|---|---|---|---|
| `source_record_id` | T (`defibrillator_id`) | T (`id`) | T (`Numer Id`) | T (`Numer Id`) | T (kod stacji) | P (`Lp`) | P (`LP.`) |
| `source_url` | T | T | T | T | P (artykuł) | P (artykuł) | P (artykuł i MSIP) |
| `license_id` | T (CC BY 4.0) | N (CC0 vs CC BY) | T (CC0) | T (CC BY 4.0) | - | - | - |
| `source_updated_at` | P | P | T | T | T | - | T |
| `name` | T (`location_object_name`) | T (`name`) | P (`Lokalizacja`) | P (`Lokalizacja`) | P | T (`Nazwa instytucji`) | T (`LOKALIZACJA...`) |
| `facility_type` | P | P | P | P | T (`parcel_locker`) | P | P |
| `city` | T | T (`city`) | P (`Adres`) | P (`Adres`) | T | P (`Adres`) | P |
| `street` | T (`location_street`) | T (`street`) | P (`Adres`) | P (`Adres`) | P | P (`Adres`) | P (`ADRES`) |
| `house_number` | T (`location_building`) | P (`home_number`) | P (`Adres`) | P (`Adres`) | P | P (`Adres`) | P (`ADRES`) |
| `postcode` | T (`location_postcode`) | T (`postcode`) | P (`Adres`) | P (`Adres`) | - | P (`Adres`) | - |
| `district` | - | - | - | - | - | - | T (`DZIELNICA`) |
| `teryt_commune` | - | - | - | - | - | - | - |
| `lat` | T (`geometry.coordinates`) | T (GeoJSON) | T (`Szerokość`) | P (odwrócone osie) | - | - | - |
| `lon` | T (`geometry.coordinates`) | T (GeoJSON) | T (`Długość`) | P (odwrócone osie) | - | - | - |
| `indoor` | T (`device_location`) | - | - | - | T | T (`Lokalizacja AED`) | T (`SZCZEGÓŁY`) |
| `level` | P | - | - | - | - | - | P |
| `entrance_description` | T (`location_description`) | - | - | - | P | P | P (`SZCZEGÓŁY`) |
| `phone` | - | T (`phone`) | - | - | - | - | - |
| `email` | - | T (`email`) | - | - | - | - | - |
| `website` | - | T (`www`) | - | - | - | - | - |
| `photo_url` | P (Base64) | T (`gallery`) | - | - | - | - | - |
| `label` | - | P (z `name`, np. `AED 9485`) | - | - | - | - | - |
| `manufacturer` | T (`device_manufacturer`) | - | - | - | - | - | - |
| `access_type` | T (`device_public_access`) | - | - | - | P | - | P |
| `is_24_7` | P (`device_availability`) | - | - | - | T | P (`Dostępność`) | P (`DOSTĘPNOŚĆ`) |
| `opening_hours` | T (`device_access_description`) | - | - | - | P | T (`Dostępność`) | T (`DOSTĘPNOŚĆ`) |
| `status` | - | - | - | - | - | - | - |
| `operator_name` | P (`location_object_name`) | P (`name`) | - | - | - | T (`Nazwa instytucji`) | T (`LOKALIZACJA...`) |

### 12.3. Pola, które pokrywają się we wszystkich źródłach

Niezależnie od formatu, każde źródło opisuje:

- nazwę lub identyfikator obiektu,
- adres lub opis lokalizacji,
- jakiś identyfikator rekordu,
- w większości przypadków informację o dostępności lub godzinach.

Pola wspólne dla wszystkich czterech zbiorów maszynowych (Warszawa, Przemyśl, Krosno, Marki):

- `source_record_id`,
- `name`,
- `city`, `street`, `house_number` lub `address_text`,
- `lat`, `lon`,
- `license_id`,
- `source_url`.

Pola wspólne dla źródeł HTML (Wrocław, Słupsk, Gliwice):

- `name`,
- `city`, `street`, `house_number` lub `address_text`,
- `opening_hours` lub `is_24_7`,
- brak `lat` i `lon`.

### 12.4. Pola brakujące we wszystkich źródłach

- `status` i `verification_status` - nigdzie nie ma potwierdzenia, że urządzenie działa.
- `serial_number`, `model`, `installed_at`, `last_inspection_at` - brak.
- `teryt_voivodeship`, `teryt_county`, `teryt_commune` - brak, trzeba doliczyć z PRG lub TERYT.
- `operator_name` - tylko pośrednio z nazwy instytucji, nigdy jako osobne pole.

To są najważniejsze luki dla wzorcowego zakresu danych w dane.gov.pl.

### 12.5. Orientacyjna kompletność

Liczba pól kanonicznych z wartością `T` lub `P` na 30 kluczowych pól:

| Źródło | Pokrycie | Ocena |
|---|---:|---|
| Warszawa | 17/30 | dobra, najlepsza wśród miast z API |
| Przemyśl | 16/30 | dobra, najlepsze API i kontakt |
| Krosno | 12/30 | podstawowa, tylko lokalizacja |
| Marki | 11/30 | podstawowa, problem z osiami |
| Wrocław | 9/30 | słaba, brak współrzędnych i licencji |
| Słupsk | 9/30 | słaba, tylko HTML |
| Gliwice | 10/30 | słaba, tylko HTML i MSIP |
| Włocławek | 0/30 | brak danych |

---

## 13. Wnioski i rekomendacje

1. **Wzorcowy zakres danych powinien być oparty na modelu z sekcji 12 i w `docs/aed-data-sources-common-schema.md`**, a nie na schemacie pojedynczego źródła. Tylko wtedy pokryje Warszawę, Przemyśl i mniejsze gminy.
2. **Obowiązkowe pola minimum:** `source_record_id`, `name`, `city`, `lat`, `lon`, `license_id`, `source_updated_at`. Bez współrzędnych zbiór nie spełnia celu mapy.
3. **Polami wyróżniającymi jakość powinny być:** `is_24_7`, `opening_hours`, `access_type`, `indoor`, `manufacturer` i `status`. Warszawa jako jedyna podaje producenta i dostęp publiczny. Żadne źródło nie podaje statusu aktywnego.
4. **Nie należy zgadywać dostępności.** Wartości typu `Ograniczona` trzeba mapować na `is_24_7 = false` lub `unknown` z zachowaniem oryginału w `entrance_description`, a nie na `access_type = private`.
5. **Kolejność współrzędnych jest realnym ryzykiem.** Marki ma odwrócone osie względem nagłówka, Warszawa ma zagnieżdżoną tablicę, Przemyśl ma niestandardowy GeoJSON z `lat`/`long`. Walidacja zakresów i przynależności do Polski jest obowiązkowa.
6. **Licencje są niespójne.** Przemyśl ma CC0 w dane.gov.pl i CC BY 4.0 w portalu lokalnym. Trzeba wybrać źródło prawne i udokumentować wybór. Wrocław, Słupsk i Gliwice nie mają licencji na swoje listy HTML.
7. **Dane HTML nie nadają się do automatycznego ingestu.** Wrocław, Słupsk i Gliwice wymagają albo ręcznego uzupełnienia, albo porozumienia z miastem i publikacji pliku. Geokodowanie adresów bez numerów może wprowadzać błędy.
8. **Dla dane.gov.pl warto przygotować jeden zbiór zbiorczy** z rekordami ze wszystkich źródeł, z polami `source.*`, oraz osobny plik XLSX ze wzorcowym zakresem danych. Portal i tak harvested tylko jeden feed, więc agregacja powinna być po naszej stronie.
9. **Priorytet integracji:** Warszawa (API, pełny schemat), Przemyśl (najlepsze API i kontakt), Krosno (CC0, proste), Marki (CC BY, ale wymaga czyszczenia), potem ewentualnie ręcznie Wrocław, Słupsk i Gliwice.
10. **Walidacja:** dla każdego rekordu sprawdzić, czy współrzędne mieszczą się w granicach Polski. Dla Marki zamienić kolejność, jeśli `lat` < 0 lub `lon` > 40.
11. **Deduplikacja:** klucz `miasto + adres + współrzędne` oraz `source_record_id`. Nazwy urządzeń mogą się różnić między źródłami.

---

## 14. Źródła

### dane.gov.pl i API

- https://api.dane.gov.pl/1.4/datasets?q=defibrylator&per_page=50
- https://api.dane.gov.pl/1.4/datasets?q=defibrylatory&per_page=50
- https://api.dane.gov.pl/1.4/datasets/39512,lokalizacja-defibryzatorow-aed
- https://api.dane.gov.pl/1.4/datasets/3624,defibrylatory-zlokalizowane-w-miescie-krosno
- https://api.dane.gov.pl/1.4/datasets/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn
- https://api.dane.gov.pl/1.4/datasets/4955,defibrylatory-zlokalizowane-na-terenie-miasta-markI
- https://api.dane.gov.pl/1.4/institutions/46/datasets

### Warszawa

- https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed
- https://dane.um.warszawa.pl/pl/catalogue/7bc32ffc-c2ac-4d32-83c9-b6f7a0b38de8
- https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pa.json
- https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pw.json
- `POST https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow`

### Przemyśl

- https://dane.przemysl.eu/zbiory-danych/defibrylatory-aed-na-terenie-miasta-przemysla/
- https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data
- https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn
- https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson
- https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.csv

### Krosno

- https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno
- https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv

### Marki

- https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miasta-markI
- https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.csv
- https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.xlsx

### Wrocław

- https://www.wroclaw.pl/open-data
- https://open-data.cui.wroclaw.pl/hdb/katalog_f/
- https://geoportal.wroclaw.pl/
- https://www.wroclaw.pl/dla-mieszkanca/aed-we-wroclawiu-paczkomaty-inpost-adresy-lista
- https://gis.um.wroc.pl/

### Słupsk

- https://www.slupsk.pl/mieszkaniec/zdrowie-i-sprawy-spoleczne/defibrylatory-aed
- https://sip.slupsk.eu/

### Włocławek

- https://wloclawek.eu/
- https://geoportal.wloclawek.eu/

### Gliwice

- https://gliwice.eu/aktualnosci/bezpieczne-gliwice/aed-w-gliwicach-gdzie-sprawdzic-lokalizacje-i-jak-skorzystac-z
- https://geoportal.gliwice.eu/gpt4/?profile=1000
- https://geoportal.gliwice.eu/app-gpt-configurator/rest/service/init.json?profile=1000&deviceType=desktop&version=7.0.0
- https://open-data-gliwice.hub.arcgis.com/
- https://www.arcgis.com/sharing/rest/search?q=AED%20Gliwice&f=json&num=30

### Źródła pomocnicze

- https://openaedmap.org/pl/
- https://www.openstreetmap.org/

---

## 15. Weryfikacja bezpośrednia HTTP

Poniższe kody i obserwacje pochodzą z zapytań wykonanych 2026-11-21. Uzupełniają opisy źródeł i pokazują, które ustalenia są potwierdzone, a które pozostają `NOT VERIFIED`.

| Źródło / endpoint | HTTP | Obserwacja |
|---|---:|---|
| `POST https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow` bez tokena | **403** | `{"message":"Access denied: Nieautoryzowany: brak ważnego tokena lub API key"}`. Token nadal wymagany |
| `https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pa.json` | **200** | dokumentacja pól API |
| `https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pw.json` | **200** | przykładowy rekord `defibrillator_id = 622` |
| Przemyśl CSV / GeoJSON | **200** | 21 rekordów. GeoJSON ma 21 punktów, `crs` nieobecny -> EPSG:4326 |
| Krosno CSV | **200** | 21 rekordów. Potwierdzone wiodące spacje w nagłówkach ` Nazwa`, ` Lokalizacja`, ` Adres`, ` Numer Id` |
| Marki CSV | **200** | 8 rekordów. Potwierdzone wadliwe cytowanie, standardowy parser widzi jedną kolumnę |
| `https://www.slupsk.pl/mieszkaniec/zdrowie-i-sprawy-spoleczne/defibrylatory-aed` | **200** | 25 wierszy tabeli HTML, brak linków do CSV/JSON/GeoJSON |
| `https://www.wroclaw.pl/open-data` | **403** | blokada FortiADC. Przeglądarka również nie renderuje treści |
| `https://geoportal.wroclaw.pl/` | **200** | 40 stron `/mapy/...` przeszukanych pod `defib`/`AED`, 0 trafień |
| `https://open-data.cui.wroclaw.pl/hdb/katalog_f/` | **200** | 0 wystąpień `defibryl`, `AED`, `helpbox`, `paczkomat`, `inpost` |
| `https://geoportal.wloclawek.eu/` | **200** | WMS/WFS tylko EGiB, GESUT, BDOT500, BDSOG, RCN. Brak AED |
| `https://geoportal.gliwice.eu/app-gpt-configurator/rest/service/init.json?profile=1000...` | **200** | 114 warstw, 0 wystąpień `AED`/`defib`/`ratown`/`medycz` w profilu **1000** (inwestor) |
| `.../rest/service/map?...SERVICE=WMS&REQUEST=GetCapabilities` (Gliwice) | **501** | `GetCapabilities` nieobsługiwane. `GetMap` działa (200) |

**Korekta zawężająca:** brak warstwy AED dotyczy profilu **1000** MSIP Gliwice („Geoportal inwestora”). Nie wyklucza to warstwy w profilu **756** („Geoportal mieszkańca”), opisanej w sekcji 10 na podstawie oficjalnego artykułu. To wymaga kontaktu z wydawcą.

**Wniosek:** dla Wrocławia, Włocławka i profilu 1000 Gliwic pozostaje **NOT VERIFIED** jako źródła maszynowe AED. Warszawa, Przemyśl, Krosno i Marki są potwierdzone jako pliki/API. Słupsk pozostaje źródłem wyłącznie HTML.

---

## 16. Zastrzeżenia

- Kody HTTP i dostępność źródła mogą się zmienić. Badanie wykonano 2026-11-21.
- „NOT VERIFIED” nie oznacza „nie istnieje”. Oznacza brak potwierdzenia w publicznym, maszynowym źródle.
- Nie modyfikowano kodu aplikacji ani nie commitowano zmian.
