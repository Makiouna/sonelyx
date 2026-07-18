import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { projectInspections, quote as quoteTable, user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendInspectionCompletedClientEmail, sendInspectionCompletedAdminEmail } from '@/lib/email';
import { parseDevice, getGeoLocation, extractClientIp } from '@/lib/geo';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentification requise.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { clientSignature } = body as { clientSignature: string };

    if (!clientSignature) {
      return NextResponse.json({ success: false, error: 'Signature requise.' }, { status: 400 });
    }

    // Fetch inspection + quote + client
    const rows = await db
      .select({ inspection: projectInspections, quote: quoteTable, client: userTable })
      .from(projectInspections)
      .innerJoin(quoteTable, eq(projectInspections.quoteId, quoteTable.id))
      .innerJoin(userTable, eq(quoteTable.userId, userTable.id))
      .where(eq(projectInspections.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'État des lieux introuvable.' }, { status: 404 });
    }

    const { inspection, quote, client } = rows[0];

    if (quote.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    if (inspection.status !== 'PENDING_CLIENT') {
      return NextResponse.json({ success: false, error: 'Cet état des lieux a déjà été signé.' }, { status: 400 });
    }

    // Extract connection metadata
    const reqHeaders = request.headers;
    const ip = extractClientIp(reqHeaders);
    const ua = reqHeaders.get('user-agent') ?? '';
    const device = parseDevice(ua);
    const geoLocation = await getGeoLocation(ip, reqHeaders);

    const now = new Date();
    await db
      .update(projectInspections)
      .set({
        clientSignature,
        clientSignedAt: now,
        clientIp: ip,
        clientDevice: device,
        clientGeoLocation: geoLocation,
        clientUserId: session.user.id,
        status: 'COMPLETED',
      })
      .where(eq(projectInspections.id, id));

    const projectName = quote.projectName ?? `Projet #${quote.id.slice(0, 8)}`;

    await Promise.all([
      sendInspectionCompletedClientEmail(client.email, client.name, projectName, inspection.type as 'DEPART' | 'RETOUR', now),
      sendInspectionCompletedAdminEmail(client.name, projectName, inspection.type as 'DEPART' | 'RETOUR', now),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/inspections/[id]/client-sign error:', error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
