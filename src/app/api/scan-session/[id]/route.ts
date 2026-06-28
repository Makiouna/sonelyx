import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { scanSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // 2. Parse body
    const { qrCodeId } = await request.json();
    if (!qrCodeId) {
      return NextResponse.json({ success: false, error: 'QR Code requis.' }, { status: 400 });
    }

    // 3. Update the scan session
    await db
      .update(scanSessions)
      .set({
        qrCodeId,
        status: 'SCANNED',
      })
      .where(eq(scanSessions.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

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

    // 2. Fetch the session
    const rows = await db.select().from(scanSessions).where(eq(scanSessions.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ success: true, status: 'DISCONNECTED' });
    }

    const s = rows[0];
    if (s.status === 'SCANNED') {
      // Clean up consumed session
      await db.delete(scanSessions).where(eq(scanSessions.id, id));
      return NextResponse.json({ success: true, status: 'SCANNED', qrCodeId: s.qrCodeId });
    }

    return NextResponse.json({ success: true, status: 'PENDING' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
