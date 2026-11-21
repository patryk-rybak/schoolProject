import type { AedRecord } from "./domain";
import type { RawBatch, RawRecord } from "./ingest";

/** Why a raw upstream record could not become an `AedRecord`. */
export interface NormalizationIssue {
	readonly code:
		| "missing_coordinates"
		| "invalid_coordinates"
		| "missing_name"
		| "out_of_poland"
		| "duplicate"
		| "unsupported_payload"
		| "other";
	readonly message: string;
	readonly record: RawRecord;
}

export interface NormalizationResult {
	readonly accepted: readonly AedRecord[];
	readonly rejected: readonly NormalizationIssue[];
}

/**
 * Maps one source's raw payloads onto the shared `AedRecord` model.
 * One implementation per `IngestSource`, keyed by `sourceId`.
 */
export interface Standardizer {
	readonly sourceId: string;
	readonly normalize: (batch: RawBatch) => NormalizationResult;
}
