# DANE AED RAZEM — opis projektu i instrukcja dla jury

## 1. Tytuł i krótki opis

**DANE AED RAZEM** to prototyp mechanizmu tworzenia ogólnopolskiego, otwartego zasobu danych o defibrylatorach AED dla portalu dane.gov.pl. Rozwiązanie nie próbuje zmieniać zasad portalu. Każdy dysponent publikuje swój zbiór (lub wykaz) we własnym imieniu, a aplikacja pobiera te dane, waliduje je, standaryzuje i przygotowuje do publikacji jako jeden zbiór z stałymi identyfikatorami `extIdent`.

Hasło akcji: **Dane darują minuty**.

Identyfikacja wizualna (logo w formatach PNG, JPG, SVG i księga znaku PDF) znajduje się w `competition-assets/`.

Logotyp przedstawia uśmiechniętą maskotkę AED w kredkowej stylistyce. Plikiem źródłowym jest `competition-assets/brand/cheerful-crayon-aed-mascot.png` (autor: Zdzisław); formaty PNG i JPG są kanoniczne, a SVG osadza PNG jako dane base64. Dalsze użycie maskotki poza zgłoszeniem wymaga ustalenia licencji z autorem.

## 2. Problem i podejście

Dane o AED w Polsce są rozproszone, niepełne i często niezweryfikowane. Istnieją pojedyncze rejestry samorządowe i baza OpenStreetMap, ale nie ma jednej, wiarygodnej listy. Portal dane.gov.pl nie pozwala na dowolne „wrzucanie” danych przez każdą osobę. Wymagany jest dostawca, który bierze odpowiedzialność za jakość zbioru.

Nasze rozwiązanie:

1. inwentaryzuje źródła (79 pozycji w `SOURCES.md`, 11 konektorów skonfigurowanych w `backend/ingest/datasources-config.json`),
2. pobiera surowe dane i zapisuje snapshot z hashem SHA-256 w `.data/core/raw/`,
3. mapuje je do wspólnego rekordu kanonicznego (`src/server/ingest/canonical.ts`),
4. odrzuca rekordy błędne i oznacza status lokalizacji, weryfikacji oraz licencję,
5. udostępnia dane przez interfejs mapy i formularze (`/`, `/dodaj-aed`, `/zrodla`, `/zrodla/nowe`),
6. publikuje zbiór w formacie zgodnym z harvesterem dane.gov.pl 1.13 (`/harvester/feed.xml`, `/harvester/feed.md5`, `/data/aed.csv`, `/data/aed.geojson`).

### Źródła danych i provenance

Zbiór jest budowany wyłącznie ze źródeł zdefiniowanych w `backend/ingest/datasources-config.json`. Konfiguracja obejmuje 11 źródeł, z których 5 jest włączonych: `krosno`, `marki`, `openaedmap`, `przemysl` i `warszawa`. Pozostałe wpisy (`belchatow`, `lodz`, `olsztyn`, `pawlowice`, `tczew`, `zielona-gora`) pozostają wyłączone do decyzji licencyjnej. Każdy rekord zachowuje `source_id`, `source_url` i `status_weryfikacji`, więc provenance jest jednoznacznie przypisane do źródła z konfiguracji.

| Identyfikator źródła | Nazwa | Status |
| --- | --- | --- |
| `krosno` | Defibrylatory w Krośnie | włączone |
| `marki` | Defibrylatory w Markach | włączone |
| `openaedmap` | OpenAEDMap — eksport krajowy PL | włączone |
| `przemysl` | Otwarte Dane Przemyśl — defibrylatory AED | włączone |
| `warszawa` | Lokalizacja defibrylatorów (AED) — m.st. Warszawa | włączone |
| `belchatow` | Wykaz defibrylatorów AED na terenie Bełchatowa (KML) | wyłączone do decyzji licencyjnej |
| `lodz` | Defibrylatory AED w Łodzi (Google My Maps, KML) | wyłączone do decyzji licencyjnej |
| `olsztyn` | Mapa ogólnodostępnych defibrylatorów AED w Olsztynie (KML) | wyłączone do decyzji licencyjnej |
| `pawlowice` | Defibrylatory AED - Gmina Pawłowice (KML) | wyłączone do decyzji licencyjnej |
| `tczew` | AED Tczew (Google My Maps, KML) | wyłączone do decyzji licencyjnej |
| `zielona-gora` | AED w Zielonej Górze (Google My Maps, KML) | wyłączone do decyzji licencyjnej |

Każdy rekord zachowuje `source_id`, `source_url` i `status_weryfikacji`.

## 3. Instrukcja krok po kroku dla jury

