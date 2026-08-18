CREATE TABLE `access_rate_limits` (
	`identifier_hash` text PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`window_started_at` integer NOT NULL,
	`blocked_until` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_access_rate_limits_updated_at` ON `access_rate_limits` (`updated_at`);