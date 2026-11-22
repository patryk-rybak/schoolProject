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

## Slajd 3. Mapa i wyszukiwanie AED

- Mapa Polski z 19 468 punktami z bazy deweloperskiej.
- Kolor punktu oznacza status weryfikacji: zielony = zweryfikowany, szary = niezweryfikowany.
- Kliknięcie punktu pokazuje nazwę, miejscowość i datę weryfikacji.
- Kliknięcie pustego miejsca pozwala dodać brakujący AED.

Dowód: `../screenshots/01-mapa.png` (zrzut strony głównej).

---

## Slajd 4. Dodawanie i weryfikacja rekordu

Kroki użytkownika:

1. wybierz punkt na mapie lub wpisz współrzędne,
2. uzupełnij nazwę, adres, dostępność i status,
3. geokoduj adres, jeśli nie znasz współrzędnych,
4. zapisz formularz; błędy są zwracane przy konkretnych polach.

Walidacja obegejmuje zakres współrzędnych, status lokalizacji i wymagane pola.

Dowód: `../screenshots/02-dodaj-aed.png` (formularz).

---

## Slajd 5. Podłączanie nowych źródeł

- Kreator `/zrodla/nowe` obsługuje pliki CSV/XLSX/JSON/GeoJSON/KML, SQLite, PostgreSQL i S3.
- Podgląd pokazuje kolumny i pięć przykładowych wierszy przed zapisem.
- Mapowanie pól na rekord kanoniczny odbywa się w interfejsie.
- Import podaje liczbę wierszy wczytanych, przyjętych i odrzuconych.

Dowód: `../screenshots/03-zrodla-nowe.png` (kreator źródła).

---

## Slajd 6. Zgodność z dane.gov.pl

- Feed zgodny z XSD `urn:otwarte-dane:harvester:1.13`.
- Stałe `extIdent`: `aed-pl-open`, `aed-pl-open-csv`, `aed-pl-open-geojson`.
- Zasoby w CSV i GeoJSON, obie `availability=local`.
- `/harvester/feed.md5` zwraca sumę kontrolną dokładnie tych samych bajtów.
- Test end-to-end z lokalnym portalem opisany w README.

Dowód: `README.md` → „Test end-to-end: nasza aplikacja → lokalny dane.gov.pl”.

---

## Slajd 7. Wzorcowy zakres danych i kampania

- Plik XLSX opisuje 24 pola rekordu, typy, wymagalność, wartości i przykłady.
- Osobne karty: źródła i zakresy referencyjne, przykład rekordu, zasady publikacji.
- Nazwa akcji: **DANE AED RAZEM**.
- Hasło: **Dane darują minuty**.
- Księga znaku PDF zawiera kolorystykę, pole ochronne, minimalną wielkość i zakazy użycia.

Dowód: `../wzorcowy-zakres-danych/wzorcowy-zakres-danych-aed.xlsx`, `../brand/dane-aed-razem-ksiega-znaku.pdf`, `../logo/`.

---

## Slajd 8. Ograniczenia i dalsze kroki

- 68 z 79 źródeł nie ma jeszcze konektorów.
- Publiczny feed nie przenosi jeszcze pełnego rekordu kanonicznego.
- Licencja agregatu wymaga decyzji: występują CC0, CC BY 4.0 i ODbL 1.0.
- Kolejny krok: rozszerzenie feedu o provenance i licencję oraz DCAT-AP.

Dowód: `INSTRUKCJA-DLA-JURY.md` → „Ograniczenia”, `SOURCES.md`.