### Krok 1. Uruchom prototyp

```bash
cd AED
bun install
bun run dev
```

Otwórz `http://localhost:3000/`. Jeśli w środowisku jury nie ma możliwości uruchomienia kodu, użyj klikalnego prototypu pod adresem podanym w pliku zgłoszeniowym.

### Krok 2. Zobacz mapę i ogólnopolski zbiór

Na stronie głównej sprawdź:

- mapę Polski z punktami AED (MapLibre + Protomaps),
- kolor punktów: zielony = zweryfikowany, szary = niezweryfikowany,
- kliknięcie w punkt pokazuje nazwę, miejscowość i status weryfikacji,
- kliknięcie w puste miejsce otwiera „Dodaj AED tutaj”.

### Krok 3. Dodaj rekord ręcznie

Przejdź na `/dodaj-aed`:

1. rozwinięte są sekcje **Podstawowe informacje**, **Lokalizacja/Adres** i **Dostępność**; **Cechy dostępności**, **Urządzenie i przeglądy** oraz **Opiekun** pozostają zwinięte,
2. wybierz punkt na mapie lub wpisz adres i geokoduj go; kod pocztowy, województwo i powiat uzupełnia się automatycznie,
3. uzupełnij nazwę obiektu oraz obowiązkowy **Typ dostępu** (24/7 publiczny, w godzinach otwarcia, ograniczony/na klucz, nieznany); godziny otwarcia pojawiają się tylko przy dostępie w godzinach otwarcia,
4. zapisz formularz; pozostałe pola są opcjonalne i nie blokują zgłoszenia.

Formularz waliduje dane po stronie serwera i zwraca komunikaty przy konkretnych polach.

### Krok 4. Podłącz źródło danych

Przejdź na `/zrodla/nowe`:

1. wybierz typ połączenia: plik, baza danych lub S3,
2. podaj adres i format danych,
3. naciśnij „Podgląd”, aby zobaczyć kolumny i przykładowe wiersze,
4. zmapuj kolumny na pola kanoniczne,
5. zapisz konfigurację,
6. na `/zrodla` naciśnij „Importuj do mapy”.

Rejestr źródeł jest aktualizowany atomowo. Import pobiera dane, wykonuje mapowanie i walidację, a wynik pokazuje liczbę wierszy przyjętych i odrzuconych.

### Krok 5. Sprawdź zgodność z dane.gov.pl

```bash
curl -s http://localhost:3000/harvester/feed.xml | head -20
curl -s http://localhost:3000/harvester/feed.md5
curl -s http://localhost:3000/data/aed.csv | head -3
curl -s http://localhost:3000/data/aed.geojson | head -20
```

Feed XML używa oficjalnego schematu `urn:otwarte-dane:harvester:1.13`. Suma MD5 dotyczy dokładnie tych samych bajtów, co `feed.xml`. Zasoby są w formacie maszynowym CSV i GeoJSON. Pełny test z lokalnie postawionym portalem jest opisany w `README.md` w rozdziale „Test end-to-end”.

### Krok 6. Otwórz materiały konkursowe

Przycisk **Pobierz dane XLSX** na stronie głównej obok mapy (`/data/aed.xlsx`) pobiera aktualną, pełną bazę AED znormalizowaną do wspólnego rekordu kanonicznego. To nie jest pusty arkusz wzorca: eksport ma jeden wiersz na urządzenie, a kolumny łączą nazwy pól kanonicznych, polskie aliasy i metadane dodawane przez system.

| Wymaganie | Plik |
| --- | --- |
| Pełny rejestr AED (dynamiczny XLSX) | `/data/aed.xlsx` — przycisk **Pobierz dane XLSX** na stronie głównej obok mapy |
| Wzorcowy zakres danych (statyczny XLSX, dokumentacja) | `competition-assets/wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx` |
| Logotyp PNG | `competition-assets/logo/dane-aed-razem.png` |
| Logotyp JPG | `competition-assets/logo/dane-aed-razem.jpg` |
| Logotyp SVG (format otwarty) | `competition-assets/logo/dane-aed-razem.svg` |
| Księga znaku PDF | `competition-assets/brand/dane-aed-razem-ksiega-znaku.pdf` |
| Prezentacja | `competition-assets/prezentacja/prezentacja.md` |
| Zrzuty ekranu | `competition-assets/screenshots/` |

## 4. Eksport danych i wzorcowy zakres

