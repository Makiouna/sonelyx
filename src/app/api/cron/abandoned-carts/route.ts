import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { sendAbandonedCartEmail } from '@/lib/email';

export async function GET(request: Request) {
  // Check authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const today = new Date();
    // Carts modified/created more than 24 hours ago
    const timeThreshold = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Find quotes with:
    // - status = 'draft'
    // - createdAt < timeThreshold (older than 24 hours)
    // - cartReminderSentAt is null
    const candidates = await db
      .select({
        id: quoteTable.id,
        userId: quoteTable.userId,
        items: quoteTable.items,
        projectName: quoteTable.projectName,
      })
      .from(quoteTable)
      .where(
        and(
          eq(quoteTable.status, 'draft'),
          lt(quoteTable.createdAt, timeThreshold),
          isNull(quoteTable.cartReminderSentAt)
        )
      );

    const sent: string[] = [];
    const errors: string[] = [];

    for (const quote of candidates) {
      try {
        // Fetch user email and name
        const userRows = await db.select().from(userTable).where(eq(userTable.id, quote.userId)).limit(1);
        if (!userRows[0]) continue;

        const clientName = userRows[0].name;
        const clientEmail = userRows[0].email;

        // Parse items to get names and quantities
        let parsedItems: Array<{ name: string; quantity: number }> = [];
        try {
          const itemsData = JSON.parse(quote.items);
          if (Array.isArray(itemsData)) {
            parsedItems = itemsData.map((it: any) => ({
              name: it.name || 'Matériel',
              quantity: it.quantity || 1,
            }));
          }
        } catch (e) {
          console.error(`Failed to parse items for quote ${quote.id}:`, e);
        }

        if (parsedItems.length === 0) continue;

        // Send email
        await sendAbandonedCartEmail(clientEmail, clientName, quote.id, parsedItems);

        // Update database to mark email as sent
        await db
          .update(quoteTable)
          .set({ cartReminderSentAt: new Date(), updatedAt: new Date() })
          .where(eq(quoteTable.id, quote.id));

        sent.push(quote.id);
      } catch (err: any) {
        errors.push(`${quote.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: candidates.length,
      sent,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
