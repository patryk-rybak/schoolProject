import type { PublishService } from "../contracts";

export type {
	DcatCategory,
	FeedArtifact,
	FeedDatasetMeta,
	FeedResource,
	LicenceName,
	PublishService,
	ResourceAvailability,
	UpdateFrequency,
} from "../contracts";

export const BLOCK = "backend-publish" as const;

/**
 * TODO(backend-publish): implement the dane.gov.pl harvester feed
 * (`feed.xml` + `feed.md5`) and the CSV/GeoJSON resource endpoints.
 * Wire protocol: `docs/dane-gov-pl-harvester.md`.
 */
export function createPublishService(): PublishService {
	throw new Error(
		"backend-publish: createPublishService() is not implemented — see README.md",
	);
}
