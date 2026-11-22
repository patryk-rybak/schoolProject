ALTER TABLE `aed_devices` ADD `verification_status` text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `aed_devices` ADD `verified_by` text;--> statement-breakpoint
ALTER TABLE `aed_devices` ADD `verified_by_kind` text;--> statement-breakpoint
ALTER TABLE `aed_devices` ADD `verified_at` text;