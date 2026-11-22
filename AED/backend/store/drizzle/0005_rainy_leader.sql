-- Materialize the combined read model.
-- The previous migration created a live view; replace it with a real table so
-- dane.gov.pl and later deduplication read a stable snapshot.

DROP VIEW IF EXISTS `aed_devices_combined`;--> statement-breakpoint
CREATE TABLE `aed_devices_combined` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`record_id` text NOT NULL,
	`source_id` text NOT NULL,
	`source_record_id` text NOT NULL,
	`source_url` text,
	`version` integer DEFAULT 1 NOT NULL,
	`name` text,
	`description` text,
	`note` text,
	`facility_type` text,
	`device_type` text,
	`access_type` text DEFAULT 'unknown' NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`verification_status` text NOT NULL,
	`verified_by` text,
	`verified_by_kind` text,
	`verified_at` text,
	`confidence` real,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`coord_precision_m` real,
	`location_status` text DEFAULT 'point' NOT NULL,
	`geom_source` text DEFAULT 'source' NOT NULL,
	`address_text` text,
	`address_kind` text DEFAULT 'none' NOT NULL,
	`address_source` text DEFAULT 'source' NOT NULL,
	`address_confidence` real,
	`geocode_provider` text,
	`geocode_version` text,
	`geocode_confidence` real,
	`geocoded_at` text,
	`geocode_input_sha256` text,
	`geocode_note` text,
	`claim_status` text DEFAULT 'unclaimed' NOT NULL,
	`claimed_by` text,
	`claimed_at` text,
	`claim_note` text,
	`field_provenance` text,
	`attributes` text,
	`origin` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by_id` text
);
--> statement-breakpoint
CREATE INDEX `aed_devices_combined_record_id_idx` ON `aed_devices_combined` (`record_id`);--> statement-breakpoint
CREATE INDEX `aed_devices_combined_source_id_idx` ON `aed_devices_combined` (`source_id`);--> statement-breakpoint
CREATE INDEX `aed_devices_combined_coords_idx` ON `aed_devices_combined` (`lat`,`lon`);--> statement-breakpoint
CREATE INDEX `aed_devices_combined_origin_idx` ON `aed_devices_combined` (`origin`);
--> statement-breakpoint
INSERT INTO `aed_devices_combined` (`record_id`, `source_id`, `source_record_id`, `source_url`, `version`, `name`, `description`, `note`, `facility_type`, `device_type`, `access_type`, `status`, `verification_status`, `verified_by`, `verified_by_kind`, `verified_at`, `confidence`, `lat`, `lon`, `coord_precision_m`, `location_status`, `geom_source`, `address_text`, `address_kind`, `address_source`, `address_confidence`, `geocode_provider`, `geocode_version`, `geocode_confidence`, `geocoded_at`, `geocode_input_sha256`, `geocode_note`, `claim_status`, `claimed_by`, `claimed_at`, `claim_note`, `field_provenance`, `attributes`, `origin`, `created_at`, `updated_at`, `created_by_id`)
SELECT `record_id`, `source_id`, `source_record_id`, `source_url`, `version`, `name`, `description`, `note`, `facility_type`, `device_type`, `access_type`, `status`, `verification_status`, `verified_by`, `verified_by_kind`, `verified_at`, `confidence`, `lat`, `lon`, `coord_precision_m`, `location_status`, `geom_source`, `address_text`, `address_kind`, `address_source`, `address_confidence`, `geocode_provider`, `geocode_version`, `geocode_confidence`, `geocoded_at`, `geocode_input_sha256`, `geocode_note`, `claim_status`, `claimed_by`, `claimed_at`, `claim_note`, `field_provenance`, `attributes`, `origin`, `created_at`, `updated_at`, `created_by_id`
FROM `aed_devices`;--> statement-breakpoint
INSERT INTO `aed_devices_combined` (`record_id`, `source_id`, `source_record_id`, `source_url`, `version`, `name`, `description`, `note`, `facility_type`, `device_type`, `access_type`, `status`, `verification_status`, `verified_by`, `verified_by_kind`, `verified_at`, `confidence`, `lat`, `lon`, `coord_precision_m`, `location_status`, `geom_source`, `address_text`, `address_kind`, `address_source`, `address_confidence`, `geocode_provider`, `geocode_version`, `geocode_confidence`, `geocoded_at`, `geocode_input_sha256`, `geocode_note`, `claim_status`, `claimed_by`, `claimed_at`, `claim_note`, `field_provenance`, `attributes`, `origin`, `created_at`, `updated_at`, `created_by_id`)
SELECT `record_id`, `source_id`, `source_record_id`, `source_url`, `version`, `name`, `description`, `note`, `facility_type`, `device_type`, `access_type`, `status`, `verification_status`, `verified_by`, `verified_by_kind`, `verified_at`, `confidence`, `lat`, `lon`, `coord_precision_m`, `location_status`, `geom_source`, `address_text`, `address_kind`, `address_source`, `address_confidence`, `geocode_provider`, `geocode_version`, `geocode_confidence`, `geocoded_at`, `geocode_input_sha256`, `geocode_note`, `claim_status`, `claimed_by`, `claimed_at`, `claim_note`, `field_provenance`, `attributes`, `origin`, `created_at`, `updated_at`, NULL
FROM `aed_source_devices`;
