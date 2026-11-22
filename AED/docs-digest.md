# Docs Digest (docs specialist, 2026-11-22)

Scratch-quality reference for the team. Sources: local TanStack intent skills
(react-start 1.169.7, router-core 1.171.39, start-client-core 1.170.39),
maplibre-gl 6.19.0 installed source (`node_modules/maplibre-gl/src/ui/popup.ts`),
vite.dev (Vite 8 docs), bun.com/docs/runtime/sqlite, nitro.build (v3).
Installed versions verified: vite 8.3.8, nitro 3.0.261103-rc, react 19.3.1,
drizzle-orm 0.45.4, maplibre-gl 6.19.0.

Note: this checkout is flat (app files at repo root, no `AED/` subdir despite
AGENTS.md saying otherwise). Run bun commands from repo root.

---

## 1. MapLibre 6.19 Popup lifecycle (VERIFIED against installed source)

**Verified finding: `Popup._container` is created lazily in `_update()` only
when `_content` is set. `getElement()` returns `undefined` before
`setDOMContent()` (or `setHTML`/`setText`).**

Source proof (`src/ui/popup.ts`):
- `getElement()` (line ~422) is literally `return this._container;`. The d.ts
  says `HTMLElement` but at runtime it is `undefined` until the container
  exists. Type lies; guard it.
- `_update()` (line ~640): early-returns `if (!this._map || !hasPosition || !this._content)`.
  Only after that does it create `this._container = DOM.create('div', 'maplibregl-popup', map.getContainer())`.
  So the container needs ALL THREE: map attached (`addTo`), position
  (`setLngLat` or trackPointer), and content (`setDOMContent`).
- `setDOMContent(htmlNode)` creates `this._content` div, appends your node,
  creates close button, calls `_update()` and `_focusFirstElement()`.
- `remove()` deletes `_container` (`delete this._container`), so after close
  `getElement()` is `undefined` again. Re-adding recreates it; a React root
  mounted into an old detached div is orphaned.

**Correct pattern for React content (create div first, never rely on getElement):**

```ts
const div = document.createElement("div");
const popup = new maplibregl.Popup({ /* options */ })
  .setLngLat(lngLat)
  .setDOMContent(div)   // sets _content; container created on _update after addTo
  .addTo(map);          // now _update() runs with map+pos+content -> container exists
const root = createRoot(div); // mount into YOUR div, not popup.getElement()
root.render(<PopupContent />);
popup.on("close", () => root.unmount()); // unmount before/when container is removed
```

Gotchas:
- Do NOT `createRoot(popup.getElement()!)` before `setDOMContent` + `addTo`;
  it is `undefined`. Even after addTo, without content there is no container.
- Do NOT call `setDOMContent` again on the same popup while a React root owns
  the div: it removes all children of `_content` (your div included) without
  unmounting the root -> leaked root / detached updates.
- `setHTML`/`setText` replace content the same way; pick one ownership model.
- Unmount the React root on `close` (and on map cleanup) to avoid
  "root.unmount on removed container" leaks; `remove()` deletes the container.
- `addTo` before `setLngLat` is fine as long as content+position arrive before
  you need the element; `_update` re-runs on each setter.
- v6 also added globe `_updateOpacity` and `locationOccludedOpacity`; irrelevant
  to the bug but explains new `_container` accesses guarded by `if`.

## 2. TanStack Start server functions (zrodla forms)

From `@tanstack/react-start#react-start` + `start-client-core#start-core/server-functions`:

- Import `createServerFn`, `useServerFn` from `@tanstack/react-start` (NOT
  react-router). Routing APIs (`createFileRoute`, `Link`, `redirect`,
  `notFound`) from `@tanstack/react-router` (also re-exported by react-start).
- Chain: `createServerFn({ method: 'POST' }).validator(schemaOrFn).handler(async ({ data }) => ...)`.
  Validator can be a plain function `(data: T) => T`, a Zod schema, or a
  FormData-narrowing function (`if (!(data instanceof FormData)) throw ...`).
  Validator runs on the server; it validates INPUT only, not output.
- Call shape is always `fn({ data: ... })`, both from loaders and via
  `useServerFn(fn)` in components. GET is the default method.
- **Loaders are ISOMORPHIC** (run on server during SSR AND on client during
  navigation). DB access / secrets must live inside `createServerFn`, never
  directly in a loader. Loader calls the server fn: `loader: () => getSources()`.
- **Server fns are public HTTP endpoints.** `beforeLoad` auth is UX only;
  enforce auth inside the handler or via `.middleware([authMiddleware])` for
  anything private (source-admin import/delete!).
