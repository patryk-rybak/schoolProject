# Prezentacja projektu: DANE AED RAZEM

Format slajdów: Markdown. Każdy slajd zawiera dowód w postaci opisu zrzutu ekranu lub wskazania pliku. Wersję apresentacyjną można wygenerować z tego pliku dowolnym narzędziem obsługującym Markdown.

---

## Slajd 1. Tytuł i problem

**DANE AED RAZEM** — otwarty, ogólnopolski zbiór danych o defibrylatorach dla dane.gov.pl.

- Przy nagłym zatrzymaniu krążenia liczy się każda minuta.
- Dane o AED są dziś rozproszone i często niezweryfikowane.
- Portal dane.gov.pl wymaga dostawcy, który odpowiada za zbiór.

Hasło akcji: **Dane darują minuty**.

Dowód: `../logo/dane-aed-razem.png` (logo akcji).

---

## Slajd 2. Architektura rozwiązania

```text
źródła danych → ingest → rekord kanoniczny → store → mapa i formularze → harvester dane.gov.pl
```

- 79 zidentyfikowanych źródeł, 11 skonfigurowanych konektorów.
- Surowy snapshot z SHA-256 przed mapowaniem.
- Deterministyczny feed XML 1.13 i ten sam MD5 dla `feed.xml`.

Dowód: `README.md` → „Architektura i przepływ danych”, „Integracja z dane.gov.pl”.

---

## Slajd 3. Mapa, wyszukiwanie i materiały na stronie głównej

- Mapa Polski z 19 468 punktami z bazy deweloperskiej.
- Kolor punktu oznacza status weryfikacji: zielony = zweryfikowany, szary = niezweryfikowany.
- Kliknięcie punktu pokazuje nazwę, miejscowość i datę weryfikacji.
- Kliknięcie pustego miejsca pozwala dodać brakujący AED.
- Obok mapy jest bezpośredni przycisk **Pobierz dane XLSX** (`/data/aed.xlsx`) z pełną, aktualną bazą AED w wspólnym schemacie (nie z pustym wzorcem).
- Osobne strony `/materialy` i `/dokumentacja` zostały usunięte. Materiały są dostępne z poziomu strony głównej i w repozytorium.

Dowód: `../screenshots/01-mapa.png` (zrzut strony głównej z przyciskiem pobrania).

---

## Slajd 4. Formularz zgłaszania AED: szybko i bez zbędnych pól

Formularz `/dodaj-aed` prowadzi użytkownika krok po kroku:

- rozwinięte są tylko trzy sekcje rdzeniowe: **Podstawowe informacje**, **Lokalizacja / Adres** oraz **Dostępność**,
- pozostałe sekcje z danymi dodatkowymi są domyślnie zwinięte i można je otworzyć tylko wtedy, gdy zgłaszający ma takie informacje,
- **Typ dostępu jest obowiązkowy**. Bez jednoznacznej deklaracji dostępności rekord nie zostaje zapisany,
- współrzędne pochodzą z kliknięcia na mapie albo z geokodowania adresu. Nie trzeba ich wpisywać ręcznie,
- kod pocztowy i województwo uzupełniają się automatycznie po wybraniu punktu. Formularz nie zmusza do ich wpisywania,
- błędy walidacji są zwracane przy konkretnych polach, a wpisane dane nie giną.

Efekt: mieszkaniec podaje minimum niezbędne do pokazania AED na mapie, a instytucja może rozbudować rekord o szczegóły.

Dowód: `../screenshots/02-dodaj-aed.png` (formularz z trzema otwartymi sekcjami).

---

## Slajd 5. Pełny eksport XLSX i wzorcowy zakres

Przycisk **Pobierz dane XLSX** na stronie głównej (`/data/aed.xlsx`) pobiera całą bazę AED znormalizowaną do wspólnego rekordu: jeden wiersz na urządzenie, wyłącznie polskie nazwy kolumn: `id` (stabilny UUID), `nazwa_obiektu`, `szerokosc_geo`, `dlugosc_geo`, `miejscowosc`, `typ_dostepnosci`, `status_sprawnosci`, `status_weryfikacji`, `zweryfikowane_przez`, `typ_weryfikatora`, `data_weryfikacji`, `identyfikator_kanoniczny`, `zrodlo_danych`, `identyfikator_w_zrodle`, `url_zrodla`, `status_lokalizacji`, `zrodlo_geometrii`, `data_utworzenia` i `data_aktualizacji`.

Osobny plik `../wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx` jest wyłącznie statyczną dokumentacją wzorca (6 kart), nie eksportem danych. Jego pola są uporządkowane według praktyki dane.gov.pl / DCAT-AP:

