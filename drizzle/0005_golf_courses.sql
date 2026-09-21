CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`club` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`tee` text DEFAULT '' NOT NULL,
	`holes` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `courses_name_idx` ON `courses` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `courses_external_idx` ON `courses` (`external_id`);