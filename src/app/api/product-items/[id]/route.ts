import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { productItems as productItemsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify administrator session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    // 2. Parse body
    const { status, qrCodeId } = await request.json();

    const updateData: any = {};
    if (status !== undefined) {
      if (!['AVAILABLE', 'RENTED', 'MAINTENANCE'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Statut invalide.' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (qrCodeId !== undefined) {
      if (!qrCodeId) {
        return NextResponse.json({ success: false, error: 'QR Code ne peut pas être vide.' }, { status: 400 });
      }
      // Check if QR code is unique (excluding self)
      const conflict = await db.select().from(productItemsTable).where(eq(productItemsTable.qrCodeId, qrCodeId)).limit(1);
      if (conflict.length > 0 && conflict[0].id !== id) {
        return NextResponse.json({ success: false, error: 'Ce QR code est déjà attribué.' }, { status: 400 });
      }
      updateData.qrCodeId = qrCodeId;
    }

    // 3. Update database
    await db.update(productItemsTable).set(updateData).where(eq(productItemsTable.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify administrator session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    // 2. Delete item from database
    await db.delete(productItemsTable).where(eq(productItemsTable.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
