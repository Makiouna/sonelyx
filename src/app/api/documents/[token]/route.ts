import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentRequests, user } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const [req] = await db.select().from(documentRequests).where(eq(documentRequests.token, token)).limit(1);

  if (!req) {
    return NextResponse.json({ success: false, error: 'INVALID_TOKEN' }, { status: 404 });
  }
  if (req.status === 'COMPLETED') {
    return NextResponse.json({ success: false, error: 'ALREADY_COMPLETED' }, { status: 410 });
  }
  if (new Date() > req.expiresAt) {
    return NextResponse.json({ success: false, error: 'EXPIRED' }, { status: 410 });
  }

  const [client] = await db.select({ name: user.name }).from(user).where(eq(user.id, req.customerId)).limit(1);

  return NextResponse.json({
    success: true,
    request: {
      id: req.id,
      customerId: req.customerId,
      clientName: client?.name ?? '',
      requestedTypes: JSON.parse(req.requestedTypes) as string[],
      expiresAt: req.expiresAt,
    },
  });
}
