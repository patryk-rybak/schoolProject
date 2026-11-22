import process from "node:process";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const pollingFlagName = "VITE_USE_POLLING";
const usePolling = ["1", "true"].includes(process.env[pollingFlagName] ?? "");

// biome-ignore lint/style/noDefaultExport: Vite requires a default export.
export default defineConfig({
	server: {
		...(usePolling ? { watch: { usePolling: true, interval: 300 } } : {}),
		// Pre-transform the SSR entry chain so the first request does not pay
		// for transforming the router, root route, and header on /mnt/c.
		warmup: {
			clientFiles: [
				"frontend/router.tsx",
				"frontend/routes/__root.tsx",
				"frontend/routes/index.tsx",
				"frontend/auth-form/site-header.tsx",
			],
			ssrFiles: [
				"frontend/router.tsx",
				"frontend/routes/__root.tsx",
				"frontend/routes/index.tsx",
				"frontend/auth-form/site-header.tsx",
			],
		},
	},
	resolve: { tsconfigPaths: true },
	publicDir: "frontend/public",
	ssr: { noExternal: ["maplibre-gl"] },
	// Pre-bundle heavy client deps up front. Without this, deps reached only
	// through lazy chunks (map, auth client) are discovered mid-load and force
	// a re-optimization pass plus full page reload on first visit.
	optimizeDeps: {
		// Scan only the client tree; backend code imports bun builtins and the
		// legacy src/ tree, which would fail the scan and skip pre-bundling.
		entries: ["frontend/**/*.{ts,tsx}"],
		include: [
			"react",
			"react-dom",
			"react-dom/client",
			"react/jsx-runtime",
			"react/jsx-dev-runtime",
			"@tanstack/react-router",
			"maplibre-gl",
			"@protomaps/basemaps",
			"pmtiles",
			"better-auth/react",
			"better-auth/client/plugins",
			"nanostores",
			"zod",
			"radix-ui",
			"lucide-react",
			"class-variance-authority",
			"cn",
		],
	},
	plugins: [
		nitro({
			preset: "bun",
			framework: { previewCommand: "bun run preview" },
			publicAssets: [{ dir: "frontend/public", baseURL: "/" }],
		}),
		tailwindcss(),
		tanstackStart({ srcDirectory: "frontend" }),
		viteReact(),
	],
});
