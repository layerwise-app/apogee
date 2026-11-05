CREATE TABLE `app_secrets` (
	`name` text PRIMARY KEY,
	`value` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `form_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`visitor_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sample_requests` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL UNIQUE,
	`organization` text NOT NULL,
	`area_of_interest` text NOT NULL,
	`use_case` text NOT NULL,
	`owner_notified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `form_attempts_visitor_created_idx` ON `form_attempts` (`visitor_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `sample_requests_created_at_idx` ON `sample_requests` (`created_at`);--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
DROP TABLE `verification`;