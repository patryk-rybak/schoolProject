import { layers, namedFlavor } from "@protomaps/basemaps";
import { Link } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
// biome-ignore lint/performance/noNamespaceImport: MapLibre is used as both a value namespace and a type namespace here.
import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";

import polandBorder from "./poland-border.geo.json" with { type: "json" };

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

// Mask everything outside Poland: a world-sized outer ring with the Polish
// border as a hole (even-odd fill). Border: Natural Earth 1:50m (public domain).
const WORLD_LON = 180;
// Web Mercator clips at ~85.06°; 85 covers the whole projected world.
const WORLD_LAT = 85;
const WORLD_RING: [number, number][] = [
	[-WORLD_LON, -WORLD_LAT],
	[WORLD_LON, -WORLD_LAT],
	[WORLD_LON, WORLD_LAT],
	[-WORLD_LON, WORLD_LAT],
	[-WORLD_LON, -WORLD_LAT],
];

function addPolandMask(map: maplibregl.Map): void {
	const border = polandBorder.geometry.coordinates as [number, number][][];
	map.addSource("poland-mask", {
		type: "geojson",
		data: {
			type: "Feature",
			properties: {},
			geometry: { type: "Polygon", coordinates: [WORLD_RING, ...border] },
		},
	});
	map.addSource("poland-outline", {
		type: "geojson",
		data: {
			type: "Feature",
			properties: {},
			geometry: { type: "Polygon", coordinates: border },
		},
	});
	map.addLayer({
		id: "poland-mask",
		type: "fill",
		source: "poland-mask",
		paint: { "fill-color": "#f8fafc", "fill-opacity": 1 },
	});
	map.addLayer({
		id: "poland-border",
		type: "line",
		source: "poland-outline",
		paint: { "line-color": "#94a3b8", "line-width": 1.5 },
	});
}

// Verified points are green, unverified gray.
const VERIFIED_COLOR = "#16a34a";
const UNVERIFIED_COLOR = "#9ca3af";

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function verificationHtml(props: Record<string, unknown>): string {
	// biome-ignore lint/complexity/useLiteralKeys: GeoJSON properties use an index signature.
	const verified = props["verification_status"] === "verified";
	if (!verified) {
		return "Niezweryfikowany";
	}
	// biome-ignore lint/complexity/useLiteralKeys: GeoJSON properties use an index signature.
	const by = props["verified_by"];
	// biome-ignore lint/complexity/useLiteralKeys: GeoJSON properties use an index signature.
	const at = props["verified_at"];
	const parts = ["Zweryfikowany"];
	if (by) {
		parts.push(`przez ${escapeHtml(String(by))}`);
	}
	if (at) {
		parts.push(escapeHtml(String(at)));
	}
	return parts.join(" · ");
}

function addAedPoints(
	map: maplibregl.Map,
	pickRef: { current: ((lat: number, lon: number) => void) | null },
): void {
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
			"circle-color": [
				"case",
				["==", ["get", "verification_status"], "verified"],
				VERIFIED_COLOR,
				UNVERIFIED_COLOR,
			],
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
		const [lon, lat] = feature.geometry.coordinates as [number, number];
		new maplibregl.Popup({ maxWidth: "280px" })
			.setLngLat(feature.geometry.coordinates as [number, number])
			.setHTML(
				`<strong>${escapeHtml(String(name))}</strong><br/>${escapeHtml(String(city))}<br/>${verificationHtml(props)}`,
			)
			.addTo(map);
		// W trybie wyboru punktu kliknięcie w istniejący AED też ustawia punkt.
		if (pickRef.current) {
			pickRef.current(lat, lon);
		}
		// Nie otwieraj popupu „Dodaj AED tutaj” pod klikniętym punktem.
		event.preventDefault();
	});
	map.on("mouseenter", "aed-points", () => {
		map.getCanvas().style.cursor = "pointer";
	});
	map.on("mouseleave", "aed-points", () => {
		map.getCanvas().style.cursor = "";
	});
}

