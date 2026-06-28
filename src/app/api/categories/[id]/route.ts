import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { category as categoryTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // 2. Find if category exists
    const existing = await db.select().from(categoryTable).where(eq(categoryTable.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Catégorie introuvable.' }, { status: 404 });
    }

    // 3. Delete from database
    await db.delete(categoryTable).where(eq(categoryTable.id, id));

    return NextResponse.json({ success: true, message: 'Catégorie supprimée avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
