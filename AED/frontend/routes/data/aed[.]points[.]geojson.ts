import { createFileRoute } from "@tanstack/react-router";
import { acceptEncodingAllowsGzip } from "#/lib/gzip-negotiation";
import {
	getExportSnapshot,
	POINTS_CONTENT_TYPE,
} from "#backend/gov-api/index.ts";

const HEADERS = {
	"cache-control": "public, max-age=60, stale-while-revalidate=300",
	"content-disposition": 'inline; filename="aed.points.geojson"',
	"content-type": POINTS_CONTENT_TYPE,
	vary: "Accept-Encoding",
} as const;

function byteLength(value: string): string {
	return String(new TextEncoder().encode(value).byteLength);
}

let gzipCache: {
	readonly key: string;
	readonly bytes: Uint8Array<ArrayBuffer>;
} | null = null;

/**
 * Gzip once per snapshot key and reuse the bytes on every request.
 * Bun.gzipSync is deterministic and reliable, so no round-trip verification.
 */
function gzipForSnapshot(key: string, body: string): Uint8Array<ArrayBuffer> {
	if (gzipCache?.key !== key) {
		gzipCache = { key, bytes: Bun.gzipSync(new TextEncoder().encode(body)) };
	}
	return gzipCache.bytes;
}

/** Compact point layer for the interactive map; canonical export stays intact. */
export const Route = createFileRoute("/data/aed.points.geojson")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const snapshot = getExportSnapshot();
				const body = snapshot.points;
				const headers = {
					...HEADERS,
					etag: `"points-${snapshot.key}"`,
					"last-modified": new Date(snapshot.latest).toUTCString(),
				};

				if (!acceptEncodingAllowsGzip(request.headers.get("accept-encoding"))) {
					return new Response(body, { headers });
				}

				const gzipped = gzipForSnapshot(snapshot.key, body);
				return new Response(gzipped, {
					headers: {
						...headers,
						"content-encoding": "gzip",
						"content-length": String(gzipped.byteLength),
					},
				});
			},
			HEAD: () => {
				const snapshot = getExportSnapshot();
				return new Response(null, {
					headers: {
						...HEADERS,
						"content-length": byteLength(snapshot.points),
						etag: `"points-${snapshot.key}"`,
						"last-modified": new Date(snapshot.latest).toUTCString(),
					},
				});
			},
		},
	},
});
