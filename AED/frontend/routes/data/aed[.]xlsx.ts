import { createFileRoute } from "@tanstack/react-router";

import {
	getExportSnapshot,
	XLSX_CONTENT_TYPE,
} from "#backend/gov-api/index.ts";

const HEADERS = {
	"cache-control": "public, max-age=60, stale-while-revalidate=300",
	"content-disposition": 'attachment; filename="aed.xlsx"',
	"content-type": XLSX_CONTENT_TYPE,
} as const;

/** Machine-readable XLSX built from the same normalized records as CSV/GeoJSON. */
export const Route = createFileRoute("/data/aed.xlsx")({
	server: {
		handlers: {
			GET: () => {
				const snapshot = getExportSnapshot();
				const bytes = new Uint8Array(snapshot.xlsx);
				return new Response(bytes.buffer as ArrayBuffer, {
					headers: {
						...HEADERS,
						"content-length": String(snapshot.xlsx.byteLength),
						etag: `"${snapshot.key}"`,
						"last-modified": new Date(snapshot.latest).toUTCString(),
					},
				});
			},
		},
	},
});
