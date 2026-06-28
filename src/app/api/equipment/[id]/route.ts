import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { equipment as equipmentTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
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

    // 2. Parse request body
    const body = await request.json();
    const { name, brand, cat, desc, specs, price, priceType, priceTax, purchasePrice, quantity, image } = body;

    // 3. Find if item exists
    const existing = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Équipement introuvable.' }, { status: 404 });
    }

    // Map category to category labels
    const catLabels: Record<string, string> = {
      diffusion: 'DIFFUSION',
      eclairage: 'ÉCLAIRAGE',
      regie: 'RÉGIE',
      structure: 'STRUCTURE',
      energie: 'ÉNERGIE',
    };
    const catLabel = catLabels[cat] || existing[0].catLabel;

    // 4. Update item in database
    await db
      .update(equipmentTable)
      .set({
        cat: cat || existing[0].cat,
        catLabel: catLabel,
        brand: brand || existing[0].brand,
        name: name || existing[0].name,
        desc: desc || existing[0].desc,
        specs: specs ? JSON.stringify(specs) : existing[0].specs,
        price: price !== undefined ? Number(price) : existing[0].price,
        priceType: priceType !== undefined ? priceType : existing[0].priceType,
        priceTax: priceTax !== undefined ? priceTax : existing[0].priceTax,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing[0].purchasePrice,
        quantity: quantity !== undefined ? Number(quantity) : existing[0].quantity,
        image: image !== undefined ? image : existing[0].image,
      })
      .where(eq(equipmentTable.id, id));

    return NextResponse.json({ success: true, message: 'Équipement mis à jour avec succès.' });
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

    // 2. Find if item exists
    const existing = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Équipement introuvable.' }, { status: 404 });
    }

    // 3. Delete from database
    await db.delete(equipmentTable).where(eq(equipmentTable.id, id));

    return NextResponse.json({ success: true, message: 'Équipement supprimé avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
