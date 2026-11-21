# frontend-map — AED map

## Scope

The map that answers "where is the nearest working defibrillator?". Markers,
clustering, detail panel, "nearest to me", filters, and an accessible fallback
for people who cannot use a pointer.

## Owns

- `src/blocks/frontend-map/**`
- Route file the owner adds: `src/routes/mapa.tsx` (regenerate
  `src/routeTree.gen.ts` with `bun run dev`)

## Public API

```ts
import { AedMap } from "#/blocks/frontend-map";
```

Takes `readonly AedRecord[]` from the contracts plus optional `selectedId` /
`onSelect`. It must not fetch data itself — the page decides where records come
from.

## Depends on

- `#/blocks/contracts` — `AedRecord`, `AedMapProps`
- `#/components/map/poland-map` — the existing MapLibre + Protomaps base map
- `#/routes/api/pmtiles`, `#/routes/api/maplibre-worker` — tiles and worker

## Done when

- [ ] Markers render from `AedRecord[]`, coloured by `status`/`access`
- [ ] Clustering works with 10 000+ records without jank
- [ ] Detail popup/panel shows name, address, access, status, source, licence
- [ ] "Nearest to me" uses geolocation with a clear permission-denied state
- [ ] Keyboard-only and screen-reader alternative: the same records available
      as a list/table
- [ ] Responsive: usable at 360×640 and on desktop
- [ ] No API keys in the client; tiles stay local (`/api/pmtiles`)
- [ ] Screenshots for the presentation (desktop + mobile)
