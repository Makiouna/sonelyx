CREATE TABLE "equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"cat" text NOT NULL,
	"catLabel" text NOT NULL,
	"brand" text NOT NULL,
	"name" text NOT NULL,
	"desc" text NOT NULL,
	"specs" text NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"purchasePrice" double precision DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"image" text
);
