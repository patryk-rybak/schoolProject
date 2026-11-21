import { createFileRoute } from "@tanstack/react-router";

// PMTiles needs HTTP byte-range responses, which static hosting of
// public/ does not provide in dev. Serve the archive with Bun.file.
// Relative to the server's working directory, like the CLI scripts.
const TILES_PATH = "public/poland.pmtiles";
const RANGE_PATTERN = /^bytes=(?<start>\d+)-(?<end>\d*)$/u;

async function serveTiles(request: Request): Promise<Response> {
	const file = Bun.file(TILES_PATH);
	if (!(await file.exists())) {
		return new Response("Map tiles not found. Run `bun run map:tiles`.", {
			status: 404,
		});
	}

	const headers = {
		"Accept-Ranges": "bytes",
		"Content-Type": "application/octet-stream",
	};

	const rangeHeader = request.headers.get("range");
	if (!rangeHeader) {
		return new Response(file, { headers });
	}

	const match = RANGE_PATTERN.exec(rangeHeader);
	const start = Number(match?.[1]);
	const end = match?.[2] ? Number(match[2]) : file.size - 1;
	if (!match || start > end || end >= file.size) {
		return new Response(null, {
			status: 416,
			headers: { "Content-Range": `bytes */${file.size}` },
		});
	}

	return new Response(file.slice(start, end + 1), {
		status: 206,
		headers: {
			...headers,
			"Content-Range": `bytes ${start}-${end}/${file.size}`,
		},
	});
}

export const Route = createFileRoute("/api/pmtiles")({
	server: {
		handlers: {
			GET: ({ request }) => serveTiles(request),
		},
	},
});
