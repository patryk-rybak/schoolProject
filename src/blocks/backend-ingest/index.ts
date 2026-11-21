import type { IngestRegistry } from "../contracts";

export type {
	IngestOptions,
	IngestSource,
	RawBatch,
	RawRecord,
	SourceScope,
} from "../contracts";

export const BLOCK = "backend-ingest" as const;

/**
 * TODO(backend-ingest): return a registry with one `IngestSource` per upstream
 * dataset (municipal open-data portals, OSM, fire service, …).
 */
export function createIngestRegistry(): IngestRegistry {
	throw new Error(
		"backend-ingest: createIngestRegistry() is not implemented — see README.md",
	);
}
