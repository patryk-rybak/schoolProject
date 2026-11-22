/**
 * Minimal row shape published to dane.gov.pl.
 *
 * Deliberately smaller than the database model: the temporary dev table may
 * change, but the published contract should stay stable.
 */
export interface FeedRecord {
	readonly id: number;
	readonly name: string;
	readonly lat: number;
	readonly lon: number;
	readonly city: string | null;
	readonly access: string;
	readonly status: string;
	readonly verificationStatus: string;
	readonly verifiedBy: string | null;
	readonly verifiedByKind: string | null;
	readonly verifiedAt: string | null;
}

export interface FeedArtifact {
	/** XML document in the `urn:otwarte-dane:harvester:1.13` format. */
	readonly xml: string;
	/** MD5 of the exact UTF-8 bytes of `xml`, lowercase hex. */
	readonly md5: string;
	/** ISO timestamp used as `lastUpdateDate` in the feed. */
	readonly generatedAt: string;
}
