CREATE TABLE `competitions` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'league' NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`external_url` text DEFAULT '' NOT NULL,
	`embed_url` text DEFAULT '' NOT NULL,
	`team_name` text DEFAULT '' NOT NULL,
	`standings` text,
	`standings_updated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `competitions_crew_idx` ON `competitions` (`crew_id`);--> statement-breakpoint
CREATE TABLE `match_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`goals` integer DEFAULT 0 NOT NULL,
	`assists` integer DEFAULT 0 NOT NULL,
	`rating` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_stats_unique` ON `match_stats` (`session_id`,`user_id`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `competition_id` text REFERENCES competitions(id);--> statement-breakpoint
ALTER TABLE `sessions` ADD `opponent` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `home_away` text DEFAULT 'home' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `round` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `goals_for` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `goals_against` integer;--> statement-breakpoint
CREATE INDEX `sessions_competition_idx` ON `sessions` (`competition_id`);