Przycisk **Pobierz dane XLSX** na stronie głównej (`/data/aed.xlsx`) pobiera pełną, aktualną bazę AED, a nie pusty wzorzec. Eksport jest tworzony z danych w bazie, ma jeden wiersz na urządzenie i następujące kolumny: `id` (stabilny UUID), `nazwa_obiektu`, `szerokosc_geo`, `dlugosc_geo`, `miejscowosc`, `typ_dostepnosci`, `status_sprawnosci`, `status_weryfikacji`, `zweryfikowane_przez`, `typ_weryfikatora`, `data_weryfikacji`, `identyfikator_kanoniczny`, `zrodlo_danych`, `identyfikator_w_zrodle`, `url_zrodla`, `status_lokalizacji`, `zrodlo_geometrii`, `data_utworzenia` i `data_aktualizacji`. Te same nazwy pól są używane w CSV oraz jako klucze właściwości w GeoJSON.

Osobny, statyczny plik `competition-assets/wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx` pozostaje wyłącznie dokumentacją wzorca i nie jest pobierany przez przycisk na stronie głównej. Ma sześć kart:

1. **Informacje** — cel, wersja i zasada odpowiedzialności dostawcy,
2. **Wzorcowy zakres** — pola rekordu, typy, wymagalność, wartości, opisy i przykłady,
3. **Pola systemowe** — metadane dodawane automatycznie do eksportów, nieumieszczane w formularzu obywatelskim,
4. **Źródła i zakresy** — 11 źródeł z zakresem terytorialnym, formatem i licencją,
5. **Przykład rekordu** — pełny przykładowy wiersz,
6. **Zasady publikacji** — ID, WGS84, weryfikacja, lokalizacja i licencja.

Pola w karcie „Wzorcowy zakres” są podzielone na trzy poziomy zgodnie z podejściem dane.gov.pl/DCAT-AP:

- **Wymagane** (7): `id`, `nazwa_obiektu`, `szerokosc_geo` (WGS84), `dlugosc_geo` (WGS84), `miejscowosc`, `typ_dostepnosci`, `data_aktualizacji`,
- **Zalecane** (8): `ulica`, `nr_budynku`, `opis_lokalizacji`, `godziny_otwarcia`, `wewnatrz_zewnatrz`, `status_sprawnosci`, `opiekun_nazwa`, `opiekun_kontakt`,
- **Opcjonalne** (5): `producent_model`, `elektrody_pediatryczne`, `data_waznosci_baterii`, `data_waznosci_elektrod`, `url_zdjecia`.

W eksportach CSV, GeoJSON i XLSX system uwzględnia pola techniczne: `id` (stabilny UUID), `identyfikator_kanoniczny`, `data_utworzenia`, `data_aktualizacji`, `zrodlo_danych`, `identyfikator_w_zrodle`, `url_zrodla`, `status_lokalizacji`, `zrodlo_geometrii` i `status_weryfikacji`. Nie wymagamy ich od osoby zgłaszającej AED; pozwalają ocenić pochodzenie i weryfikację rekordu.

Najważniejsze zasady:

- współrzędne w WGS84; w CSV jako `szerokosc_geo,dlugosc_geo`, w GeoJSON jako `[dlugosc_geo,szerokosc_geo]`,
- `location_status` informuje, czy punkt pochodzi ze źródła, geokodowania albo czy jest tylko adres,
- `verification_status=verified` wymaga wskazania weryfikatora lub daty weryfikacji,
- `source_id`, `source_record_id` i `source_url` zachowują provenance,
- licencja źródła jest deklarowana w metadanych; źródła bez licencji są wyłączone z agregacji.

## 5. Ograniczenia

- baza `dev.db` i katalog `.data/` są lokalne i nie są częścią repozytorium,
- 68 z 79 zidentyfikowanych źródeł nie ma jeszcze konektorów; większość to listy HTML/PDF bez współrzędnych,
- publiczny feed udostępnia obecnie ograniczony zestaw pól; pełny rekord kanoniczny jest w `.data/core/core.json` i w bazie,
- licencja agregatu wymaga decyzji prawnej: część źródeł to CC BY 4.0 i ODbL 1.0, więc samo CC0 nie jest wystarczające dla całego zbioru,
- testing z portalem dane.gov.pl wymaga Docker i lokalnego środowiska opisanego w `dane.gov.pl/RUNNING.md`,
- certyfikat HTTPS używany w teście lokalnym jest self-signed.

## 6. Jak odtworzyć materiały

```bash
cd AED
bun scripts/generate-competition-assets.ts
```

Skrypt generuje XLSX, księgę znaku PDF oraz wersje logotypu PNG, JPG, SVG i mono z pliku źródłowego maskotki. Logotypy są wersjonowane w katalogu `competition-assets/logo/`.
