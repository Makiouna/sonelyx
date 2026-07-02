import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureStripeCustomer, createAndSendQuoteInvoice } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { quoteId } = await request.json();
    if (!quoteId) {
      return NextResponse.json({ success: false, error: 'quoteId manquant.' }, { status: 400 });
    }

    // The amount invoiced always comes from the DB record set earlier by an
    // admin-only request — never from this request's body — so there is no
    // client-supplied price to validate here.
    const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document introuvable.' }, { status: 404 });
    }

    const quote = rows[0];

    if (quote.stripeInvoiceId) {
      return NextResponse.json({ success: false, error: 'Une facture Stripe a déjà été envoyée pour ce document.' }, { status: 400 });
    }
    if (quote.invoicePaymentStatus === 'SUCCEEDED' || quote.invoicePaymentStatus === 'CASH') {
      return NextResponse.json({ success: false, error: 'Ce document est déjà marqué comme réglé.' }, { status: 400 });
    }
    if (!quote.totalTTC || quote.totalTTC <= 0) {
      return NextResponse.json({ success: false, error: 'Montant invalide.' }, { status: 400 });
    }

    const clientRows = await db.select().from(userTable).where(eq(userTable.id, quote.userId)).limit(1);
    const client = clientRows[0];
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client introuvable.' }, { status: 404 });
    }

    const customerId = await ensureStripeCustomer(client.id, client.email, client.name);
    const invoice = await createAndSendQuoteInvoice(quote, customerId);

    await db
      .update(quoteTable)
      .set({ stripeInvoiceId: invoice.id, invoicePaymentStatus: 'PENDING', updatedAt: new Date() })
      .where(eq(quoteTable.id, quoteId));

    return NextResponse.json({ success: true, hostedInvoiceUrl: invoice.hosted_invoice_url });
  } catch (error: any) {
    console.error('Stripe invoice send failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur Stripe lors de l\'envoi de la facture.' }, { status: 500 });
  }
}
