CREATE TABLE IF NOT EXISTS "project_inspections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quote_id" text NOT NULL,
  "type" text NOT NULL,
  "photo_urls" text NOT NULL DEFAULT '[]',
  "admin_signature" text NOT NULL,
  "admin_signed_at" timestamp NOT NULL,
  "client_signature" text,
  "client_signed_at" timestamp,
  "status" text NOT NULL DEFAULT 'PENDING_CLIENT',
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_inspections_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action
);
