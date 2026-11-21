# Znormalizowany inwentarz 69 źródeł AED

**Data:** 2026-11-21 · **Status:** artefakt roboczy lane'u `source-inventory` · **Wersja:** 1.0

Pliki:

| Plik | Rola |
| --- | --- |
| [`normalized-source-inventory.csv`](./normalized-source-inventory.csv) | 69 źródeł, znormalizowane pola, priorytety, connector/parser, licencje, TERYT, blockery |
| [`../raw/voivodeships/national-registries.csv`](../raw/voivodeships/national-registries.csv) | surowy inwentarz wejściowy 69 źródeł |
| [`../raw/voivodeships/national-registries.md`](../raw/voivodeships/national-registries.md) | opis klas A/B+/B/B- i rekomendacje |
| [`../raw/voivodeships/national-scan-method.md`](../raw/voivodeships/national-scan-method.md) | metoda skanu i ograniczenia pokrycia |
| [`../../ingest-source-config.md`](../../ingest-source-config.md) | kontrakt `connector.family` / `parser`, mapping DSL, dryf |
| [`../../aed-data-sources-common-schema.md`](../../aed-data-sources-common-schema.md) | model kanoniczny, `source`, `coverage_teryt`, TERYT |

## 1. Cel i zakres

Ten dokument normalizuje surowy audyt 69 rejestrów JST do postaci, którą można
wprost wykorzystać w lane’u connector-config. Nie zmienia faktów z audytu:
przypisuje każdemu źródłu stabilny `source_id`, priorytet wdrożeniowy, rodzinę
connectora i parser, status licencji, status TERYT oraz listę blockerów.

Zakres to **69 źródeł** z `national-registries.csv`: 11 klasy A, 5 B+, 44 B i 9 B-.
Pozycja `OpenAEDMap / OSM` jest źródłem krajowym; pozostałe 68 to rejestry lokalne.
Inwentarz nie obejmuje źródeł aplikacyjnych z `aggregator-apps.md` (SOS DAE,
Ratuj z Sercem, InfoRatunek itd.); te mają osobny raport i osobną bramkę licencyjną.

## 2. Co znaczy "znormalizowany"

1. **Stabilny `source_id`** w ASCII, niezależny od nazwy wyświetlanej i od URL.
2. **Jedna rodzina connectora i jeden parser** na źródło, zgodne z macierzą
   z `ingest-source-config.md` §4.3. Dla źródeł manualnych: `manual` / `none`.
3. **Priorytet P0-P3 i faza rollout** zgodne z `aed-data-sources-common-schema.md`
   §1.4 oraz `rollout-testing-acceptance.md`.
4. **`readiness`** opisuje gotowość techniczną, a nie zgodę prawną. Brak licencji
   jest osobnym polem `license_status` i osobnym blockerem.
5. **`publish_enabled`** jest `true` tylko wtedy, gdy licencja pozwala na
   redystrybucję i nie ma blokady tokena. To nie jest decyzja prawna, tylko
   domyślna bramka techniczna z `observability-licensing.md`.
6. **TERYT** jest przypisany na poziomie gminy (7 znaków), powiatu (4 znaki),
   województwa (2 znaki) albo kraju. `present_derived` oznacza kod gminy
   miejsko-wiejskiej odtworzony z kodu miasta przez zmianę ostatniej cyfry
   na `3`; taki kod wymaga potwierdzenia w PRG/TERYT przed produkcją.
7. **`blockers`** to lista kodów rozdzielonych `;`. Kody są stabilne i opisane
   w §7. Nie są to komunikaty dla użytkownika.

## 3. Priorytety i fazy

