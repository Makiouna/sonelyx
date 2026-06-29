import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { equipment as equipmentTable, productItems as productItemsTable } from '@/db/schema';
import { getEquipmentItemWithQuantity } from '@/db/queries';
import { eq } from 'drizzle-orm';

export async function GET(
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

    // 2. Fetch equipment item
    const existing = await getEquipmentItemWithQuantity(id);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Équipement introuvable.' }, { status: 404 });
    }

    // 3. Fetch product items (exemplaires physiques)
    const items = await db.select().from(productItemsTable).where(eq(productItemsTable.productId, id));

    return NextResponse.json({
      success: true,
      equipment: existing[0],
      items,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(
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

    const { qrCodeId } = await request.json();
    if (!qrCodeId) {
      return NextResponse.json({ success: false, error: 'QR Code requis.' }, { status: 400 });
    }

    // 2. Check if QR code is already assigned
    const conflict = await db.select().from(productItemsTable).where(eq(productItemsTable.qrCodeId, qrCodeId)).limit(1);
    if (conflict.length > 0) {
      return NextResponse.json({ success: false, error: 'Ce QR code est déjà attribué à un autre exemplaire.' }, { status: 400 });
    }

    // 3. Find parent product to get name
    const [eqItem] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (!eqItem) {
      return NextResponse.json({ success: false, error: 'Équipement introuvable.' }, { status: 404 });
    }

    // 4. Generate item name
    const existingItems = await db.select().from(productItemsTable).where(eq(productItemsTable.productId, id));
    let maxIndex = 0;
    for (const item of existingItems) {
      const match = item.itemName.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxIndex) maxIndex = num;
      }
    }
    if (maxIndex === 0) {
      maxIndex = existingItems.length;
    }
    const itemName = `${eqItem.name} ${maxIndex + 1}`;

    // 5. Insert new item
    const [newItem] = await db.insert(productItemsTable).values({
      productId: id,
      itemName,
      qrCodeId,
      status: 'AVAILABLE',
    }).returning();

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

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
    const { name, brand, cat, desc, specs, price, priceType, priceTax, purchasePrice, image } = body;

    // 3. Find if item exists with quantity
    const existing = await getEquipmentItemWithQuantity(id);
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
