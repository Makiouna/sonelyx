import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { resend } from '@/lib/resend';
import { buildDepositConfirmedEmail } from '@/lib/email-templates/deposit-confirmed';
import { sendInvoicePaymentConfirmationEmail } from '@/lib/email';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('[SECURITY] Stripe webhook signature verification failed — possible spoofing attempt:', err.message);
    return NextResponse.json({ error: 'Webhook signature invalid.' }, { status: 400 });
  }

  // ── Stripe-hosted invoice events (sent via the "Envoyer via Stripe" admin action) ──
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const quoteId = invoice.metadata?.quoteId;
    if (!quoteId) return NextResponse.json({ received: true });

    const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
    const quote = rows[0];
    if (!quote || quote.stripeInvoiceId !== invoice.id) return NextResponse.json({ received: true });

    if (event.type === 'invoice.paid') {
      const wasAlreadySucceeded = quote.invoicePaymentStatus === 'SUCCEEDED';
      await db
        .update(quoteTable)
        .set({ invoicePaymentStatus: 'SUCCEEDED', updatedAt: new Date() })
        .where(eq(quoteTable.id, quoteId));

      if (!wasAlreadySucceeded) {
        const clientRows = await db.select().from(userTable).where(eq(userTable.id, quote.userId)).limit(1);
        const client = clientRows[0];
        if (client) {
          sendInvoicePaymentConfirmationEmail(
            client.email,
            client.name,
            quote.projectName ?? 'Votre Projet',
            quote.startDate,
            quote.totalTTC,
            'card',
          ).catch(err => console.error('Payment confirmation email failed:', err));
        }
      }
    } else {
      await db
        .update(quoteTable)
        .set({ invoicePaymentStatus: 'FAILED', updatedAt: new Date() })
        .where(eq(quoteTable.id, quoteId));
    }

    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const quoteId = paymentIntent.metadata?.quoteId;
  const intentType = paymentIntent.metadata?.type;

  if (!quoteId || (intentType !== 'deposit' && intentType !== 'invoice')) {
    return NextResponse.json({ received: true });
  }

  // ── Invoice payment events ───────────────────────────────────────────────
  if (intentType === 'invoice') {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        await db
          .update(quoteTable)
          .set({ invoicePaymentStatus: 'SUCCEEDED', updatedAt: new Date() })
          .where(eq(quoteTable.id, quoteId));
        break;
      }
      case 'payment_intent.payment_failed': {
        await db
          .update(quoteTable)
          .set({
            invoicePaymentStatus: 'FAILED',
            invoiceStripePaymentIntentId: null,
            updatedAt: new Date(),
          })
          .where(eq(quoteTable.id, quoteId));
        break;
      }
    }
    return NextResponse.json({ received: true });
  }

  // ── Deposit events ────────────────────────────────────────────────────────
  switch (event.type) {
    case 'payment_intent.amount_capturable_updated': {
      // Funds are blocked — mark deposit as AUTHORIZED
      const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
      const wasAlreadyAuthorized = rows[0]?.depositStatus === 'AUTHORIZED';

      await db
        .update(quoteTable)
        .set({ depositStatus: 'AUTHORIZED', updatedAt: new Date() })
        .where(eq(quoteTable.id, quoteId));

      if (!wasAlreadyAuthorized && rows[0]?.depositAmount) {
        try {
          const userRows = await db.select().from(userTable).where(eq(userTable.id, rows[0].userId)).limit(1);
          if (userRows[0]?.email) {
            const { html, subject } = buildDepositConfirmedEmail({
              clientName: userRows[0].name,
              depositAmount: rows[0].depositAmount,
              quoteId,
            });
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
              to: userRows[0].email,
              subject,
              html,
            });
          }
        } catch {}
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      // Card declined or expired — reset so client can retry
      await db
        .update(quoteTable)
        .set({
          depositStatus: 'PENDING',
          stripePaymentIntentId: null,
          updatedAt: new Date(),
        })
        .where(eq(quoteTable.id, quoteId));
      break;
    }

    case 'payment_intent.canceled': {
      // Canceled by admin (release) or expired
      const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
      // Only reset to PENDING if not already captured/released by admin action
      if (rows[0] && rows[0].depositStatus === 'AUTHORIZED') {
        await db
          .update(quoteTable)
          .set({
            depositStatus: 'PENDING',
            stripePaymentIntentId: null,
            updatedAt: new Date(),
          })
          .where(eq(quoteTable.id, quoteId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
