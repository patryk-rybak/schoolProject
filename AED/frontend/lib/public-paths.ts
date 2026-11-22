/**
 * Routes that stay public for signed-out visitors: the map, login, and the
 * machine endpoints used by the map and the dane.gov.pl harvester.
 * Every other path requires a session.
 */
const PUBLIC_PATHS = new Set(["/", "/logowanie", "/api/pmtiles"]);
const PUBLIC_PREFIXES = ["/api/auth/", "/data/", "/harvester/"];
const TRAILING_SLASHES = /\/+$/u;

export function isPublicPath(pathname: string): boolean {
	const normalized = pathname.replace(TRAILING_SLASHES, "") || "/";
	return (
		PUBLIC_PATHS.has(normalized) ||
		PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix))
	);
}
