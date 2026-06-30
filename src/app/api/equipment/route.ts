import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { equipment as equipmentTable, productItems as productItemsTable, setting as settingTable, packCompositions } from '@/db/schema';
import { getEquipmentWithQuantity, syncProductItems } from '@/db/queries';
import { eq } from 'drizzle-orm';
import { CATALOGUE } from '@/lib/catalogue-data';

export async function GET() {
  try {
    // 1. Fetch items from database with calculated quantity
    let items = await getEquipmentWithQuantity();

    // 2. Auto-seed if the table is empty
    if (items.length === 0) {
      console.log('Database equipment table is empty. Seeding default items...');
      
      // Default prices and quantities for seeding
      const seededCatalogue = CATALOGUE.map((item) => {
        // Base rental prices on gear types
        let price = 50;
        let purchasePrice = 1200;
        let quantity = 4;

        if (item.cat === 'diffusion') {
          price = item.brand.includes('L-Acoustics') ? 180 : (item.brand.includes('d&b') ? 140 : 90);
          purchasePrice = price * 12;
          quantity = 6;
        } else if (item.cat === 'eclairage') {
          price = item.brand.includes('Robe') ? 120 : (item.brand.includes('Martin') ? 80 : 50);
          purchasePrice = price * 15;
          quantity = 8;
        } else if (item.cat === 'regie') {
          price = item.brand.includes('Pioneer') ? 150 : (item.brand.includes('Allen') ? 250 : 100);
          purchasePrice = price * 18;
          quantity = 2;
        } else if (item.cat === 'structure') {
          price = 30;
          purchasePrice = 350;
          quantity = 12;
        } else if (item.cat === 'energie') {
          price = item.brand.includes('Gen') ? 220 : 60;
          purchasePrice = price * 14;
          quantity = 3;
        }

        return {
          id: item.id,
          cat: item.cat,
          catLabel: item.catLabel,
          brand: item.brand,
          name: item.name,
          desc: item.desc,
          specs: JSON.stringify(item.specs),
          price: price,
          priceType: 'numeric',
          priceTax: 'HT',
          purchasePrice: purchasePrice,
          initialQty: quantity,
          image: null,
        };
      });

      // Insert equipment items (without initialQty)
      await db.insert(equipmentTable).values(seededCatalogue.map(({ initialQty, ...rest }) => rest));

      // Seed product items for each seeded equipment
      for (const item of seededCatalogue) {
        await syncProductItems(item.id, item.initialQty);
      }

      items = await getEquipmentWithQuantity();
    }

    // 2.5 Fetch dynamic TVA rate
    const tvaSetting = await db
      .select()
      .from(settingTable)
      .where(eq(settingTable.id, 'tva_rate'))
      .limit(1);
    const tvaRate = tvaSetting.length > 0 ? Number(tvaSetting[0].value) : 20;

    // 3. Check if requester is administrator
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const isAdmin = session?.user && (session.user as any).role === 'admin';

    // 3.5 Compute pack quantities from component stock
    const componentQtyMap: Record<string, number> = {};
    for (const item of items) {
      if (!item.isPack) componentQtyMap[item.id] = item.quantity;
    }

    const allCompositions = await db.select().from(packCompositions);
    const packCompMap: Record<string, Array<{ componentId: string; quantityNeeded: number }>> = {};
    for (const row of allCompositions) {
      if (!packCompMap[row.packProductId]) packCompMap[row.packProductId] = [];
      packCompMap[row.packProductId].push({ componentId: row.componentProductId, quantityNeeded: row.quantityNeeded });
    }

    // 4. Return items (sanitize purchasePrice if not admin)
    const sanitizedItems = items.map((item) => {
      const parsedSpecs = JSON.parse(item.specs);

      // For packs: quantity = min(floor(componentStock / quantityNeeded))
      let effectiveQuantity = item.quantity;
      if (item.isPack) {
        const comps = packCompMap[item.id];
        if (!comps || comps.length === 0) {
          effectiveQuantity = 0;
        } else {
          effectiveQuantity = Math.min(...comps.map(c => Math.floor((componentQtyMap[c.componentId] ?? 0) / c.quantityNeeded)));
        }
      }

      let priceHT = item.price;
      let priceTTC = item.price;

      if (item.priceType === 'numeric') {
        if (item.priceTax === 'HT') {
          priceTTC = Math.round(item.price * (1 + tvaRate / 100) * 100) / 100;
        } else {
          priceHT = Math.round((item.price / (1 + tvaRate / 100)) * 100) / 100;
        }
      }

      const slug = item.slug ?? `location-${item.id}-orleans`;

      if (isAdmin) {
        return {
          ...item,
          slug,
          quantity: effectiveQuantity,
          priceHT,
          priceTTC,
          specs: parsedSpecs,
        };
      } else {
        const { purchasePrice, ...publicItem } = item;
        return {
          ...publicItem,
          slug,
          quantity: effectiveQuantity,
          priceHT,
          priceTTC,
          specs: parsedSpecs,
        };
      }
    });

    return NextResponse.json({ success: true, items: sanitizedItems, tvaRate });
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
    const { name, brand, cat, desc, specs, price, priceType, priceTax, purchasePrice, items, image, isPack, compositions } = body;

    if (!name || !brand || !cat || !desc || !specs) {
      return NextResponse.json({ success: false, error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    // 3. Generate id + SEO slug
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `location-${id}-orleans`;

    // Check if ID already exists
    const existing = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'Un équipement avec ce nom existe déjà.' }, { status: 400 });
    }

    // Map category to category labels
    const catLabels: Record<string, string> = {
      diffusion: 'DIFFUSION',
      eclairage: 'ÉCLAIRAGE',
      regie: 'RÉGIE',
      structure: 'STRUCTURE',
      energie: 'ÉNERGIE',
    };
    const catLabel = catLabels[cat] || 'MATÉRIEL';

    // 4. Insert into database
    await db.insert(equipmentTable).values({
      id,
      slug,
      cat,
      catLabel,
      brand,
      name,
      desc,
      specs: JSON.stringify(specs || []),
      price: Number(price) || 0,
      priceType: priceType || 'numeric',
      priceTax: priceTax || 'HT',
      purchasePrice: Number(purchasePrice) || 0,
      image: image || null,
      isPack: !!isPack,
    });

    if (isPack) {
      // 5a. Pack: insert compositions (no physical items)
      const compsArray: Array<{ componentProductId: string; quantityNeeded: number }> = Array.isArray(compositions) ? compositions : [];
      if (compsArray.length > 0) {
        await db.insert(packCompositions).values(
          compsArray.map(c => ({
            packProductId: id,
            componentProductId: c.componentProductId,
            quantityNeeded: Math.max(1, c.quantityNeeded),
          }))
        );
      }
    } else {
      // 5b. Regular product: create physical items with optional QR codes
      const itemsArray: { qrCodeId?: string | null }[] = Array.isArray(items) ? items : [];
      if (itemsArray.length > 0) {
        await db.insert(productItemsTable).values(
          itemsArray.map((item, i) => ({
            productId: id,
            itemName: `${name} ${i + 1}`,
            qrCodeId: item.qrCodeId || null,
            status: 'AVAILABLE' as const,
          }))
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Équipement ajouté au catalogue.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
