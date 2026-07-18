import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user as userTable, session as sessionTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { parseDevice, getGeoLocation } from '@/lib/geo';

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as any).role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { id } = await params;

    const [targetUser] = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Client introuvable.' }, { status: 404 });
    }

    const [lastSession] = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.userId, id))
      .orderBy(desc(sessionTable.createdAt))
      .limit(1);

    let lastConnection = null;
    if (lastSession) {
      const ua = lastSession.userAgent ?? '';
      const ip = lastSession.ipAddress ?? 'Inconnu';
      // Note: pass empty headers — the Vercel geo headers on *this* request belong
      // to the admin viewing the page, not to the client's stored session IP.
      const geoLocation = await getGeoLocation(ip, new Headers());
      lastConnection = {
        ipAddress: ip,
        device: parseDevice(ua),
        geoLocation,
        createdAt: lastSession.createdAt,
      };
    }

    return NextResponse.json({ success: true, user: targetUser, lastConnection });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body as { role: string };

    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ success: false, error: 'Rôle invalide.' }, { status: 400 });
    }

    const [updated] = await db
      .update(userTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(userTable.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Client introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
