/**
 * Display model for one map point. Mirrors the compact property contract of
 * `/data/aed.points.geojson` (backend/gov-api/points.ts); full record data is
 * fetched lazily via getAedDetailFn when the detail overlay opens.
 */
export interface AedMapPoint {
	readonly id: number | null;
	readonly name: string;
	readonly city: string | null;
	readonly address: string | null;
	/** Location description („opis”), e.g. „Na ścianie remizy strażackiej.” */
	readonly description: string | null;
	readonly access: string;
	readonly status: string;
	readonly source: string;
	readonly verificationStatus: string;
	readonly sourceUrl: string | null;
}
