# Frontend · Mapa AED

**Status:** częściowo istnieje · **Kod:** `src/components/map/`, `src/routes/index.tsx`

## Cel

Pokazać, gdzie znajdują się defibrylatory, czy są dostępne i czy działają —
tak szybko, jak to możliwe, również na telefonie.

## Zakres

- znaczniki AED z kolorem zależnym od statusu i dostępności,
- klastrowanie przy dużej liczbie rekordów,
- panel szczegółów: nazwa, adres, dostępność, status, źródło danych, licencja,
- „najbliższy AED” na podstawie geolokalizacji (z obsługą odmowy zgody),
- filtry (dostępność 24/7, status, źródło),
- alternatywa dostępna z klawiatury: ta sama lista rekordów jako tabela,
- responsywność 360×640 → desktop.

## Zależności

- dane: `backend/store/` → API/loader,
- kafelki: `src/routes/api/pmtiles.ts`, `public/poland.pmtiles`,
  `bun run map:tiles`,
- styl: `src/components/ui/`.

## Stan obecny

Działa mapa Polski (MapLibre 6 + Protomaps, polskie etykiety) w
`src/components/map/poland-map.tsx`, serwowanie kafelków z obsługą zakresów
bajtów oraz strona główna. Brak warstwy AED, filtrów i panelu szczegółów.