| Priorytet | Faza | Kryterium | Liczba | Źródła |
| --- | ---: | --- | ---: | --- |
| **P0** | 1 | Otwarta licencja, maszynowy dostęp, źródło bazowe lub wzorcowy connector. Wchodzi w fazę 1. | 2 | OpenAEDMap / OSM, Przemyśl |
| **P1** | 2 | Wysoka wartość i gotowy format, ale wymaga tokena, zgody na KML/ToS albo naprawy formatu. Faza 2. | 9 | Zielona Góra, Marki, Warszawa, Krosno, Tczew, Olsztyn, Bełchatów, Łódź, Pawłowice |
| **P2** | 3 | Oficjalny rejestr lokalny bez współrzędnych lub z ekstrakcją PDF/HTML. Wymaga geokodowania i zgody. Faza 3. | 32 | Sława, Tarnów Opolski, Czarne, Manowo, Suszec, Kobierzyce, Polkowice, Strzegom, Bydgoszcz, Toruń, Lublin, Nieporęt, Kraków, powiat bocheński, Łomża, Gdańsk, Kosakowo, Nowa Wieś Lęborska, Pruszcz Gdański, Szemud, Słupsk, powiat starogardzki, Żukowo, Lwówek, Piła, Przemęt, Suchy Las, powiat szamotulski, Śmigiel, Czaplinek, Kołbaskowo, Gorzyce |
| **P3** | 4 | Mały, niepełny albo manualny zbiór; brak maszynowego dostępu lub tylko nazwy. Faza 4 albo partnerstwo. | 26 | Góra, Lubin (gmina wiejska), Brzeźnica, Budzów, Jordanów, Lubień, Radłów, Wierzchosławice, powiat krakowski, Biskupiec, Lubawa, Ostróda, Koźmin Wielkopolski, Barlinek, Połczyn-Zdrój, Świdwin, Imielin, Dziadowa Kłoda, Kcynia, UMWL - instytucje kultury, Nowa Sól (miasto), Świdnica (gmina), Rzekuń, Żuromin, Dopiewo, Koszęcin |

Rozkład klas w priorytetach:

| Klasa | P0 | P1 | P2 | P3 | Razem |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 2 | 9 | 0 | 0 | 11 |
| B+ | 0 | 0 | 5 | 0 | 5 |
| B | 0 | 0 | 27 | 17 | 44 |
| B- | 0 | 0 | 0 | 9 | 9 |
| **Razem** | 2 | 9 | 32 | 26 | **69** |

Uwaga: priorytet nie jest tym samym co klasa. Klasa A oznacza format maszynowy,
ale 6 z 11 źródeł A to KML z Google My Maps bez otwartej licencji. Dlatego
Zielona Góra, Łódź, Olsztyn, Bełchatów, Pawłowice i Tczew są P1 tylko
warunkowo: parser jest gotowy, ale publikacja jest zablokowana do uzyskania zgody.

## 4. Connector i parser

| Rodzina / parser | Liczba | Zastosowanie | Główne ograniczenia |
| --- | ---: | --- | --- |
| `html_table` / `html_table` | 38 | Oficjalna tabela lub lista HTML. Zawsze `review`, heurystyka kolumn, brak licencji. | — |
| `manual` / `none` | 20 | PDF, DOCX, JPG/PNG, e-mapa, wyniki wyszukiwania albo lista bez stabilnej struktury. Transkrypcja przez człowieka. | — |
| `google_my_maps_kml` / `kml` | 6 | Osadzone mapy Google My Maps z punktami. Wymaga zamiany `mid` na URL KML i walidacji typu Placemark. | — |
| `http_json` / `json` | 2 | REST JSON z paginacją lub POST z tokenem. | — |
| `file_static` / `csv` | 2 | CSV/XLSX z jednego URL. Wymaga napraw encoding/quoting/osie. | — |
| `file_static` / `geojson` | 1 | Jeden duży GeoJSON kraju. Warunkowe pobranie po ETag/Last-Modified. | — |

Źródła wymagające szczególnej uwagi przy mapowaniu:

- **Marki** (`file_static`/`csv`): podwójne cytowanie całego wiersza, `""` w środku, osie zamienione, wiersz poza bbox.
- **Krosno** (`file_static`/`csv`): BOM i wiodące spacje w nagłówkach; `utf-8-sig` + `trim_headers`.
- **Przemyśl** (`http_json`/`json`): domyślnie 10 z 21 wierszy; wymagany `limit` i `total_path`.
- **Warszawa** (`http_json`/`json`): POST z tokenem; bez tokena 403; `coordinates` czasem zagnieżdżone.
- **KML A** (`google_my_maps_kml`/`kml`): sześć map z punktami; brak licencji i wersjonowania.
- **Bydgoszcz i Piła**: KML istnieje, ale nie nadaje się do punktów (brak geometrii albo polygony zasięgu).
- **e-mapa** (Pruszcz Gdański, Barlinek, Koźmin Wielkopolski, Imielin): dane ładowane JavaScriptem; `manual`.

## 5. Licencje i bramka publikacji

