import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// biome-ignore lint/style/noDefaultExport: Vite requires a default export.
export default defineConfig({
	server: {
		watch: { usePolling: true, interval: 300 },
	},
	resolve: { tsconfigPaths: true },
	publicDir: "frontend/public",
	ssr: { noExternal: ["maplibre-gl"] },
	plugins: [
		nitro({
			preset: "bun",
			publicAssets: [{ dir: "frontend/public", baseURL: "/" }],
		}),
		tailwindcss(),
		tanstackStart({ srcDirectory: "frontend" }),
		viteReact(),
	],
});
