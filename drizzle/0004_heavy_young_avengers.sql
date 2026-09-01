CREATE TABLE `admin_login_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_email` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_login_challenges_admin_email` ON `admin_login_challenges` (`admin_email`);--> statement-breakpoint
CREATE INDEX `idx_admin_login_challenges_expires_at` ON `admin_login_challenges` (`expires_at`);--> statement-breakpoint
DELETE FROM `access_session_actors`
WHERE `token_hash` IN (
	SELECT `token_hash` FROM `access_sessions` WHERE `role` = 'teacher'
);--> statement-breakpoint
DELETE FROM `access_sessions` WHERE `role` = 'teacher';--> statement-breakpoint
PRAGMA optimize;
