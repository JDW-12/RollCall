ALTER TABLE `competitions` ADD `standings_source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD `feed_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD `feed_kind` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD `synced_at` integer;--> statement-breakpoint
ALTER TABLE `competitions` ADD `sync_error` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `competitions_sync_idx` ON `competitions` (`feed_kind`,`synced_at`);