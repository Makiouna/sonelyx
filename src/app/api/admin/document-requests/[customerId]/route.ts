import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { documentRequests, customerDocuments } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const { customerId } = await params;

  const [requests, documents] = await Promise.all([
    db.select().from(documentRequests).where(eq(documentRequests.customerId, customerId)),
    db.select().from(customerDocuments).where(eq(customerDocuments.customerId, customerId)),
  ]);

  return NextResponse.json({ success: true, requests, documents });
}