- Serialization: payloads cross the network via the Start serializer (seroval).
  Return plain JSON-safe values: objects, arrays, strings, numbers, booleans,
  null, Date, Map, Set, undefined, FormData/Request/Response, and unawaited
  promises (streaming). Do NOT return class instances with methods, functions,
  Drizzle row proxies, Bun SQLite objects, or anything with a prototype you
  care about; methods/prototypes are lost. Errors thrown in handlers are
  serialized and rethrown client-side (`error.message` survives); `throw redirect(...)`
  and `throw notFound()` are honored specially. Project convention here:
  return `{ ok:false, message, issues }` instead of throwing for form errors
  (`frontend/server/forms.ts` pattern) - keep it.
- Mutation + reload pattern: `await mutateFn({ data }); await router.invalidate({ sync: true })`
  so loaders re-read persisted state. Do not fake success with local state only.
- Server-only helpers: keep DB code in `*.server.ts` / `backend/`, wrappers in
  `*.functions.ts`. Static imports of server fns are safe anywhere; the build
  swaps in RPC stubs for the client bundle. No `"use server"` directives.
- Request/response utils come from `@tanstack/react-start/server`
  (`getRequest`, `getRequestHeader`, `setResponseHeader(s)`, `setResponseStatus`).
- Types are fully inferred: never cast validator output or handler results.

## 3. Route loaders (router-core/data-loading)

- Lifecycle per navigation: match (params.parse, validateSearch) -> serial
  `beforeLoad` (parent first) -> parallel `loader` + component preload.
  Throwing in `beforeLoad` blocks children.
- Loaders do not get search params directly. Declare
  `loaderDeps: ({ search }) => ({ ... })`; deps are the cache key and changing
  them forces reload regardless of staleTime.
- SWR defaults: `staleTime: 0` (always background-refetch on match),
  `defaultPreloadStaleTime: 30_000`, `gcTime: 30min`. Set per-route
  `staleTime`/`gcTime` or router `defaultStaleTime` to taste.
- Pending UI: `pendingComponent` shows after `pendingMs` (default 1000),
  stays at least `pendingMinMs` (default 500).
- Deferred data: return unawaited promises from loader, render with
  `<Await promise={p} fallback={...}>{(data) => ...}</Await>`.
- Router context DI: `createRootRouteWithContext<Ctx>()({...})` (double call),
  supply via `createRouter({ context })`. No React hooks in loader/beforeLoad.
- In split/lazy files use `getRouteApi('/path').useLoaderData()`; importing
  `Route` from the route file defeats splitting.
- Relative `fetch('/api/...')` breaks during SSR (needs absolute URL); for
  app-internal data call a server fn from the loader instead.

## 4. Lazy loading / code splitting (router-core/code-splitting)

- `autoCodeSplitting: true` in the router/start Vite plugin splits
  `component`, `errorComponent`, `pendingComponent`, `notFoundComponent`.
  Critical (stays in main bundle): loader, beforeLoad, validateSearch, params,
  context, head links/scripts.
- **Loader is NOT split by default** - splitting it adds a double async
  waterfall (fetch chunk, then run loader). Keep default.
- **Never `export` component functions from route files** - exports land in
  the main bundle and bypass splitting.
- Manual: `route.tsx` (critical) + `route.lazy.tsx` with
  `createLazyFileRoute('/path')({ component })`; only the 4 component options
  allowed. Virtual routes: a lone `.lazy.tsx` works, no critical file needed.
- `__root.tsx` cannot be split; no `__root.lazy.tsx`.
- Overrides: per-route `codeSplitGroupings: [['loader','component']]` >
  plugin `splitBehavior({routeId})` > `defaultBehavior`.
- For dev startup perf: splitting shrinks the initial transform graph, but
  every lazy chunk is a separate dev request on first navigation; warm the
  hot ones (see below).

## 5. Vite 8 dev startup perf

From vite.dev/config/dep-optimization-options.html (NOTE: the old
`dep-options.html` URL is 404; Vite 8 docs are Rolldown-based):

- `optimizeDeps.include`: force-prebundle deps discovered late (deep imports,
  linked packages). Vite 8 supports trailing globs:
  `include: ['my-lib/components/**/*']` to avoid re-optimization reloads.
  For this app, candidates: `maplibre-gl`, `react-dom/client`, better-auth
  client subpaths, any `@tanstack/*` deep import that triggers a mid-session
  "new dependency optimized" full reload.
- `optimizeDeps.entries`: default crawl is all `.html`; with TanStack Start
  there is no static html entry, so point entries at real entry files
  (e.g. `frontend/router.tsx`, `frontend/routes/**/index.tsx` patterns) so the
  scanner finds deps up front instead of on first request.
- `optimizeDeps.holdUntilCrawlEnd` (default true): holds first optimize result
  until static crawl finishes to avoid full-page reloads; set false ONLY if
  scanner+include already find everything (more parallel requests, but risk
  of reloads).
- `optimizeDeps.noDiscovery: true` + explicit `include` = fully deterministic
  optimizer (fastest cold start if the list is complete; CJS deps MUST be
  listed). `optimizeDeps.force: true` ignores cache (debug only).