export interface PolandMapProps {
	/** Tryb wyboru punktu: kliknięcie mapy wywołuje onPick(lat, lon). */
	onPick?: (lat: number, lon: number) => void;
	/** Punkt wybrany/wyznaczony do pokazania na mapie pickera. */
	picked?: { lat: number; lon: number } | null;
	/** Punkt początkowy (np. z geokodowania lub parametrów URL). */
	initialCenter?: { lat: number; lon: number } | null;
	/** Wysokość kontenera mapy; domyślnie 70vh jak na stronie głównej. */
	className?: string;
}

const PICK_ZOOM = 16;
const COORD_DECIMALS = 6;

function AddHerePopup({ lat, lon }: { lat: number; lon: number }) {
	return (
		<div className="flex flex-col gap-2 p-1">
			<p className="font-medium text-sm">Dodać AED w tym miejscu?</p>
			<p className="text-muted-foreground text-xs">
				{lat.toFixed(COORD_DECIMALS)}, {lon.toFixed(COORD_DECIMALS)}
			</p>
			<Button asChild={true} size="sm">
				<Link to="/dodaj-aed" search={{ lat, lon }}>
					Dodaj AED tutaj
				</Link>
			</Button>
		</div>
	);
}

export function PolandMap({
	onPick,
	picked,
	initialCenter,
	className,
}: PolandMapProps = {}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const markerRef = useRef<maplibregl.Marker | null>(null);
	const pickRef = useRef<((lat: number, lon: number) => void) | null>(null);
	const popupRootRef = useRef<Root | null>(null);
	const [error, setError] = useState<string | null>(null);
	pickRef.current = onPick ?? null;

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
			center: initialCenter
				? [initialCenter.lon, initialCenter.lat]
				: POLAND_CENTER,
			zoom: initialCenter ? PICK_ZOOM : POLAND_ZOOM,
			minZoom: POLAND_MIN_ZOOM,
			maxZoom: POLAND_MAX_ZOOM, // overzoom past the extract's zoom 15 tiles
			attributionControl: { compact: true },
		});
		mapRef.current = map;

		map.addControl(new maplibregl.NavigationControl(), "top-right");
		map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));
		map.on("error", (event) => {
			setError(event.error.message);
		});

		// AED points from the dev store via /data/aed.geojson (gov-api module).
		map.on("load", () => {
			addPolandMask(map);
			addAedPoints(map, pickRef);
		});

		// Kliknięcie mapy: w trybie pickera ustawia punkt. Na mapie bez pickera
		// otwiera popup „Dodaj AED tutaj”; kliknięcia w istniejące punkty AED
		// obsługuje warstwa aed-points (event.defaultPrevented).
		map.on("click", (event) => {
			if (event.defaultPrevented) {
				return;
			}
			const { lat, lng } = event.lngLat;
			if (pickRef.current) {
				pickRef.current(lat, lng);
				return;
			}
			popupRootRef.current?.unmount();
			const node = document.createElement("div");
			const root = createRoot(node);
			popupRootRef.current = root;
			root.render(<AddHerePopup lat={lat} lon={lng} />);
			new maplibregl.Popup({ closeButton: true, maxWidth: "260px" })
				.setLngLat(event.lngLat)
				.setDOMContent(node)
				.addTo(map);
		});

		return () => {
			popupRootRef.current?.unmount();
			popupRootRef.current = null;
			markerRef.current?.remove();
			markerRef.current = null;
			mapRef.current = null;
			map.remove();
		};
		// initialCenter czytany tylko przy montażu; później steruje nim `picked`.
		// biome-ignore lint/correctness/useExhaustiveDependencies: montaż jednorazowy.
	}, [initialCenter]);

	// Znacznik wybranego punktu (tryb pickera).
	useEffect(() => {
		const map = mapRef.current;
		if (!map) {
			return;
		}
		if (!picked) {
			markerRef.current?.remove();
			markerRef.current = null;
			return;
		}
		if (!markerRef.current) {
			markerRef.current = new maplibregl.Marker({ color: "#dc2626" });
		}
		markerRef.current.setLngLat([picked.lon, picked.lat]).addTo(map);
		map.easeTo({
			center: [picked.lon, picked.lat],
			zoom: Math.max(map.getZoom(), PICK_ZOOM),
		});
	}, [picked]);

	return (
		<div
			className={
				className ??
				"relative h-[70vh] min-h-96 overflow-hidden rounded-xl border bg-muted"
			}
		>
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
