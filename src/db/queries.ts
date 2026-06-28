import { eq, sql, inArray } from 'drizzle-orm';
import { db } from './index';
import { equipment, productItems } from './schema';

/**
 * Fetches all equipment items, joining with the product_items table
 * to compute the active quantity dynamically.
 * Active quantity counts all items whose status is not 'MAINTENANCE'.
 */
export async function getEquipmentWithQuantity() {
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
    })
    .from(equipment)
    .leftJoin(activeCountSubquery, eq(equipment.id, activeCountSubquery.productId));

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
