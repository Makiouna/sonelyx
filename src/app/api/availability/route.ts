import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { getEquipmentWithQuantity } from '@/db/queries';
import { eq } from 'drizzle-orm';

// GET /api/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns available quantities per equipment, considering locked reservations that overlap the period
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate et endDate requis.' }, { status: 400 });
    }

    // Fetch all equipment (total stock) with calculated quantity
    const allEquipment = await getEquipmentWithQuantity();

    // Fetch all locked quotes
    const lockedQuotes = await db
      .select()
      .from(quoteTable)
      .where(eq(quoteTable.status, 'locked'));

    // Filter to overlapping period: quote.startDate <= requestEnd AND quote.endDate >= requestStart
    const overlapping = lockedQuotes.filter(
      q => q.startDate <= endDate && q.endDate >= startDate
    );

    // Sum locked quantities per equipment id
    const lockedQty: Record<string, number> = {};
    for (const q of overlapping) {
      try {
        const items = JSON.parse(q.items) as Array<{ id: string; quantity: number }>;
        for (const item of items) {
          lockedQty[item.id] = (lockedQty[item.id] || 0) + item.quantity;
        }
      } catch {}
    }

    // Compute available quantities (never below 0)
    const available: Record<string, number> = {};
    for (const eq of allEquipment) {
      available[eq.id] = Math.max(0, eq.quantity - (lockedQty[eq.id] || 0));
    }

    return NextResponse.json({ success: true, available });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