| Licencja | Liczba | `license_status` | `publish_enabled` | Źródła |
| --- | ---: | --- | --- | --- |
| `ODbL-1.0` | 1 | open | 1 | OpenAEDMap / OSM |
| `CC0-1.0` | 2 | open | 2 | Przemyśl, Krosno |
| `CC-BY-4.0` | 2 | open | 1 | Marki, Warszawa |
| `NOASSERTION` | 64 | noassertion | 0 | Zielona Góra, Tczew, Olsztyn, Bełchatów, Łódź, Pawłowice, Sława, Tarnów Opolski, Czarne, Manowo, Suszec, Kobierzyce, Polkowice, Strzegom, Bydgoszcz, Toruń, Lublin, Nieporęt, Kraków, powiat bocheński, Łomża, Gdańsk, Kosakowo, Nowa Wieś Lęborska, Pruszcz Gdański, Szemud, Słupsk, powiat starogardzki, Żukowo, Lwówek, Piła, Przemęt, Suchy Las, powiat szamotulski, Śmigiel, Czaplinek, Kołbaskowo, Gorzyce, Góra, Lubin (gmina wiejska), Brzeźnica, Budzów, Jordanów, Lubień, Radłów, Wierzchosławice, powiat krakowski, Biskupiec, Lubawa, Ostróda, Koźmin Wielkopolski, Barlinek, Połczyn-Zdrój, Świdwin, Imielin, Dziadowa Kłoda, Kcynia, UMWL - instytucje kultury, Nowa Sól (miasto), Świdnica (gmina), Rzekuń, Żuromin, Dopiewo, Koszęcin |

Wnioski licencyjne:

- **Tylko 5 źródeł ma otwartą licencję:** OpenAEDMap (ODbL), Przemyśl i Krosno
  (CC0) oraz Marki i Warszawa (CC BY). Warszawa ma dodatkowo blokadę tokena.
- **64 źródła mają `NOASSERTION`.** To nie znaczy "domena publiczna". Oznacza
  brak deklaracji i konieczność pisemnej zgody przed pobieraniem i publikacją.
- **6 KML z Google My Maps** nie ma licencji, a sam endpoint KML jest
  nieudokumentowany i objęty ToS Google. Nie wolno traktować HTTP 200 jako zgody.
- **Brak licencji nie blokuje pracy analitycznej**, ale blokuje `publish.enabled`
  i automatyczną ingestię do danych publicznych. Wyjątkiem jest wewnętrzny
  dry-run/shadow, który nie zapisuje danych kanonicznych.
- **CC BY 4.0 (Marki, Warszawa)** wymaga atrybucji i nie jest share-alike;
  nie mieszać jej po cichu z ODbL. Eksport powinien rozdzielać zasoby.

## 6. TERYT

| Status | Liczba | Znaczenie |
| --- | ---: | --- |
| `present` | 59 | kod gminy (7), powiatu (4) lub województwa (2) potwierdzony w Wikidata P1653 |
| `present_derived` | 4 | kod gminy miejsko-wiejskiej odtworzony z kodu miasta (ostatnia cyfra `3`) |
| `present_partial` | 1 | tylko kod województwa; źródło obejmuje wycinek województwa |
| `missing` | 4 | brak kodu TERYT w Wikidata i brak potwierdzenia w innym źródle |
| `not_applicable` | 1 | źródło krajowe, TERYT nie dotyczy |

**Braki TERYT (4):** Manowo, Budzów, Dziadowa Kłoda, Kołbaskowo.
**Kody pochodne (4):** Barlinek `3210013`, Połczyn-Zdrój `3216033`,
Czarne `2203023`, Biskupiec `2814023`. **Częściowy:** UMWL `06` (województwo lubelskie).

Metoda i ograniczenia:

- Kody pobrano z Wikidata `P1653` (TERC municipality code) i przefiltrowano po
  prefiksie województwa, żeby odrzucić jednostki o tej samej nazwie w innym
  województwie (np. Góra, Gorzyce, Świdnica, Lubin).
- To **nie jest oficjalny rejestr GUS**. Wikidata bywa niepełna i miesza kody
  miast z kodami gmin miejsko-wiejskich. Dlatego `present_derived` i
  `present_partial` wymagają potwierdzenia w PRG/TERYT przed produkcją.
- Dla źródeł powiatowych użyto kodu powiatu (4 znaki), a nie kodu gminy.
- Dla źródeł miejskich w gminie miejsko-wiejskiej użyto kodu gminy (7 znaków,
  końcówka `3`), bo rejestr obejmuje zwykle miasto i obszar wiejski.
