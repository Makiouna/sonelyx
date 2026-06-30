ALTER TABLE "quote"
  ADD COLUMN "cancellation_reason" text,
  ADD COLUMN "cancelled_at" timestamp;
