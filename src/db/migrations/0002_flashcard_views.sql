CREATE TABLE IF NOT EXISTS `flashcard_views` (
  `word_id` text PRIMARY KEY NOT NULL,
  `views` integer DEFAULT 0 NOT NULL,
  `last_seen_at` integer,
  FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade
);
