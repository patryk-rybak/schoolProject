# Backend · Agregacja i baza danych

**Status:** planowane · **Kod:** brak (placeholder)

## Cel

Trzymać jeden, spójny zbiór defibrylatorów i udostępniać go resztę aplikacji:
mapę, formularze i integrację z dane.gov.pl.

## Zakres

- schemat Drizzle: rekordy AED, źródła, przebiegi synchronizacji,
- migracje i praca na `bun:sqlite` z WAL,
- zapis idempotentny (upsert) po identyfikatorze źródła,
- zapytania: po obszarze (bbox), najbliższe urządzenia, po identyfikatorze,
- paginacja i filtry dla interfejsu,
- indeksy na współrzędnych i identyfikatorach,
- historia zmian rekordu (kto, kiedy, co).

## Zależności

- `src/db/` — istniejący klient Drizzle,
- [`../normalize/`](../normalize/README.md) — dane wejściowe,
- [`../gov-api/`](../gov-api/README.md) — odbiorca danych.

## Stan obecny

Istnieje klient Drizzle i przykładowa tabela `todos`. Brak schematu AED.
