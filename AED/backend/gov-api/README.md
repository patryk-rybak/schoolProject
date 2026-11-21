# Backend · Integracja z dane.gov.pl

**Status:** planowane · **Kod:** brak (placeholder)

## Cel

Udostępnić dane w takiej formie, aby portal dane.gov.pl mógł je **sam pobrać**
harwesterem — bez ręcznego wgrywania plików.

## Jak działa portal (ustalone na podstawie źródeł 2.63.0)

Portal nie przyjmuje danych przez API zapisu. Raz na dobę uruchamia harwester,
który pobiera feed XML zarejestrowanego źródła:

1. `HEAD <feed>.xml` — musi zwrócić 200 i `Content-Type` z `text/xml` lub
   `application/xml`,
2. `GET <feed bez .xml>.md5` — suma MD5 dokładnie tych bajtów, które serwujemy,
3. `GET <feed>.xml` — walidacja MD5, potem XSD,
4. import po `extIdent` (aktualizacja lub utworzenie), usunięcie rekordów
   nieobecnych w feedzie,
5. zasoby z `availability=local` portal kopiuje do siebie.

## Zakres

- generator feedu `urn:otwarte-dane:harvester:1.13`,
- `GET /harvester/feed.xml` oraz `GET /harvester/feed.md5`,
- `GET /data/aed.csv` i `GET /data/aed.geojson`,
- stabilne `extIdent` (≤ 36 znaków) i pełny snapshot przy każdym przebiegu,
- wyłącznie adresy zasobów `https://`,
- walidacja wygenerowanego XML względem oficjalnego XSD w CI,
- test end-to-end na lokalnej instancji portalu
  (`dane.gov.pl/RUNNING.md`).

## Zależności

- [`../store/`](../store/README.md) — źródło danych,
- publiczny hosting HTTPS (portal nie widzi `localhost`).

## Stan obecny

Brak. Kontrakt feedu jest opisany powyżej; nie ma jeszcze generatora ani tras.