- Brak TERYT nie blokuje parsera, ale blokuje raport pokrycia per gmina
  i normalizację adresu do `teryt_commune`/`simc`/`ulic`.

## 7. Katalog blockerów

| Kod | Liczba | Znaczenie | Działanie |
| --- | ---: | --- | --- |
| `LICENSE_NOASSERTION` | 58 | Brak deklaracji licencji. | Kontakt z wydawcą; `publish=false` do zgody. |
| `NO_COORDS` | 52 | Źródło nie ma współrzędnych. | Geokodowanie lub ręczne uzupełnienie; `confidence` niżej. |
| `GEOCODE_REQUIRED` | 43 | Adres jest, ale brak geometrii. | Geokodowanie z `address_source` i `coord_precision_m`. |
| `PARTIAL_LIST` | 7 | Lista może być niepełna. | Oznacz `verification_status` niżej; nie usuwaj rekordów z OSM. |
| `LICENSE_GOOGLE_TOS` | 6 | KML z Google My Maps objęty ToS. | Nie pobierać masowo; wystąpić o dane lub odtworzyć z OSM. |
| `UNVERSIONED_ENDPOINT` | 6 | Brak wersjonowania i stabilnego kontraktu. | Snapshot + hash; dry-run przed każdym przebiegiem. |
| `NO_ADDRESS` | 5 | Brak adresu i współrzędnych. | Tylko `candidate`; nie publikować jako punkt. |
| `TERYT_DERIVED` | 4 | Kod TERYT odtworzony, niepotwierdzony. | Potwierdzić w PRG/TERYT. |
| `TERYT_MISSING` | 4 | Brak kodu TERYT. | Uzupełnić z PRG/TERYT/BIP powiatu. |
| `IMAGE_ONLY` | 4 | Tabela lub mapa tylko jako JPG/PNG. | OCR lub transkrypcja; `confidence` niżej. |
| `OCR_REQUIRED` | 4 | Wymagany OCR lub transkrypcja obrazu. | Kolejka manualna. |
| `E_MAPA_JS` | 4 | Dane e-mapa ładowane JavaScriptem. | `manual`; nie omijać zabezpieczeń. |
| `SEARCH_RESULTS_ONLY` | 4 | Lista tylko w wynikach wyszukiwania. | Manualna transkrypcja; sprawdzić pełną stronę. |
| `PDF_EXTRACTION` | 3 | Dane w PDF. | Ekstrakcja tekstu; jeśli brak warstwy tekstowej, OCR. |
| `DUPLICATE_LOCATIONS` | 2 | Więcej urządzeń lub duplikatów w jednej lokalizacji. | Deduplikacja po urządzeniu; `on_duplicate=warn`. |
| `PARTIAL_ADDRESS` | 2 | Adres bez numeru lub niepełny. | Geokodowanie z niższą precyzją; `review`. |
| `PAGINATION_DEFAULT_10` | 1 | API domyślnie zwraca 10 wierszy. | Wymusić `limit` i porównać z `total_rows`. |
| `CSV_QUOTING` | 1 | Podwójne cytowanie całego wiersza. | `unwrap_outer_quotes` + `repair_double_quotes`. |
| `AXIS_ORDER` | 1 | Kolejność osi niezgodna z nagłówkiem. | Mapować wg danych, wąski bbox, `review`. |
| `OUT_OF_AREA_ROW` | 1 | Rekord poza obszarem jednostki. | `review`, nie publikować. |
| `TOKEN_REQUIRED` | 1 | API wymaga tokena. | `auth.header` + `env`; `enabled=false` bez tokena. |
| `CSV_BOM_HEADERS` | 1 | BOM i spacje w nagłówkach. | `utf-8-sig` + `trim_headers`. |
| `KML_NO_GEOMETRY` | 1 | KML bez współrzędnych. | Traktować jako listę adresów, nie punkty. |
| `STALE_DATA` | 1 | Dane mogą być nieaktualne. | Weryfikacja terenowa; `last_verified_at` z źródła. |
| `KML_POLYGON_ONLY` | 1 | KML zawiera polygony zasięgu, nie punkty AED. | Nie tworzyć rekordów AED. |
| `GOOGLE_MAPS_LINKS` | 1 | Lokalizacja tylko przez link Google Maps. | Geokodowanie lub manualnie; `review`. |
| `DOCX_EXTRACTION` | 1 | Dane w DOCX. | Konwersja i ekstrakcja tabeli. |
| `NO_MACHINE_ACCESS` | 1 | Brak publicznego API/eksportu. | Kontakt partnerski; `manual`. |
| `SCOPE_PARTIAL` | 1 | Źródło obejmuje tylko wycinek jednostki. | Oznaczyć zakres; nie traktować jako pełnego rejestru. |
| `TERYT_PARTIAL` | 1 | Kod tylko na poziomie województwa. | Uzupełnić gminę, jeśli źródło ma adresy. |

