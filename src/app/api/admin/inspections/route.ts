import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { projectInspections, quote as quoteTable, user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UTApi } from 'uploadthing/server';
import { sendInspectionSignatureRequestEmail } from '@/lib/email';

const utapi = new UTApi();

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const formData = await request.formData();
    const quoteId = formData.get('quoteId') as string | null;
    const type = formData.get('type') as 'DEPART' | 'RETOUR' | null;
    const adminSignature = formData.get('adminSignature') as string | null;
    const photoFiles = formData.getAll('photos') as File[];

    if (!quoteId || !type || !adminSignature) {
      return NextResponse.json({ success: false, error: 'Champs requis manquants.' }, { status: 400 });
    }
    if (!['DEPART', 'RETOUR'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Type invalide.' }, { status: 400 });
    }

    // Fetch quote + client
    const quoteRows = await db
      .select({ q: quoteTable, u: userTable })
      .from(quoteTable)
      .innerJoin(userTable, eq(quoteTable.userId, userTable.id))
      .where(eq(quoteTable.id, quoteId))
      .limit(1);

    if (quoteRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    const { q: quoteData, u: clientUser } = quoteRows[0];
    const projectName = quoteData.projectName ?? `Projet #${quoteId.slice(0, 8)}`;

    // Upload photos to UploadThing
    let photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      const filesToUpload = photoFiles.slice(0, 10).map((f, i) =>
        new File([f], `inspection-${quoteId}-${type}-${i + 1}.${f.name.split('.').pop()}`, { type: f.type })
      );
      const results = await utapi.uploadFiles(filesToUpload);
      photoUrls = results
        .filter(r => !r.error && r.data)
        .map(r => r.data!.ufsUrl ?? r.data!.url);
    }

    // Create inspection record
    const [inspection] = await db
      .insert(projectInspections)
      .values({
        quoteId,
        type,
        photoUrls: JSON.stringify(photoUrls),
        adminSignature,
        adminSignedAt: new Date(),
        status: 'PENDING_CLIENT',
      })
      .returning();

    // Send signature request email to client
    await sendInspectionSignatureRequestEmail(
      clientUser.email,
      clientUser.name,
      projectName,
      inspection.id,
      type
    );

    return NextResponse.json({ success: true, inspection });
  } catch (error: any) {
    console.error('POST /api/admin/inspections error:', error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
