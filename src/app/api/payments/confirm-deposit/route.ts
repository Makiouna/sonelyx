import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { resend } from '@/lib/resend';
import { buildDepositConfirmedEmail } from '@/lib/email-templates/deposit-confirmed';

// Confirms the deposit status right after the client-side Stripe confirmation.
// This lets the deposit flow work without relying on a webhook (e.g. in local dev,
// where no webhook endpoint is configured) — the webhook remains the source of
// truth in production for async events (3DS, failures, expirations).
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
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const quote = rows[0];
    if (!quote.stripePaymentIntentId) {
      return NextResponse.json({ success: false, error: 'Aucune caution en cours pour ce devis.' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(quote.stripePaymentIntentId);

    if (paymentIntent.status === 'requires_capture') {
      const wasAlreadyAuthorized = quote.depositStatus === 'AUTHORIZED';

      await db
        .update(quoteTable)
        .set({ depositStatus: 'AUTHORIZED', updatedAt: new Date() })
        .where(eq(quoteTable.id, quoteId));

      // Send confirmation email only on the PENDING -> AUTHORIZED transition
      if (!wasAlreadyAuthorized && quote.depositAmount) {
        try {
          const userRows = await db.select().from(userTable).where(eq(userTable.id, session.user.id)).limit(1);
          const clientName = userRows[0]?.name ?? 'Client';
          const clientEmail = userRows[0]?.email ?? session.user.email;
          if (clientEmail) {
            const { html, subject } = buildDepositConfirmedEmail({
              clientName,
              depositAmount: quote.depositAmount,
              quoteId: quote.id,
            });
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
              to: clientEmail,
              subject,
              html,
            });
          }
        } catch {}
      }

      return NextResponse.json({ success: true, depositStatus: 'AUTHORIZED' });
    }

    return NextResponse.json({ success: true, depositStatus: quote.depositStatus, stripeStatus: paymentIntent.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
