ALTER TABLE "quote"
  ADD COLUMN "deposit_amount" double precision,
  ADD COLUMN "deposit_status" text,
  ADD COLUMN "stripe_payment_intent_id" text,
  ADD COLUMN "deposit_reminder_sent_at" timestamp;
