import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { setting as settingTable } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Helper to fetch/create key-value settings with fallbacks
async function getOrInitSetting(key: string, defaultValue: string): Promise<string> {
  const existing = await db
    .select()
    .from(settingTable)
    .where(eq(settingTable.id, key))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(settingTable).values({
      id: key,
      value: defaultValue,
      updatedAt: new Date(),
    });
    return defaultValue;
  }
  return existing[0].value;
}

export async function GET() {
  try {
    // Fetch settings or initialize defaults
    const tvaRate = await getOrInitSetting('tva_rate', '20');
    const coeffWeekend = await getOrInitSetting('coeff_weekend', '1.4');
    const coeff3Jours = await getOrInitSetting('coeff_3jours', '1.8');
    const coeffSemaine = await getOrInitSetting('coeff_semaine', '3.0');

    return NextResponse.json({
      success: true,
      tvaRate: Number(tvaRate) || 20,
      coeffWeekend: Number(coeffWeekend) || 1.4,
      coeff3Jours: Number(coeff3Jours) || 1.8,
      coeffSemaine: Number(coeffSemaine) || 3.0,
    });
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
    const { tvaRate, coeffWeekend, coeff3Jours, coeffSemaine } = body;

    // Helper to upsert a setting key-value pair
    const upsertSetting = async (key: string, val: string) => {
      const existing = await db
        .select()
        .from(settingTable)
        .where(eq(settingTable.id, key))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(settingTable).values({
          id: key,
          value: val,
          updatedAt: new Date(),
        });
      } else {
        await db
          .update(settingTable)
          .set({
            value: val,
            updatedAt: new Date(),
          })
          .where(eq(settingTable.id, key));
      }
    };

    if (tvaRate !== undefined && !isNaN(Number(tvaRate))) {
      await upsertSetting('tva_rate', String(tvaRate));
    }
    if (coeffWeekend !== undefined && !isNaN(Number(coeffWeekend))) {
      await upsertSetting('coeff_weekend', String(coeffWeekend));
    }
    if (coeff3Jours !== undefined && !isNaN(Number(coeff3Jours))) {
      await upsertSetting('coeff_3jours', String(coeff3Jours));
    }
    if (coeffSemaine !== undefined && !isNaN(Number(coeffSemaine))) {
      await upsertSetting('coeff_semaine', String(coeffSemaine));
    }

    return NextResponse.json({ success: true, message: 'Paramètres mis à jour avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
