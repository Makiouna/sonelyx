CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "priceType" text DEFAULT 'numeric' NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "priceTax" text DEFAULT 'HT' NOT NULL;