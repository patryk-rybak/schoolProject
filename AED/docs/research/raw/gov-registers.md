# Rejestry publiczne i źródła rządowe dla mapy AED

Data badania: **2026-11-21**. Lane: `gov-registers`.
Zakres: KSRG/OSP (KG PSP), RPWDL, NFZ, RSPO/SIO, OLiOC oraz zbiory AED w
portalu dane.gov.pl (API 1.4).

Legenda:
- **POTWIERDZONE** - sprawdzone realnym zapytaniem HTTP, odczytem pliku lub
  źródłem OpenAPI.
- **NIEPOTWIERDZONE** - informacja z dokumentacji lub wnioskowanie, wymaga
  dalszej weryfikacji.
- **BRAK DANYCH** - źródło nie zawiera informacji o AED.

Najważniejszy wniosek: **nie istnieje jeden publiczny, centralny rejestr AED**.
dane.gov.pl zawiera cztery zbiory gminne/miejskie. KSRG, RPWDL, NFZ i RSPO są
rejestrami lokalizacji lub operatorów, a nie rejestrami AED. Informacja o
posiadaniu AED przez OSP jest zbierana w karcie jednostki OSP/SWD-PSP, ale nie
jest publikowana jako otwarty zbiór per jednostka.

## 1. Tabela przydatności

Skala 0-5 dla potrzeb mapy AED: pokrycie, precyzja lokalizacji, operator,
jawność AED, dostęp maszynowy.

| Źródło | Lokalizacja | Operator | AED? | Współrzędne / EPSG | Dostęp maszynowy | Auth | Licencja | Aktualizacja | Ocena |
|---|---|---|---|---|---|---|---|---|---|
| dane.gov.pl, 4 zbiory AED | adres i punkt | miasto publikujące, rzadko właściciel urządzenia | **tak, jawnie** | tak, EPSG:4326, różna kolejność osi | API 1.4, JSON:API, CSV/GeoJSON/GML/XLSX | brak | CC0 1.0 lub CC BY 4.0 | od jednorazowej do codziennej | **5/5 AED, 2/5 pokrycie** |
| KSRG/OSP, KG PSP | gmina i miejscowość, bez adresu | OSP, gmina, powiat | **tak, pośrednio** (AED wymagane warunkiem KSRG) | brak, geokodowanie do EPSG:4326 | tylko PDF | brak | gov.pl domyślnie CC BY-SA 4.0, brak jawnej licencji zbioru | miesięcznie | **4/5 zasięg, 2/5 precyzja** |
| Karta jednostki OSP / SWD-PSP | gmina, miejscowość, numer jednostki | OSP, KRS | **tak, pole AED (min. 1 szt.)** | brak | brak publiczny | brak | brak jawnej licencji | bieżąca | **3/5 tylko po pozyskaniu** |
| RPWDL 2.0 | adres siedziby i jednostek | podmiot leczniczy, księga rejestrowa | nie | brak, geokodowanie do EPSG:4326 | brak otwartego API, UI z reCAPTCHA, raporty Power BI | reCAPTCHA, Keycloak dla części zasobów | brak jawnej licencji open data | ciągła | **3/5 operator, 1/5 maszynowość** |
| NFZ Terminy Leczenia 1.4.3 | adres i punkt | świadczeniodawca, kod, REGON, księga | nie | tak, latitude/longitude, EPSG:4326, często null | REST JSON:API | brak | regulamin API, CC BY 4.0 dla zbiorów NFZ (potwierdzić) | miesięczna migawka | **4/5 placówki medyczne** |
| NFZ Umowy 1.2 | adres świadczeniodawcy | świadczeniodawca, kod, REGON, NIP, księga | nie | brak, geokodowanie do EPSG:4326 | REST JSON/XML | brak | CC BY 4.0 | umowy od 2008, plany miesięczne | **4/5 operator** |
| RSPO / SIO, API | adres i punkt | organ prowadzący, placówka, RSPO, REGON | nie | tak, geolokalizacja, EPSG:4326 (do potwierdzenia) | REST, OpenAPI 3.1 | HTTP Basic, wniosek do CIE | regulamin API, brak open data | dane z SIO, bez SLA | **4/5 szkoły** |
| RSPO XLSX na dane.gov.pl | adres, bez punktu | organ prowadzący, placówka | nie | brak | XLSX, 55 742 wiersze | brak | CC BY 4.0 | roczna | **3/5 szkoły** |
| OLiOC (MSWiA) | brak | podmioty OLiOC, JST, PSP, OSP | **nie** | brak | tylko HTML/PDF | brak | gov.pl CC BY-SA 4.0 | dokument 2025-2026 | **0/5 AED, 1/5 kontekst** |

## 2. Wspólny schemat docelowy

Rekord miejsca AED, niezależny od źródła. Nazwy pól `snake_case`,
identyfikatory jako tekst, daty ISO 8601 UTC.

```json
{
  "id": "uuid",
  "source": "dane_gov_pl | ksrg | rpwdl | nfz_terminy | nfz_umowy | rspo | olioc",
  "source_record_id": "string",
  "source_dataset_id": "string | null",
  "source_url": "https://...",
  "name": "string",
  "site_type": "aed | osp | medical_facility | school | public_building | other",
  "operator": {
    "name": "string | null",
    "type": "osp | gmina | powiat | podmiot_leczniczy | swiadczeniodawca | szkola | inne | null",
    "regon": "string | null",
    "nip": "string | null",
    "rpwdl_ledger_number": "string | null",
    "nfz_provider_code": "string | null",
    "rspo_number": "string | null",
    "krs": "string | null",
    "swd_psp_unit_number": "string | null"
  },
  "address": {
    "street": "string | null",
    "building_number": "string | null",
    "unit_number": "string | null",
    "postal_code": "string | null",
    "city": "string | null",
    "commune": "string | null",
    "commune_teryt": "string | null",
    "county": "string | null",
    "county_teryt": "string | null",
    "voivodeship": "string | null",
    "voivodeship_teryt": "string | null",
    "locality_teryt": "string | null"
  },
  "geo": {
    "lat": 52.2297,
    "lon": 21.0122,
    "geometry": "GeoJSON Point, EPSG:4326",
    "epsg": 4326,
    "precision": "exact | building | street | locality | commune | unknown",
    "method": "source | geocoder | manual"
  },
  "aed": {
    "present": true,
    "explicit": true,
    "count": 1,
    "manufacturer": "string | null",
    "model": "string | null",
    "public_access": "public | restricted | unknown",
    "availability_24_7": "yes | no | unknown",
    "access_description": "string | null",
    "indoor": "indoor | outdoor | unknown"
  },
  "contact": {
    "phone": "string | null",
    "email": "string | null",
    "website": "string | null"
  },
  "provenance": {
    "license": "CC0-1.0 | CC-BY-4.0 | CC-BY-SA-4.0 | other | unknown",
    "attribution": "string | null",
    "fetched_at": "2026-11-21T18:00:00Z",
    "source_updated_at": "2026-11-11T00:00:00Z",
    "confidence": 0.0
  }
}
```

### 2.1. Pola krytyczne

