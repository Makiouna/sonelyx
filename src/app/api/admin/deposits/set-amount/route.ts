import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const { quoteId, depositAmount } = await request.json();
    if (!quoteId) {
      return NextResponse.json({ success: false, error: 'quoteId manquant.' }, { status: 400 });
    }

    const rows = await db.select().from(quoteTable).where(eq(quoteTable.id, quoteId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const amount = Number(depositAmount);
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: 'Montant invalide.' }, { status: 400 });
    }

    await db
      .update(quoteTable)
      .set({
        depositAmount: amount > 0 ? amount : null,
        depositStatus: amount > 0 ? 'PENDING' : null,
        updatedAt: new Date(),
      })
      .where(eq(quoteTable.id, quoteId));

    return NextResponse.json({ success: true, message: 'Montant de caution mis à jour.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
