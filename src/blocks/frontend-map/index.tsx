import type { AedMapProps } from "../contracts";

export type { AedMapProps, AedSummary } from "../contracts";

export const BLOCK = "frontend-map" as const;

/**
 * TODO(frontend-map): replace the stub with the real MapLibre map.
 * Reuse the base map from `#/components/map/poland-map`.
 */
export function AedMap(_props: AedMapProps) {
	return null;
}
