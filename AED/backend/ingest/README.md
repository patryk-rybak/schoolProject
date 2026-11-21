# Backend · Pobieranie danych z rozproszonych źródeł

**Status:** planowane · **Kod:** brak (placeholder)

## Cel

Zebrać dane o AED od wszystkich dysponentów: portale open-data miast, serwisy
organizacji, dane z OSM i inne dostępne źródła — wraz z **zakresem
referencyjnym** każdego źródła.

## Zakres

- rejestr źródeł: identyfikator, wydawca, obszar (TERYT), licencja, częstotliwość
  aktualizacji, dostępne pola,
- klient HTTP z limitem czasu, ponowieniami i uczciwym User-Agent,
- stabilne identyfikatory rekordów w obrębie źródła,
- zapis surowych odpowiedzi (snapshot), aby normalizacja nie wymagała sieci,
- izolacja błędów: awaria jednego źródła nie zatrzymuje pozostałych,
- respektowanie regulaminów i robots.txt.

## Zależności

- [`../store/`](../store/README.md) — zapis snapshotów i przebiegów pobierania,
- [`../normalize/`](../normalize/README.md) — odbiorca surowych danych.

## Stan obecny

Brak. W repozytorium nie ma jeszcze żadnego connectora.
