import { eq, sql, inArray } from 'drizzle-orm';
import { db } from './index';
import { equipment, productItems, category, setting, packCompositions } from './schema';

/**
 * Fetches all equipment items, joining with the product_items table
 * to compute the active quantity dynamically.
 * Active quantity counts all items whose status is not 'MAINTENANCE'.
 */
export async function getEquipmentWithQuantity() {
  const itemStatsSubquery = db
    .select({
      productId: productItems.productId,
      count: sql<number>`count(*)::integer`.as('count'),
      unassignedQrCount: sql<number>`count(CASE WHEN ${productItems.qrCodeId} IS NULL THEN 1 END)::integer`.as('unassigned_qr_count'),
    })
    .from(productItems)
    .where(sql`${productItems.status} != 'MAINTENANCE'`)
    .groupBy(productItems.productId)
    .as('item_stats');

  const result = await db
    .select({
      id: equipment.id,
      slug: equipment.slug,
      cat: equipment.cat,
      catLabel: equipment.catLabel,
      brand: equipment.brand,
      name: equipment.name,
      desc: equipment.desc,
      specs: equipment.specs,
      price: equipment.price,
      priceType: equipment.priceType,
      priceTax: equipment.priceTax,
      purchasePrice: equipment.purchasePrice,
      image: equipment.image,
      quantity: sql<number>`COALESCE(${itemStatsSubquery.count}, 0)`.mapWith(Number),
      unassignedQrCount: sql<number>`COALESCE(${itemStatsSubquery.unassignedQrCount}, 0)`.mapWith(Number),
      isPack: equipment.isPack,
    })
    .from(equipment)
    .leftJoin(itemStatsSubquery, eq(equipment.id, itemStatsSubquery.productId));

  return result;
}

/**
 * Fetches a single equipment item by ID, computing its active quantity dynamically.
 */
export async function getEquipmentItemWithQuantity(id: string) {
  const activeCountSubquery = db
    .select({
      productId: productItems.productId,
      count: sql<number>`count(*)::integer`.as('count'),
    })
    .from(productItems)
    .where(sql`${productItems.status} != 'MAINTENANCE'`)
    .groupBy(productItems.productId)
    .as('active_counts');

  const result = await db
    .select({
      id: equipment.id,
      slug: equipment.slug,
      cat: equipment.cat,
      catLabel: equipment.catLabel,
      brand: equipment.brand,
      name: equipment.name,
      desc: equipment.desc,
      specs: equipment.specs,
      price: equipment.price,
      priceType: equipment.priceType,
      priceTax: equipment.priceTax,
      purchasePrice: equipment.purchasePrice,
      image: equipment.image,
      quantity: sql<number>`COALESCE(${activeCountSubquery.count}, 0)`.mapWith(Number),
      isPack: equipment.isPack,
    })
    .from(equipment)
    .leftJoin(activeCountSubquery, eq(equipment.id, activeCountSubquery.productId))
    .where(eq(equipment.id, id))
    .limit(1);

  return result;
}

/**
 * Generates a unique 7-digit QR code identifier.
 */
export async function generateUniqueQrCode(): Promise<string> {
  while (true) {
    const code = Math.floor(1000000 + Math.random() * 9000000).toString(); // 7 digits
    const conflict = await db.select().from(productItems).where(eq(productItems.qrCodeId, code)).limit(1);
    if (conflict.length === 0) {
      return code;
    }
  }
}

/**
 * Synchronizes physical product items count with targetQuantity by adding or deleting AVAILABLE ones.
 */
export async function syncProductItems(productId: string, targetQuantity: number) {
  // 1. Get current items
  const existingItems = await db
    .select()
    .from(productItems)
    .where(eq(productItems.productId, productId));

  // 2. Get equipment name for item name generation
  const [eqItem] = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, productId))
    .limit(1);
  const nameBase = eqItem ? eqItem.name : 'Matériel';

  const currentCount = existingItems.length;

  if (currentCount < targetQuantity) {
    // We need to add items
    const toAdd = targetQuantity - currentCount;
    const itemsToAdd = [];

    // Find the highest sequence index from names like "[Name] [Index]"
    let maxIndex = 0;
    for (const item of existingItems) {
      const match = item.itemName.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxIndex) maxIndex = num;
      }
    }
    if (maxIndex === 0) {
      maxIndex = currentCount;
    }

    for (let i = 1; i <= toAdd; i++) {
      const qrCode = await generateUniqueQrCode();
      itemsToAdd.push({
        productId,
        itemName: `${nameBase} ${maxIndex + i}`,
        qrCodeId: qrCode,
        status: 'AVAILABLE' as const,
      });
    }

    if (itemsToAdd.length > 0) {
      await db.insert(productItems).values(itemsToAdd);
    }
  } else if (currentCount > targetQuantity) {
    // We need to remove items
    const toRemove = currentCount - targetQuantity;
    
    // Priority is to delete AVAILABLE items (we shouldn't delete active RENTED/MAINTENANCE ones)
    const availableItems = existingItems.filter(item => item.status === 'AVAILABLE');
    const itemsToDelete = availableItems.slice(0, Math.min(toRemove, availableItems.length));
    
    if (itemsToDelete.length > 0) {
      await db.delete(productItems).where(
        inArray(
          productItems.id,
          itemsToDelete.map(item => item.id)
        )
      );
    }
  }
}

