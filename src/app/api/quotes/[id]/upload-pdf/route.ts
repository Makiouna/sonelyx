import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UTApi } from 'uploadthing/server';

const utapi = new UTApi();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const existing = await db.select().from(quoteTable).where(eq(quoteTable.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    if (existing[0].status !== 'pdf_pending') {
      return NextResponse.json({ success: false, error: 'Ce devis n\'est pas en cours d\'envoi PDF.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Fichier PDF requis.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Le fichier ne doit pas dépasser 10 Mo.' }, { status: 400 });
    }

    const renamedFile = new File([file], `devis-${id}.pdf`, { type: 'application/pdf' });
    const result = await utapi.uploadFiles(renamedFile);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    const pdfUrl = result.data.ufsUrl ?? result.data.url;

    await db.update(quoteTable).set({
      pdfUrl,
      status: 'validated',
      updatedAt: new Date(),
    }).where(eq(quoteTable.id, id));

    return NextResponse.json({ success: true, pdfUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
