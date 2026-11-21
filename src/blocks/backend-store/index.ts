import type { AedRepository } from "../contracts";

export type {
	AedQuery,
	AedRepository,
	GeoBoundingBox,
	NearestQuery,
	SyncRun,
	UpsertSummary,
} from "../contracts";

export const BLOCK = "backend-store" as const;

/**
 * TODO(backend-store): implement the Drizzle-backed repository, the schema in
 * `src/db/schema.ts` and the migrations used by ingest runs.
 */
export function createAedRepository(): AedRepository {
	throw new Error(
		"backend-store: createAedRepository() is not implemented — see README.md",
	);
}
