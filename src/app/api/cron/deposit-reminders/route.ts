import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quote as quoteTable, user as userTable } from '@/db/schema';
import { eq, and, isNotNull, isNull } from 'drizzle-orm';
import { resend } from '@/lib/resend';
import { buildDepositReminderEmail } from '@/lib/email-templates/deposit-reminder';

// Secured by CRON_SECRET header — set this in your cron service (Vercel Cron, cron-job.org, etc.)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const today = new Date();
  // Target: events starting in exactly 3 days
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + 3);
  const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

  // Find all devis (not facture/avoir/contrat) with:
  // - depositAmount set
  // - depositStatus = 'PENDING'
  // - startDate matching J+3
  // - reminder not already sent today
  const candidates = await db
    .select({
      id: quoteTable.id,
      userId: quoteTable.userId,
      startDate: quoteTable.startDate,
      endDate: quoteTable.endDate,
      depositAmount: quoteTable.depositAmount,
      depositReminderSentAt: quoteTable.depositReminderSentAt,
    })
    .from(quoteTable)
    .where(
      and(
        eq(quoteTable.docType, 'devis'),
        eq(quoteTable.depositStatus, 'PENDING'),
        isNotNull(quoteTable.depositAmount),
        eq(quoteTable.startDate, targetDateStr),
      )
    );

  const sent: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const quote of candidates) {
    // Skip if a reminder was already sent today
    if (quote.depositReminderSentAt) {
      const sentDay = quote.depositReminderSentAt.toISOString().split('T')[0];
      if (sentDay === today.toISOString().split('T')[0]) {
        skipped.push(quote.id);
        continue;
      }
    }

    try {
      // Fetch client email
      const userRows = await db.select().from(userTable).where(eq(userTable.id, quote.userId)).limit(1);
      if (!userRows[0]) continue;

      const clientName = userRows[0].name;
      const clientEmail = userRows[0].email;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonelyx.fr';
      const depositLink = `${appUrl}/profil`;

      const { html, subject } = buildDepositReminderEmail({
        clientName,
        depositAmount: quote.depositAmount!,
        eventDate: quote.startDate,
        depositLink,
        quoteId: quote.id,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
        to: clientEmail,
        subject,
        html,
      });

      // Record that the reminder was sent
      await db
        .update(quoteTable)
        .set({ depositReminderSentAt: new Date(), updatedAt: new Date() })
        .where(eq(quoteTable.id, quote.id));

      sent.push(quote.id);
    } catch (err: any) {
      errors.push(`${quote.id}: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    targetDate: targetDateStr,
    sent,
    skipped,
    errors,
  });
}
