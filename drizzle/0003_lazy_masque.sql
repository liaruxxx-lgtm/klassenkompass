CREATE TABLE `access_session_actors` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`actor_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_event_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_name` text NOT NULL,
	`actor_role` text NOT NULL,
	`changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`before_state` text,
	`after_state` text,
	`restored_from_log_id` text
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_event_audit_logs_changed_at` ON `calendar_event_audit_logs` (`changed_at`);--> statement-breakpoint
CREATE INDEX `idx_calendar_event_audit_logs_event_id` ON `calendar_event_audit_logs` (`event_id`);--> statement-breakpoint
PRAGMA optimize;
