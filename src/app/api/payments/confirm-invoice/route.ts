import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Confirms invoice payment status right after the client-side Stripe confirmation.
// Mirrors confirm-deposit — works without webhooks by polling paymentIntents.retrieve().
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { quoteId } = await request.json();
    if (!quoteId) {
      return NextResponse.json({ success: false, error: 'quoteId manquant.' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(quoteTable)
      .where(and(eq(quoteTable.id, quoteId), eq(quoteTable.userId, session.user.id)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Facture introuvable.' }, { status: 404 });
    }

    const quote = rows[0];

    // Idempotent — already confirmed
    if (quote.invoicePaymentStatus === 'SUCCEEDED') {
      return NextResponse.json({ success: true, invoicePaymentStatus: 'SUCCEEDED' });
    }

    if (!quote.invoiceStripePaymentIntentId) {
      return NextResponse.json({ success: false, error: 'Aucun paiement initié pour cette facture.' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(quote.invoiceStripePaymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      await db
        .update(quoteTable)
        .set({ invoicePaymentStatus: 'SUCCEEDED', updatedAt: new Date() })
        .where(eq(quoteTable.id, quoteId));

      return NextResponse.json({ success: true, invoicePaymentStatus: 'SUCCEEDED' });
    }

    // Payment method was declined or authentication failed
    if (paymentIntent.status === 'requires_payment_method') {
      await db
        .update(quoteTable)
        .set({ invoicePaymentStatus: 'FAILED', updatedAt: new Date() })
        .where(eq(quoteTable.id, quoteId));

      return NextResponse.json({ success: true, invoicePaymentStatus: 'FAILED' });
    }

    return NextResponse.json({
      success: true,
      invoicePaymentStatus: quote.invoicePaymentStatus,
      stripeStatus: paymentIntent.status,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
