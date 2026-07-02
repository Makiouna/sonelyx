import { pgTable, text, timestamp, boolean, integer, doublePrecision, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  role: text('role'),
  stripeCustomerId: text('stripe_customer_id'), // Stripe Customer object id, created lazily on first Stripe invoice
});

export const category = pgTable('category', {
  id: text('id').primaryKey(), // slug, e.g. "diffusion"
  label: text('label').notNull(), // display label, e.g. "Diffusion"
});

export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  slug: text('slug').unique(),
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
  image: text('image'),
  isPack: boolean('is_pack').default(false).notNull(),
});

export const productItems = pgTable('product_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => equipment.id, { onDelete: 'cascade' }),
  itemName: text('item_name').notNull(),
  qrCodeId: text('qr_code_id').unique(),
  status: text('status').$type<'AVAILABLE' | 'RENTED' | 'MAINTENANCE'>().default('AVAILABLE').notNull(),
  rentedByQuoteId: text('rented_by_quote_id')
    .references(() => quote.id, { onDelete: 'set null' }),
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
  // Deposit / caution fields (only relevant on docType = 'devis')
  depositAmount: doublePrecision('deposit_amount'), // montant de la caution demandée (null = pas de caution)
  depositStatus: text('deposit_status').$type<'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'RELEASED' | 'BYPASSED'>(), // null tant qu'aucune caution n'est définie
  stripePaymentIntentId: text('stripe_payment_intent_id'), // PaymentIntent Stripe lié
  depositReminderSentAt: timestamp('deposit_reminder_sent_at'), // date du dernier rappel J-3 envoyé
  invoiceStripePaymentIntentId: text('invoice_stripe_payment_intent_id'),
  invoicePaymentStatus: text('invoice_payment_status').$type<'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CASH'>(),
  stripeInvoiceId: text('stripe_invoice_id'), // Stripe hosted Invoice id — set when sent via the "Envoyer via Stripe" admin action
  cancellationReason: text('cancellation_reason'),
  cancelledAt: timestamp('cancelled_at'),
  cartReminderSentAt: timestamp('cart_reminder_sent_at'),
  pickupReminderSentAt: timestamp('pickup_reminder_sent_at'),
  returnReminderSentAt: timestamp('return_reminder_sent_at'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const scanSessions = pgTable('scan_sessions', {
  id: text('id').primaryKey(),
  qrCodeId: text('qr_code_id'),
  status: text('status').$type<'PENDING' | 'SCANNED'>().default('PENDING').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const remoteScanQueue = pgTable('remote_scan_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: text('admin_id').notNull(),
  qrCodeId: text('qr_code_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const packCompositions = pgTable('pack_compositions', {
  id: uuid('id').defaultRandom().primaryKey(),
  packProductId: text('pack_product_id')
    .notNull()
    .references(() => equipment.id, { onDelete: 'cascade' }),
  componentProductId: text('component_product_id')
    .notNull()
    .references(() => equipment.id, { onDelete: 'cascade' }),
  quantityNeeded: integer('quantity_needed').notNull().default(1),
});

export const systemSettings = pgTable('system_settings', {
  id: text('id').primaryKey(), // 'default'
  emailCollectionText: text('email_collection_text').notNull(),
  emailReturnText: text('email_return_text').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const documentRequests = pgTable('document_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: text('customer_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  requestedTypes: text('requested_types').notNull(), // JSON string of string[]
  token: text('token').notNull().unique(),
  status: text('status').$type<'PENDING' | 'COMPLETED'>().notNull().default('PENDING'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customerDocuments = pgTable('customer_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: text('customer_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id').references(() => documentRequests.id, { onDelete: 'set null' }),
  documentType: text('document_type').notNull(),
  filePath: text('file_path').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const projectInspections = pgTable('project_inspections', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: text('quote_id').notNull().references(() => quote.id, { onDelete: 'cascade' }),
  type: text('type').$type<'DEPART' | 'RETOUR'>().notNull(),
  photoUrls: text('photo_urls').notNull().default('[]'), // JSON string of URL[]
  adminSignature: text('admin_signature').notNull(),
  adminSignedAt: timestamp('admin_signed_at').notNull(),
  clientSignature: text('client_signature'),
  clientSignedAt: timestamp('client_signed_at'),
  clientIp: text('client_ip'),
  clientDevice: text('client_device'),
  clientGeoLocation: text('client_geo_location'),
  clientUserId: text('client_user_id'),
  status: text('status').$type<'PENDING_CLIENT' | 'COMPLETED'>().notNull().default('PENDING_CLIENT'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
