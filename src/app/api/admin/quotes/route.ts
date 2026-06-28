import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Verify administrator session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès interdit.' }, { status: 403 });
    }

    // 2. Fetch all quotes with user details
    const quotes = await db
      .select({
        id: quoteTable.id,
        userId: quoteTable.userId,
        status: quoteTable.status,
        docType: quoteTable.docType,
        linkedDevisId: quoteTable.linkedDevisId,
        startDate: quoteTable.startDate,
        endDate: quoteTable.endDate,
        notes: quoteTable.notes,
        items: quoteTable.items,
        totalHT: quoteTable.totalHT,
        totalTTC: quoteTable.totalTTC,
        pdfUrl: quoteTable.pdfUrl,
        discount: quoteTable.discount,
        createdAt: quoteTable.createdAt,
        updatedAt: quoteTable.updatedAt,
        userName: userTable.name,
        userEmail: userTable.email,
      })
      .from(quoteTable)
      .innerJoin(userTable, eq(quoteTable.userId, userTable.id))
      .orderBy(desc(quoteTable.createdAt));

    // 3. Parse JSON items
    const parsedQuotes = quotes.map((q) => ({
      ...q,
      items: JSON.parse(q.items),
    }));

    return NextResponse.json({ success: true, quotes: parsedQuotes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
