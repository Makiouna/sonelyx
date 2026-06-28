import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { category as categoryTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    let items = await db.select().from(categoryTable);

    // Auto-seed default categories if empty
    if (items.length === 0) {
      console.log('Database category table is empty. Seeding default categories...');
      const defaults = [
        { id: 'diffusion', label: 'Diffusion' },
        { id: 'eclairage', label: 'Éclairage' },
        { id: 'regie', label: 'Régie' },
        { id: 'structure', label: 'Structure' },
        { id: 'energie', label: 'Énergie' },
      ];
      await db.insert(categoryTable).values(defaults);
      items = await db.select().from(categoryTable);
    }

    return NextResponse.json({ success: true, categories: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify administrator session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { label } = body;

    if (!label) {
      return NextResponse.json({ success: false, error: 'Libellé de catégorie requis.' }, { status: 400 });
    }

    // 3. Generate id/slug
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if category already exists
    const existing = await db.select().from(categoryTable).where(eq(categoryTable.id, id)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'Cette catégorie existe déjà.' }, { status: 400 });
    }

    // 4. Insert into database
    await db.insert(categoryTable).values({ id, label });

    return NextResponse.json({ success: true, category: { id, label } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
