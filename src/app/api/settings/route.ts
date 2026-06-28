import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { setting as settingTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function getOrInitSetting(key: string, defaultValue: string): Promise<string> {
  const existing = await db.select().from(settingTable).where(eq(settingTable.id, key)).limit(1);
  if (existing.length === 0) {
    await db.insert(settingTable).values({ id: key, value: defaultValue, updatedAt: new Date() });
    return defaultValue;
  }
  return existing[0].value;
}

export async function GET() {
  try {
    const [tvaRate, coeffWeekend, coeff3Jours, coeffSemaine, iban, bic, paymentInstructions] = await Promise.all([
      getOrInitSetting('tva_rate', '20'),
      getOrInitSetting('coeff_weekend', '1.4'),
      getOrInitSetting('coeff_3jours', '1.8'),
      getOrInitSetting('coeff_semaine', '3.0'),
      getOrInitSetting('payment_iban', ''),
      getOrInitSetting('payment_bic', ''),
      getOrInitSetting('payment_instructions', ''),
    ]);

    return NextResponse.json({
      success: true,
      tvaRate: Number(tvaRate) || 20,
      coeffWeekend: Number(coeffWeekend) || 1.4,
      coeff3Jours: Number(coeff3Jours) || 1.8,
      coeffSemaine: Number(coeffSemaine) || 3.0,
      iban,
      bic,
      paymentInstructions,
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
    const { tvaRate, coeffWeekend, coeff3Jours, coeffSemaine, iban, bic, paymentInstructions } = body;

    const upsertSetting = async (key: string, val: string) => {
      const existing = await db.select().from(settingTable).where(eq(settingTable.id, key)).limit(1);
      if (existing.length === 0) {
        await db.insert(settingTable).values({ id: key, value: val, updatedAt: new Date() });
      } else {
        await db.update(settingTable).set({ value: val, updatedAt: new Date() }).where(eq(settingTable.id, key));
      }
    };

    const ops: Promise<void>[] = [];
    if (tvaRate !== undefined && !isNaN(Number(tvaRate))) ops.push(upsertSetting('tva_rate', String(tvaRate)));
    if (coeffWeekend !== undefined && !isNaN(Number(coeffWeekend))) ops.push(upsertSetting('coeff_weekend', String(coeffWeekend)));
    if (coeff3Jours !== undefined && !isNaN(Number(coeff3Jours))) ops.push(upsertSetting('coeff_3jours', String(coeff3Jours)));
    if (coeffSemaine !== undefined && !isNaN(Number(coeffSemaine))) ops.push(upsertSetting('coeff_semaine', String(coeffSemaine)));
    if (iban !== undefined) ops.push(upsertSetting('payment_iban', String(iban)));
    if (bic !== undefined) ops.push(upsertSetting('payment_bic', String(bic)));
    if (paymentInstructions !== undefined) ops.push(upsertSetting('payment_instructions', String(paymentInstructions)));

    await Promise.all(ops);

    return NextResponse.json({ success: true, message: 'Paramètres mis à jour avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
