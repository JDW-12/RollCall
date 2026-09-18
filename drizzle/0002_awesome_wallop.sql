CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`crew_id` text,
	`user_id` text,
	`session_id` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_kind_idx` ON `events` (`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_crew_idx` ON `events` (`crew_id`);--> statement-breakpoint
ALTER TABLE `crews` ADD `referred_by_crew_id` text;