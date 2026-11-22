import { layers, namedFlavor } from "@protomaps/basemaps";
import { Link, RouterContextProvider, useRouter } from "@tanstack/react-router";
import {
	CircleAlert,
	LoaderCircle,
	Maximize2,
	ShieldCheck,
	ShieldQuestion,
	X,
} from "lucide-react";
// biome-ignore lint/performance/noNamespaceImport: MapLibre is used as both a value namespace and a type namespace here.
import * as maplibregl from "maplibre-gl";
// Vite emits the MapLibre worker as a hashed asset and returns its URL.
// Configure it once before any map is constructed; no copied public asset or
// cache-busting query parameter is needed.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

import "maplibre-gl/dist/maplibre-gl.css";

import { AedDetailContent } from "#/components/aed-detail-content";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { getAedDetailFn } from "#/server/forms";
import {
	ACCESS_LABELS,
	displayValue,
	labelFor,
	STATUS_LABELS,
} from "#/lib/aed-labels";
import type { AedDetail } from "#backend/aed-detail.ts";

import type { AedMapPoint } from "./aed-point.ts";
import polandBorder from "./poland-border.geo.json" with { type: "json" };

// MapLibre v6 loads its worker from a URL. Set the Vite-generated URL once at
// startup (browser only) so every map instance uses the bundled worker asset.
if (typeof globalThis.window !== "undefined") {
	maplibregl.setWorkerUrl(maplibreWorkerUrl);
}

// biome-ignore lint/style/noMagicNumbers: the geographic centre of Poland is a named constant here.
const POLAND_CENTER: [number, number] = [19.1451, 51.9194];
const POLAND_ZOOM = 5.4;
const POLAND_MIN_ZOOM = 4;
const POLAND_MAX_ZOOM = 18;
const TILE_SOURCE_MAX_ZOOM = 15;
const NUMERIC_ID_PATTERN = /^\d+$/u;

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

// Punkty są wyróżniane wyłącznie według stanu weryfikacji.
export const VERIFIED_COLOR = "#16a34a";
export const UNVERIFIED_COLOR = "#9ca3af";

/** Converts untrusted GeoJSON properties into the popup's display model. */
export function toAedMapPoint(
	properties: Record<string, unknown> | null | undefined,
): AedMapPoint | null {
	if (!properties) {
		return null;
	}
	const prop = (key: string): string => displayValue(properties[key]);
	const idText = prop("id");
	const id = NUMERIC_ID_PATTERN.test(idText) ? Number(idText) : null;
	const name = prop("name");
	if (id === null && name === "") {
		return null;
	}

	return {
		id,
		name: name || "AED",
		city: prop("city") || null,
		address: prop("address") || null,
		access: prop("access") || "unknown",
		status: prop("status") || "unknown",
		source: prop("source_id") || "Niepodano",
		verificationStatus: prop("verification_status") || "unverified",
		sourceUrl: prop("source_url") || null,
	};
}

/** Aktywny popup mapy wraz z funkcją zamykającą (sprząta też korzeń React). */
interface ActivePopup {
	readonly popup: maplibregl.Popup;
	readonly close: () => void;
}

