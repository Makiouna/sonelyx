import { pgTable, text, timestamp, boolean, integer, doublePrecision } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  role: text('role'),
});

export const category = pgTable('category', {
  id: text('id').primaryKey(), // slug, e.g. "diffusion"
  label: text('label').notNull(), // display label, e.g. "Diffusion"
});

export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  cat: text('cat').notNull(),
  catLabel: text('catLabel').notNull(),
  brand: text('brand').notNull(),
  name: text('name').notNull(),
  desc: text('desc').notNull(),
  specs: text('specs').notNull(), // JSON string representing string[]
  price: doublePrecision('price').default(0).notNull(),
  priceType: text('priceType').default('numeric').notNull(), // 'numeric' | 'on_request'
  priceTax: text('priceTax').default('HT').notNull(), // 'HT' | 'TTC'
  purchasePrice: doublePrecision('purchasePrice').default(0).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  image: text('image'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: timestamp('expiresAt'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
});

export const setting = pgTable('setting', {
  id: text('id').primaryKey(), // e.g. 'tva_rate'
  value: text('value').notNull(), // e.g. '20'
  updatedAt: timestamp('updatedAt').notNull(),
});

export const quote = pgTable('quote', {
  id: text('id').primaryKey(), // random id
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'draft' | 'pending' | 'modified_by_admin' | 'pdf_pending' | 'validated' | 'cancelled'
  startDate: text('startDate').notNull(), // string date
  endDate: text('endDate').notNull(), // string date
  notes: text('notes'),
  items: text('items').notNull(), // JSON string representing array of items
  totalHT: doublePrecision('totalHT').notNull(),
  totalTTC: doublePrecision('totalTTC').notNull(),
  pdfUrl: text('pdfUrl'), // link to paper PDF
  docType: text('docType').default('devis').notNull(), // 'devis' | 'facture' | 'avoir' | 'contrat'
  projectName: text('projectName'), // custom project name set by client (null = auto-generated)
  linkedDevisId: text('linkedDevisId'), // for factures/avoirs: id of the source devis
  discount: doublePrecision('discount').default(0).notNull(), // global promo discount percentage
  previousVersion: text('previousVersion'), // JSON snapshot of quote state before admin modification
  clientRefusalNote: text('clientRefusalNote'), // client message when refusing admin modifications
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});
