import { createFileRoute } from "@tanstack/react-router";

import { GEOJSON_CONTENT_TYPE, getGeoJson } from "#backend/gov-api/index.ts";

const HEADERS = {
	"cache-control": "no-store",
	"content-disposition": 'inline; filename="aed.geojson"',
	"content-type": GEOJSON_CONTENT_TYPE,
} as const;

function byteLength(value: string): string {
	return String(new TextEncoder().encode(value).byteLength);
}

/** Machine-readable geo resource linked from `/harvester/feed.xml`. */
export const Route = createFileRoute("/data/aed.geojson")({
	server: {
		handlers: {
			GET: () => new Response(getGeoJson(), { headers: HEADERS }),
			HEAD: () => {
				const body = getGeoJson();
				return new Response(null, {
					headers: { ...HEADERS, "content-length": byteLength(body) },
				});
			},
		},
	},
});
