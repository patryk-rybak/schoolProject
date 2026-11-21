/**
 * Shared domain model for the AED platform.
 *
 * Every block speaks in these types. Change them only through a dedicated
 * contract PR — all seven blocks depend on this file.
 */

/** ISO-8601 timestamp, e.g. `2026-11-21T10:00:00Z`. */
export type IsoDateTime = string;

/** ISO-8601 calendar date, e.g. `2026-11-21`. */
export type IsoDate = string;

/** TERYT identifier: 2 = voivodeship, 4 = county, 7 = municipality. */
export type TerytCode = string;

export interface GeoPoint {
	readonly lat: number;
	readonly lon: number;
}

/** Can a bystander use the device right now, and when? */
export type AedAccess = "always" | "business_hours" | "restricted" | "unknown";

export type AedLocationType = "indoor" | "outdoor" | "unknown";

export type AedStatus = "operational" | "out_of_service" | "unknown";

/** How much we trust a record. */
export type AedVerification = "unverified" | "source" | "field" | "community";

/**
 * One defibrillator after normalisation.
 *
 * A record is the unit the map renders, the store persists and the publisher
 * turns into a dane.gov.pl feed entry.
 */
export interface AedRecord {
	/** `<sourceId>:<externalId>`, stable across imports. */
	readonly id: string;
	readonly sourceId: string;
	/** Identifier in the upstream dataset. */
	readonly externalId: string;
	readonly name: string;
	readonly location: GeoPoint;
	readonly addressLine: string | null;
	readonly city: string | null;
	readonly teryt: TerytCode | null;
	readonly access: AedAccess;
	readonly locationType: AedLocationType;
	readonly status: AedStatus;
	/** Free-form opening hours / "ask reception" note. */
	readonly availabilityNote: string | null;
	readonly operator: string | null;
	readonly deviceModel: string | null;
	readonly serialNumber: string | null;
	readonly installedAt: IsoDate | null;
	readonly lastInspectedAt: IsoDate | null;
	readonly verification: AedVerification;
	/** Canonical upstream URL for this record. */
	readonly sourceUrl: string;
	readonly licence: string | null;
	readonly updatedAt: IsoDateTime;
}

/**
 * What a source actually covers. Required by the challenge ("reference
 * scope") and rendered in the UI next to every imported dataset.
 */
export interface SourceScope {
	readonly sourceId: string;
	readonly name: string;
	readonly publisher: string;
	readonly homepage: string;
	readonly licence: string | null;
	/** Human-readable area, e.g. "Warszawa" or "Polska". */
	readonly area: string;
	readonly teryt: readonly TerytCode[];
	/** Which AedRecord fields this source can actually provide. */
	readonly fields: readonly (keyof AedRecord)[];
	readonly updateCadence: "daily" | "weekly" | "monthly" | "irregular";
	readonly notes: string | null;
}
