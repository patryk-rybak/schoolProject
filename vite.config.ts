import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	ssr: { noExternal: ["maplibre-gl"] },
	plugins: [
		devtools(),
		nitro({ preset: "bun", rollupConfig: { external: [/^@sentry\//u] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

// biome-ignore lint/style/noDefaultExport: Vite requires a default export.
export default config;
