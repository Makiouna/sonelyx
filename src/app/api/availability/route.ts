import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quote as quoteTable, packCompositions } from '@/db/schema';
import { getEquipmentWithQuantity } from '@/db/queries';
import { eq } from 'drizzle-orm';

// GET /api/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate et endDate requis.' }, { status: 400 });
    }

    const allEquipment = await getEquipmentWithQuantity();

    // Build pack composition map: packId -> [{componentId, quantityNeeded}]
    const allCompositions = await db.select().from(packCompositions);
    const packCompMap: Record<string, Array<{ componentId: string; quantityNeeded: number }>> = {};
    for (const row of allCompositions) {
      if (!packCompMap[row.packProductId]) packCompMap[row.packProductId] = [];
      packCompMap[row.packProductId].push({ componentId: row.componentProductId, quantityNeeded: row.quantityNeeded });
    }

    const packIds = new Set(allEquipment.filter(e => e.isPack).map(e => e.id));

    // Fetch overlapping locked quotes
    const lockedQuotes = await db.select().from(quoteTable).where(eq(quoteTable.status, 'locked'));
    const overlapping = lockedQuotes.filter(q => q.startDate <= endDate && q.endDate >= startDate);

    // Sum locked quantities per component (expanding packs → components)
    const lockedQty: Record<string, number> = {};
    for (const q of overlapping) {
      try {
        const items = JSON.parse(q.items) as Array<{ id: string; quantity: number }>;
        for (const item of items) {
          if (packIds.has(item.id)) {
            // Expand: lock each component
            const comps = packCompMap[item.id] ?? [];
            for (const comp of comps) {
              lockedQty[comp.componentId] = (lockedQty[comp.componentId] || 0) + item.quantity * comp.quantityNeeded;
            }
          } else {
            lockedQty[item.id] = (lockedQty[item.id] || 0) + item.quantity;
          }
        }
      } catch {}
    }

    // Step 1: compute availability for non-pack products
    const available: Record<string, number> = {};
    for (const eq of allEquipment) {
      if (!eq.isPack) {
        available[eq.id] = Math.max(0, eq.quantity - (lockedQty[eq.id] || 0));
      }
    }

    // Step 2: derive pack availability from component availability
    for (const eq of allEquipment) {
      if (eq.isPack) {
        const comps = packCompMap[eq.id];
        if (!comps || comps.length === 0) {
          available[eq.id] = 0;
        } else {
          available[eq.id] = Math.min(
            ...comps.map(c => Math.floor((available[c.componentId] ?? 0) / c.quantityNeeded))
          );
        }
      }
    }

    return NextResponse.json({ success: true, available });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
