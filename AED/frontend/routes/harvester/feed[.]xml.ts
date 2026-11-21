import { createFileRoute } from "@tanstack/react-router";

import { getFeedArtifact } from "#backend/gov-api/index.ts";

const HEADERS = {
	"cache-control": "no-store",
	"content-type": "application/xml; charset=utf-8",
} as const;

function byteLength(value: string): string {
	return String(new TextEncoder().encode(value).byteLength);
}

/**
 * dane.gov.pl harvester entry point.
 *
 * The portal calls HEAD first and requires an XML Content-Type, then downloads
 * the body and compares its MD5 with `/harvester/feed.md5`.
 */
export const Route = createFileRoute("/harvester/feed.xml")({
	server: {
		handlers: {
			GET: () => {
				const { xml } = getFeedArtifact();
				return new Response(xml, { headers: HEADERS });
			},
			HEAD: () => {
				const { xml } = getFeedArtifact();
				return new Response(null, {
					headers: { ...HEADERS, "content-length": byteLength(xml) },
				});
			},
		},
	},
});
