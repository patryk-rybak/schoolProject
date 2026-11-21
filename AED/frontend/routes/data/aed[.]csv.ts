import { createFileRoute } from "@tanstack/react-router";

import { CSV_CONTENT_TYPE, getCsv } from "#backend/gov-api/index.ts";

const HEADERS = {
	"cache-control": "no-store",
	"content-disposition": 'inline; filename="aed.csv"',
	"content-type": CSV_CONTENT_TYPE,
} as const;

function byteLength(value: string): string {
	return String(new TextEncoder().encode(value).byteLength);
}

/** Machine-readable resource linked from `/harvester/feed.xml`. */
export const Route = createFileRoute("/data/aed.csv")({
	server: {
		handlers: {
			GET: () => new Response(getCsv(), { headers: HEADERS }),
			HEAD: () => {
				const body = getCsv();
				return new Response(null, {
					headers: { ...HEADERS, "content-length": byteLength(body) },
				});
			},
		},
	},
});
