import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { projectInspections, quote as quoteTable, user as userTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const { quoteId } = await params;

    const rows = await db
      .select({ inspection: projectInspections, client: userTable })
      .from(projectInspections)
      .innerJoin(quoteTable, eq(projectInspections.quoteId, quoteTable.id))
      .innerJoin(userTable, eq(quoteTable.userId, userTable.id))
      .where(eq(projectInspections.quoteId, quoteId))
      .orderBy(desc(projectInspections.createdAt));

    const inspections = rows.map(({ inspection, client }) => ({
      ...inspection,
      photoUrls: JSON.parse(inspection.photoUrls) as string[],
      clientName: client.name,
      clientEmail: client.email,
    }));

    return NextResponse.json({ success: true, inspections });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
