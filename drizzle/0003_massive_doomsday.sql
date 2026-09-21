ALTER TABLE `crews` ADD `stripe_account_id` text;--> statement-breakpoint
ALTER TABLE `crews` ADD `stripe_charges_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ledger` ADD `external_ref` text;--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_external_ref_idx` ON `ledger` (`external_ref`);