/**
 * Fetches a single equipment item by its SEO slug (e.g. "location-kara-ii-orleans").
 */
export async function getEquipmentBySlug(slug: string) {
  const activeCountSubquery = db
    .select({
      productId: productItems.productId,
      count: sql<number>`count(*)::integer`.as('count'),
    })
    .from(productItems)
    .where(sql`${productItems.status} != 'MAINTENANCE'`)
    .groupBy(productItems.productId)
    .as('active_counts');

  const result = await db
    .select({
      id: equipment.id,
      slug: equipment.slug,
      cat: equipment.cat,
      catLabel: equipment.catLabel,
      brand: equipment.brand,
      name: equipment.name,
      desc: equipment.desc,
      specs: equipment.specs,
      price: equipment.price,
      priceType: equipment.priceType,
      priceTax: equipment.priceTax,
      image: equipment.image,
      quantity: sql<number>`COALESCE(${activeCountSubquery.count}, 0)`.mapWith(Number),
      isPack: equipment.isPack,
    })
    .from(equipment)
    .leftJoin(activeCountSubquery, eq(equipment.id, activeCountSubquery.productId))
    .where(sql`COALESCE(${equipment.slug}, 'location-' || ${equipment.id} || '-orleans') = ${slug}`)
    .limit(1);

  return result[0] ?? null;
}

/**
 * Fetches all equipment categories, used for catalogue filters.
 */
export async function getCategories() {
  return db.select().from(category);
}

/**
 * Fetches the public catalogue: equipment with parsed specs, TVA-adjusted
 * pricing and pack-corrected stock, stripped of internal fields (purchasePrice).
 * Used by public Server Components (accueil, catalogue) that render on the server.
 */
export async function getPublicEquipmentList() {
  const items = await getEquipmentWithQuantity();

  const tvaSetting = await db.select().from(setting).where(eq(setting.id, 'tva_rate')).limit(1);
  const tvaRate = tvaSetting.length > 0 ? Number(tvaSetting[0].value) : 20;

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

  return items.map((item) => {
    const specs = JSON.parse(item.specs) as string[];

    let effectiveQuantity = item.quantity;
    if (item.isPack) {
      const comps = packCompMap[item.id];
      effectiveQuantity = !comps || comps.length === 0
        ? 0
        : Math.min(...comps.map((c) => Math.floor((componentQtyMap[c.componentId] ?? 0) / c.quantityNeeded)));
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

    return {
      id: item.id,
      slug: item.slug ?? `location-${item.id}-orleans`,
      cat: item.cat,
      catLabel: item.catLabel,
      brand: item.brand,
      name: item.name,
      desc: item.desc,
      specs,
      price: item.price,
      priceType: item.priceType as 'numeric' | 'on_request',
      priceTax: item.priceTax as 'HT' | 'TTC',
      priceHT,
      priceTTC,
      image: item.image,
      quantity: effectiveQuantity,
      isPack: item.isPack,
    };
  });
}

/**
 * Fetches the name and technical characteristics of an equipment item,
 * used to feed the "Expert Produit" AI assistant's system prompt.
 */
export async function getProductSpecs(productId: string) {
  const result = await db
    .select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      catLabel: equipment.catLabel,
      desc: equipment.desc,
      specs: equipment.specs,
    })
    .from(equipment)
    .where(eq(equipment.id, productId))
    .limit(1);

  const item = result[0];
  if (!item) return null;

  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    catLabel: item.catLabel,
    desc: item.desc,
    specs: JSON.parse(item.specs) as string[],
  };
}
