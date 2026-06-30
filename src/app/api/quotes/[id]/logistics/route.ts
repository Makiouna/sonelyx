import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable, productItems, equipment as equipmentTable, packCompositions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Expand pack items into their components for a given quantity
async function expandToComponents(
  items: Array<{ id: string; name: string; brand?: string; quantity: number }>
): Promise<Array<{ id: string; name: string; brand: string; quantity: number; fromPackId?: string; fromPackName?: string }>> {
  // Fetch all equipment to resolve names/brands and isPack flag
  const allEquipment = await db.select({ id: equipmentTable.id, name: equipmentTable.name, brand: equipmentTable.brand, isPack: equipmentTable.isPack }).from(equipmentTable);
  const eqMap = Object.fromEntries(allEquipment.map(e => [e.id, e]));

  // Fetch all compositions for pack items in the list
  const packItemIds = items.filter(i => eqMap[i.id]?.isPack).map(i => i.id);
  const compsMap: Record<string, Array<{ componentProductId: string; quantityNeeded: number }>> = {};

  if (packItemIds.length > 0) {
    const allComps = await db.select().from(packCompositions);
    for (const row of allComps) {
      if (packItemIds.includes(row.packProductId)) {
        if (!compsMap[row.packProductId]) compsMap[row.packProductId] = [];
        compsMap[row.packProductId].push({ componentProductId: row.componentProductId, quantityNeeded: row.quantityNeeded });
      }
    }
  }

  const expanded: Array<{ id: string; name: string; brand: string; quantity: number; fromPackId?: string; fromPackName?: string }> = [];

  for (const item of items) {
    const eq = eqMap[item.id];
    if (eq?.isPack) {
      const comps = compsMap[item.id] ?? [];
      for (const comp of comps) {
        const compEq = eqMap[comp.componentProductId];
        // Merge with existing entry if same component appears from multiple packs or directly
        const existing = expanded.find(e => e.id === comp.componentProductId && e.fromPackId === item.id);
        if (existing) {
          existing.quantity += item.quantity * comp.quantityNeeded;
        } else {
          expanded.push({
            id: comp.componentProductId,
            name: compEq?.name ?? comp.componentProductId,
            brand: compEq?.brand ?? '',
            quantity: item.quantity * comp.quantityNeeded,
            fromPackId: item.id,
            fromPackName: item.name,
          });
        }
      }
    } else {
      // Regular product — pass through
      const existing = expanded.find(e => e.id === item.id && !e.fromPackId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        expanded.push({
          id: item.id,
          name: item.name,
          brand: eq?.brand ?? (item.brand ?? ''),
          quantity: item.quantity,
        });
      }
    }
  }

  return expanded;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const [quote] = await db.select().from(quoteTable).where(eq(quoteTable.id, id)).limit(1);
    if (!quote) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const rawItems = JSON.parse(quote.items) as Array<{ id: string; name: string; brand: string; quantity: number }>;

    // Expand packs → components for the logistics checklist
    const reserved = await expandToComponents(rawItems);

    // Physical items actually scanned (rented) for this quote
    const scanned = await db.select().from(productItems).where(eq(productItems.rentedByQuoteId, id));

    return NextResponse.json({ success: true, reserved, scanned });
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

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { action, qrCodeId } = await request.json();
    if (!action || !qrCodeId) {
      return NextResponse.json({ success: false, error: 'Action et QR Code requis.' }, { status: 400 });
    }

    const [quote] = await db.select().from(quoteTable).where(eq(quoteTable.id, id)).limit(1);
    if (!quote) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const rawItems = JSON.parse(quote.items) as Array<{ id: string; name: string; brand: string; quantity: number }>;

    // Expand packs → components to build the full required list
    const requiredItems = await expandToComponents(rawItems);

    // Find physical item by QR code
    const [item] = await db.select().from(productItems).where(eq(productItems.qrCodeId, qrCodeId)).limit(1);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Exemplaire physique introuvable pour ce QR Code.' }, { status: 404 });
    }

    if (action === 'check-out') {
      if (item.status === 'RENTED' && item.rentedByQuoteId === id) {
        return NextResponse.json({ success: false, error: 'Exemplaire déjà scanné au départ pour cette commande.' }, { status: 400 });
      }
      if (item.status !== 'AVAILABLE') {
        return NextResponse.json({ success: false, error: `Exemplaire indisponible (statut: ${item.status}).` }, { status: 400 });
      }

      // Find matching required item (direct or via pack component)
      const orderProduct = requiredItems.find(r => r.id === item.productId);
      if (!orderProduct) {
        return NextResponse.json({ success: false, error: "Ce matériel ne fait pas partie de cette commande." }, { status: 400 });
      }

      // Check if quota for this component is already reached
      const alreadyScanned = await db.select().from(productItems).where(
        and(eq(productItems.rentedByQuoteId, id), eq(productItems.productId, item.productId))
      );
      if (alreadyScanned.length >= orderProduct.quantity) {
        return NextResponse.json({
          success: false,
          error: `Quota atteint pour ce produit (${orderProduct.quantity}/${orderProduct.quantity}).`,
        }, { status: 400 });
      }

      await db.update(productItems)
        .set({ status: 'RENTED', rentedByQuoteId: id })
        .where(eq(productItems.id, item.id));

      const label = orderProduct.fromPackName
        ? `${item.itemName} (Pack: ${orderProduct.fromPackName})`
        : item.itemName;

      return NextResponse.json({ success: true, message: `${label} scanné au départ.` });

    } else if (action === 'check-in') {
      if (item.rentedByQuoteId !== id) {
        return NextResponse.json({ success: false, error: "Cet exemplaire n'est pas associé à cette commande." }, { status: 400 });
      }

      await db.update(productItems)
        .set({ status: 'AVAILABLE', rentedByQuoteId: null })
        .where(eq(productItems.id, item.id));

      return NextResponse.json({ success: true, message: `${item.itemName} scanné au retour.` });
    }

    return NextResponse.json({ success: false, error: 'Action invalide.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
