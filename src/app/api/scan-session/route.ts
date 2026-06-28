import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { scanSessions } from '@/db/schema';

export async function POST(request: Request) {
  try {
    // 1. Verify administrator session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    // 2. Parse request body
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de session requis.' }, { status: 400 });
    }

    // 3. Register session
    await db.insert(scanSessions).values({
      id,
      status: 'PENDING',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
