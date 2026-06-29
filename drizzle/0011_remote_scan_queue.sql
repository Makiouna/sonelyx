CREATE TABLE "remote_scan_queue" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"qr_code_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
