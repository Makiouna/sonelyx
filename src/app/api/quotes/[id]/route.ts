import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT: Updates status of a quote (e.g. 'draft' to 'pending')
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const body = await request.json();
    const { status, startDate, endDate, notes, items, totalHT, totalTTC } = body;

    const isAdmin = session.user && (session.user as any).role === 'admin';
    const whereClause = isAdmin 
      ? eq(quoteTable.id, id) 
      : and(eq(quoteTable.id, id), eq(quoteTable.userId, session.user.id));

    // Verify quote belongs to user or requester is admin
    const existing = await db
      .select()
      .from(quoteTable)
      .where(whereClause)
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      if (!['draft', 'pending', 'modified_by_admin', 'pdf_pending', 'validated', 'cancelled'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Statut invalide.' }, { status: 400 });
      }
      updates.status = status;
    }

    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (notes !== undefined) updates.notes = notes;
    if (items !== undefined) updates.items = JSON.stringify(items);
    if (totalHT !== undefined) updates.totalHT = Number(totalHT);
    if (totalTTC !== undefined) updates.totalTTC = Number(totalTTC);
    if (pdfUrl !== undefined) updates.pdfUrl = pdfUrl;
    if (discount !== undefined) updates.discount = Number(discount);

    await db
      .update(quoteTable)
      .set(updates)
      .where(eq(quoteTable.id, id));

    return NextResponse.json({ success: true, message: 'Devis mis à jour avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

// DELETE: Deletes a quote (only if it is a draft)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const isAdmin = session.user && (session.user as any).role === 'admin';
    const whereClause = isAdmin 
      ? eq(quoteTable.id, id) 
      : and(eq(quoteTable.id, id), eq(quoteTable.userId, session.user.id));

    const existing = await db
      .select()
      .from(quoteTable)
      .where(whereClause)
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    if (existing[0].status !== 'draft' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Seuls les brouillons peuvent être supprimés.' }, { status: 400 });
    }

    await db.delete(quoteTable).where(eq(quoteTable.id, id));

    return NextResponse.json({ success: true, message: 'Devis supprimé avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