function addAedPoints(
	map: maplibregl.Map,
	pickRef: { current: ((lat: number, lon: number) => void) | null },
	popupRef: { current: ActivePopup | null },
): void {
	map.addSource("aed", {
		type: "geojson",
		data: `${globalThis.location.origin}/data/aed.points.geojson`,
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
		const point = toAedMapPoint(feature.properties);
		const [lon, lat] = feature.geometry.coordinates as [number, number];
		if (point) {
			showPopup({
				map,
				lngLat: event.lngLat,
				content: <AedPopup point={point} />,
				popupRef,
			});
		}
		// W trybie wyboru punktu kliknięcie w istniejący AED też ustawia punkt.
		if (pickRef.current) {
			pickRef.current(lat, lon);
		}
		// Kliknięcie w istniejący AED nie otwiera komunikatu o braku punktu.
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

function AedPopup({ point }: { point: AedMapPoint }) {
	const verified = point.verificationStatus === "verified";
	const [detailOpen, setDetailOpen] = useState(false);
	const location = [point.city, point.address]
		.filter((part) => part !== null && part !== "")
		.join(", ");

	return (
		<div className="flex max-w-72 flex-col gap-2 p-1">
			<div className="flex flex-col gap-1">
				<p className="font-semibold text-sm leading-snug">{point.name}</p>
				<p className="text-muted-foreground text-xs">
					{location === "" ? "Brak danych adresowych" : location}
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-1.5">
				<Badge
					variant="secondary"
					className={
						verified
							? "bg-green-100 text-green-800"
							: "bg-muted text-muted-foreground"
					}
				>
					{verified ? <ShieldCheck /> : <ShieldQuestion />}
					{verified ? "Zweryfikowany" : "Niezweryfikowany"}
				</Badge>
			</div>
			<p className="text-muted-foreground text-xs">
				{labelFor(point.access, ACCESS_LABELS)} ·{" "}
				{labelFor(point.status, STATUS_LABELS)}
			</p>
			{point.id !== null ? (
				<>
					<Separator />
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							onClick={() => {
								setDetailOpen(true);
							}}
						>
							<Maximize2 />
							Więcej
						</Button>
						<Button asChild={true} size="sm" variant="outline">
							<a
								href={`/aed/${encodeURIComponent(String(point.id))}`}
								onClick={(event) => event.stopPropagation()}
							>
								Zobacz szczegóły AED
							</a>
						</Button>
					</div>
					{detailOpen ? (
						<AedDetailOverlay
							id={point.id}
							onClose={() => {
								setDetailOpen(false);
							}}
						/>
					) : null}
				</>
			) : null}
		</div>
	);
}

/**
 * Pełnoekranowy podgląd wszystkich danych AED. Portal do document.body, żeby
 * overlay nie był przycinany ani przesuwany przez kontener popupu MapLibre.
 * Szczegóły są pobierane leniwie dopiero po kliknięciu „Więcej”.
 */
function AedDetailOverlay({
	id,
	onClose,
}: {
	id: number;
	onClose: () => void;
}) {
	const [detail, setDetail] = useState<AedDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		getAedDetailFn({ data: { id: String(id) } })
			.then((result) => {
				if (cancelled) {
					return;
				}
				if (result === null) {
					setError("Nie znaleziono danych tego AED.");
				} else {
					setDetail(result);
				}
			})
			.catch((cause: unknown) => {
				if (!cancelled) {
					console.error("Błąd pobierania szczegółów AED:", cause);
					setError("Nie udało się pobrać szczegółów AED. Spróbuj ponownie.");
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [id]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				onClose();
			}
		};
		globalThis.document.addEventListener("keydown", onKeyDown);
		return () => {
			globalThis.document.removeEventListener("keydown", onKeyDown);
		};
	}, [onClose]);

	return createPortal(
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-background"
			role="dialog"
			aria-modal={true}
			aria-label="Szczegóły AED"
		>
			<div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
				<div className="flex items-center justify-between gap-4">
					<h1 className="font-bold text-2xl">Szczegóły AED</h1>
					<Button
						variant="outline"
						size="sm"
						onClick={onClose}
						aria-label="Zamknij szczegóły AED"
					>
						<X />
						Zamknij
					</Button>
				</div>
				{loading ? (
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<LoaderCircle className="animate-spin" />
						Wczytywanie danych AED…
					</p>
				) : error !== null ? (
					<Alert variant="destructive">
						<CircleAlert />
						<AlertTitle>Nie udało się wczytać danych</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : detail !== null ? (
					<Card>
						<CardContent>
							<AedDetailContent detail={detail} />
						</CardContent>
					</Card>
				) : null}
			</div>
		</div>,
		globalThis.document.body,
	);
}

function showPopup(options: {
	map: maplibregl.Map;
	lngLat: maplibregl.LngLat;
	content: React.ReactNode;
	popupRef: { current: ActivePopup | null };
}): void {
	const { map, lngLat, content, popupRef } = options;
	popupRef.current?.close();
	popupRef.current = null;

	// MapLibre v6 tworzy kontener popupu leniwie w _update() i tylko gdy ma
	// treść, więc getElement() zaraz po addTo() może zwrócić undefined.
	// Tworzymy własny węzeł i przekazujemy go przez setDOMContent PRZED addTo,
	// a React montujemy na tym właśnie węźle.
	const container = globalThis.document.createElement("div");
	const popup = new maplibregl.Popup({ maxWidth: "320px", closeOnClick: false })
		.setLngLat(lngLat)
		.setDOMContent(container);
	const root = createRoot(container);

	// Zamknięcie z zewnątrz (X popupu): usuń popup i odmontuj React dopiero po
	// zakończeniu bieżącego cyklu renderowania (unmount w trakcie renderu
	// Reacta wywołuje ostrzeżenie).
	let disposed = false;
	const dispose = (): void => {
		if (disposed) {
			return;
		}
		disposed = true;
		popup.remove();
		queueMicrotask(() => {
			root.unmount();
		});
	};
	popup.on("close", dispose);

	// Zamknięcie z naszej strony: najpierw odmontuj React (poza cyklem
	// renderowania), potem usuń popup. Zdarzenie „close” jest wtedy no-opem.
	const close = (): void => {
		if (disposed) {
			return;
		}
		disposed = true;
		popup.off("close", dispose);
		if (popupRef.current?.popup === popup) {
			popupRef.current = null;
		}
		queueMicrotask(() => {
			root.unmount();
			popup.remove();
		});
	};

	popup.addTo(map);
	root.render(content);
	popupRef.current = { popup, close };
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
	const popupRef = useRef<ActivePopup | null>(null);
	// Popupy żyją w osobnych korzeniach React (createRoot), więc kontekst
	// routera nie dociera do nich automatycznie. Przechwytujemy instancję
	// routera i owijamy treść popupu w RouterContextProvider, żeby Link
	// w „Dodaj AED tutaj” działał (nawigacja kliencka zamiast przeładowania).
	const router = useRouter();
	const routerRef = useRef(router);
	routerRef.current = router;
	const [error, setError] = useState<string | null>(null);
	pickRef.current = onPick ?? null;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

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
			console.error("Błąd wczytywania mapy:", event.error);
			setError(
				"Nie udało się wczytać mapy. Sprawdź połączenie z internetem i dostępność danych mapy.",
			);
		});

		// AED points from the dev store via /data/aed.points.geojson (gov-api).
		map.on("load", () => {
			addPolandMask(map);
			addAedPoints(map, pickRef, popupRef);
		});

		// Kliknięcie mapy: w trybie pickera ustawia punkt. Na mapie bez pickera
		// otwiera popup z informacją o braku AED; kliknięcia w istniejące punkty
		// obsługuje warstwa aed-points (event.defaultPrevented).
		map.on("click", (event) => {
			const pointLayer = map.getLayer("aed-points");
			if (
				event.defaultPrevented ||
				(pointLayer &&
					map.queryRenderedFeatures(event.point, { layers: [pointLayer.id] })
						.length > 0)
			) {
				return;
			}
			const { lat, lng } = event.lngLat;
			if (pickRef.current) {
				popupRef.current?.close();
				popupRef.current = null;
				pickRef.current(lat, lng);
				return;
			}
			showPopup({
				map,
				lngLat: event.lngLat,
				content: (
					<RouterContextProvider router={routerRef.current}>
						<AddHerePopup lat={lat} lon={lng} />
					</RouterContextProvider>
				),
				popupRef,
			});
		});

		return () => {
			popupRef.current?.close();
			popupRef.current = null;
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
					className="absolute inset-x-4 top-4 z-20 mx-auto max-w-2xl bg-background/95 shadow-lg"
				>
					<CircleAlert />
					<AlertTitle>Nie udało się wczytać mapy.</AlertTitle>
					<AlertDescription>
						{error} Uruchom <code>bun run map:tiles</code>, aby pobrać dane
						mapy.
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
