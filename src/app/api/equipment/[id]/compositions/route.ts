import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { equipment as equipmentTable, packCompositions } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/equipment/[id]/compositions — returns composition list for a pack
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await db
      .select({
        id: packCompositions.id,
        componentProductId: packCompositions.componentProductId,
        quantityNeeded: packCompositions.quantityNeeded,
        componentName: equipmentTable.name,
        componentBrand: equipmentTable.brand,
        componentCatLabel: equipmentTable.catLabel,
        componentImage: equipmentTable.image,
      })
      .from(packCompositions)
      .innerJoin(equipmentTable, eq(packCompositions.componentProductId, equipmentTable.id))
      .where(eq(packCompositions.packProductId, id));

    return NextResponse.json({ success: true, compositions: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

// PUT /api/equipment/[id]/compositions — replaces all compositions for a pack
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { id } = await params;
    const { compositions } = await request.json() as {
      compositions: Array<{ componentProductId: string; quantityNeeded: number }>;
    };

    // Replace all existing compositions atomically
    await db.delete(packCompositions).where(eq(packCompositions.packProductId, id));

    if (compositions.length > 0) {
      await db.insert(packCompositions).values(
        compositions.map(c => ({
          packProductId: id,
          componentProductId: c.componentProductId,
          quantityNeeded: Math.max(1, c.quantityNeeded),
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
