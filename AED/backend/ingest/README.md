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

Brak kodu. Zdefiniowano kontrakt konfiguracji i zestaw przykładów:

- [`source-config.schema.json`](./source-config.schema.json): JSON Schema 2020-12,
- [`examples/`](./examples/): sześć konfiguracji bazowych: OpenAEDMap, Przemyśl,
  Krosno, Marki, Warszawa; do tego osiem konfiguracji KML w
  [`examples/kml/`](./examples/kml/): Zielona Góra, Łódź, Olsztyn, Bełchatów,
  Pawłowice, Tczew oraz guardy dla Bydgoszczy (brak geometrii) i Piły
  (polygony zasięgu), a także szablon listy adresowej bez geometrii,
- [`../../docs/ingest-source-config.md`](../../docs/ingest-source-config.md):
  inwentarz formatów, mapping DSL, rodziny connectorów i wykrywanie dryfu.

Kolejny krok: loader konfiguracji i pierwsze dwa connectory (`file_static`,
`http_json`), potem `html_list` z geokodowaniem adresu. Model rekordu bez
`lat/lon` opisuje [`../../docs/design/address-only-sources.md`](../../docs/design/address-only-sources.md).
