ALTER TABLE "businesses" ADD COLUMN "public_theme" text DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "public_accent_color" text DEFAULT '#7c3aed' NOT NULL;