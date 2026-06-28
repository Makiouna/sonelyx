CREATE TABLE "product_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"item_name" text NOT NULL,
	"qr_code_id" text NOT NULL,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	CONSTRAINT "product_items_qr_code_id_unique" UNIQUE("qr_code_id")
);
--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "docType" text DEFAULT 'devis' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "projectName" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "linkedDevisId" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "previousVersion" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "clientRefusalNote" text;--> statement-breakpoint
ALTER TABLE "product_items" ADD CONSTRAINT "product_items_product_id_equipment_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;