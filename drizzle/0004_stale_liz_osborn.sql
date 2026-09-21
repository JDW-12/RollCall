ALTER TABLE `crews` ADD `calendar_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `crews_calendar_idx` ON `crews` (`calendar_token`);