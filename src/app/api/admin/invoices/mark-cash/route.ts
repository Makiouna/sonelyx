import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendInvoicePaymentConfirmationEmail } from '@/lib/email';

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

    const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document introuvable.' }, { status: 404 });
    }

    const quote = rows[0];

    if (quote.invoicePaymentStatus === 'SUCCEEDED' || quote.invoicePaymentStatus === 'CASH') {
      return NextResponse.json({ success: false, error: 'Ce document est déjà marqué comme réglé.' }, { status: 400 });
    }

    await db
      .update(quoteTable)
      .set({ invoicePaymentStatus: 'CASH', updatedAt: new Date() })
      .where(eq(quoteTable.id, quoteId));

    // Send confirmation email to client (non-blocking)
    db.select().from(userTable).where(eq(userTable.id, quote.userId)).limit(1).then(([client]) => {
      if (!client) return;
      sendInvoicePaymentConfirmationEmail(
        client.email,
        client.name,
        quote.projectName ?? 'Votre Projet',
        quote.startDate,
        quote.totalTTC,
        'cash',
      ).catch(err => console.error('Cash payment confirmation email failed:', err));
    }).catch(err => console.error('Failed to fetch client for email:', err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
