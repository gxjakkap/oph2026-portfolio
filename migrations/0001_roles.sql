ALTER TABLE `admins` ADD `role` text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
-- everyone already on the allowlist had full access before roles existed
UPDATE `admins` SET `role` = 'admin';
