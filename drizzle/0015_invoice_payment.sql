ALTER TABLE "quote"
  ADD COLUMN "invoice_stripe_payment_intent_id" text,
  ADD COLUMN "invoice_payment_status" text;