| Pole | Znaczenie | Uwagi |
|---|---|---|
| `source_record_id` | identyfikator w źródle | stabilny, nie numer wiersza PDF |
| `operator.regon` | 9 lub 14 cyfr | wspólny klucz RPWDL, NFZ, RSPO, GUS |
| `operator.rpwdl_ledger_number` | numer księgi rejestrowej | format `000000027307-W-14`, łączy RPWDL i NFZ |
| `operator.nfz_provider_code` | kod świadczeniodawcy | 8 cyfr, tylko NFZ |
| `operator.rspo_number` | numer RSPO | tylko RSPO |
| `address.commune_teryt` | kod gminy | 7 cyfr, wspólny dla KSRG, NFZ, RSPO, RPWDL |
| `geo.lat`, `geo.lon` | szerokość i długość | zawsze lat, lon w schemacie docelowym |
| `geo.precision` | precyzja | wymagane dla KSRG i RPWDL |
| `aed.explicit` | czy źródło wprost mówi o AED | odróżnia jawne AED od wniosku z KSRG |
| `provenance.confidence` | 0-1 | rośnie dla punktu i zgodnego adresu |

### 2.2. Reguły normalizacji współrzędnych

| Źródło | Kolejność | CRS |
|---|---|---|
| dane.gov.pl, Krosno CSV | `lon, lat` | WGS84, EPSG:4326 |
| dane.gov.pl, Marki CSV | `lat, lon` mimo nagłówka `Długość, Szerokość` | WGS84, EPSG:4326 |
| dane.gov.pl, Przemyśl GeoJSON | `lon, lat` | WGS84, EPSG:4326 |
| dane.gov.pl, Przemyśl CSV | `lat, lon` w obiekcie `{lat, long}` | WGS84, EPSG:4326 |
| dane.gov.pl, Przemyśl GML | `lat, lon`, brak `srsName` | WGS84, EPSG:4326, brak deklaracji |
| dane.gov.pl, Warszawa API | `[lon, lat]` | WGS84, EPSG:4326 |
| NFZ Terminy | `latitude`, `longitude` osobno | WGS84, EPSG:4326 |
| RSPO | `latitude`, `longitude` jako tekst | prawdopodobnie WGS84, EPSG:4326 |

Zasada: adapter zapisuje `lat` i `lon` do wspólnych pól, a surowy `geometry`
zachowuje w `raw`. Walidacja: `lat` w [-90, 90], `lon` w [-180, 180], punkt w
granicach Polski. Dla GML bez `srsName` nie zakładać EPSG:2180, bo wartości w
próbce są geograficzne.

## 3. dane.gov.pl i API 1.4

### 3.1. Dostęp

| Element | Wartość |
|---|---|
| Baza API | `https://api.dane.gov.pl/1.4` |
| Specyfikacja | `https://api.dane.gov.pl/spec/1.4` - **POTWIERDZONE**, 200, `application/vnd.api+json`, ok. 318 KB, OpenAPI 3.0.0 |
| Dokumentacja UI | `https://api.dane.gov.pl/doc` - 200, Swagger UI |
| Uwierzytelnianie | **brak**, publiczne |
| Format | JSON:API 1.4, `application/vnd.api+json`; pliki CSV, JSON, XML, XLSX, GeoJSON, GML |
| Paginacja | `page`, `per_page`, domyślnie 25, **maksimum 100** |
| Nagłówki opcjonalne | `X-API-VERSION: 1.4`, `Accept-Language: pl|en` |
| Licencja | brak jednej licencji API, zależy od zbioru (`license_name`, `license_description`) |
| Limity zapytań | **NIEPOTWIERDZONE** |

Endpointy:

| Endpoint | Zastosowanie |
|---|---|
| `GET /1.4/datasets` | zbiory, filtry `title`, `q`, `keyword`, `institution`, `format`, `has_*` |
| `GET /1.4/datasets/{id}` | metadane, `include=institution,resources` |
| `GET /1.4/datasets/{id}/resources` | zasoby i pliki |
| `GET /1.4/resources` | zasoby, filtry `title`, `q`, `format`, `dataset` |
| `GET /1.4/resources/{id}` | metadane, `file_url`, `download_url` |
| `GET /1.4/resources/{id}/file` | pobranie pliku, zwykle 302 |
| `GET /1.4/resources/{id}/data` | dane tabelaryczne JSON:API, kolumny `col1..colN` |
| `GET /1.4/resources/{id}/data/spec` | opis kolumn, jeśli tabela |
| `GET /1.4/resources/{id}/geo` | dane przestrzenne, jeśli warstwa geo |
| `GET /1.4/institutions` | instytucje, filtr `regon`, `city`, `q` |
| `GET /1.4/search` | wyszukiwanie zbiorcze |

Filtry są obiektami zagnieżdżonymi, np. `title[term]=defibrylator`,
`institution[term]=145`. `q` jest pełnotekstowe i zbyt szerokie. `q=AED`
zwraca 70 zbiorów, w tym fałszywe trafienia. `keyword=aed` również nie jest
precyzyjne. Najlepsze jest `title=defibrylator` plus ręczny filtr.

### 3.2. Zbiory AED

`GET /1.4/datasets?title=defibrylator&per_page=100` zwraca **4 zbiory**.

| ID | Tytuł | Instytucja | Licencja | Aktualizacja | Zasoby |
|---|---|---|---|---|---|
| 3624 | Defibrylatory zlokalizowane w Mieście Krosno | Urząd Miasta Krosna (229) | CC0 1.0 | jednorazowe / nie dotyczy | 54632 CSV |
| 4581 | Lokalizacje AED w Przemyślu | Gmina Miasto Przemyśl (145) | CC0 1.0 | codziennie, ostatnia zmiana 2024-11-06 | 62092 GML, 62093 GeoJSON, 62094 JSON, 62095 CSV, 62424 GML |
| 4955 | Defibrylatory zlokalizowane na terenie Miasta Marki | Miasto Marki (537) | CC BY 4.0 | jednorazowe | 68353 CSV, 68355 XLSX |
| 39512 | Lokalizacja defibrylatorów (AED) | Urząd m.st. Warszawy (7621) | CC BY 4.0 | źródło CKAN codziennie, brak `update_frequency` | 2512040 JSON, to **dokumentacja API**, nie dane |

Dodatkowe liczby: `GET /1.4/resources?q=defibrylator` zwraca 10 zasobów, a
`GET /1.4/search?q=defibrylator` zwraca 14 wyników (4 zbiory i 10 zasobów).

#### 3.2.1. Krosno, zbiór 3624, zasób 54632

- Plik: `https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv`
- 21 rekordów, CSV z nagłówkiem, 2787 B.
- Pola: `Długość geograficzna`, `Szerokość geograficzna`, ` Nazwa`,
  ` Lokalizacja`, ` Adres`, ` Numer Id` (spacje wiodące w trzech nazwach).
- Współrzędne: `lon, lat`, WGS84, EPSG:4326.
- Brak operatora, dostępności i producenta.
- `Nazwa` to zawsze „Defibrylator”, a `Lokalizacja` to nazwa obiektu.

Mapowanie:

