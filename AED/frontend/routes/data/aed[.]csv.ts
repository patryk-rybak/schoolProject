import { createFileRoute } from "@tanstack/react-router";

import { CSV_CONTENT_TYPE, getExportSnapshot } from "#backend/gov-api/index.ts";

const HEADERS = {
	"cache-control": "public, max-age=60, stale-while-revalidate=300",
	"content-disposition": 'inline; filename="aed.csv"',
	"content-type": CSV_CONTENT_TYPE,
	vary: "Accept-Encoding",
} as const;

function byteLength(value: string): string {
	return String(new TextEncoder().encode(value).byteLength);
}

/** Machine-readable resource linked from `/harvester/feed.xml`. */
export const Route = createFileRoute("/data/aed.csv")({
	server: {
		handlers: {
			GET: () => {
				const snapshot = getExportSnapshot();
				return new Response(snapshot.csv, {
					headers: {
						...HEADERS,
						etag: `"${snapshot.key}"`,
						"last-modified": new Date(snapshot.latest).toUTCString(),
					},
				});
			},
			HEAD: () => {
				const snapshot = getExportSnapshot();
				return new Response(null, {
					headers: {
						...HEADERS,
						"content-length": byteLength(snapshot.csv),
						etag: `"${snapshot.key}"`,
						"last-modified": new Date(snapshot.latest).toUTCString(),
					},
				});
			},
		},
	},
});
