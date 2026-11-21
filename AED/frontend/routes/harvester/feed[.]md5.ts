import { createFileRoute } from "@tanstack/react-router";

import { getFeedArtifact } from "#backend/gov-api/index.ts";

const HEADERS = {
	"cache-control": "no-store",
	"content-type": "text/plain; charset=utf-8",
} as const;

function byteLength(value: string): string {
	return String(new TextEncoder().encode(value).byteLength);
}

/**
 * Checksum sidecar for `/harvester/feed.xml`.
 *
 * The portal derives this URL by replacing `.xml` with `.md5`, so the route is
 * `feed.md5` (not `feed.xml.md5`). The body must be the MD5 of exactly the
 * bytes served by the XML endpoint.
 */
export const Route = createFileRoute("/harvester/feed.md5")({
	server: {
		handlers: {
			GET: () => {
				const body = `${getFeedArtifact().md5}\n`;
				return new Response(body, { headers: HEADERS });
			},
			HEAD: () => {
				const body = `${getFeedArtifact().md5}\n`;
				return new Response(null, {
					headers: { ...HEADERS, "content-length": byteLength(body) },
				});
			},
		},
	},
});
