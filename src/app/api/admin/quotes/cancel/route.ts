import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { quote as quoteTable, productItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { quoteId, reason } = await request.json();
    if (!quoteId) {
      return NextResponse.json({ success: false, error: 'quoteId manquant.' }, { status: 400 });
    }

    const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document introuvable.' }, { status: 404 });
    }

    const quote = rows[0];

    if (quote.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Ce document est déjà annulé.' }, { status: 400 });
    }

    // 1. Release all physical items linked to this quote
    const rentedItems = await db
      .select()
      .from(productItems)
      .where(eq(productItems.rentedByQuoteId, quoteId));

    if (rentedItems.length > 0) {
      await db
        .update(productItems)
        .set({ status: 'AVAILABLE', rentedByQuoteId: null })
        .where(eq(productItems.rentedByQuoteId, quoteId));
    }

    // 2. Release Stripe deposit if still authorized (non-destructive — only cancels the hold)
    if (quote.stripePaymentIntentId && quote.depositStatus === 'AUTHORIZED') {
      try {
        await stripe.paymentIntents.cancel(quote.stripePaymentIntentId, undefined, {
          idempotencyKey: `deposit_cancel_${quote.stripePaymentIntentId}`,
        });
      } catch {}
    }

    // 3. Mark quote as cancelled with reason and timestamp
    await db
      .update(quoteTable)
      .set({
        status: 'cancelled',
        cancellationReason: reason?.trim() || null,
        cancelledAt: new Date(),
        updatedAt: new Date(),
        // Reflect the deposit release in DB (webhook would also handle this, but be explicit)
        ...(quote.depositStatus === 'AUTHORIZED'
          ? { depositStatus: 'RELEASED' }
          : {}),
      })
      .where(eq(quoteTable.id, quoteId));

    return NextResponse.json({
      success: true,
      releasedItemsCount: rentedItems.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
