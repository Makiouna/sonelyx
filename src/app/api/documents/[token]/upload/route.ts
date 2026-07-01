import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentRequests, customerDocuments, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '@/lib/supabase-admin';
import { sendDocumentsReceivedAdminEmail } from '@/lib/email';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const [req] = await db.select().from(documentRequests).where(eq(documentRequests.token, token)).limit(1);
  if (!req || req.status === 'COMPLETED' || new Date() > req.expiresAt) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 410 });
  }

  const formData = await request.formData();
  const requestedTypes: string[] = JSON.parse(req.requestedTypes);
  const uploadedTypes: string[] = [];
  const insertedDocs: { documentType: string; filePath: string }[] = [];

  for (const docType of requestedTypes) {
    const file = formData.get(docType) as File | null;
    if (!file || file.size === 0) continue;

    const ext = file.name.split('.').pop() ?? 'bin';
    const filePath = `customers/${req.customerId}/${docType}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      console.error(`Supabase upload error for ${docType}:`, error);
      return NextResponse.json({ success: false, error: `Upload failed for ${docType}` }, { status: 500 });
    }

    insertedDocs.push({ documentType: docType, filePath });
    uploadedTypes.push(docType);
  }

  if (!uploadedTypes.length) {
    return NextResponse.json({ success: false, error: 'No files received' }, { status: 400 });
  }

  await db.insert(customerDocuments).values(
    insertedDocs.map(d => ({
      customerId: req.customerId,
      requestId: req.id,
      documentType: d.documentType,
      filePath: d.filePath,
    }))
  );

  await db.update(documentRequests)
    .set({ status: 'COMPLETED' })
    .where(eq(documentRequests.id, req.id));

  // Notify admin (non-blocking — upload succeeds even if email fails)
  try {
    const [client] = await db.select().from(user).where(eq(user.id, req.customerId)).limit(1);
    const adminUsers = await db.select().from(user).where(eq(user.role, 'admin'));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonelyx.fr';
    for (const admin of adminUsers) {
      await sendDocumentsReceivedAdminEmail(
        admin.email,
        client?.name ?? '',
        client?.email ?? '',
        uploadedTypes,
        `${appUrl}/admin/client/${req.customerId}`,
      );
    }
  } catch (err) {
    console.error('Failed to send admin notification email:', err);
  }

  return NextResponse.json({ success: true });
}
