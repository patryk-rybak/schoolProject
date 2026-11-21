import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";

import type { Map as MapLibreMap } from "maplibre-gl";

const MAPLIBRE_WORKER_URL = "/api/maplibre-worker?v=1";

const POLAND_CENTER: [number, number] = [19.1451, 51.9194];
const POLAND_ZOOM = 5.4;
const POLAND_MAX_ZOOM = 10;

let pmtilesProtocolAdded = false;

function getTilesUrl(): string {
	const configured = import.meta.env["VITE_PROTOMAPS_PMTILES_URL"];
	if (configured) {
		return configured;
	}

	return new URL("/api/pmtiles", globalThis.location.origin).toString();
}

export function PolandMap() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let map: MapLibreMap | undefined;
		let cancelled = false;
		let workerBlobUrl: string | undefined;

		async function init() {
			const [maplibregl, { Protocol }, { layers, namedFlavor }, workerResponse] =
				await Promise.all([
					import("maplibre-gl"),
					import("pmtiles"),
					import("@protomaps/basemaps"),
					fetch(MAPLIBRE_WORKER_URL),
				]);

			if (cancelled || !containerRef.current) {
				return;
			}

			const workerSource = await workerResponse.text();
			// MapLibre v6 loads its worker from a URL. A Blob URL avoids
			// bundler and browser restrictions on module worker URLs.
			workerBlobUrl = URL.createObjectURL(
				new Blob([workerSource], { type: "text/javascript" }),
			);
			maplibregl.setWorkerUrl(workerBlobUrl);

			if (!pmtilesProtocolAdded) {
				maplibregl.addProtocol("pmtiles", new Protocol().tile);
				pmtilesProtocolAdded = true;
			}

			const style = {
				version: 8 as const,
				glyphs:
					"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
				sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
				sources: {
					protomaps: {
						type: "vector" as const,
						url: `pmtiles://${getTilesUrl()}`,
						attribution:
							'<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
					},
				},
				layers: layers("protomaps", namedFlavor("light"), { lang: "pl" }),
			};

			const mapInstance = new maplibregl.Map({
				container: containerRef.current,
				style,
				center: POLAND_CENTER,
				zoom: POLAND_ZOOM,
				minZoom: 4,
				maxZoom: POLAND_MAX_ZOOM,
				attributionControl: { compact: true },
			});
			map = mapInstance;

			mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");
			mapInstance.addControl(
				new maplibregl.ScaleControl({ unit: "metric" }),
				"bottom-left",
			);

			mapInstance.on("error", (event) => {
				setError(event.error?.message ?? "Nie udało się załadować mapy.");
			});
		}

		void init();

		return () => {
			cancelled = true;
			map?.remove();
			if (workerBlobUrl) {
				URL.revokeObjectURL(workerBlobUrl);
			}
		};
	}, []);

	return (
		<div className="relative h-[70vh] min-h-96 w-full overflow-hidden rounded-xl border bg-muted">
			<div ref={containerRef} className="absolute inset-0" />
			{error ? (
				<div className="absolute inset-x-4 bottom-4 rounded-md border border-destructive/30 bg-background/95 p-3 text-sm text-destructive shadow-sm">
					{error} Uruchom <code className="font-mono">bun run map:tiles</code>,
					aby pobrać dane mapy.
				</div>
			) : null}
		</div>
	);
}
