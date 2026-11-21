# Backend

Warstwa danych i integracji. Katalog zawiera **wyłącznie plan modułów** — kod
nadal mieszka w `src/` (Drizzle, better-auth, trasy API) i będzie rozbudowywany
wraz z powstawaniem kolejnych części.

| Moduł | Zakres | Status |
| --- | --- | --- |
| [`auth/`](./auth/README.md) | sesje, role, uprawnienia | częściowo istnieje |
| [`ingest/`](./ingest/README.md) | pobieranie danych z rozproszonych źródeł | planowane |
| [`normalize/`](./normalize/README.md) | standaryzacja do wspólnego formatu | planowane |
| [`store/`](./store/README.md) | agregacja i baza danych | planowane |
| [`gov-api/`](./gov-api/README.md) | integracja z dane.gov.pl | planowane |

Przepływ danych:

```
źródła → ingest → normalize → store → gov-api → dane.gov.pl
                     ↑
                frontend (mapa, formularze)
```

Zasady wspólne:

- Bun + `bun:sqlite` + Drizzle (WAL zostaje włączony),
- brak sekretów w repozytorium (`.env.local`),
- każda zmiana schematu = migracja,
- kod serwerowy nie trafia do komponentów klienckich.
