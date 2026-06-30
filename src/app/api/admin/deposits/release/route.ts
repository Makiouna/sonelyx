import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const { quoteId } = await request.json();
    if (!quoteId) {
      return NextResponse.json({ success: false, error: 'quoteId manquant.' }, { status: 400 });
    }

    const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const quote = rows[0];

    if (quote.depositStatus !== 'AUTHORIZED') {
      return NextResponse.json({ success: false, error: 'La caution n\'est pas en statut AUTHORIZED.' }, { status: 400 });
    }

    if (!quote.stripePaymentIntentId) {
      return NextResponse.json({ success: false, error: 'Aucun PaymentIntent associé.' }, { status: 400 });
    }

    await stripe.paymentIntents.cancel(quote.stripePaymentIntentId);

    await db
      .update(quoteTable)
      .set({ depositStatus: 'RELEASED', updatedAt: new Date() })
      .where(eq(quoteTable.id, quoteId));

    return NextResponse.json({ success: true, message: 'Caution libérée avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
