CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "telegram_id" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_business_id_idx" ON "api_keys" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_business_telegram_idx" ON "clients" USING btree ("business_id","telegram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_business_external_idx" ON "services" USING btree ("business_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_business_idempotency_idx" ON "appointments" USING btree ("business_id","external_idempotency_key");