## 8. Rekomendacje wdrożeniowe

1. **P0 bez zmian:** OpenAEDMap jako warstwa bazowa i Przemyśl jako wzorcowy
   connector miejski. Oba mają otwartą licencję i działający maszynowy dostęp.
2. **P1 najpierw bez licencji:** Marki i Krosno są gotowe do parsera i publikacji;
   Warszawa czeka na token. KML A (Zielona Góra, Łódź, Olsztyn, Bełchatów,
   Pawłowice, Tczew) przygotować jako `dry-run`/`shadow`, ale nie publikować
   bez pisemnej zgody.
3. **B+ podnieść do A:** Sława, Manowo, Tarnów Opolski i Suszec mają HTML
   z współrzędnymi; Czarne wymaga PDF. Wszystkie czekają na zgodę licencyjną.
4. **B traktować jako weryfikację, nie masowy import:** 35 źródeł wymaga
   geokodowania, 8 ekstrakcji PDF/obrazu, 4 e-mapy. Oznaczać `confidence` niżej.
5. **B- nie importować bez weryfikacji:** Kcynia, UMWL, Żuromin, Rzekuń,
   Dziadowa Kłoda, Nowa Sól, Świdnica, Dopiewo, Koszęcin.
6. **Uzupełnić 4 brakujące TERYT:** Manowo, Budzów, Dziadowa Kłoda, Kołbaskowo.
   Klucz: TERYT + BIP powiatu; potwierdzić kody pochodne Barlinek, Połczyn-Zdrój,
   Czarne i Biskupiec.
7. **Nie budować na Geoportal WMS.** To overlay OSM, nie źródło wektorowe.

## 9. Pełna tabela 69 źródeł

Kolumny: `source_id`, jednostka, województwo, TERYT, klasa, priorytet,
rekordy, connector/parser, licencja, readiness, blockery. Pełny zestaw pól
znajduje się w CSV.

