import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'admin';
    const whereClause = isAdmin
      ? eq(quoteTable.id, id)
      : and(eq(quoteTable.id, id), eq(quoteTable.userId, session.user.id));

    const existing = await db.select().from(quoteTable).where(whereClause).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    if (!existing[0].pdfUrl) {
      return NextResponse.json({ success: false, error: 'Aucun PDF disponible pour ce devis.' }, { status: 404 });
    }

    const pdfRes = await fetch(existing[0].pdfUrl);
    if (!pdfRes.ok) {
      return NextResponse.json({ success: false, error: 'Impossible de récupérer le fichier PDF.' }, { status: 502 });
    }

    return new Response(pdfRes.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="devis-${id}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