| Źródło | Schemat |
|---|---|
| `Numer Id` | `source_record_id` |
| `Nazwa` | `aed.model` lub `name`, jeśli `Lokalizacja` puste |
| `Lokalizacja` | `name` |
| `Adres` | `address.street`, `postal_code`, `city` po rozbiorze |
| `Długość geograficzna` | `geo.lon` |
| `Szerokość geograficzna` | `geo.lat` |
| brak | `operator.name` = „Gmina Miasto Krosno”, `operator.type` = `gmina` |

#### 3.2.2. Przemyśl, zbiór 4581, zasoby 62092-62095 i 62424

- GeoJSON: `https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson`
- 21 obiektów `Feature`, 48823 B.
- Pola: `id`, `name`, `description`, `category`, `city`, `street`,
  `home_number`, `postcode`, `phone`, `email`, `www`, `youtube_url`,
  `panorama_url`, `geometry`, `gallery`, `attachments`, `links`.
- GeoJSON: `geometry.coordinates` w kolejności `[lon, lat]`, EPSG:4326.
- CSV: kolumna `geometry` to tekst
  `{"type":"Point","coordinates":{"lat":"...","long":"..."}}`, czyli
  **niestandardowy format i kolejność `lat, lon`**.
- GML: `<gml:pos>lat lon</gml:pos>` bez `srsName`, również `lat, lon`.
- Brak operatora. Dane kontaktowe często puste.
- `description` to długi tekst edukacyjny, nie opis lokalizacji.

Mapowanie:

| Źródło | Schemat |
|---|---|
| `id` | `source_record_id` |
| `name` | `name` |
| `category` | `site_type` lub `aed.model`, jeśli zawiera typ |
| `city` | `address.city` |
| `street` + `home_number` | `address.street` + `address.building_number` |
| `postcode` | `address.postal_code` |
| `geometry` | `geo` po konwersji na EPSG:4326 |
| `phone`, `email`, `www` | `contact.*` |
| brak | `operator.name` = „Gmina Miasto Przemyśl”, `operator.type` = `gmina` |

#### 3.2.3. Marki, zbiór 4955, zasób 68353

- Plik: `https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.csv`
- 8 rekordów, ale CSV jest **uszkodzony**: cały wiersz jest jednym polem w
  cudzysłowie, a przecinki wewnątrz nie są poprawnie rozdzielone. Nagłówek
  również jest jednym stringiem.
- Nagłówek deklaruje `Długość geograficzna, Szerokość geograficzna`, ale
  wartości w pierwszej kolumnie to szerokość (`52.326697`), a w drugiej
  długość (`21.107557`). Kolejność jest `lat, lon`, odwrotnie niż w nagłówku.
- Pola logiczne: współrzędne, `Nazwa`, `Lokalizacja`, `Adres`, `Numer Id`.
- Licencja CC BY 4.0, aktualizacja jednorazowa.

Mapowanie jak Krosno, ale z obowiązkowym parsowaniem niestandardowego CSV i
zamianą osi. Operator: „Gmina Miasto Marki”, typ `gmina`.

#### 3.2.4. Warszawa, zbiór 39512, zasób 2512040

Zasób w dane.gov.pl to **plik JSON z dokumentacją API**, a nie lista AED.
Zawiera dwa dokumenty:

- `https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pa.json`
- `https://dane.um.warszawa.pl/files/scb_lokalizacja_defibrylatorow_pw.json`

Faktyczny endpoint danych:

```text
POST https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow
Authorization: token_uzytkownika
Content-Type: application/json

{"defibrillator_id": "622"}
```

`token_uzytkownika` jest obowiązkowy. Bez tokenu nie ma dostępu do rekordów.
Dokumentacja opisuje odpowiedź:

```json
{
  "geometry": {
    "type": "Point",
    "coordinates": [[21.0148748892902, 52.2086170695684]]
  },
  "properties": {
    "defibrillator_id": "622",
    "device_access_description": "Poniedziałek: godz. 8:00-18:00; ...",
    "device_availability": "Ograniczona",
    "device_location": "Wewnątrz budynku",
    "device_manufacturer": "Medtronic",
    "device_public_access": "Publiczny",
    "location_building": "25/27",
    "location_city": "Warszawa",
    "location_description": "Przy wejściu na półpiętrze.",
    "location_object_name": "Urząd Dzielnicy Mokotów m.st. Warszawy",
    "location_postcode": "02-517",
    "location_street": "Rakowiecka",
    "attachment": "base64, tylko dla pojedynczego urządzenia"
  }
}
```

Uwagi:

- `coordinates` jest zagnieżdżone: `[[lon, lat]]`, tablica tablic.
- Kolejność `[lon, lat]`, EPSG:4326.
- `device_availability` to tekst, nie boolean. Znormalizować „Ograniczona”,
  „24/7” itd.
- `device_public_access` to tekst „Publiczny” lub inny.
- `attachment` może być dużym base64, nie pobierać masowo.
- Licencja: CC BY 4.0, źródło CKAN „Otwarte dane Warszawy”.
- Operator publikujący: Urząd m.st. Warszawy. Właściciel urządzenia nie jest
  osobnym polem.

### 3.3. Ograniczenia dane.gov.pl

1. Pokrycie tylko 4 miasta, brak zbioru krajowego.
2. Brak wspólnego schematu pól między miastami.
3. Uszkodzony CSV w Markach i niestandardowy `geometry` w Przemyślu.
4. Warszawa bez tokenu nie zwraca danych.
5. Część zbiorów jest martwa od 2024 lub 2025 roku.
6. `keyword` i `q` nie nadają się do precyzyjnego wyszukiwania AED.

## 4. KSRG i OSP, Komenda Główna PSP

### 4.1. Wykaz OSP w KSRG

| Element | Wartość |
|---|---|
| Strona | `https://www.gov.pl/web/kgpsp/osp-w-ksrg` - 200 |
| Wykaz miesięczny | `https://www.gov.pl/attachment/19771423-c851-47ca-a74b-fb3ae10df970` - 200, PDF, 0,71 MB |
| Wersja bieżąca | **2026.11**, „Stan na 11.11.2026 r.” |
| Liczba rekordów | **5363** jednostki OSP (ostatni numer na stronie 72) |
| Format | PDF, 72 strony, brak API, brak CSV/XLSX |
| Uwierzytelnianie | brak |
| Licencja | gov.pl domyślnie **CC BY-SA 4.0**, brak jawnej licencji zbioru |
| Aktualizacja | miesięczna, w praktyce kilka wersji w miesiącu |

Kolumny:

| Kolumna | Przykład | Znaczenie |
|---|---|---|
| `Lp.` | `1` | numer porządkowy, niestabilny między miesiącami |
| `Województwo` | `dolnośląskie` | nazwa województwa |
| `Powiat` | `Bolesławiec` | nazwa powiatu, w nowym wykazie też przymiotnikowa (`bolesławiecki`) |
| `Gmina` | `Bolesławiec (gmina wiejska)` | nazwa gminy z typem |
| `Nazwa JOP` | `OSP Ocice` | nazwa jednostki OSP |

Wykaz nowo włączonych ma dodatkową kolumnę `Rodzaj włączenia do KSRG`
(`nowe`, `ponowne`). Link bieżący:
`https://www.gov.pl/attachment/84e37a45-8b6b-42d0-834c-9b251f02ef8d`.
Starszy przykład: `https://www.gov.pl/attachment/78691c2a-f4d3-4aa1-aad9-529fa1863cc8`
(2025-05, 5 stron).

