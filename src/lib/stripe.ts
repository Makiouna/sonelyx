import Stripe from 'stripe';
import { db } from '@/db';
import { user as userTable, quote as quoteTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
});

/**
 * Returns the client's Stripe Customer id, creating it lazily on first use.
 * Reused across every quote/invoice for that client instead of creating a
 * new Stripe customer each time.
 */
export async function ensureStripeCustomer(userId: string, email: string, name: string): Promise<string> {
  const rows = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  const existing = rows[0]?.stripeCustomerId;
  if (existing) return existing;

  const customer = await stripe.customers.create(
    { email, name, metadata: { userId } },
    { idempotencyKey: `customer_${userId}` },
  );

  await db.update(userTable).set({ stripeCustomerId: customer.id, updatedAt: new Date() }).where(eq(userTable.id, userId));

  return customer.id;
}

/**
 * Creates a single-line Stripe Invoice for the full (already tax-inclusive) quote
 * total, finalizes it and has Stripe email it to the customer for payment
 * (collection_method: 'send_invoice'). Mirrors the flat, single-amount approach
 * already used by the card PaymentIntent flow — no per-line-item Stripe Prices.
 */
export async function createAndSendQuoteInvoice(quote: typeof quoteTable.$inferSelect, customerId: string) {
  const invoice = await stripe.invoices.create(
    {
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 14,
      metadata: { quoteId: quote.id, type: 'quote_invoice' },
    },
    { idempotencyKey: `invoice_create_${quote.id}` },
  );

  await stripe.invoiceItems.create(
    {
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(quote.totalTTC * 100),
      currency: 'eur',
      description: `${quote.projectName ?? 'Location'} — du ${quote.startDate} au ${quote.endDate} (#${quote.id})`,
    },
    { idempotencyKey: `invoice_item_${quote.id}` },
  );

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id!, undefined, {
    idempotencyKey: `invoice_finalize_${quote.id}`,
  });
  const sent = await stripe.invoices.sendInvoice(finalized.id!, undefined, {
    idempotencyKey: `invoice_send_${quote.id}`,
  });

  return sent;
}
