import { layers, namedFlavor } from "@protomaps/basemaps";
import { CircleAlert } from "lucide-react";
// biome-ignore lint/performance/noNamespaceImport: MapLibre is used as both a value namespace and a type namespace here.
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

// biome-ignore lint/style/noMagicNumbers: the geographic centre of Poland is a named constant here.
const POLAND_CENTER: [number, number] = [19.1451, 51.9194];
const POLAND_ZOOM = 5.4;
const POLAND_MIN_ZOOM = 4;
const POLAND_MAX_ZOOM = 18;
const TILE_SOURCE_MAX_ZOOM = 15;

// Tiles come from frontend/routes/api/pmtiles.ts (HTTP range support).
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
				maxzoom: TILE_SOURCE_MAX_ZOOM,
				attribution:
					// biome-ignore lint/security/noSecrets: attribution HTML, not a credential.
					'<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
			},
		},
		layers: layers("protomaps", namedFlavor("light"), { lang: "pl" }),
	};
}

function addAedPoints(map: maplibregl.Map): void {
	map.addSource("aed", {
		type: "geojson",
		data: `${globalThis.location.origin}/data/aed.geojson`,
	});
	map.addLayer({
		id: "aed-points",
		type: "circle",
		source: "aed",
		paint: {
			"circle-radius": 5,
			"circle-color": "#16a34a",
			"circle-stroke-width": 1,
			"circle-stroke-color": "#ffffff",
		},
	});
	map.on("click", "aed-points", (event) => {
		const feature = event.features?.[0];
		if (!feature || feature.geometry.type !== "Point") {
			return;
		}
		const props = feature.properties ?? {};
		// biome-ignore lint/complexity/useLiteralKeys: GeoJSON properties use an index signature.
		const name = props["name"] ?? "AED";
		// biome-ignore lint/complexity/useLiteralKeys: GeoJSON properties use an index signature.
		const city = props["city"] ?? "";
		new maplibregl.Popup()
			.setLngLat(feature.geometry.coordinates as [number, number])
			.setHTML(`<strong>${String(name)}</strong><br/>${String(city)}`)
			.addTo(map);
	});
	map.on("mouseenter", "aed-points", () => {
		map.getCanvas().style.cursor = "pointer";
	});
	map.on("mouseleave", "aed-points", () => {
		map.getCanvas().style.cursor = "";
	});
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
			center: POLAND_CENTER,
			zoom: POLAND_ZOOM,
			minZoom: POLAND_MIN_ZOOM,
			maxZoom: POLAND_MAX_ZOOM, // overzoom past the extract's zoom 15 tiles
			attributionControl: { compact: true },
		});

		map.addControl(new maplibregl.NavigationControl(), "top-right");
		map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));
		map.on("error", (event) => {
			setError(event.error.message);
		});

		// AED points from the dev store via /data/aed.geojson (gov-api module).
		map.on("load", () => {
			addAedPoints(map);
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
						{error} Uruchom <code>bun run map:tiles</code>, aby pobrać dane
						mapy.
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
