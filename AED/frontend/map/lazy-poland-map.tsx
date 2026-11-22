import { lazy, Suspense, useEffect, useState } from "react";

import type { PolandMapProps } from "#/map/poland-map";

const PolandMap = lazy(async () => ({
	default: (await import("#/map/poland-map")).PolandMap,
}));

function MapLoading({ className }: PolandMapProps) {
	return (
		<output
			className={
				className ??
				"relative flex h-[70vh] min-h-96 items-center justify-center overflow-hidden rounded-xl border bg-muted"
			}
			aria-live="polite"
		>
			<p className="text-muted-foreground text-sm">Przygotowywanie mapy AED…</p>
		</output>
	);
}

interface LazyPolandMapProps extends PolandMapProps {
	/** Odłóż ładowanie pakietu mapy do momentu po pierwszym wyrenderowaniu. */
	deferred?: boolean;
}

/**
 * Browser-only gate: the map bundle (and therefore MapLibre/PMTiles) is never
 * imported during SSR. Without `deferred`, importing starts immediately after
 * hydration; with it, mounting waits until the main thread is idle.
 */
export function LazyPolandMap({
	deferred = false,
	...props
}: LazyPolandMapProps) {
	const [shouldMount, setShouldMount] = useState(false);

	useEffect(() => {
		if (!deferred) {
			setShouldMount(true);
			return;
		}

		const scope = globalThis.window as typeof globalThis.window & {
			requestIdleCallback?: (callback: () => void) => number;
			cancelIdleCallback?: (handle: number) => void;
		};
		if (
			typeof scope.requestIdleCallback === "function" &&
			typeof scope.cancelIdleCallback === "function"
		) {
			const handle = scope.requestIdleCallback(() => setShouldMount(true));
			return () => scope.cancelIdleCallback?.(handle);
		}

		// Safari lacks requestIdleCallback: paint the placeholder first, then
		// start the import on the next task.
		let cleanup = () => {
			// No pending timer until requestAnimationFrame runs.
		};
		const frame = scope.requestAnimationFrame(() => {
			const timer = scope.setTimeout(() => setShouldMount(true), 0);
			cleanup = () => scope.clearTimeout(timer);
		});
		return () => {
			cleanup();
			scope.cancelAnimationFrame(frame);
		};
	}, [deferred]);

	if (!shouldMount) {
		return <MapLoading {...props} />;
	}

	return (
		<Suspense fallback={<MapLoading {...props} />}>
			<PolandMap {...props} />
		</Suspense>
	);
}
