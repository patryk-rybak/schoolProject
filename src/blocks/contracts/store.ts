import type { AedRecord, GeoPoint, IsoDateTime } from "./domain";

export interface GeoBoundingBox {
	readonly south: number;
	readonly west: number;
	readonly north: number;
	readonly east: number;
}

export interface AedQuery {
	readonly bbox?: GeoBoundingBox;
	readonly sourceId?: string;
	readonly limit?: number;
	readonly offset?: number;
}

export interface UpsertSummary {
	readonly inserted: number;
	readonly updated: number;
	readonly unchanged: number;
}

export interface NearestQuery {
	readonly point: GeoPoint;
	readonly limit?: number;
	readonly maxDistanceMeters?: number;
}

export interface AedRepository {
	readonly upsert: (records: readonly AedRecord[]) => Promise<UpsertSummary>;
	readonly list: (query?: AedQuery) => Promise<readonly AedRecord[]>;
	readonly getById: (id: string) => Promise<AedRecord | null>;
	readonly nearest: (query: NearestQuery) => Promise<readonly AedRecord[]>;
	readonly count: () => Promise<number>;
}

/** Bookkeeping for one ingest → normalize → store pass. */
export interface SyncRun {
	readonly id: string;
	readonly sourceId: string;
	readonly startedAt: IsoDateTime;
	readonly finishedAt: IsoDateTime | null;
	readonly fetched: number;
	readonly accepted: number;
	readonly rejected: number;
	readonly error: string | null;
}
