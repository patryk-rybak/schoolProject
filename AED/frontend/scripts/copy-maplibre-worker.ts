const source = Bun.file("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const target = "frontend/public/maplibre-gl-worker.mjs";

await Bun.write(target, source);
