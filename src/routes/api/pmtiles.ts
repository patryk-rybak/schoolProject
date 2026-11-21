import { createFileRoute } from "@tanstack/react-router";

// biome-ignore lint/correctness/noProcessGlobal: the Bun server needs the working directory to locate the tile archive.
const PMTILES_PATH = `${process.cwd()}/public/poland.pmtiles`;
const RANGE_PATTERN = /^bytes=(?<start>\d*)-(?<end>\d*)$/u;

interface ByteRange {
	end: number;
	start: number;
}

function parseRange(header: string, size: number): ByteRange | null {
	const match = RANGE_PATTERN.exec(header);
	if (!match) {
		return null;
	}

	const { groups } = match;
	const startText = groups?.["start"];
	const endText = groups?.["end"];
	const start = startText ? Number(startText) : 0;
	const end = endText ? Number(endText) : size - 1;

	if (!(Number.isInteger(start) && Number.isInteger(end))) {
		return null;
	}

	if (start < 0 || end >= size || start > end) {
		return null;
	}

	return { end, start };
}

async function servePmtiles(request: Request): Promise<Response> {
	const file = Bun.file(PMTILES_PATH);
	if (!(await file.exists())) {
		return new Response("Map tiles not found. Run `bun run map:tiles`.", {
			status: 404,
		});
	}

	const { size } = file;
	const rangeHeader = request.headers.get("range");

	if (!rangeHeader) {
		return new Response(file, {
			headers: {
				"Accept-Ranges": "bytes",
				"Content-Length": String(size),
				"Content-Type": "application/octet-stream",
			},
		});
	}

	const range = parseRange(rangeHeader, size);
	if (!range) {
		return new Response(null, {
			headers: { "Content-Range": `bytes */${size}` },
			status: 416,
		});
	}

	const { start, end } = range;

	return new Response(file.slice(start, end + 1), {
		headers: {
			"Accept-Ranges": "bytes",
			"Content-Length": String(end - start + 1),
			"Content-Range": `bytes ${start}-${end}/${size}`,
			"Content-Type": "application/octet-stream",
		},
		status: 206,
	});
}

export const Route = createFileRoute("/api/pmtiles")({
	server: {
		handlers: {
			GET: ({ request }) => servePmtiles(request),
		},
	},
});
