import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { quote as quoteTable, setting as settingTable } from '@/db/schema';
import { getEquipmentWithQuantity } from '@/db/queries';
import { eq, desc } from 'drizzle-orm';

// GET: Returns the logged-in user's quotes
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const quotes = await db
      .select()
      .from(quoteTable)
      .where(eq(quoteTable.userId, session.user.id))
      .orderBy(desc(quoteTable.createdAt));

    // Parse items and strip the raw pdfUrl — client downloads via the /api/quotes/[id]/pdf proxy
    const parsedQuotes = quotes.map(({ pdfUrl, previousVersion, ...q }) => ({
      ...q,
      items: JSON.parse(q.items),
      hasPdf: !!pdfUrl,
      previousVersion: previousVersion ?? null,
    }));

    return NextResponse.json({ success: true, quotes: parsedQuotes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

// POST: Creates a new quote
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié. Veuillez vous connecter.' }, { status: 401 });
    }

    const body = await request.json();
    const { status, startDate, endDate, notes, cart } = body;

    // Validate request inputs
    if (!status || !startDate || !endDate || !cart || typeof cart !== 'object') {
      return NextResponse.json({ success: false, error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    if (!['draft', 'pending'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Statut de devis invalide.' }, { status: 400 });
    }

    const itemIds = Object.keys(cart);
    if (itemIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Le panier est vide.' }, { status: 400 });
    }

    // 1. Fetch current TVA rate and coefficients
    const tvaSetting = await db
      .select()
      .from(settingTable)
      .where(eq(settingTable.id, 'tva_rate'))
      .limit(1);
    const tvaRate = tvaSetting.length > 0 ? Number(tvaSetting[0].value) : 20;

    const coeffWeekendSetting = await db
      .select()
      .from(settingTable)
      .where(eq(settingTable.id, 'coeff_weekend'))
      .limit(1);
    const coeffWeekend = coeffWeekendSetting.length > 0 ? Number(coeffWeekendSetting[0].value) : 1.4;

    const coeff3JoursSetting = await db
      .select()
      .from(settingTable)
      .where(eq(settingTable.id, 'coeff_3jours'))
      .limit(1);
    const coeff3Jours = coeff3JoursSetting.length > 0 ? Number(coeff3JoursSetting[0].value) : 1.8;

    const coeffSemaineSetting = await db
      .select()
      .from(settingTable)
      .where(eq(settingTable.id, 'coeff_semaine'))
      .limit(1);
    const coeffSemaine = coeffSemaineSetting.length > 0 ? Number(coeffSemaineSetting[0].value) : 3.0;

    // 2. Fetch equipment details from DB with calculated quantity
    const equipmentItems = await getEquipmentWithQuantity();
    
    // 3. Construct snapshot items list and calculate daily totals
    let dailyHT = 0;
    let dailyTTC = 0;
    const snapshotItems = [];

    for (const id of itemIds) {
      const eqItem = equipmentItems.find(e => e.id === id);
      if (!eqItem) continue;

      const requestedQty = Number(cart[id]) || 1;
      const finalQty = Math.min(requestedQty, eqItem.quantity); // Clamp to stock limit

      let itemHT = 0;
      let itemTTC = 0;

      if (eqItem.priceType === 'numeric') {
        if (eqItem.priceTax === 'HT') {
          itemHT = eqItem.price * finalQty;
          itemTTC = itemHT * (1 + tvaRate / 100);
        } else {
          itemTTC = eqItem.price * finalQty;
          itemHT = itemTTC / (1 + tvaRate / 100);
        }
      }

      dailyHT += itemHT;
      dailyTTC += itemTTC;

      snapshotItems.push({
        id: eqItem.id,
        name: eqItem.name,
        brand: eqItem.brand,
        catLabel: eqItem.catLabel,
        price: eqItem.price,
        priceType: eqItem.priceType,
        priceTax: eqItem.priceTax,
        quantity: finalQty,
        image: eqItem.image,
      });
    }

    if (snapshotItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun article valide trouvé.' }, { status: 400 });
    }

    // 3.5 Calculate duration coefficient
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    let coeff = 1.0;
    if (durationDays === 2) {
      coeff = coeffWeekend;
    } else if (durationDays === 3) {
      coeff = coeff3Jours;
    } else if (durationDays >= 4 && durationDays <= 6) {
      coeff = durationDays * 0.7;
    } else if (durationDays >= 7) {
      coeff = coeffSemaine * (durationDays / 7);
    }

    // Multiply daily rates by the duration coefficient
    let totalHT = dailyHT * coeff;
    let totalTTC = dailyTTC * coeff;

    // Round totals to 2 decimal places
    totalHT = Math.round(totalHT * 100) / 100;
    totalTTC = Math.round(totalTTC * 100) / 100;

    // 4. Generate random quote id
    const quoteId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // 5. Insert into DB
    await db.insert(quoteTable).values({
      id: quoteId,
      userId: session.user.id,
      status,
      startDate,
      endDate,
      notes: notes || null,
      items: JSON.stringify(snapshotItems),
      totalHT,
      totalTTC,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: status === 'draft' ? 'Devis enregistré en brouillon.' : 'Demande de devis envoyée avec succès.',
      quoteId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
