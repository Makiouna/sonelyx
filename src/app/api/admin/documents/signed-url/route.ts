import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const { filePath } = await request.json() as { filePath: string };
  if (!filePath) {
    return NextResponse.json({ success: false, error: 'Missing filePath' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ success: false, error: error?.message ?? 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.json({ success: true, signedUrl: data.signedUrl });
}
