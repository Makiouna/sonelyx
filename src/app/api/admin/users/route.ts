import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Verify administrator session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    // 2. Fetch users list
    const users = await db.select().from(userTable).orderBy(userTable.createdAt);

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role } = body as { name: string; email: string; password: string; role?: string };

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Nom, email et mot de passe requis.' }, { status: 400 });
    }

    // Create the account server-side (does not touch the admin's own session cookie
    // since we never forward this request's headers/response into signUpEmail).
    const result = await auth.api.signUpEmail({
      body: { name, email, password, rememberMe: false },
    });

    if (role === 'admin') {
      await db.update(userTable).set({ role: 'admin', updatedAt: new Date() }).where(eq(userTable.id, result.user.id));
    }

    const [createdUser] = await db.select().from(userTable).where(eq(userTable.id, result.user.id)).limit(1);

    return NextResponse.json({ success: true, user: createdUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.body?.message || error.message || String(error) }, { status: 400 });
  }
}
