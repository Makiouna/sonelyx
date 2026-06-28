ALTER TABLE "quote" ADD COLUMN "pdfUrl" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "discount" double precision DEFAULT 0 NOT NULL;