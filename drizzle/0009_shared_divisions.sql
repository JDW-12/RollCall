ALTER TABLE `competitions` ADD `division_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `competitions_division_idx` ON `competitions` (`division_key`);