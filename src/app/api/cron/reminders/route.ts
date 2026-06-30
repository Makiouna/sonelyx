import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quote as quoteTable, user as userTable, systemSettings as systemSettingsTable } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { sendPickupReminderEmail, sendReturnReminderEmail } from '@/lib/email';

const DEFAULT_COLLECTION_TEXT = `Bonjour {client_name},

Votre matériel pour le projet "{project_name}" est prêt à être retiré ! Nous vous attendons le {date} à partir de {time}.

Adresse de l'entrepôt : 45000 Orléans, France.

Merci de vous munir d'une pièce d'identité et du contrat signé.`;

const DEFAULT_RETURN_TEXT = `Bonjour {client_name},

Nous vous rappelons que le retour du matériel loué pour le projet "{project_name}" est prévu pour le {date} avant {time}.

Consignes importantes pour le retour :
- Matériel propre et rangé dans ses flight cases d'origine.
- Câbles enroulés et attachés.
- Respect strict des horaires pour éviter toute pénalité de retard.

Merci et à très vite !`;

export async function GET(request: Request) {
  // Check authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const today = new Date();
    // Calculate date for tomorrow (J+1)
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Fetch system email templates
    const emailSettings = await db
      .select()
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.id, 'default'))
      .limit(1);

    const collectionTemplate = emailSettings[0]?.emailCollectionText || DEFAULT_COLLECTION_TEXT;
    const returnTemplate = emailSettings[0]?.emailReturnText || DEFAULT_RETURN_TEXT;

    const sentPickups: string[] = [];
    const sentReturns: string[] = [];
    const errors: string[] = [];

    // 2. Target Pickups (J-1): validated quotes where startDate is tomorrow and pickupReminderSentAt is null
    const pickupCandidates = await db
      .select({
        id: quoteTable.id,
        userId: quoteTable.userId,
        projectName: quoteTable.projectName,
        startDate: quoteTable.startDate,
      })
      .from(quoteTable)
      .where(
        and(
          inArray(quoteTable.status, ['validated', 'pdf_pending']),
          eq(quoteTable.startDate, tomorrowStr),
          isNull(quoteTable.pickupReminderSentAt)
        )
      );

    for (const quote of pickupCandidates) {
      try {
        const userRows = await db.select().from(userTable).where(eq(userTable.id, quote.userId)).limit(1);
        if (!userRows[0]) continue;

        const clientName = userRows[0].name;
        const clientEmail = userRows[0].email;
        const projectName = quote.projectName || 'Votre Projet';

        await sendPickupReminderEmail(
          clientEmail,
          clientName,
          projectName,
          quote.startDate,
          '09:00', // default time
          collectionTemplate
        );

        await db
          .update(quoteTable)
          .set({ pickupReminderSentAt: new Date(), updatedAt: new Date() })
          .where(eq(quoteTable.id, quote.id));

        sentPickups.push(quote.id);
      } catch (err: any) {
        errors.push(`Pickup #${quote.id}: ${err.message}`);
      }
    }

    // 3. Target Returns (J-1): validated quotes where endDate is tomorrow and returnReminderSentAt is null
    const returnCandidates = await db
      .select({
        id: quoteTable.id,
        userId: quoteTable.userId,
        projectName: quoteTable.projectName,
        endDate: quoteTable.endDate,
      })
      .from(quoteTable)
      .where(
        and(
          inArray(quoteTable.status, ['validated', 'pdf_pending']),
          eq(quoteTable.endDate, tomorrowStr),
          isNull(quoteTable.returnReminderSentAt)
        )
      );

    for (const quote of returnCandidates) {
      try {
        const userRows = await db.select().from(userTable).where(eq(userTable.id, quote.userId)).limit(1);
        if (!userRows[0]) continue;

        const clientName = userRows[0].name;
        const clientEmail = userRows[0].email;
        const projectName = quote.projectName || 'Votre Projet';

        await sendReturnReminderEmail(
          clientEmail,
          clientName,
          projectName,
          quote.endDate,
          '18:00', // default return time
          returnTemplate
        );

        await db
          .update(quoteTable)
          .set({ returnReminderSentAt: new Date(), updatedAt: new Date() })
          .where(eq(quoteTable.id, quote.id));

        sentReturns.push(quote.id);
      } catch (err: any) {
        errors.push(`Return #${quote.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      tomorrow: tomorrowStr,
      pickupsProcessed: pickupCandidates.length,
      pickupsSent: sentPickups,
      returnsProcessed: returnCandidates.length,
      returnsSent: sentReturns,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