| `source_id` | Jednostka | Woj. | TERYT | Klasa | Prio | Rekordy | Connector/parser | Licencja | Readiness | Blockery |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| `openaedmap` | OpenAEDMap / OSM | - | — | A | P0 | 18 299 | `file_static`/`geojson` | `ODbL-1.0` | ready | — |
| `przemysl` | Przemyśl | podkarpackie | 1862011 | A | P0 | 21 | `http_json`/`json` | `CC0-1.0` | ready | PAGINATION_DEFAULT_10 |
| `zielona-gora` | Zielona Góra | lubuskie | 0862011 | A | P1 | 165 | `google_my_maps_kml`/`kml` | `NOASSERTION` | ready_with_review | LICENSE_GOOGLE_TOS;UNVERSIONED_ENDPOINT |
| `marki` | Marki | mazowieckie | 1434021 | A | P1 | 8 | `file_static`/`csv` | `CC-BY-4.0` | ready_with_review | CSV_QUOTING;AXIS_ORDER;OUT_OF_AREA_ROW |
| `warszawa` | Warszawa | mazowieckie | 1465011 | A | P1 | unknown (~622 w docs) | `http_json`/`json` | `CC-BY-4.0` | blocked_token | TOKEN_REQUIRED |
| `krosno` | Krosno | podkarpackie | 1861011 | A | P1 | 21 | `file_static`/`csv` | `CC0-1.0` | ready | CSV_BOM_HEADERS |
| `tczew` | Tczew | pomorskie | 2214011 | A | P1 | 12 | `google_my_maps_kml`/`kml` | `NOASSERTION` | ready_with_review | LICENSE_GOOGLE_TOS;UNVERSIONED_ENDPOINT |
| `olsztyn` | Olsztyn | warmińsko-mazurskie | 2862011 | A | P1 | 43 | `google_my_maps_kml`/`kml` | `NOASSERTION` | ready_with_review | LICENSE_GOOGLE_TOS;UNVERSIONED_ENDPOINT;DUPLICATE_LOCATIONS |
| `belchatow` | Bełchatów | łódzkie | 1001011 | A | P1 | 32 | `google_my_maps_kml`/`kml` | `NOASSERTION` | ready_with_review | LICENSE_GOOGLE_TOS;UNVERSIONED_ENDPOINT |
| `lodz` | Łódź | łódzkie | 1061011 | A | P1 | 136 | `google_my_maps_kml`/`kml` | `NOASSERTION` | ready_with_review | LICENSE_GOOGLE_TOS;UNVERSIONED_ENDPOINT |
| `pawlowice` | Pawłowice | śląskie | 2410042 | A | P1 | 12 | `google_my_maps_kml`/`kml` | `NOASSERTION` | ready_with_review | LICENSE_GOOGLE_TOS;UNVERSIONED_ENDPOINT |
| `slawa` | Sława | lubuskie | 0812013 | B+ | P2 | 13 | `html_table`/`html_table` | `NOASSERTION` | ready_with_review | LICENSE_NOASSERTION |
| `tarnow-opolski` | Tarnów Opolski | opolskie | 1609112 | B+ | P2 | 10 urządzeń / 9 lokalizacji | `html_table`/`html_table` | `NOASSERTION` | ready_with_review | LICENSE_NOASSERTION;DUPLICATE_LOCATIONS |
| `czarne` | Czarne | pomorskie | 2203023 | B+ | P2 | 20 | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;PDF_EXTRACTION;TERYT_DERIVED |
| `manowo` | Manowo | zachodniopomorskie | — | B+ | P2 | 8 | `html_table`/`html_table` | `NOASSERTION` | ready_with_review | LICENSE_NOASSERTION;TERYT_MISSING |
| `suszec` | Suszec | śląskie | 2410062 | B+ | P2 | 5 | `html_table`/`html_table` | `NOASSERTION` | ready_with_review | LICENSE_NOASSERTION |
| `kobierzyce` | Kobierzyce | dolnośląskie | 0223052 | B | P2 | 13 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `polkowice` | Polkowice | dolnośląskie | 0216043 | B | P2 | 21 miejsc / 23 urządzenia | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;PARTIAL_ADDRESS;GEOCODE_REQUIRED |
| `strzegom` | Strzegom | dolnośląskie | 0219063 | B | P2 | 15 miejsc / 19 urządzeń | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `bydgoszcz` | Bydgoszcz | kujawsko-pomorskie | 0461011 | B | P2 | 114 adresów | `html_table`/`html_table` | `NOASSERTION` | blocked_geometry | LICENSE_NOASSERTION;NO_COORDS;KML_NO_GEOMETRY;GEOCODE_REQUIRED |
| `torun` | Toruń | kujawsko-pomorskie | 0463011 | B | P2 | 46 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `lublin` | Lublin | lubelskie | 0663011 | B | P2 | 48 (46 unikalnych adresów) | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;NO_COORDS;PDF_EXTRACTION;GEOCODE_REQUIRED |
| `nieporet` | Nieporęt | mazowieckie | 1408032 | B | P2 | 10 | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;NO_COORDS;PDF_EXTRACTION;GEOCODE_REQUIRED |
| `krakow` | Kraków | małopolskie | 1261011 | B | P2 | 58 w tabeli / 74 deklarowane | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `powiat-bochenski` | powiat bocheński | małopolskie | 1201 | B | P2 | 10 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `lomza` | Łomża | podlaskie | 2062011 | B | P2 | 10 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `gdansk` | Gdańsk | pomorskie | 2261011 | B | P2 | 26 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;STALE_DATA;GEOCODE_REQUIRED |
| `kosakowo` | Kosakowo | pomorskie | 2211052 | B | P2 | 10 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_ADDRESS;NO_COORDS;GEOCODE_REQUIRED |
| `nowa-wies-leborska` | Nowa Wieś Lęborska | pomorskie | 2208042 | B | P2 | 10 | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;NO_COORDS;IMAGE_ONLY;OCR_REQUIRED;GEOCODE_REQUIRED |
| `pruszcz-gdanski` | Pruszcz Gdański | pomorskie | 2204011 | B | P2 | 15 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;E_MAPA_JS;GEOCODE_REQUIRED |
| `szemud` | Szemud | pomorskie | 2215092 | B | P2 | 13 | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;NO_COORDS;IMAGE_ONLY;OCR_REQUIRED;GEOCODE_REQUIRED |
| `slupsk` | Słupsk | pomorskie | 2263011 | B | P2 | 25 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `powiat-starogardzki` | powiat starogardzki | pomorskie | 2213 | B | P2 | 28 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `zukowo` | Żukowo | pomorskie | 2205083 | B | P2 | 27 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;PARTIAL_ADDRESS;GEOCODE_REQUIRED |
| `lwowek` | Lwówek | wielkopolskie | 3015023 | B | P2 | 14 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `pila` | Piła | wielkopolskie | 3019011 | B | P2 | 15 | `html_table`/`html_table` | `NOASSERTION` | blocked_geometry | LICENSE_NOASSERTION;NO_COORDS;KML_POLYGON_ONLY;GEOCODE_REQUIRED |
| `przemet` | Przemęt | wielkopolskie | 3029012 | B | P2 | 21 wpisów / 20 lokalizacji | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GOOGLE_MAPS_LINKS;GEOCODE_REQUIRED |
| `suchy-las` | Suchy Las | wielkopolskie | 3021152 | B | P2 | 12 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `powiat-szamotulski` | powiat szamotulski | wielkopolskie | 3024 | B | P2 | 47 | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;NO_COORDS;DOCX_EXTRACTION;GEOCODE_REQUIRED |
| `smigiel` | Śmigiel | wielkopolskie | 3011053 | B | P2 | 17 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `czaplinek` | Czaplinek | zachodniopomorskie | 3203013 | B | P2 | 11 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `kolbaskowo` | Kołbaskowo | zachodniopomorskie | — | B | P2 | 15 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED;TERYT_MISSING |
| `gorzyce` | Gorzyce | śląskie | 2415062 | B | P2 | 12 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `gora` | Góra | dolnośląskie | 0204013 | B | P3 | 8 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `lubin-gmina` | Lubin (gmina wiejska) | dolnośląskie | 0211022 | B | P3 | 3+ | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;PARTIAL_LIST;GEOCODE_REQUIRED |
| `brzeznica` | Brzeźnica | małopolskie | 1218022 | B | P3 | 6 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `budzow` | Budzów | małopolskie | — | B | P3 | 5 | `manual`/`none` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;SEARCH_RESULTS_ONLY;TERYT_MISSING |
| `jordanow` | Jordanów | małopolskie | 1215011 | B | P3 | 5 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_COORDS;SEARCH_RESULTS_ONLY |
| `lubien` | Lubień | małopolskie | 1209022 | B | P3 | 4 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `radlow` | Radłów | małopolskie | 1216052 | B | P3 | 3 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `wierzchoslawice` | Wierzchosławice | małopolskie | 1216112 | B | P3 | 5 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_COORDS;SEARCH_RESULTS_ONLY |
| `powiat-krakowski` | powiat krakowski | małopolskie | 1206 | B | P3 | 3 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `biskupiec` | Biskupiec | warmińsko-mazurskie | 2814023 | B | P3 | 2 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED;TERYT_DERIVED |
| `lubawa` | Lubawa | warmińsko-mazurskie | 2807021 | B | P3 | 5 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `ostroda` | Ostróda | warmińsko-mazurskie | 2815011 | B | P3 | 6 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `kozmin-wielkopolski` | Koźmin Wielkopolski | wielkopolskie | 3012033 | B | P3 | 3 | `manual`/`none` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;E_MAPA_JS;GEOCODE_REQUIRED |
| `barlinek` | Barlinek | zachodniopomorskie | 3210013 | B | P3 | 8-9 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;E_MAPA_JS;GEOCODE_REQUIRED;TERYT_DERIVED |
| `polczyn-zdroj` | Połczyn-Zdrój | zachodniopomorskie | 3216033 | B | P3 | 8 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED;TERYT_DERIVED |
| `swidwin` | Świdwin | zachodniopomorskie | 3216011 | B | P3 | 5 | `html_table`/`html_table` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;GEOCODE_REQUIRED |
| `imielin` | Imielin | śląskie | 2414021 | B | P3 | 5 | `manual`/`none` | `NOASSERTION` | needs_geocoding | LICENSE_NOASSERTION;NO_COORDS;E_MAPA_JS;GEOCODE_REQUIRED |
| `dziadowa-kloda` | Dziadowa Kłoda | dolnośląskie | — | B- | P3 | 5+ | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_COORDS;SEARCH_RESULTS_ONLY;PARTIAL_LIST;TERYT_MISSING |
| `kcynia` | Kcynia | kujawsko-pomorskie | 0410013 | B- | P3 | 5 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_COORDS;PARTIAL_LIST;NO_MACHINE_ACCESS |
| `umwl-instytucje-kultury` | UMWL - instytucje kultury | lubelskie | 06 | B- | P3 | 10 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;SCOPE_PARTIAL;NO_ADDRESS;TERYT_PARTIAL |
| `nowa-sol` | Nowa Sól (miasto) | lubuskie | 0804011 | B- | P3 | 6 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_ADDRESS;NO_COORDS;PARTIAL_LIST |
| `swidnica-gmina` | Świdnica (gmina) | lubuskie | 0809072 | B- | P3 | 8 | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;NO_COORDS;IMAGE_ONLY;OCR_REQUIRED;GEOCODE_REQUIRED |
| `rzekun` | Rzekuń | mazowieckie | 1415102 | B- | P3 | 13 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_ADDRESS;NO_COORDS;PARTIAL_LIST |
| `zuromin` | Żuromin | mazowieckie | 1437063 | B- | P3 | 7 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_ADDRESS;NO_COORDS;PARTIAL_LIST |
| `dopiewo` | Dopiewo | wielkopolskie | 3021052 | B- | P3 | 11 | `manual`/`none` | `NOASSERTION` | needs_ocr | LICENSE_NOASSERTION;NO_COORDS;IMAGE_ONLY;OCR_REQUIRED;GEOCODE_REQUIRED |
| `koszecin` | Koszęcin | śląskie | 2407062 | B- | P3 | 2 | `manual`/`none` | `NOASSERTION` | manual_transcription | LICENSE_NOASSERTION;NO_COORDS;PARTIAL_LIST |

