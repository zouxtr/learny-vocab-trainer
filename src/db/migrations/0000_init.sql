CREATE TABLE `daily_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`study_seconds` integer DEFAULT 0 NOT NULL,
	`words_reviewed` integer DEFAULT 0 NOT NULL,
	`words_learned` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_date_idx` ON `daily_activity` (`date`);--> statement-breakpoint
CREATE TABLE `dictionaries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source_language` text DEFAULT 'de' NOT NULL,
	`target_language` text DEFAULT 'bg' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_opened_at` integer,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`folder_id` text,
	`color` text
);
--> statement-breakpoint
CREATE INDEX `dictionaries_updated_at_idx` ON `dictionaries` (`updated_at`);--> statement-breakpoint
CREATE INDEX `dictionaries_archived_idx` ON `dictionaries` (`is_archived`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`word_id` text NOT NULL,
	`session_id` text NOT NULL,
	`mode` text NOT NULL,
	`direction` text NOT NULL,
	`is_correct` integer NOT NULL,
	`confidence` integer,
	`response_time_ms` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_word_idx` ON `reviews` (`word_id`);--> statement-breakpoint
CREATE INDEX `reviews_session_idx` ON `reviews` (`session_id`);--> statement-breakpoint
CREATE TABLE `spaced_repetition` (
	`word_id` text PRIMARY KEY NOT NULL,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`interval` integer DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`next_review_at` integer,
	`last_review_at` integer,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `srs_next_review_idx` ON `spaced_repetition` (`next_review_at`);--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`dictionary_id` text NOT NULL,
	`mode` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`wrong_count` integer DEFAULT 0 NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`completed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`dictionary_id`) REFERENCES `dictionaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_dictionary_idx` ON `study_sessions` (`dictionary_id`);--> statement-breakpoint
CREATE TABLE `words` (
	`id` text PRIMARY KEY NOT NULL,
	`dictionary_id` text NOT NULL,
	`source` text NOT NULL,
	`target` text NOT NULL,
	`rektion` text,
	`example` text,
	`group` text,
	`notes` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`dictionary_id`) REFERENCES `dictionaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `words_dictionary_idx` ON `words` (`dictionary_id`);--> statement-breakpoint
CREATE INDEX `words_position_idx` ON `words` (`dictionary_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `words_source_dictionary_idx` ON `words` (`dictionary_id`,`source`);