**Brak**: adresu, kodu pocztowego, współrzędnych, REGON, KRS, telefonu, email,
liczby AED, modelu AED.

### 4.2. Karta jednostki OSP i SWD-PSP

- Wzór karty: `https://www.gov.pl/attachment/fc1c5b37-f915-4eca-b03d-226b163fadfd`
  - 200, DOCX, 32170 B.
- Pola identyfikacyjne i adresowe: `Województwo`, `Powiat`, `Gmina`,
  `Miejscowość`, `Numer Jednostki w SWD-PSP`, `Numer KRS jednostki OSP`.
- Sekcja wyposażenia zawiera `AED (min. 1 szt.)*` oraz
  `Zestaw ratownictwa medycznego R1 (min. 1 szt.)*`.
- To dowód, że informacja o AED jest zbierana w karcie/SWD-PSP, ale karta nie
  jest publikowana per jednostka jako otwarty zbiór.

### 4.3. Czy wykaz zawiera AED?

Tak, ale **pośrednio**. Strona KG PSP podaje warunki włączenia do KSRG:
jednostka musi mieć „sprzęt umożliwiający wykonywanie czynności ratowniczych
w ramach kwalifikowanej pierwszej pomocy - zestaw ratownictwa medycznego R-1
oraz AED”. Każda OSP z wykazu powinna mieć co najmniej jedno AED. Nie jest to
rejestr urządzeń: brak liczby, modelu, producenta, dostępności i dokładnego
miejsca przechowywania.

Wykaz jest **dolnym ograniczeniem**: OSP spoza KSRG też mogą mieć AED, a
jednostki usunięte z KSRG mogą je nadal posiadać. Nie usuwać rekordów przy
zmianie statusu KSRG, tylko zmieniać `aed.explicit` i `operator` oraz dodawać
historię.

### 4.4. Mapowanie

| Źródło | Schemat | Uwagi |
|---|---|---|
| `Nazwa JOP` | `name`, `operator.name` | „OSP Ocice” to nazwa jednostki |
| `Województwo` | `address.voivodeship` | zachować polskie znaki |
| `Powiat` | `address.county` | nowy wykaz używa przymiotników, stary rzeczowników |
| `Gmina` | `address.commune` | usunąć `(gmina wiejska)` do `commune_type` |
| `Lp.` | nie używać jako ID | numer zmienia się przy każdej edycji |
| brak | `source_record_id` | stabilny hash: `ksrg:<woj>:<powiat>:<gmina>:<nazwa>` |
| brak | `operator.type` | `osp` |
| brak | `site_type` | `osp` |
| brak | `aed.present` | `true` z warunku KSRG |
| brak | `aed.explicit` | `false`, bo to wniosek, nie deklaracja urządzenia |
| brak | `geo` | geokodować gminę i miejscowość, `precision=locality` lub `commune` |
| brak | `provenance.confidence` | 0.6 dla AED, 0.3 dla punktu |

Geokodowanie: zbudować adres `OSP <miejscowość>, <gmina>, <powiat>,
<województwo>` i znaleźć budynek OSP w OSM lub PRG. Fallback to centroid
miejscowości z TERYT, nie centroid gminy. Dla jednostek o nazwie
„OSP <miejscowość>” miejscowość zwykle wynika z nazwy, ale nie zawsze.

## 5. RPWDL 2.0

### 5.1. Dostęp

| Element | Wartość |
|---|---|
| Wejście | `https://rpwdl.ezdrowie.gov.pl/` - 302 na `https://rpwdl2.ezdrowie.gov.pl/` |
| Wyszukiwarka | `https://rpwdl2.ezdrowie.gov.pl/wyszukiwarka` - 200, Angular SPA |
| Publiczne API | brak udokumentowanego API |
| Wewnętrzne API | `https://rpwdl2.ezdrowie.gov.pl/api` |
| Próba `GET /api/rpwdl-healthcare-provider-ledger/medical-facilities?medicalFacilityCriteria=` | 500, `Required request header 'recaptchaToken' ...` |
| Próba `GET /api/rpwdl-security/users/contexts` | 403, `NO_ACCESS_TO_THE_RESOURCE` |
| Uwierzytelnianie | reCAPTCHA (`recaptchaToken`), Keycloak dla części zasobów |
| Format | JSON wewnętrznie, UI HTML/PDF |
| Raporty publiczne | `GET /api/rpwdl-public-resource/public-report/available/get` - 200, linki Power BI |
| Potencjalny bulk | `GET /api/rpwdl-storage/public/files/{uuid}?operationType=DOWNLOAD_INCREMENTAL_LEDGER_ZIP` - **NIEPOTWIERDZONE** bez ważnego UUID |
| Licencja | **NIEPOTWIERDZONE**, rejestr publiczny, brak jawnej licencji open data |
| Aktualizacja | ciągła, rejestr urzędowy |
| AED | **BRAK DANYCH** |

Próba wywołania wyszukiwarki bez tokenu zwraca błąd o brakującym nagłówku
`recaptchaToken`. Publiczna wyszukiwarka jest chroniona reCAPTCHA i nie
nadaje się do stabilnej integracji serwerowej. Raporty publiczne to linki
Power BI, nie pliki CSV. Legalna droga to kontakt z Centrum e-Zdrowia i
uzyskanie dostępu do danych lub raportów, albo ręczne wykorzystanie
wyszukiwarki. Nie obchodzić reCAPTCHA.

### 5.2. Pola

Pola widoczne w wyszukiwarce, formularzach i raportach RPWDL 2.0:

| Obszar | Pola |
|---|---|
| Identyfikacja | numer księgi rejestrowej, kod resortowy (części III, V, VII, VIII, IX, X), NIP, REGON |
| Nazwa | nazwa podmiotu leczniczego, nazwa skrócona, nazwa podmiotu tworzącego |
| Adres | adres siedziby, adres do korespondencji, województwo, powiat, gmina, miejscowość, ulica, numer budynku, numer lokalu, kod pocztowy, poczta, TERYT |
| Status | data wpisu, data rozpoczęcia działalności, data likwidacji, status wpisu |
| Struktura | jednostki organizacyjne, zakłady lecznicze, komórki organizacyjne, zakresy świadczeń |
| Kontakt | telefon, email, strona internetowa |
| Właściciel | podmiot tworzący, forma prawna, NIP/REGON |

Numery ksiąg mają format `000000027307-W-14`, gdzie `W` oznacza rodzaj
podmiotu, a `14` numer organu rejestrowego. Ten sam numer występuje w NFZ
jako `registry-number`, co czyni go najlepszym kluczem łączenia.

### 5.3. EPSG, licencja, aktualizacja, AED

- EPSG: brak współrzędnych, tylko adres. Geokodowanie do EPSG:4326.
- Licencja: brak jawnej licencji open data. Rejestr jest jawny z mocy ustawy,
  ale warunki ponownego użycia i bulk exportu trzeba potwierdzić w CeZ.
- Aktualizacja: ciągła, wraz z wpisami i zmianami.
- AED: **nie**. RPWDL nie zawiera informacji o defibrylatorach.

### 5.4. Mapowanie

