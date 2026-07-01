import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { projectInspections, quote as quoteTable, user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendInspectionCompletedClientEmail, sendInspectionCompletedAdminEmail } from '@/lib/email';

function parseDevice(ua: string): string {
  if (!ua) return 'Inconnu';
  let device = 'Autre';
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Android/i.test(ua) && /Mobile/i.test(ua)) device = 'Android Mobile';
  else if (/Android/i.test(ua)) device = 'Android Tablette';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Macintosh/i.test(ua)) device = 'Mac';
  else if (/Linux/i.test(ua)) device = 'Linux';

  let browser = 'Navigateur inconnu';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return `${device} / ${browser}`;
}

async function getGeoLocation(ip: string, reqHeaders: Headers): Promise<string> {
  // Vercel native geo headers (production)
  const city = reqHeaders.get('x-vercel-ip-city');
  const region = reqHeaders.get('x-vercel-ip-country-region');
  const country = reqHeaders.get('x-vercel-ip-country');
  if (city || country) {
    return [decodeURIComponent(city ?? ''), region ?? '', country ?? ''].filter(Boolean).join(', ');
  }

  // Fallback: ipapi.co (free, no key needed, works for non-Vercel/local)
  const isPrivate = !ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('::1') || ip.startsWith('192.168.') || ip.startsWith('10.');
  if (!isPrivate) {
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'sonelyx-app/1.0' },
      });
      if (res.ok) {
        const data = await res.json() as { city?: string; region?: string; country_name?: string };
        return [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'Non disponible';
      }
    } catch {
      // geo lookup is best-effort — never block the signature
    }
  }

  return ip.startsWith('127.') || ip === '::1' ? 'Réseau local (dev)' : 'Non disponible';
}

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
    const ip = (reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? reqHeaders.get('x-real-ip')
      ?? '').replace(/^::ffff:/, '') || 'Inconnu';
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
