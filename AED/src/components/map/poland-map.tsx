import { layers, namedFlavor } from "@protomaps/basemaps";
import { CircleAlert } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";

import "maplibre-gl/dist/maplibre-gl.css";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";

// MapLibre v6 loads its worker from a URL. Serve the file copied into
// public/ by scripts/copy-maplibre-worker.ts as a static asset: Nitro's dev
// middleware bypasses server routes for Sec-Fetch-Dest: worker requests.
// Keep ?v= in sync with the maplibre-gl version to bust caches on upgrades.
const WORKER_URL = "/maplibre-gl-worker.mjs?v=6.19.0";

// Tiles come from src/routes/api/pmtiles.ts (HTTP range support).
function createStyle(origin: string): maplibregl.StyleSpecification {
	return {
		version: 8,
		glyphs:
			"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
		sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
		sources: {
			protomaps: {
				type: "vector",
				url: `pmtiles://${origin}/api/pmtiles`,
				// The tile extract stops at zoom 15. Pin the source maxzoom so
				// MapLibre overzooms (reuses z15 tiles) instead of requesting
				// missing z16+ tiles when the map zooms further in.
				maxzoom: 15,
				attribution:
					'<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
			},
		},
		layers: layers("protomaps", namedFlavor("light"), { lang: "pl" }),
	};
}

export function PolandMap() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		maplibregl.setWorkerUrl(WORKER_URL);
		maplibregl.addProtocol("pmtiles", new Protocol().tile);

		const map = new maplibregl.Map({
			container,
			style: createStyle(globalThis.location.origin),
			center: [19.1451, 51.9194], // Poland
			zoom: 5.4,
			minZoom: 4,
			maxZoom: 18, // overzoom past the extract's zoom 15 tiles
			attributionControl: { compact: true },
		});

		map.addControl(new maplibregl.NavigationControl(), "top-right");
		map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));
		map.on("error", (event) => {
			setError(event.error.message);
		});

		return () => {
			map.remove();
		};
	}, []);

	return (
		<div className="relative h-[70vh] min-h-96 overflow-hidden rounded-xl border bg-muted">
			{/* MapLibre's CSS forces position:relative on its container, which
			    would defeat `absolute inset-0`. Size the element directly. */}
			<div ref={containerRef} className="h-full w-full" />
			{error ? (
				<Alert
					variant="destructive"
					className="absolute inset-x-4 bottom-4 w-auto bg-background/95"
				>
					<CircleAlert />
					<AlertTitle>Nie udało się wczytać mapy</AlertTitle>
					<AlertDescription>
						{error} Uruchom <code>bun run map:tiles</code>, aby pobrać dane mapy.
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
