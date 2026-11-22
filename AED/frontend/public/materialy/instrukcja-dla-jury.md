# DANE AED RAZEM — opis projektu i instrukcja dla jury

## 1. Tytuł i krótki opis

**DANE AED RAZEM** to prototyp mechanizmu tworzenia ogólnopolskiego, otwartego zasobu danych o defibrylatorach AED dla portalu dane.gov.pl. Rozwiązanie nie próbuje zmieniać zasad portalu. Każdy dysponent publikuje swój zbiór (lub wykaz) we własnym imieniu, a aplikacja pobiera te dane, waliduje je, standaryzuje i przygotowuje do publikacji jako jeden zbiór z stałymi identyfikatorami `extIdent`.

Hasło akcji: **Dane darują minuty**.

Identyfikacja wizualna (logo w formatach PNG, JPG, SVG i księga znaku PDF) znajduje się w `competition-assets/`.

## 2. Problem i podejście

Dane o AED w Polsce są rozproszone, niepełne i często niezweryfikowane. Istnieją pojedyncze rejestry samorządowe i baza OpenStreetMap, ale nie ma jednej, wiarygodnej listy. Portal dane.gov.pl nie pozwala na dowolne „wrzucanie” danych przez każdą osobę. Wymagany jest dostawca, który bierze odpowiedzialność za jakość zbioru.

Nasze rozwiązanie:

1. inwentaryzuje źródła (79 pozycji w `SOURCES.md`, 11 konektorów skonfigurowanych w `backend/ingest/datasources-config.json`),
2. pobiera surowe dane i zapisuje snapshot z hashem SHA-256 w `.data/core/raw/`,
3. mapuje je do wspólnego rekordu kanonicznego (`src/server/ingest/canonical.ts`),
4. odrzuca rekordy błędne i oznacza status lokalizacji, weryfikacji oraz licencję,
5. udostępnia dane przez interfejs mapy i formularze (`/`, `/dodaj-aed`, `/zrodla`, `/zrodla/nowe`),
6. publikuje zbiór w formacie zgodnym z harvesterem dane.gov.pl 1.13 (`/harvester/feed.xml`, `/harvester/feed.md5`, `/data/aed.csv`, `/data/aed.geojson`).

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

1. wybierz punkt na mapie lub wpisz współrzędne,
2. uzupełnij nazwę, adres, dostępność i status,
3. użyj geokodowania, jeśli znasz tylko adres,
4. zapisz formularz.

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

Materiały są również dostępne w uruchomionej aplikacji jako klikalna strona `/materialy` oraz strona dokumentacji `/dokumentacja/wzorcowy-zakres-danych`.

| Wymaganie | Plik |
| --- | --- |
| Wzorcowy zakres danych (XLSX) | `competition-assets/wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx` |
| Logotyp PNG | `competition-assets/logo/dane-aed-razem.png` |
| Logotyp JPG | `competition-assets/logo/dane-aed-razem.jpg` |
| Logotyp SVG (format otwarty) | `competition-assets/logo/dane-aed-razem.svg` |
| Księga znaku PDF | `competition-assets/brand/dane-aed-razem-ksiega-znaku.pdf` |
| Prezentacja | `competition-assets/prezentacja/prezentacja.md` |
| Zrzuty ekranu | `competition-assets/screenshots/` |

## 4. Wzorcowy zakres danych

Plik XLSX ma pięć kart:

1. **Informacje** — cel, wersja i zasada odpowiedzialności dostawcy,
2. **Wzorcowy zakres** — pola rekordu, typy, wymagalność, wartości, opisy i przykłady,
3. **Źródła i zakresy** — 11 źródeł z zakresem terytorialnym, formatem i licencją,
4. **Przykład rekordu** — pełny przykładowy wiersz,
5. **Zasady publikacji** — ID, WGS84, weryfikacja, lokalizacja i licencja.

Najważniejsze zasady:

- współrzędne w WGS84; w CSV jako `lat,lon`, w GeoJSON jako `[lon,lat]`,
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

Skrypt generuje XLSX i księgę znaku PDF. Logotypy są wersjonowane w katalogu `competition-assets/logo/`.
