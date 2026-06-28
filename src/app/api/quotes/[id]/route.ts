import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'admin';
    const whereClause = isAdmin
      ? eq(quoteTable.id, id)
      : and(eq(quoteTable.id, id), eq(quoteTable.userId, session.user.id));

    const existing = await db.select().from(quoteTable).where(whereClause).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const body = await request.json();
    const { status, startDate, endDate, notes, items, totalHT, totalTTC, pdfUrl, discount, approve, refuse, clientRefusalNote, projectName } = body;

    // Client approves admin modifications
    if (approve === true && !isAdmin) {
      if (existing[0].status !== 'modified_by_admin') {
        return NextResponse.json({ success: false, error: 'Ce devis n\'est pas en attente de validation.' }, { status: 400 });
      }
      await db.update(quoteTable).set({
        status: 'pdf_pending',
        previousVersion: null,
        clientRefusalNote: null,
        updatedAt: new Date(),
      }).where(eq(quoteTable.id, id));
      return NextResponse.json({ success: true, message: 'Modifications acceptées.' });
    }

    // Client refuses admin modifications — restore previous version
    if (refuse === true && !isAdmin) {
      if (existing[0].status !== 'modified_by_admin') {
        return NextResponse.json({ success: false, error: 'Ce devis n\'est pas en attente de validation.' }, { status: 400 });
      }

      const updates: any = {
        status: 'pending',
        clientRefusalNote: clientRefusalNote || null,
        updatedAt: new Date(),
      };

      if (existing[0].previousVersion) {
        try {
          const prev = JSON.parse(existing[0].previousVersion);
          updates.items = JSON.stringify(prev.items);
          updates.totalHT = prev.totalHT;
          updates.totalTTC = prev.totalTTC;
          updates.startDate = prev.startDate;
          updates.endDate = prev.endDate;
          updates.notes = prev.notes ?? null;
          updates.discount = prev.discount ?? 0;
        } catch {}
      }

      updates.previousVersion = null;

      await db.update(quoteTable).set(updates).where(eq(quoteTable.id, id));
      return NextResponse.json({ success: true, message: 'Modifications refusées. Devis restauré.' });
    }

    // Standard field updates
    const updates: any = { updatedAt: new Date() };

    if (status !== undefined) {
      if (!['draft', 'pending', 'modified_by_admin', 'pdf_pending', 'validated', 'cancelled'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Statut invalide.' }, { status: 400 });
      }

      // When admin saves a modification, snapshot the current version before overwriting
      if (isAdmin && status === 'modified_by_admin' && items !== undefined) {
        const snapshot = {
          items: JSON.parse(existing[0].items),
          totalHT: existing[0].totalHT,
          totalTTC: existing[0].totalTTC,
          startDate: existing[0].startDate,
          endDate: existing[0].endDate,
          notes: existing[0].notes,
          discount: existing[0].discount,
        };
        updates.previousVersion = JSON.stringify(snapshot);
        updates.clientRefusalNote = null;
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
    if (projectName !== undefined) updates.projectName = projectName || null;

    await db.update(quoteTable).set(updates).where(eq(quoteTable.id, id));

    return NextResponse.json({ success: true, message: 'Devis mis à jour avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'admin';
    const whereClause = isAdmin
      ? eq(quoteTable.id, id)
      : and(eq(quoteTable.id, id), eq(quoteTable.userId, session.user.id));

    const existing = await db.select().from(quoteTable).where(whereClause).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    if (existing[0].status !== 'draft' && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Seuls les brouillons peuvent être supprimés.' }, { status: 400 });
    }

    await db.delete(quoteTable).where(eq(quoteTable.id, id));
    return NextResponse.json({ success: true, message: 'Devis supprimé avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
