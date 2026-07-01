import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { documentRequests, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { sendDocumentRequestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { customerId, requestedTypes } = body as { customerId: string; requestedTypes: string[] };

  if (!customerId || !requestedTypes?.length) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const [client] = await db.select().from(user).where(eq(user.id, customerId)).limit(1);
  if (!client) {
    return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [created] = await db.insert(documentRequests).values({
    customerId,
    requestedTypes: JSON.stringify(requestedTypes),
    token,
    status: 'PENDING',
    expiresAt,
  }).returning();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonelyx.fr';
  const uploadUrl = `${appUrl}/documents-upload/${token}`;

  await sendDocumentRequestEmail(client.email, client.name, requestedTypes, uploadUrl, expiresAt);

  return NextResponse.json({ success: true, request: created });
}