| Źródło | Schemat |
|---|---|
| numer księgi rejestrowej | `operator.rpwdl_ledger_number` |
| NIP | `operator.nip` |
| REGON | `operator.regon` |
| nazwa podmiotu | `operator.name` |
| adres siedziby | `address.*` |
| TERYT gminy | `address.commune_teryt` |
| data wpisu | `provenance.source_updated_at` lub historia |
| telefon, email, www | `contact.*` |
| brak | `site_type` = `medical_facility` |
| brak | `geo` = geokodowany adres, `precision=building` lub `street` |

RPWDL jest źródłem **operatora**, a nie lokalizacji AED. Może wzbogacić
placówki medyczne z NFZ lub RSPO o pełną nazwę, NIP, REGON i strukturę.

## 6. NFZ

NFZ udostępnia dwa niezależne API. Oba są publiczne, bez klucza, w formacie
JSON:API.

### 6.1. API Terminy Leczenia 1.4.3

| Element | Wartość |
|---|---|
| Dokumentacja | `https://apinfz.nfz.gov.pl/app-itl-api-pcus/` - 200 |
| Swagger | `https://apinfz.nfz.gov.pl/app-itl-api-pcus/swagger/v1.4/swagger.json` - 200, OpenAPI 3.0.4 |
| Stara wersja 1.3 | `https://api.nfz.gov.pl/app-itl-api/` - 200, nieaktualna |
| Zasoby | `/queues`, `/queues/{id}`, `/many-places/{id}`, `/providers`, `/places`, `/localities`, `/benefits`, `/streets` |
| Uwierzytelnianie | brak |
| Licencja | regulamin API, CC BY 4.0 dla zbiorów NFZ (potwierdzić dla Terminów) |
| Aktualizacja | miesięczna migawka, pole `statistics.provider-data.update` np. `2026-10` |
| Zakres | tylko świadczeniodawcy z listami oczekujących, nie wszyscy |
| AED | **BRAK DANYCH** |

Przykład:

```text
GET https://apinfz.nfz.gov.pl/app-itl-api-pcus/queues?case=1&province=07&benefit=poradnia&page=1&limit=1
```

Pola `queue.attributes`:

| Pole | Znaczenie | Mapowanie |
|---|---|---|
| `provider` | nazwa świadczeniodawcy | `operator.name` |
| `provider-code` | kod świadczeniodawcy | `operator.nfz_provider_code` |
| `regon-provider` | REGON | `operator.regon` |
| `nip-provider` | NIP | `operator.nip` |
| `registry-number` | numer księgi RPWDL | `operator.rpwdl_ledger_number` |
| `teryt-provider` | TERYT | `address.*_teryt` |
| `place` | nazwa miejsca | `name` |
| `address` | ulica i numer | `address.street` + `building_number` |
| `locality` | miejscowość | `address.city` |
| `county` | powiat (nowe w 1.4) | `address.county` |
| `teryt-place` | TERYT miejsca | `address.locality_teryt` |
| `phone`, `email`, `website` | kontakt | `contact.*` |
| `latitude`, `longitude` | punkt | `geo.lat`, `geo.lon`, EPSG:4326 |
| `toilet`, `ramp`, `car-park`, `elevator`, `ac`, `wheelchairs` | dostępność | `aed.access_description` lub osobne pole |
| `statistics.provider-data.update` | miesiąc migawki | `provenance.source_updated_at` |

Ważne: `latitude` i `longitude` **mogą być null**. W próbce Warszawy jedna
poradnia miała null mimo adresu. Zawsze mieć fallback geokodowania adresu.
Słownik `/providers` zwraca tylko nazwy świadczeniodawców, bez adresów i
współrzędnych. Pełniejsze dane są w `/queues`.

### 6.2. API Umowy NFZ 1.2

| Element | Wartość |
|---|---|
| Dokumentacja | `https://api.nfz.gov.pl/app-umw-api/` - 200 |
| Zasoby | `/agreements`, `/agreements/{id}`, `/plans/{id}`, `/months/{id}`, `/available-years`, `/providers`, `/contract-products`, `/service-types` |
| Wymagane parametry | `/agreements` wymaga `year` i `branch`, `/plans` i `/months` wymagają ID |
| Uwierzytelnianie | brak |
| Licencja | CC BY 4.0 (zbiór „API Umowy NFZ”, ID 1734) |
| Aktualizacja | umowy od 2008, plany miesięczne |
| Zakres | świadczeniodawcy z umową NFZ, nie wszystkie podmioty lecznicze |
| AED | **BRAK DANYCH** |

Przykładowy rekord `/providers`:

```json
{
  "branch": "15",
  "code": "150010526",
  "name": "\"APTEKA PRZY SZPITALU\"",
  "nip": "7871474331",
  "regon": "300243472",
  "registry-number": null,
  "post-code": "64500",
  "street": "SUKIENNICZA 13",
  "place": "SZAMOTUŁY",
  "phone": "728467126,503070244",
  "commune": "3024074"
}
```

Pola: `branch`, `code`, `name`, `nip`, `regon`, `registry-number`,
`post-code`, `street`, `place`, `phone`, `commune`. Brak współrzędnych.
`commune` to TERYT gminy.

Mapowanie:

| Źródło | Schemat |
|---|---|
| `code` | `operator.nfz_provider_code` |
| `name` | `operator.name` |
| `nip` | `operator.nip` |
| `regon` | `operator.regon` |
| `registry-number` | `operator.rpwdl_ledger_number` |
| `street` | `address.street` |
| `place` | `address.city` |
| `post-code` | `address.postal_code` |
| `commune` | `address.commune_teryt` |
| `branch` | `raw.branch` lub `operator.nfz_branch` |
| brak | `geo` = geokodowany adres, `precision=building` |
| brak | `site_type` = `medical_facility` |

### 6.3. NFZ a AED

Oba API **nie zawierają informacji o AED**. Są cenne, bo dają duży zbiór
placówek medycznych z adresami i współrzędnymi, numer księgi rejestrowej
łączy NFZ z RPWDL, a `latitude`/`longitude` w Terminach są gotowe do użycia.

## 7. RSPO i SIO

### 7.1. Dostęp

| Element | Wartość |
|---|---|
| Wyszukiwarka | `https://rspo.gov.pl/` - 200 |
| API | `https://api.rspo.gov.pl/` - 200 |
| OpenAPI | `https://api.rspo.gov.pl/v3/api-docs` lub `.../v3/api-docs.yaml` - 200, OpenAPI 3.1.0, wersja API 1.2.0 |
| Swagger UI | `https://api.rspo.gov.pl/swagger-ui/index.html` - 200 |
| Uwierzytelnianie | **HTTP Basic**, `GET /api` bez danych zwraca 401, `WWW-Authenticate: Basic realm="Realm"` |
| Dostęp | wniosek e-mail na `rspo@cie.gov.pl`, tytuł „Wniosek o dostęp do API [nazwa podmiotu]”, rozpatrzenie do 14 dni, unikalne dane uwierzytelniające |
| Licencja | regulamin API, brak jawnej licencji open data |
| Aktualizacja | dane z SIO, bez opublikowanego SLA |
| AED | **BRAK DANYCH** |

