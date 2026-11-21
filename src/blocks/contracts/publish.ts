import type { IsoDateTime } from "./domain";

/** `updateFrequency` values accepted by the dane.gov.pl harvester XSD. */
export type UpdateFrequency =
	| "daily"
	| "weekly"
	| "monthly"
	| "quarterly"
	| "everyHalfYear"
	| "yearly"
	| "irregular"
	| "notPlanned";

/** `category` values accepted by the dane.gov.pl harvester XSD. */
export type DcatCategory =
	| "AGRI"
	| "EDUC"
	| "ENVI"
	| "ENER"
	| "TRAN"
	| "TECH"
	| "ECON"
	| "SOCI"
	| "HEAL"
	| "GOVE"
	| "REGI"
	| "JUST"
	| "INTR";

/**
 * `local` — the portal downloads and mirrors the file.
 * `remote` — the portal only links to it.
 */
export type ResourceAvailability = "local" | "remote";

/** Licences accepted by `conditions/dbOrCopyrightedLicenseChosen`. */
export type LicenceName =
	| "CC0 1.0"
	| "CC BY 4.0"
	| "CC BY-SA 4.0"
	| "CC BY-NC 4.0"
	| "CC BY-NC-SA 4.0"
	| "CC BY-ND 4.0"
	| "CC BY-NC-ND 4.0";

/** Metadata of the dataset entry we publish to dane.gov.pl. */
export interface FeedDatasetMeta {
	/** Stable, max 36 chars — the portal's upsert key. */
	readonly extIdent: string;
	readonly titlePl: string;
	readonly titleEn: string | null;
	readonly descriptionPl: string;
	readonly descriptionEn: string | null;
	readonly categories: readonly DcatCategory[];
	readonly tags: readonly string[];
	readonly updateFrequency: UpdateFrequency;
	readonly licence: LicenceName;
	readonly datasetUrl: string;
	readonly hasDynamicData: boolean;
	readonly hasHighValueData: boolean;
}

export interface FeedResource {
	/** Stable, max 36 chars. */
	readonly extIdent: string;
	readonly url: string;
	readonly titlePl: string;
	readonly descriptionPl: string;
	readonly availability: ResourceAvailability;
	readonly dataDate: string;
	readonly teryt: readonly string[];
}

export interface FeedArtifact {
	readonly xml: string;
	/** MD5 of `xml`, served at `<feed-url-without-.xml>.md5`. */
	readonly md5: string;
	readonly generatedAt: IsoDateTime;
	readonly dataset: FeedDatasetMeta;
	readonly resources: readonly FeedResource[];
}

/**
 * Turns the stored records into the artefacts dane.gov.pl harvests.
 * See `docs/dane-gov-pl-harvester.md` for the wire protocol.
 */
export interface PublishService {
	readonly buildFeed: () => Promise<FeedArtifact>;
	readonly buildCsv: () => Promise<string>;
	readonly buildGeoJson: () => Promise<string>;
}
