import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { remoteScanQueue } from '@/db/schema';
import { eq, asc, lt } from 'drizzle-orm';

// Mobile sends a scan to the PC queue
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { qrCodeId } = await request.json();
    if (!qrCodeId) {
      return NextResponse.json({ success: false, error: 'QR Code requis.' }, { status: 400 });
    }

    await db.insert(remoteScanQueue).values({
      adminId: session.user.id,
      qrCodeId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

// PC polls for the oldest pending scan (returns and deletes it atomically)
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    // Clean up stale entries older than 5 minutes first
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await db.delete(remoteScanQueue).where(lt(remoteScanQueue.createdAt, fiveMinutesAgo));

    // Fetch oldest pending scan for this admin
    const rows = await db
      .select()
      .from(remoteScanQueue)
      .where(eq(remoteScanQueue.adminId, session.user.id))
      .orderBy(asc(remoteScanQueue.createdAt))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: true, scan: null });
    }

    // Delete and return (consume the scan)
    await db.delete(remoteScanQueue).where(eq(remoteScanQueue.id, rows[0].id));
    return NextResponse.json({ success: true, scan: { qrCodeId: rows[0].qrCodeId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
