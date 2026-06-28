import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { productItems as productItemsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // 1. Verify administrator session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const qrCodeId = url.searchParams.get('qrCodeId');
    if (!qrCodeId) {
      return NextResponse.json({ success: false, error: 'QR Code requis.' }, { status: 400 });
    }

    // 2. Fetch the item to find parent product
    const item = await db
      .select()
      .from(productItemsTable)
      .where(eq(productItemsTable.qrCodeId, qrCodeId))
      .limit(1);

    if (item.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun exemplaire correspondant à ce QR code.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, productId: item[0].productId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
