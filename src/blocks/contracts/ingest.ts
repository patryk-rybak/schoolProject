import type { IsoDateTime, SourceScope } from "./domain";

/** A single upstream item, exactly as fetched (no interpretation). */
export interface RawRecord {
	readonly sourceId: string;
	readonly externalId: string;
	readonly fetchedAt: IsoDateTime;
	readonly sourceUrl: string;
	/** Untouched upstream payload; each source has its own shape. */
	readonly payload: unknown;
}

export interface RawBatch {
	readonly scope: SourceScope;
	readonly records: readonly RawRecord[];
	readonly fetchedAt: IsoDateTime;
}

export interface IngestOptions {
	readonly signal?: AbortSignal;
}

/**
 * One upstream dataset. Implementations live in `backend-ingest/sources/`.
 * Must be idempotent: fetching twice yields the same externalIds.
 */
export interface IngestSource {
	readonly scope: SourceScope;
	readonly fetch: (options?: IngestOptions) => Promise<RawBatch>;
}

export interface IngestRegistry {
	readonly register: (source: IngestSource) => void;
	readonly list: () => readonly IngestSource[];
	readonly run: (
		sourceId: string,
		options?: IngestOptions,
	) => Promise<RawBatch>;
}
