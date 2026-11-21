/**
 * Local HTTPS reverse proxy for testing against the dane.gov.pl harvester.
 *
 * Why: the harvester XSD accepts only `https://` resource URLs, and the local
 * portal runs in Docker, where `localhost` means the container itself. This
 * proxy terminates TLS on the host and forwards to the dev server, so the
 * portal container can fetch the feed and files through the Docker gateway.
 *
 * Usage:
 *   bun run dev            # terminal 1, http://127.0.0.1:3000
 *   bun run dev:tls        # terminal 2, https://0.0.0.0:3443
 *   PUBLIC_BASE_URL=https://172.18.18.1:3443 bun run dev
 *
 * The certificate is self-signed and generated once into `.cert/` (gitignored).
 * dane.gov.pl fetches with certificate verification disabled, so this is fine
 * for local tests. Never use it for production.
 */

const CERT_DIR = ".cert";
const CERT_PATH = `${CERT_DIR}/dev-local.crt`;
const KEY_PATH = `${CERT_DIR}/dev-local.key`;

// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
const PORT = Number(Bun.env["DEV_PROXY_PORT"] ?? "3443");
// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
const TARGET = Bun.env["DEV_PROXY_TARGET"] ?? "http://localhost:3000";

interface Certificate {
	readonly cert: string;
	readonly key: string;
}

async function loadOrCreateCertificate(): Promise<Certificate> {
	const certFile = Bun.file(CERT_PATH);
	const keyFile = Bun.file(KEY_PATH);
	const exists = (await certFile.exists()) && (await keyFile.exists());

	if (!exists) {
		Bun.spawnSync(["mkdir", "-p", CERT_DIR]);
		const result = Bun.spawnSync([
			"openssl",
			"req",
			"-x509",
			"-newkey",
			"rsa:2048",
			"-nodes",
			"-keyout",
			KEY_PATH,
			"-out",
			CERT_PATH,
			"-days",
			"365",
			"-subj",
			"/CN=localhost",
			"-addext",
			"subjectAltName=DNS:localhost,IP:127.0.0.1,IP:172.18.18.1",
		]);
		if (result.exitCode !== 0) {
			throw new Error(
				`openssl failed to create a dev certificate:\n${result.stderr.toString()}`,
			);
		}
	}

	// Read fresh handles: when the files were just generated, the handles
	// created above may predate them.
	return {
		cert: await Bun.file(CERT_PATH).text(),
		key: await Bun.file(KEY_PATH).text(),
	};
}

function proxy(request: Request): Promise<Response> {
	const incoming = new URL(request.url);
	const upstream = new URL(incoming.pathname + incoming.search, TARGET);

	const headers = new Headers(request.headers);
	headers.delete("host");

	const init: RequestInit = { method: request.method, headers };
	if (request.method !== "GET" && request.method !== "HEAD") {
		init.body = request.body;
	}

	return fetch(upstream, init);
}

const certificate = await loadOrCreateCertificate();

Bun.serve({
	hostname: "0.0.0.0",
	port: PORT,
	tls: certificate,
	fetch: proxy,
});

Bun.stdout.write(
	[
		`Dev TLS proxy listening on https://0.0.0.0:${PORT} -> ${TARGET}`,
		`Local:                 https://localhost:${PORT}`,
		`From a Docker container: https://172.18.18.1:${PORT}`,
		"",
		"Register in the local dane.gov.pl admin:",
		`  xml_url = https://172.18.18.1:${PORT}/harvester/feed.xml`,
		`  PUBLIC_BASE_URL=https://172.18.18.1:${PORT} bun run dev`,
		"",
	].join("\n"),
);