SIO jako takie nie jest otwarte. RSPO jest publiczną wyszukiwarką danych SIO,
a API jest bramą do tego samego zakresu. Nowe API działa od 2026-01-15
(**NIEPOTWIERDZONE** poza komunikatem CIE).

### 7.2. Endpointy i filtry

Endpointy danych: `GET /api/placowki/`, `GET /api/placowki/{id}` oraz
słowniki `/api/wojewodztwa/`, `/api/powiaty/`, `/api/gminy/`,
`/api/miejscowosci/`, `/api/typ/`, `/api/status_publiczno_prawny/`,
`/api/etap_edukacyjny/`, `/api/kategoria_ucznia/`, `/api/specyfika_szkoly/`,
`/api/zwiazanie_organizacyjne/`.

Filtry `/api/placowki/`: `wojewodztwo_nazwa`, `wojewodztwo_kod_teryt`,
`powiat_nazwa`, `powiat_kod_teryt`, `gmina_nazwa`, `gmina_kod_teryt`,
`miejscowosc_nazwa`, `miejscowosc_kod_teryt`, `RSPO`, `NIP`, `REGON`,
`typ_podmiotu_id`, `status_publiczno_prawny_id`, `kategoria_ucznia_id`,
`etap_edukacji_id`, `zlikwidowana`, `podmiot_prowadzacy_id`,
`podmiot_prowadzacy_regon`, `page`, `pageSize`.

Odpowiedź to tablica `PlacowkaDTO`, bez koperty JSON:API.

### 7.3. Pola `PlacowkaDTO`

| Grupa | Pola |
|---|---|
| Identyfikacja | `numerRspo`, `nip`, `regon` |
| Nazwa i typ | `nazwa`, `typ`, `statusPublicznoPrawny`, `specyfikaSzkoly`, `zwiazanieOrganizacyjne` |
| Dyrektor | `dyrektorImie`, `dyrektorNazwisko` |
| Daty | `dataZalozenia`, `dataRozpoczecia`, `dataWlaczeniaDoZespolu`, `dataLikwidacji` |
| Uczniowie | `liczbaUczniow`, `kategoriaUczniow`, `etapyEdukacji`, `czyPosiadaObwod`, `czyPosiadaInternat` |
| Kształcenie | `ksztalcenieZawodowe`, `ksztalcenieZawodoweArtystyczne`, `ksztalcenieWkolegiachPracownikowSluzbSpolecznych` |
| Organ prowadzący | `podmiotProwadzacy[]` z `id`, `nazwa`, `regon`, `typ` |
| Organ nadrzędny | `podmiotNadrzedny` |
| Adres | `wojewodztwo`, `wojewodztwoKodTERYT`, `powiat`, `powiatKodTERYT`, `gmina`, `gminaKodTERYT`, `gminaRodzaj`, `miejscowosc`, `miejscowoscKodTERYT`, `ulica`, `ulicaKodTERYT`, `numerBudynku`, `numerLokalu`, `kodPocztowy`, `poczta` |
| Geolokalizacja | `geolokalizacja[]` z `latitude`, `longitude` (stringi) |
| Kontakt | `telefon`, `email`, `stronaInternetowa` |
| Korespondencja | `adresDoKorespondencjiMiejscowosc`, `...Ulica`, `...NumerBudynku`, `...NumerLokalu`, `...KodPocztowy`, `...Poczta` |

`GeotagDTO` ma tylko `latitude` i `longitude` jako stringi. Brak pola CRS.
Przyjąć WGS84 / EPSG:4326, ale przy pierwszym pobraniu potwierdzić zakresy.

### 7.4. RSPO XLSX na dane.gov.pl

- Dataset `839` `Wykaz szkół i placówek oświatowych`, CC BY 4.0,
  `update_frequency: Rocznie`.
- Zasób `1254769` (stan 30.09.2025):
  `https://api.dane.gov.pl/media/resources/20260216/Wykaz_szk%C3%B3%C5%82_i_plac%C3%B3wek_o%C5%9Bwiatowych_30.09.2025_.xlsx`
  - 200, 18 244 988 B, **55 742 wiersze**.
- Nagłówki: `idTerytWojewodztwo`, `Wojewodztwo`, `idTerytPowiat`, `Powiat`,
  `idTerytGmina`, `Gmina`, `idPodmiotGlowny`, `idPodmiotNadrzedny`,
  `idTypPodmiotuNadrzednego`, `idTypPodmiotu`, `idRodzajPlacowki`, `Ulica`,
  `Poczta`, `regon`, `idPublicznosc`, `idKategoriaUczniow`,
  `idSpecyfikaSzkoly`, `idZwiazanieOrganizacyjneSzkoly`, `idTypOrgProw`,
  `idOrganProwadzacy`, ...
- W zaobserwowanym nagłówku **brak `latitude`/`longitude`**. Współrzędne są
  w API RSPO, nie w XLSX. Pełna weryfikacja 52 kolumn: **NIEPOTWIERDZONE**,
  ale nie znaleziono kolumn współrzędnych.
- Brak informacji o AED.

### 7.5. Mapowanie

| Źródło | Schemat |
|---|---|
| `numerRspo` | `operator.rspo_number`, `source_record_id` |
| `nip` | `operator.nip` |
| `regon` | `operator.regon` |
| `nazwa` | `name` |
| `typ.nazwa` | `site_type` = `school`, `raw.school_type` |
| `podmiotProwadzacy[0].nazwa` | `operator.name` |
| `podmiotProwadzacy[0].regon` | `operator.regon`, jeśli brak REGON placówki |
| `podmiotProwadzacy[0].typ` | `operator.type` |
| `wojewodztwo` + `wojewodztwoKodTERYT` | `address.voivodeship`, `voivodeship_teryt` |
| `powiat` + `powiatKodTERYT` | `address.county`, `county_teryt` |
| `gmina` + `gminaKodTERYT` | `address.commune`, `commune_teryt` |
| `miejscowosc` + `miejscowoscKodTERYT` | `address.city`, `locality_teryt` |
| `ulica`, `numerBudynku`, `numerLokalu` | `address.street`, `building_number`, `unit_number` |
| `kodPocztowy`, `poczta` | `address.postal_code`, `address.city` |
| `geolokalizacja[0].latitude/longitude` | `geo.lat`, `geo.lon`, `precision=building` |
| `telefon`, `email`, `stronaInternetowa` | `contact.*` |
| brak | `aed.present` = `false` lub `unknown` |

RSPO jest dobrym źródłem **szkół jako potencjalnych miejsc AED** i organów
prowadzących. Nie zawiera informacji o AED.

## 8. OLiOC

| Element | Wartość |
|---|---|
| Strona | `https://www.gov.pl/web/olioc` - 200 |
| Program | `https://www.gov.pl/web/olioc/program-ochrony-ludnosci-i-obrony-cywilnej-na-lata-2025-2026` |
| PDF | `https://www.gov.pl/attachment/da247bc8-1645-4db4-be61-00bc33be724e` |
| Publikacja | Monitor Polski 2025, poz. 541, 43 strony |
| Platforma | `https://platformaolioc.edu.pl/`, wymaga logowania, nie jest rejestrem danych |
| API / dane | brak, tylko HTML i PDF |
| Licencja | gov.pl CC BY-SA 4.0 |
| Aktualizacja | dokument programowy, zmieniany komunikatami i nowelizacjami |
| AED | **nie**, w PDF brak słów „AED”, „defibrylator”, „automatyczny” |

