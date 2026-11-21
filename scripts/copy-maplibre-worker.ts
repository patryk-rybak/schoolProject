const source = Bun.file("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const target = "public/maplibre-gl-worker.mjs";

await Bun.write(target, source);
