import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { setting as settingTable, systemSettings as systemSettingsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

async function getOrInitSetting(key: string, defaultValue: string): Promise<string> {
  const existing = await db.select().from(settingTable).where(eq(settingTable.id, key)).limit(1);
  if (existing.length === 0) {
    await db.insert(settingTable).values({ id: key, value: defaultValue, updatedAt: new Date() });
    return defaultValue;
  }
  return existing[0].value;
}

async function getOrInitEmailSettings() {
  const existing = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, 'default')).limit(1);
  if (existing.length === 0) {
    const row = {
      id: 'default',
      emailCollectionText: DEFAULT_COLLECTION_TEXT,
      emailReturnText: DEFAULT_RETURN_TEXT,
      updatedAt: new Date(),
    };
    await db.insert(systemSettingsTable).values(row);
    return row;
  }
  return existing[0];
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const isAdmin = session?.user && (session.user as any).role === 'admin';

    // Pricing coefficients are public (needed for unauthenticated cart display)
    const [tvaRate, coeffWeekend, coeff3Jours, coeffSemaine] = await Promise.all([
      getOrInitSetting('tva_rate', '20'),
      getOrInitSetting('coeff_weekend', '1.4'),
      getOrInitSetting('coeff_3jours', '1.8'),
      getOrInitSetting('coeff_semaine', '3.0'),
    ]);

    const publicResponse = {
      success: true,
      tvaRate: Number(tvaRate) || 20,
      coeffWeekend: Number(coeffWeekend) || 1.4,
      coeff3Jours: Number(coeff3Jours) || 1.8,
      coeffSemaine: Number(coeffSemaine) || 3.0,
    };

    // IBAN/BIC/payment instructions are only for authenticated users
    if (!session?.user) {
      return NextResponse.json(publicResponse);
    }

    const [iban, bic, paymentInstructions] = await Promise.all([
      getOrInitSetting('payment_iban', ''),
      getOrInitSetting('payment_bic', ''),
      getOrInitSetting('payment_instructions', ''),
    ]);

    // Email templates are admin-only
    if (!isAdmin) {
      return NextResponse.json({ ...publicResponse, iban, bic, paymentInstructions });
    }

    const emailSettings = await getOrInitEmailSettings();

    return NextResponse.json({
      ...publicResponse,
      iban,
      bic,
      paymentInstructions,
      emailCollectionText: emailSettings.emailCollectionText,
      emailReturnText: emailSettings.emailReturnText,
    });
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
    const {
      tvaRate,
      coeffWeekend,
      coeff3Jours,
      coeffSemaine,
      iban,
      bic,
      paymentInstructions,
      emailCollectionText,
      emailReturnText,
    } = body;

    const upsertSetting = async (key: string, val: string) => {
      const existing = await db.select().from(settingTable).where(eq(settingTable.id, key)).limit(1);
      if (existing.length === 0) {
        await db.insert(settingTable).values({ id: key, value: val, updatedAt: new Date() });
      } else {
        await db.update(settingTable).set({ value: val, updatedAt: new Date() }).where(eq(settingTable.id, key));
      }
    };

    const ops: Promise<void | any>[] = [];
    if (tvaRate !== undefined && !isNaN(Number(tvaRate))) ops.push(upsertSetting('tva_rate', String(tvaRate)));
    if (coeffWeekend !== undefined && !isNaN(Number(coeffWeekend))) ops.push(upsertSetting('coeff_weekend', String(coeffWeekend)));
    if (coeff3Jours !== undefined && !isNaN(Number(coeff3Jours))) ops.push(upsertSetting('coeff_3jours', String(coeff3Jours)));
    if (coeffSemaine !== undefined && !isNaN(Number(coeffSemaine))) ops.push(upsertSetting('coeff_semaine', String(coeffSemaine)));
    if (iban !== undefined) ops.push(upsertSetting('payment_iban', String(iban)));
    if (bic !== undefined) ops.push(upsertSetting('payment_bic', String(bic)));
    if (paymentInstructions !== undefined) ops.push(upsertSetting('payment_instructions', String(paymentInstructions)));

    if (emailCollectionText !== undefined || emailReturnText !== undefined) {
      const updateEmailSettings = async () => {
        const existing = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, 'default')).limit(1);
        const updates: any = { updatedAt: new Date() };
        if (emailCollectionText !== undefined) updates.emailCollectionText = String(emailCollectionText);
        if (emailReturnText !== undefined) updates.emailReturnText = String(emailReturnText);

        if (existing.length === 0) {
          await db.insert(systemSettingsTable).values({
            id: 'default',
            emailCollectionText: emailCollectionText !== undefined ? String(emailCollectionText) : DEFAULT_COLLECTION_TEXT,
            emailReturnText: emailReturnText !== undefined ? String(emailReturnText) : DEFAULT_RETURN_TEXT,
            updatedAt: new Date(),
          });
        } else {
          await db.update(systemSettingsTable).set(updates).where(eq(systemSettingsTable.id, 'default'));
        }
      };
      ops.push(updateEmailSettings());
    }

    await Promise.all(ops);

    return NextResponse.json({ success: true, message: 'Paramètres mis à jour avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