- `optimizeDeps.needsInterop`: add packages the warning suggests to avoid
  interop-mismatch full reloads.
- `esbuildOptions` is DEPRECATED in Vite 8 -> converted to
  `optimizeDeps.rolldownOptions` internally; use `rolldownOptions` directly.
- `server.warmup: { clientFiles: [...], ssrFiles: [...] }`: pre-transform and
  cache hot files at server start, kills transform waterfalls. Good targets:
  `frontend/routes/__root.tsx`, `frontend/routes/index.tsx`,
  `frontend/map/poland-map.tsx`, `frontend/router.tsx` (ssrFiles for
  server-fn modules). Only frequently used files; overloading slows startup.
- **WSL2 gotcha (this repo lives on /mnt/c!)**: Vite docs explicitly say
  Windows-filesystem access from WSL2 is slow and file watching misses edits
  made by Windows apps. Biggest dev-perf win is moving the repo into the WSL
  filesystem; otherwise `server.watch: { usePolling: true }` fixes missed
  HMR but burns CPU. At minimum exclude the 4GB `poland.pmtiles` and
  `*.db*` from any crawl/watch globs.

## 6. Nitro 3 (vite plugin) dev mode

From nitro.build/guide + /docs/vite (v3, installed 3.0.261103-rc):

- With the `nitro()` Vite plugin use `vite dev` (bun run dev), NOT `nitro dev`
  (Nitro CLI dev does not support the Vite builder).
- Dev: server code runs in an isolated worker; server-only file changes cause
  a **server reload + browser refresh**, not HMR. Shared client/server modules
  keep Vite HMR. `vite: { serverReload: false }` (nitro options) disables the
  reload if it thrashes; trade-off: stale server code until manual restart.
- Config precedence: inline `nitro({...})` options > `nitro` key in
  vite.config > nitro.config.ts. `dev` and `rootDir` are inferred, not
  overridable.
- Port resolution: `PORT` env > Vite `server.port` > nitro `devServer.port`
  (default 3000).
- Nitro loads `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local` per
  Vite conventions; existing env vars win. (Matches this repo's `.env.local`.)
- Builders: rolldown (default, fastest), rollup, vite. Auto-detects `vite`
  builder when the nitro() plugin is in vite.config - that's us; do not
  override. Env override: `NITRO_BUILDER`.
- Nitro registers `client`, `nitro`, (+`ssr`) Vite environments; plugins that
  only mutate top-level `build` in configResolved have no effect
  (sharedConfigBuild). Don't disable sharedConfigBuild.
- Prod `/assets/` is served without fallthrough, immutable cache-control;
  keep server routes (harvester/data/api) out of it.

## 7. bun:sqlite perf

From bun.com/docs/runtime/sqlite:

- 3-6x faster than better-sqlite3 for reads; synchronous API is the fast path.
  Keep Drizzle `.all()/.get()/.run()` sync calls (already the repo rule).
- `db.query(sql)` caches the compiled statement (LRU, default
  `Database.MAX_QUERY_CACHE_SIZE = 20`, SQL >64KB not cached). Repeating the
  same SQL string reuses bytecode - parameterize, do not interpolate values
  into SQL text (also avoids cache thrash). Use `.prepare()` for one-off
  dynamic SQL to avoid polluting the cache. If the app has >20 hot queries,
  raise `Database.MAX_QUERY_CACHE_SIZE`.
- WAL: `PRAGMA journal_mode = WAL` + `PRAGMA synchronous = NORMAL` is exactly
  the recommended combo (already set in backend/store/index.ts). NORMAL syncs
  at checkpoints; power loss can drop last commits but cannot corrupt.
- `strict: true` on `new Database(...)` makes missing bound params throw
  instead of silently binding NULL - worth considering for the store.
- Transactions: `db.transaction(fn)` for bulk writes (seed/import) - one
  commit instead of per-row fsync; huge import speedup for source imports.
- WAL sidecar (`-wal`, `-shm`) cleanup on close is platform-dependent; on
  Linux/Bun they may linger after close - harmless, already gitignored.
- `.close(false)` lets prepared statements finish; `using db = ...` closes
  with `close(true)`. Not needed for the long-lived dev store.

---

## Quick action mapping

- Map popup fix: use div -> setDOMContent -> addTo -> createRoot(div); never
  getElement() before content; unmount root on close (section 1).
- Zrodla forms: validator+handler chain, `{ok:false,...}` returns, auth in
  handler/middleware, router.invalidate after writes (section 2).
- Dev startup: optimizeDeps.include/entries + server.warmup first; consider
  noDiscovery once list is stable; WSL2 /mnt/c is the elephant (sections 5-6).
- Cleanup: deprecated esbuildOptions, dep-options 404 link, no `AED/` subdir
  in this checkout (AGENTS.md drift), never split loaders or export route
  components (sections 4-5).