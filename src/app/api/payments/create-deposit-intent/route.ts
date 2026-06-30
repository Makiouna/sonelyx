import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Only the owning client can initiate their own deposit
    const rows = await db
      .select()
      .from(quoteTable)
      .where(and(eq(quoteTable.id, quoteId), eq(quoteTable.userId, session.user.id)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const quote = rows[0];

    if (!quote.depositAmount || quote.depositAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Aucune caution définie pour ce devis.' }, { status: 400 });
    }

    if (quote.depositStatus === 'AUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Une caution est déjà autorisée pour ce devis.' }, { status: 400 });
    }

    // Fetch user email for Stripe customer metadata
    const userRows = await db.select().from(userTable).where(eq(userTable.id, session.user.id)).limit(1);
    const userEmail = userRows[0]?.email ?? session.user.email;

    // If a previous PaymentIntent exists (e.g. expired), cancel it first
    if (quote.stripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(quote.stripePaymentIntentId);
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existing.status)) {
          await stripe.paymentIntents.cancel(quote.stripePaymentIntentId);
        }
      } catch {}
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(quote.depositAmount * 100), // Stripe uses cents
      currency: 'eur',
      capture_method: 'manual', // Pre-authorize only — funds are blocked but not captured
      payment_method_types: ['card'],
      metadata: {
        quoteId: quote.id,
        userId: session.user.id,
        type: 'deposit',
      },
      description: `Caution — Devis #${quote.id}`,
      receipt_email: userEmail ?? undefined,
    });

    // Persist the PaymentIntent ID and mark deposit as PENDING
    await db
      .update(quoteTable)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        depositStatus: 'PENDING',
        updatedAt: new Date(),
      })
      .where(eq(quoteTable.id, quoteId));

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
