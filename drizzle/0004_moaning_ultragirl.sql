ALTER TABLE "businesses" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "businesses_archived_at_idx" ON "businesses" USING btree ("archived_at");