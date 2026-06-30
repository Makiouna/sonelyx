ALTER TABLE "equipment" ADD COLUMN "slug" text UNIQUE;

UPDATE "equipment" SET "slug" = 'location-' || "id" || '-orleans' WHERE "slug" IS NULL;
