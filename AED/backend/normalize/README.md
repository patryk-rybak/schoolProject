# Backend · Standaryzacja danych

**Status:** planowane · **Kod:** brak (placeholder)

## Cel

Sprowadzić dane z wszystkich źródeł do jednego, porównywalnego formatu — tak,
aby mapa i portal dane.gov.pl pokazywały ten sam zestaw pól niezależnie od
źródła.

## Zakres

- mapowanie pól każdego źródła na wspólny model rekordu AED według
  [`docs/design/aed-data-quality-spec.md`](../../docs/design/aed-data-quality-spec.md),
- walidacja współrzędnych (obszar Polski) i odrzucanie błędnych rekordów
  z czytelnym powodem,
- normalizacja adresów i przypisanie TERYT (gmina/powiat/województwo),
- interpretacja dostępności i statusu urządzenia (bez zgadywania),
- deduplikacja tych samych urządzeń z różnych źródeł,
- deterministyczne identyfikatory rekordów,
- raport przyjętych i odrzuconych rekordów.

## Zależności

- [`../ingest/`](../ingest/README.md) — dane wejściowe,
- [`../store/`](../store/README.md) — zapis wyniku.

## Stan obecny

Brak kodu. Model rekordu i reguły mapowania są zdefiniowane w
[`docs/design/aed-data-quality-spec.md`](../../docs/design/aed-data-quality-spec.md)
(walidacja pól, cykl życia, pewność, kwarantanna i raporty jakości).
Implementacja silnika reguł i fixtures pozostaje do wykonania.