- **Wymagane**: `id`, `nazwa_obiektu`, `szerokosc_geo (WGS84)`, `dlugosc_geo (WGS84)`, `miejscowosc`, `typ_dostepnosci`, `data_aktualizacji`.
- **Zalecane**: `ulica`, `nr_budynku`, `opis_lokalizacji`, `godziny_otwarcia`, `wewnatrz_zewnatrz`, `status_sprawnosci`, `opiekun_nazwa`, `opiekun_kontakt`.
- **Opcjonalne**: `producent_model`, `elektrody_pediatryczne`, `data_waznosci_baterii`, `data_waznosci_elektrod`, `url_zdjecia`.

Takie rozdzielenie pozwala ocenić kompletność zgłoszenia bez karania obywatela za brak szczegółów technicznych.

---

## Slajd 6. Pola generowane przez system w eksportach

Pola obsługowe nie są wymagane od osoby zgłaszającej AED w formularzu, ale znajdują się w eksportach CSV, GeoJSON i XLSX:

- `id` to stabilny UUID rekordu,
- `data_utworzenia` to data założenia rekordu,
- `data_aktualizacji` to data ostatniej zmiany,
- `zrodlo_danych` wskazuje pochodzenie danych i odpowiedzialnego dostawcę,
- `status_weryfikacji` informuje, czy rekord został potwierdzony.

Dzięki temu zbiór ma spójne provenance, historię i jawny status jakości.

Dowód: `../../backend/gov-api/csv.ts`, `../../backend/gov-api/xlsx.ts`, `../../backend/gov-api/geojson.ts`, `../wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx`.

---

## Slajd 7. Podłączanie nowych źródeł

- Kreator `/zrodla/nowe` obsługuje pliki CSV/XLSX/JSON/GeoJSON/KML, SQLite, PostgreSQL i S3.
- Podgląd pokazuje kolumny i pięć przykładowych wierszy przed zapisem.
- Mapowanie pól na rekord kanoniczny odbywa się w interfejsie.
- Import podaje liczbę wierszy wczytanych, przyjętych i odrzuconych.

Dowód: `../screenshots/03-zrodla-nowe.png` (kreator źródła).

---

## Slajd 8. Zgodność z dane.gov.pl

- Feed zgodny z XSD `urn:otwarte-dane:harvester:1.13`.
- Stałe `extIdent`: `aed-pl-open`, `aed-pl-open-csv`, `aed-pl-open-geojson`.
- Zasoby w CSV i GeoJSON, obie `availability=local`.
- `/harvester/feed.md5` zwraca sumę kontrolną dokładnie tych samych bajtów.
- Test end-to-end z lokalnym portalem opisany w README.

Dowód: `README.md` → „Test end-to-end: nasza aplikacja → lokalny dane.gov.pl”.

---

## Slajd 9. Źródła danych i provenance

- Zbiór jest budowany wyłącznie ze źródeł zdefiniowanych w `backend/ingest/datasources-config.json`.
- Konfiguracja obejmuje 11 źródeł; włączone są `krosno`, `marki`, `openaedmap`, `przemysl` i `warszawa`.
- Pozostałe wpisy konfiguracji pozostają wyłączone do decyzji licencyjnej.
- Każdy rekord zachowuje `source_id`, `source_url` i `status_weryfikacji`.

Dowód: `README.md` → „Źródła danych i provenance”, `INSTRUKCJA-DLA-JURY.md`.

---

## Slajd 10. Kampania i materiały dla jury

- Nazwa akcji: **DANE AED RAZEM**.
- Hasło: **Dane darują minuty**.
- Księga znaku PDF zawiera kolorystykę, pole ochronne, minimalną wielkość i zakazy użycia.
- Identyfikacja wizualna opiera się na dostarczonej maskotce AED (PNG/JPG kanoniczne, SVG osadza raster).
- Statyczny XLSX zawiera karty z zakresem danych, źródłami, przykładowym rekordem i zasadami publikacji; jest dokumentacją wzorca, a nie pobieraną bazą.
- Materiały można odtworzyć poleceniem `bun scripts/generate-competition-assets.ts`.

Dowód: `../wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx`, `../brand/dane-aed-razem-ksiega-znaku.pdf`, `../logo/`.

Autor maskotki: Zdzisław. Dalsze użycie poza zgłoszeniem wymaga ustalenia licencji z autorem.

---

## Slajd 11. Ograniczenia i dalsze kroki

- 68 z 79 źródeł nie ma jeszcze konektorów.
- Publiczny feed nie przenosi jeszcze pełnego rekordu kanonicznego.
- Licencja agregatu wymaga decyzji: występują CC0, CC BY 4.0 i ODbL 1.0.
- Kolejny krok: pełna publikacja wzorcowego zakresu w feedzie i dalsze dostosowanie do DCAT-AP.

Dowód: `INSTRUKCJA-DLA-JURY.md` → „Ograniczenia”, `SOURCES.md`.