OLiOC to **Program Ochrony Ludności i Obrony Cywilnej** na lata 2025-2026,
prowadzony przez MSWiA. Nie jest rejestrem AED ani bazą lokalizacji. Pola
dokumentu: cele programu, kategorie wydatków, podmioty uprawnione (JST, PSP,
OSP, podmioty OLiOC, NGO), rodzaje sprzętu i zadań, harmonogram, finansowanie.
Brak listy lokalizacji i pól adresowych. Nie ma sensu traktować go jako
źródła miejsca. Ewentualnie można użyć jako kontekstu dla `operator.type` lub
`provenance.attribution`.

## 9. Rekomendowana kolejność wdrażania

1. **dane.gov.pl, 4 zbiory AED**: pierwszy import, jawne AED i współrzędne.
   Osobne adaptery dla Krosna, Przemyśla, Marek i Warszawy.
2. **KSRG/OSP**: import miesięczny PDF, normalizacja gmin i miejscowości,
   geokodowanie. `aed.explicit=false`, `aed.present=true`. Największy zasięg.
3. **NFZ Terminy 1.4.3**: placówki medyczne ze współrzędnymi, wykorzystać
   `registry-number` do połączenia z RPWDL.
4. **NFZ Umowy 1.2**: świadczeniodawcy i adresy, uzupełnienie operatorów.
5. **RPWDL**: import ręczny lub przez uzgodniony dostęp, tylko jako
   wzbogacenie operatora i struktury placówek. Nie scrape'ować reCAPTCHA.
6. **RSPO**: po uzyskaniu Basic Auth, szkoły jako potencjalne miejsca AED i
   organy prowadzące. Fallback: XLSX z dane.gov.pl, bez współrzędnych.
7. **OLiOC**: pominąć w pipeline AED, zachować jako dokument kontekstowy.

## 10. Łączenie i deduplikacja

### 10.1. Klucze

| Klucz | Źródła | Siła |
|---|---|---|
| numer księgi rejestrowej RPWDL | RPWDL, NFZ Terminy, NFZ Umowy | bardzo wysoka |
| REGON | RPWDL, NFZ, RSPO | wysoka, może dotyczyć całego podmiotu |
| NIP | RPWDL, NFZ, RSPO | wysoka dla podmiotu prawnego |
| numer RSPO | RSPO | wysoka dla placówki oświatowej |
| kod świadczeniodawcy NFZ | NFZ | wysoka w obrębie NFZ |
| TERYT gminy + adres | wszystkie | średnia, wymaga normalizacji |
| nazwa + miejscowość | KSRG, dane.gov.pl | niska, wymaga fuzzy match |

### 10.2. Procedura

1. Dopasuj po numerze księgi rejestrowej, potem REGON, potem NIP.
2. Jeśli brak kluczy, normalizuj adres: ulica bez „ul.”, numer budynku,
   kod pocztowy, miejscowość. Porównaj odległość punktów.
3. Scal, jeśli odległość <= 50 m lub adres jest identyczny po normalizacji.
4. Nie scalaj urządzeń AED tylko dlatego, że są w tej samej placówce. Dwa
   AED w jednym budynku to dwa urządzenia. `aed.count` może być > 1.
5. Zachowaj wszystkie `source_record_id` w tabeli `place_source`, rekord
   kanoniczny w `place`.

### 10.3. Konflikty

- KSRG mówi „AED jest”, dane.gov.pl mówi „AED jest”, ale punkt jest inny.
  Zachowaj punkt z dane.gov.pl jako `geo`, KSRG jako `operator` i
  `aed.present`. Nie nadpisuj punktu geokodowaniem.
- NFZ Terminy ma `latitude=null`, NFZ Umowy ma adres. Geokoduj adres i
  oznacz `precision=street` lub `building`.
- RPWDL i NFZ mają różne nazwy tego samego podmiotu. Preferuj nazwę z RPWDL
  jako `operator.name`, nazwę handlową z NFZ jako `name` placówki.
- Warszawa ma `device_availability` tekstowe. Znormalizuj do
  `availability_24_7=yes/no/unknown` i zachowaj oryginał w `raw`.

## 11. Geokodowanie i jakość

| Źródło | Precyzja natywna | Co robić |
|---|---|---|
| dane.gov.pl AED | punkt, EPSG:4326 | użyć bez geokodowania, naprawić osie |
| KSRG | gmina + miejscowość | geokodować miejscowość, potem budynek OSP, `precision=locality` lub `building` |
| RPWDL | adres | geokodować do budynku, `precision=building` |
| NFZ Terminy | punkt, EPSG:4326, czasem null | użyć punktu, fallback adres |
| NFZ Umowy | adres + TERYT | geokodować do budynku, `precision=building` |
| RSPO | punkt, EPSG:4326 | użyć punktu, zweryfikować zakresy |
| OLiOC | brak | nie dotyczy |

Zalecany geokoder: PRG/TERYT dla gminy i miejscowości, następnie NGII/OSM dla
budynku. Dla KSRG nie używać centroidu gminy, bo błąd może wynosić kilka
kilometrów. Dla OSP w małych miejscowościach centroid miejscowości jest
akceptowalny jako fallback z `precision=locality`.

Walidacja:

- punkt w Polsce: lat 49.0-54.9, lon 14.1-24.2,
- odległość od centroidu gminy < 30 km,
- dla OSP nazwa miejscowości z `Nazwa JOP` zgodna z przypisaną miejscowością,
- dla placówek medycznych numer księgi rejestrowej zgodny między NFZ i RPWDL.

## 12. Licencje i obowiązki prawne

| Źródło | Licencja | Obowiązki |
|---|---|---|
| dane.gov.pl, Krosno | CC0 1.0 | brak obowiązków, opcjonalnie podać źródło |
| dane.gov.pl, Przemyśl | CC0 1.0 | brak obowiązków, opcjonalnie podać źródło |
| dane.gov.pl, Marki | CC BY 4.0 | podać autora, tytuł, źródło, link do licencji |
| dane.gov.pl, Warszawa | CC BY 4.0 | podać autora, tytuł, źródło, link do licencji |
| KSRG/OSP gov.pl | CC BY-SA 4.0 (domyślnie) | podać źródło, zachować share-alike dla opracowań tekstu |
| Karta OSP | brak jawnej licencji | nie publikować bez zgody KG PSP |
| RPWDL | brak jawnej licencji open data | potwierdzić warunki w CeZ, nie publikować bulk bez zgody |
| NFZ Terminy | regulamin API, CC BY 4.0 dla zbiorów NFZ (potwierdzić) | podać źródło i datę migawki |
| NFZ Umowy | CC BY 4.0 | podać źródło i rok umowy |
| RSPO | regulamin API, brak open data | przestrzegać wniosku i regulaminu, nie redystrybuować bez zgody |
| RSPO XLSX | CC BY 4.0 | podać źródło i datę |
| OLiOC | CC BY-SA 4.0 | podać źródło, share-alike |

