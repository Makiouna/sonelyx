ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "quote" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" text;
