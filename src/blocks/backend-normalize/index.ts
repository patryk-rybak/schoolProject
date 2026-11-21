import type { Standardizer } from "../contracts";

export type {
	AedRecord,
	AedVerification,
	NormalizationIssue,
	NormalizationResult,
	Standardizer,
} from "../contracts";

export const BLOCK = "backend-normalize" as const;

/**
 * TODO(backend-normalize): implement one `Standardizer` per source id, plus
 * deduplication across sources and TERYT/address resolution.
 */
export function createStandardizer(_sourceId: string): Standardizer {
	throw new Error(
		"backend-normalize: createStandardizer() is not implemented — see README.md",
	);
}
