import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/admin/invoices — create a facture from a validated devis
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { devisId } = await request.json();
    if (!devisId) {
      return NextResponse.json({ success: false, error: 'devisId requis.' }, { status: 400 });
    }

    const existing = await db.select().from(quoteTable).where(eq(quoteTable.id, devisId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const devis = existing[0];
    if (devis.status !== 'validated' && devis.status !== 'locked') {
      return NextResponse.json({ success: false, error: 'Le devis doit être validé pour créer une facture.' }, { status: 400 });
    }

    const factureId = 'FAC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    await db.insert(quoteTable).values({
      id: factureId,
      userId: devis.userId,
      status: 'pdf_pending',
      docType: 'facture',
      linkedDevisId: devis.id,
      startDate: devis.startDate,
      endDate: devis.endDate,
      notes: devis.notes,
      items: devis.items,
      totalHT: devis.totalHT,
      totalTTC: devis.totalTTC,
      discount: devis.discount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, factureId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
