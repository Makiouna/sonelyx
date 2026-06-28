import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable, productItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // 2. Fetch quote
    const [quote] = await db.select().from(quoteTable).where(eq(quoteTable.id, id)).limit(1);
    if (!quote) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const items = JSON.parse(quote.items) as Array<{ id: string; name: string; brand: string; quantity: number }>;

    // 3. Fetch all physical items currently rented by this quote
    const rentedItems = await db.select().from(productItems).where(eq(productItems.rentedByQuoteId, id));

    return NextResponse.json({
      success: true,
      reserved: items,
      scanned: rentedItems,
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

    const { action, qrCodeId } = await request.json();
    if (!action || !qrCodeId) {
      return NextResponse.json({ success: false, error: 'Action et QR Code requis.' }, { status: 400 });
    }

    // 2. Fetch quote
    const [quote] = await db.select().from(quoteTable).where(eq(quoteTable.id, id)).limit(1);
    if (!quote) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const reservedItems = JSON.parse(quote.items) as Array<{ id: string; name: string; quantity: number }>;

    // 3. Find physical item by QR code
    const [item] = await db.select().from(productItems).where(eq(productItems.qrCodeId, qrCodeId)).limit(1);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Exemplaire physique introuvable pour ce QR Code.' }, { status: 404 });
    }

    if (action === 'check-out') {
      // Check-out logic
      if (item.status === 'RENTED' && item.rentedByQuoteId === id) {
        return NextResponse.json({ success: false, error: 'Exemplaire déjà scanné au départ pour cette commande.' }, { status: 400 });
      }
      if (item.status !== 'AVAILABLE') {
        return NextResponse.json({ success: false, error: `Exemplaire indisponible (statut actuel: ${item.status}).` }, { status: 400 });
      }

      // Check if product is in the quote
      const orderProduct = reservedItems.find(p => p.id === item.productId);
      if (!orderProduct) {
        return NextResponse.json({ success: false, error: "Ce matériel ne fait pas partie de cette commande." }, { status: 400 });
      }

      // Check if quota already reached
      const alreadyScanned = await db.select().from(productItems).where(
        and(
          eq(productItems.rentedByQuoteId, id),
          eq(productItems.productId, item.productId)
        )
      );
      if (alreadyScanned.length >= orderProduct.quantity) {
        return NextResponse.json({ success: false, error: `Quota de départ déjà atteint pour ce produit (${orderProduct.quantity}/${orderProduct.quantity}).` }, { status: 400 });
      }

      // Update physical item
      await db.update(productItems)
        .set({
          status: 'RENTED',
          rentedByQuoteId: id,
        })
        .where(eq(productItems.id, item.id));

      return NextResponse.json({ success: true, message: `${item.itemName} scanné au départ.` });

    } else if (action === 'check-in') {
      // Check-in logic
      if (item.rentedByQuoteId !== id) {
        return NextResponse.json({ success: false, error: "Cet exemplaire n'est pas associé au départ de cette commande." }, { status: 400 });
      }

      // Update physical item
      await db.update(productItems)
        .set({
          status: 'AVAILABLE',
          rentedByQuoteId: null,
        })
        .where(eq(productItems.id, item.id));

      return NextResponse.json({ success: true, message: `${item.itemName} scanné au retour.` });
    }

    return NextResponse.json({ success: false, error: 'Action invalide.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
