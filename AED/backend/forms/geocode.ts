import { z } from "zod";

/**
 * Address geocoding for the manual AED form.
 *
 * Runs server-side only (Nominatim usage policy: identifiable User-Agent,
 * max 1 request/second, no client-side bulk calls). The form calls this once
 * per explicit "Wyznacz z adresu" click. Results are limited to Poland.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// biome-ignore lint/security/noSecrets: public contact UA required by the Nominatim usage policy, not a credential.
const USER_AGENT =
	"AED-PL-forms/0.1 (school project; contact: data@example.org)";
const TIMEOUT_MS = 10_000;
const MIN_REQUEST_INTERVAL_MS = 1100;
const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 300;
const MAX_CANDIDATES = 5;
// Nominatim place_rank: 30 = budynek, 26 = ulica, 16..20 = miejscowość.
const DEFAULT_PLACE_RANK = 26;
const RANK_CONFIDENCE_BASE = 10;
const RANK_CONFIDENCE_SPAN = 20;
const MIN_CONFIDENCE = 0.2;
const MAX_CONFIDENCE = 1;

export const GEOCODE_PROVIDER = "nominatim";

export const geocodeRequestSchema = z.object({
	query: z.string().trim().min(MIN_QUERY_LENGTH).max(MAX_QUERY_LENGTH),
});

export interface GeocodeCandidate {
	lat: number;
	lon: number;
	displayName: string;
	/** Nominatim place_rank mapped to a rough 0..1 confidence. */
	confidence: number;
}

export interface GeocodeResponse {
	provider: string;
	query: string;
	candidates: GeocodeCandidate[];
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface NominatimHit {
	lat: string;
	lon: string;
	display_name: string;
	place_rank?: number;
	importance?: number;
}

let lastRequestAt = 0;

async function throttle(): Promise<void> {
	const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
	if (wait > 0) {
		await new Promise((resolve) => setTimeout(resolve, wait));
	}
	lastRequestAt = Date.now();
}

function toCandidate(hit: NominatimHit): GeocodeCandidate | null {
	const lat = Number.parseFloat(hit.lat);
	const lon = Number.parseFloat(hit.lon);
	if (!(Number.isFinite(lat) && Number.isFinite(lon))) {
		return null;
	}
	const rank = hit.place_rank ?? DEFAULT_PLACE_RANK;
	const confidence = Math.min(
		MAX_CONFIDENCE,
		Math.max(
			MIN_CONFIDENCE,
			(rank - RANK_CONFIDENCE_BASE) / RANK_CONFIDENCE_SPAN,
		),
	);
	return { lat, lon, displayName: hit.display_name, confidence };
}

/** Geocodes a free-form Polish address; returns up to 5 candidates. */
export async function geocodeAddress(
	query: string,
	options: { fetchImpl?: FetchLike } = {},
): Promise<GeocodeResponse> {
	const trimmed = query.trim();
	if (trimmed.length < MIN_QUERY_LENGTH) {
		throw new Error(`Adres musi mieć co najmniej ${MIN_QUERY_LENGTH} znaki.`);
	}
	const fetchImpl = options.fetchImpl ?? fetch;
	const url = new URL(NOMINATIM_URL);
	url.searchParams.set("q", trimmed);
	url.searchParams.set("format", "jsonv2");
	url.searchParams.set("limit", String(MAX_CANDIDATES));
	url.searchParams.set("countrycodes", "pl");
	url.searchParams.set("addressdetails", "0");

	await throttle();
	let response: Response;
	try {
		response = await fetchImpl(url.toString(), {
			headers: { "user-agent": USER_AGENT, accept: "application/json" },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch (error) {
		throw new Error(
			`Nie udało się połączyć z usługą geokodowania: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
	if (!response.ok) {
		throw new Error(`Usługa geokodowania zwróciła HTTP ${response.status}.`);
	}
	const hits = (await response.json()) as NominatimHit[];
	const candidates = hits
		.map(toCandidate)
		.filter((candidate): candidate is GeocodeCandidate => candidate !== null);
	return { provider: GEOCODE_PROVIDER, query: trimmed, candidates };
}
