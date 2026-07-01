import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { projectInspections, quote as quoteTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentification requise.' }, { status: 401 });
    }

    const { id } = await params;

    const rows = await db
      .select({ inspection: projectInspections, quote: quoteTable })
      .from(projectInspections)
      .innerJoin(quoteTable, eq(projectInspections.quoteId, quoteTable.id))
      .where(eq(projectInspections.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'État des lieux introuvable.' }, { status: 404 });
    }

    const { inspection, quote } = rows[0];

    // Verify the session user owns this quote (or is admin)
    const isAdmin = (session.user as any).role === 'admin';
    if (!isAdmin && quote.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      inspection: {
        ...inspection,
        photoUrls: JSON.parse(inspection.photoUrls) as string[],
      },
      projectName: quote.projectName ?? `Projet #${quote.id.slice(0, 8)}`,
      startDate: quote.startDate,
      endDate: quote.endDate,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
