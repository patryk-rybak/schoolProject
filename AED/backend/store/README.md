# Backend · Agregacja i baza danych

**Status:** częściowo istnieje (wersja deweloperska) · **Kod:** `src/db/`

## Cel

Trzymać jeden, spójny zbiór defibrylatorów i udostępniać go resztę aplikacji:
mapę, formularze i integrację z dane.gov.pl.

## Co już działa (dev)

Jedna, tymczasowa tabela `aed_devices` — celowo minimalna. Kolumny mogą się
zmieniać; docelowy model powstanie później.

| Kolumna | Typ | Uwagi |
| --- | --- | --- |
| `id` | integer PK | autoincrement |
| `name` | text | wymagane |
| `lat`, `lon` | real | wymagane |
| `address`, `city` | text | opcjonalne |
| `access` | text | `always` / `business_hours` / `restricted` / `unknown` |
| `status` | text | `operational` / `out_of_service` / `unknown` |
| `source` | text | skąd rekord (`seed`, `manual`, …) |
| `created_at`, `updated_at` | integer | znaczniki czasu |

Funkcje dla innych modułów (`src/db/aed-store.ts`):

```ts
import {
	addAedDevice,
	addAedDevices,
	listAedDevices,
	getAedDevice,
	countAedDevices,
	clearAedDevices,
} from "#/db/aed-store";
```

Dane startowe: `bun run db:seed` (5 przykładowych rekordów, czyści tabelę).

## Docelowy zakres

- schemat Drizzle: rekordy AED, źródła, przebiegi synchronizacji,
- zapis idempotentny (upsert) po identyfikatorze źródła,
- zapytania: po obszarze (bbox), najbliższe urządzenia, po identyfikatorze,
- paginacja i filtry dla interfejsu,
- indeksy na współrzędnych i identyfikatorach,
- historia zmian rekordu (kto, kiedy, co).

## Zależności

- `src/db/` — klient Drizzle (`bun:sqlite`, WAL),
- [`../normalize/`](../normalize/README.md) — dane wejściowe,
- [`../gov-api/`](../gov-api/README.md) — odbiorca danych.

## Uwagi

- `dev.db` jest ignorowany przez git; migracje w `drizzle/` są wersjonowane.
- `db:migrate` tworzy dodatkowo techniczną tabelę `__drizzle_migrations`
  (księgowość migracji), więc w bazie są dwie tabele: domena + techniczna.
