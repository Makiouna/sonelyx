import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const STRIPE_THRESHOLD = 1500;

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
      return NextResponse.json({ success: false, error: 'Document introuvable.' }, { status: 404 });
    }

    const quote = rows[0];

    if (!quote.totalTTC || quote.totalTTC <= 0) {
      return NextResponse.json({ success: false, error: 'Montant invalide.' }, { status: 400 });
    }

    // Security: reject if the amount exceeds the online payment threshold
    if (quote.totalTTC > STRIPE_THRESHOLD) {
      return NextResponse.json(
        { success: false, error: 'Ce montant excède le seuil de paiement en ligne. Veuillez effectuer un virement bancaire.' },
        { status: 400 },
      );
    }

    if (quote.invoicePaymentStatus === 'SUCCEEDED') {
      return NextResponse.json({ success: false, error: 'Ce document a déjà été réglé.' }, { status: 400 });
    }

    // Cancel any existing pending intent before creating a fresh one
    if (quote.invoiceStripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(quote.invoiceStripePaymentIntentId);
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existing.status)) {
          await stripe.paymentIntents.cancel(quote.invoiceStripePaymentIntentId);
        }
      } catch {}
    }

    const userRows = await db.select().from(userTable).where(eq(userTable.id, session.user.id)).limit(1);
    const userEmail = userRows[0]?.email ?? session.user.email;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(quote.totalTTC * 100),
      currency: 'eur',
      // 'card' covers CB, Apple Pay, and Google Pay via PaymentElement.
      // Avoids redirect-based methods (SEPA, Klarna…) that bypass our no-webhook confirm flow.
      payment_method_types: ['card'],
      metadata: {
        quoteId: quote.id,
        userId: session.user.id,
        type: 'invoice',
      },
      description: `Paiement — ${quote.docType === 'facture' ? 'Facture' : 'Devis'} #${quote.id}`,
      receipt_email: userEmail ?? undefined,
    });

    await db
      .update(quoteTable)
      .set({
        invoiceStripePaymentIntentId: paymentIntent.id,
        invoicePaymentStatus: 'PENDING',
        updatedAt: new Date(),
      })
      .where(eq(quoteTable.id, quoteId));

    return NextResponse.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