## 10. Słownik pól CSV

| Pole | Znaczenie |
| --- | --- |
| `source_id` | stabilny identyfikator źródła (ASCII, unikalny) |
| `source_name` | nazwa jednostki lub źródła z audytu |
| `scope` | `national` albo `local` |
| `voivodeship` | województwo; `-` dla źródła krajowego |
| `unit` | jednostka JST |
| `unit_type` | typ jednostki z audytu |
| `teryt` | kod TERYT: gmina 7, powiat 4, województwo 2, kraj pusty |
| `teryt_level` | `commune`, `county`, `voivodeship`, `country` |
| `teryt_status` | `present`, `present_derived`, `present_partial`, `missing`, `not_applicable` |
| `teryt_source` | `wikidata:P1653`, `derived_terc`, `none`, `n/a` |
| `class_raw` | klasa audytu: A, B+, B, B- |
| `priority` | P0-P3 |
| `rollout_phase` | faza rollout 1-4 |
| `readiness` | gotowość techniczna: `ready`, `ready_with_review`, `blocked_token`, `blocked_geometry`, `needs_geocoding`, `needs_ocr`, `manual_transcription` |
| `connector_family` | rodzina connectora z `ingest-source-config.md` |
| `parser` | parser zgodny z rodziną |
| `access_type` | `file`, `api`, `kml`, `html` |
| `license_id` | SPDX lub `NOASSERTION` |
| `license_status` | `open` albo `noassertion` |
| `publish_enabled` | `true` tylko dla otwartej licencji i braku blokady tokena |
| `expected_records` | liczba rekordów w postaci z audytu |
| `records_min` | dolna granica liczby rekordów (liczbowa) |
| `records_max` | górna granica liczby rekordów (liczbowa); puste dla list otwartych |
| `has_coords` | `yes`, `no`, `via_e_mapa`, `via_google_maps` |
| `blockers` | kody blockerów rozdzielone `;` |
| `source_url` | URL rejestru z audytu |
| `verified_at` | data weryfikacji audytu |
| `notes` | krótka charakterystyka i pułapki |

## 11. Czego ten dokument nie rozstrzyga

- **Nie jest opinią prawną.** `NOASSERTION` i `publish=false` to domyślna
  bramka techniczna, a nie decyzja, że dane są chronione.
- **Nie jest oficjalnym rejestrem TERYT.** Kody wymagają potwierdzenia w PRG/TERYT.
- **Nie zawiera pełnych konfiguracji YAML.** To inwentarz i mapping; konkretny
  YAML powstaje w lane’ie connector-config i przechodzi walidację schematu.
- **Nie rozstrzyga deduplikacji.** Priorytety mówią, co importować najpierw,
  a nie który rekord wygrywa w merge. To lane dedup-merge.
