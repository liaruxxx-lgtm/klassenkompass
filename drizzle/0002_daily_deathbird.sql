CREATE TABLE `calendar_event_seed_runs` (
	`seed_key` text PRIMARY KEY NOT NULL,
	`seeded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