Licencja zbioru w dane.gov.pl jest polem `license_name` i może się różnić
między zasobami tego samego zbioru. Sprawdzać przy każdym imporcie.

## 13. Luki, ryzyka i pytania otwarte

1. **Brak krajowego rejestru AED.** Cztery miasta to zbyt mało. Trzeba
   zaplanować import z OSM (`emergency=defibrillator`) lub warstwy GUGIK
   „Defibrylatory”, ale to osobne źródła poza tym raportem.
2. **KSRG nie ma adresów.** Geokodowanie OSP to główne ryzyko jakości.
3. **RPWDL nie ma otwartego API.** Nie budować produktu na scrapingu
   reCAPTCHA. Wniosek do CeZ lub ręczne raporty.
4. **RSPO wymaga wniosku i Basic Auth.** Brak licencji open data. Zaplanować
   czas na akceptację i nie publikować surowych danych bez zgody.
5. **NFZ pokrywa tylko świadczeniodawców.** Szpitale i przychodnie bez umowy
   z NFZ nie wystąpią. Terminy dodatkowo tylko z listami oczekujących.
6. **Warszawa wymaga tokenu.** Nie wiadomo, czy token jest darmowy i jaki ma
   limit. Sprawdzić w UM Warszawa.
7. **CRS w RSPO nie jest zadeklarowany.** Potwierdzić przy pierwszym pobraniu.
8. **CRS w GML Przemyśla nie jest zadeklarowany.** Wartości są geograficzne,
   ale `lat lon` bez `srsName` jest podatne na błąd.
9. **Marki CSV jest uszkodzony.** Nie używać parsera CSV bez obejścia.
10. **Aktualność zbiorów miejskich.** Krosno 2024, Przemyśl 2024, Marki 2025,
    Warszawa codziennie. Różnica może wprowadzać nieaktualne punkty.
11. **Brak właściciela urządzenia.** W większości źródeł operatorem jest
    gmina lub placówka, a nie podmiot odpowiedzialny za AED.
12. **Dane osobowe.** RSPO zawiera imię i nazwisko dyrektora, RPWDL dane
    kontaktowe. Nie publikować bez podstawy prawnej.

## 14. Minimalny zestaw pól do pierwszego wdrożenia

1. `source`, `source_record_id`, `name`, `site_type`.
2. `operator.name`, `operator.type`, `operator.regon`,
   `operator.rpwdl_ledger_number`.
3. `address.street`, `building_number`, `postal_code`, `city`, `commune`,
   `commune_teryt`, `county`, `voivodeship`.
4. `geo.lat`, `geo.lon`, `epsg`, `precision`, `method`.
5. `aed.present`, `aed.explicit`, `aed.count`, `aed.public_access`,
   `aed.availability_24_7`.
6. `contact.phone`, `contact.email`, `contact.website`.
7. `provenance.license`, `fetched_at`, `source_updated_at`, `confidence`.

Najważniejsze: od początku rozdzielać `aed.explicit` od `aed.present`, bo
KSRG daje obecność z warunku, a nie z rejestru urządzeń.

## 15. Aneks: dowody i dokładne adresy

### 15.1. dane.gov.pl

- `https://api.dane.gov.pl/spec/1.4` - 200, `application/vnd.api+json`,
  ok. 318 KB, OpenAPI 3.0.0.
- `GET /1.4/datasets?title=defibrylator&per_page=100` - 4 zbiory.
- `GET /1.4/datasets?q=AED&per_page=100` - 70 zbiorów, w tym fałszywe
  trafienia (np. „Społeczeństwo informacyjne w liczbach”).
- `GET /1.4/resources/54632/data?page=1&per_page=2` - kolumny `col1..col6`
  bez nazw, nazwy tylko w nagłówku CSV.
- `GET /1.4/resources/54632/file` - 302 na plik CSV.
- `GET /1.4/resources/2512040/data` - pusty zbiór, bo to dokumentacja API.
- Backend 2.63.0 potwierdza filtry i limity:
  `dane.gov.pl/backend_2.63.0.zip`,
  `mcod/datasets/deserializers.py` (`per_page` max 100),
  `mcod/resources/deserializers.py`.

### 15.2. KSRG

- `https://www.gov.pl/web/kgpsp/osp-w-ksrg` - 200, linki do PDF.
- PDF 2026.11 - 72 strony, 5363 pozycje, stan na 11.11.2026.
- Kolumny: `Lp.`, `Województwo`, `Powiat`, `Gmina`, `Nazwa JOP`.
- Warunek KSRG: „zestaw ratownictwa medycznego R-1 oraz AED”.
- Karta OSP: `https://www.gov.pl/attachment/fc1c5b37-f915-4eca-b03d-226b163fadfd`
  - DOCX, pole `AED (min. 1 szt.)`, `Numer Jednostki w SWD-PSP`, `KRS`.

### 15.3. RPWDL

- `GET https://rpwdl2.ezdrowie.gov.pl/api/rpwdl-public-resource/public-report/available/get`
  - 200, JSON z linkami Power BI.
- `GET https://rpwdl2.ezdrowie.gov.pl/api/rpwdl-healthcare-provider-ledger/medical-facilities?medicalFacilityCriteria=`
  - 500, brak `recaptchaToken`.
- `https://rpwdl2.ezdrowie.gov.pl/wyszukiwarka` - Angular SPA.
- Brak publicznej dokumentacji API i bulk exportu.

### 15.4. NFZ

- Terminy 1.4.3: `https://apinfz.nfz.gov.pl/app-itl-api-pcus/` - 200.
- Swagger: `.../swagger/v1.4/swagger.json` - 200, OpenAPI 3.0.4.
- Przykład kolejki zwraca `latitude`, `longitude`, `registry-number`,
  `provider-code`; współrzędne mogą być null.
- Terminy 1.3: `https://api.nfz.gov.pl/app-itl-api/` - nieaktualne.
- Umowy 1.2: `https://api.nfz.gov.pl/app-umw-api/`, provider zwraca
  `branch`, `code`, `name`, `nip`, `regon`, `registry-number`, `post-code`,
  `street`, `place`, `phone`, `commune`.
- Licencja zbioru „API Umowy NFZ” (ID 1734): CC BY 4.0.

### 15.5. RSPO

- `https://api.rspo.gov.pl/v3/api-docs` - 200, OpenAPI 3.1.0, API 1.2.0,
  `securitySchemes.basicAuth`.
- `https://api.rspo.gov.pl/api` bez danych - 401.
- `https://api.rspo.gov.pl/swagger-ui/index.html` - 200.
- `/api/placowki/` ma filtry TERYT, RSPO, NIP, REGON i zwraca `PlacowkaDTO`
  z `geolokalizacja`.
- Dostęp: `rspo@cie.gov.pl`, odpowiedź do 14 dni.

### 15.6. OLiOC

- `https://www.gov.pl/web/olioc/program-ochrony-ludnosci-i-obrony-cywilnej-na-lata-2025-2026`
  linkuje PDF `Program_Ochrony_Ludnośc_i_Obrony_Cywilnej.pdf`.
- PDF Monitor Polski 2025 poz. 541, 43 strony.
- Brak trafień na „AED”, „defibrylator”, „automatyczny”.
- Brak API i listy lokalizacji.

Koniec raportu.
