import { createFileRoute } from "@tanstack/react-router";

// biome-ignore lint/correctness/noProcessGlobal: the Bun server needs the working directory to locate the worker.
const WORKER_PATH = `${process.cwd()}/public/maplibre-gl-worker.mjs`;

async function serveWorker(): Promise<Response> {
	const file = Bun.file(WORKER_PATH);
	if (!(await file.exists())) {
		return new Response("MapLibre worker not found. Run `bun install`.", {
			status: 404,
		});
	}

	return new Response(file, {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "text/javascript; charset=utf-8",
		},
	});
}

export const Route = createFileRoute("/api/maplibre-worker")({
	server: {
		handlers: {
			GET: () => serveWorker(),
		},
	},
});
