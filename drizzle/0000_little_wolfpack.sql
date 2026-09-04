CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`attended` integer NOT NULL,
	`confirmed_by` text NOT NULL,
	`confirmed_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_unique` ON `attendance` (`session_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `crew_members` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crew_members_unique` ON `crew_members` (`crew_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `crew_members_user_idx` ON `crew_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `crews` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sport` text NOT NULL,
	`city` text DEFAULT 'London' NOT NULL,
	`hue` integer DEFAULT 150 NOT NULL,
	`late_drop_hours` integer DEFAULT 24 NOT NULL,
	`invite_token` text NOT NULL,
	`season_name` text DEFAULT 'Season 1' NOT NULL,
	`season_starts_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crews_slug_idx` ON `crews` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `crews_invite_idx` ON `crews` (`invite_token`);--> statement-breakpoint
CREATE TABLE `feed` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`session_id` text,
	`kind` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feed_crew_idx` ON `feed` (`crew_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `game_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_entries_unique` ON `game_entries` (`game_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_unique` ON `games` (`session_id`,`kind`);--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`session_id` text,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_pence` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ledger_crew_user_idx` ON `ledger` (`crew_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `ledger_session_idx` ON `ledger` (`session_id`);--> statement-breakpoint
CREATE TABLE `login_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`rater_id` text NOT NULL,
	`category` text NOT NULL,
	`ratee_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rater_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ratee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ratings_unique` ON `ratings` (`session_id`,`rater_id`,`category`);--> statement-breakpoint
CREATE INDEX `ratings_session_idx` ON `ratings` (`session_id`);--> statement-breakpoint
CREATE TABLE `rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`queued_at` integer NOT NULL,
	`responded_at` integer NOT NULL,
	`dropped_at` integer,
	`late_drop` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rsvps_unique` ON `rsvps` (`session_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_id` text NOT NULL,
	`sport` text NOT NULL,
	`title` text NOT NULL,
	`venue_name` text DEFAULT '' NOT NULL,
	`venue_address` text DEFAULT '' NOT NULL,
	`starts_at` integer NOT NULL,
	`duration_min` integer DEFAULT 60 NOT NULL,
	`capacity` integer NOT NULL,
	`cost_mode` text DEFAULT 'total' NOT NULL,
	`cost_pence` integer DEFAULT 0 NOT NULL,
	`rsvp_deadline_at` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`played_at` integer,
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_crew_starts_idx` ON `sessions` (`crew_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`hue` integer DEFAULT 150 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);