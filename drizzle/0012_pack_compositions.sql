ALTER TABLE "equipment" ADD COLUMN "is_pack" boolean NOT NULL DEFAULT false;

CREATE TABLE "pack_compositions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pack_product_id" text NOT NULL,
  "component_product_id" text NOT NULL,
  "quantity_needed" integer NOT NULL DEFAULT 1,
  CONSTRAINT "pack_compositions_pack_product_id_equipment_id_fk"
    FOREIGN KEY ("pack_product_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "pack_compositions_component_product_id_equipment_id_fk"
    FOREIGN KEY ("component_product_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
