export interface QuoteItem {
  id: string;
  name: string;
  brand: string;
  catLabel: string;
  price: number;
  priceType: 'numeric' | 'on_request';
  priceTax: 'HT' | 'TTC';
  quantity: number;
}

export interface QuoteSnapshot {
  items: QuoteItem[];
  totalHT: number;
  totalTTC: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  discount: number;
}

export type QuoteStatus =
  | 'draft'
  | 'pending'
  | 'modified_by_admin'
  | 'pdf_pending'
  | 'validated'
  | 'cancelled'
  | 'locked';

export type DocType = 'devis' | 'facture' | 'avoir' | 'contrat';

export interface Quote {
  id: string;
  status: QuoteStatus;
  docType: DocType;
  projectName: string | null;
  linkedDevisId: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  items: QuoteItem[];
  totalHT: number;
  totalTTC: number;
  hasPdf: boolean;
  discount: number;
  previousVersion: string | null;
  clientRefusalNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectGroup {
  id: string;
  name: string;
  quotes: Quote[];
  rentalStart: string;
  rentalEnd: string;
}

export type ProjectStatus =
  | 'action_required'
  | 'pdf_pending'
  | 'pending'
  | 'draft'
  | 'locked'
  | 'validated'
  | 'cancelled'
  | 'mixed';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function autoGroupName(rentalStart: string): string {
  const date = new Date(rentalStart);
  const monthYear = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `Location — ${monthYear.charAt(0).toUpperCase()}${monthYear.slice(1)}`;
}

export function groupQuotesByProject(quotes: Quote[]): ProjectGroup[] {
  if (quotes.length === 0) return [];

  // Separate linked docs (factures/avoirs with linkedDevisId) from standalone
  const standalone = quotes.filter(q => !q.linkedDevisId);
  const linked = quotes.filter(q => !!q.linkedDevisId);

  // Sort standalone by createdAt ascending
  const sorted = [...standalone].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 5-day sliding window on standalone quotes
  const rawGroups: Quote[][] = [];
  for (const q of sorted) {
    const qTime = new Date(q.createdAt).getTime();
    let placed = false;
    for (const group of rawGroups) {
      const lastTime = new Date(group[group.length - 1].createdAt).getTime();
      if (qTime - lastTime <= FIVE_DAYS_MS) {
        group.push(q);
        placed = true;
        break;
      }
    }
    if (!placed) rawGroups.push([q]);
  }

  // Attach linked docs to the group containing their parent devis
  for (const lq of linked) {
    const parentGroup = rawGroups.find(g => g.some(q => q.id === lq.linkedDevisId));
    if (parentGroup) {
      parentGroup.push(lq);
    } else {
      rawGroups.push([lq]);
    }
  }

  // Build groups with auto-names (groups are oldest-first at this point)
  const intermediate = rawGroups.map(qs => {
    // Use standalone quotes for date range computation
    const anchors = qs.filter(q => !q.linkedDevisId);
    const allDates = (anchors.length > 0 ? anchors : qs);
    const startDates = allDates.map(q => q.startDate).sort();
    const endDates   = allDates.map(q => q.endDate).sort();
    return {
      id: qs.find(q => !q.linkedDevisId)?.id ?? qs[0].id,
      autoName: autoGroupName(startDates[0]),
      customName: (qs.find(q => !q.linkedDevisId) ?? qs[0]).projectName ?? null,
      quotes: qs,
      rentalStart: startDates[0],
      rentalEnd: endDates[endDates.length - 1],
    };
  });

  // Count auto-name collisions among groups without a custom name
  const autoNameCount: Record<string, number> = {};
  for (const g of intermediate) {
    if (!g.customName) autoNameCount[g.autoName] = (autoNameCount[g.autoName] || 0) + 1;
  }

  // Assign suffixes (oldest = (1))
  const autoNameSeen: Record<string, number> = {};
  const groups: ProjectGroup[] = intermediate.map(g => {
    if (g.customName) return { id: g.id, name: g.customName, quotes: g.quotes, rentalStart: g.rentalStart, rentalEnd: g.rentalEnd };
    if (autoNameCount[g.autoName] > 1) {
      autoNameSeen[g.autoName] = (autoNameSeen[g.autoName] || 0) + 1;
      return { id: g.id, name: `${g.autoName} (${autoNameSeen[g.autoName]})`, quotes: g.quotes, rentalStart: g.rentalStart, rentalEnd: g.rentalEnd };
    }
    return { id: g.id, name: g.autoName, quotes: g.quotes, rentalStart: g.rentalStart, rentalEnd: g.rentalEnd };
  });

  // Sort newest-first
  return groups.sort((a, b) => {
    const latestA = new Date(a.quotes[a.quotes.length - 1].createdAt).getTime();
    const latestB = new Date(b.quotes[b.quotes.length - 1].createdAt).getTime();
    return latestB - latestA;
  });
}

export function getProjectStatus(quotes: Quote[]): ProjectStatus {
  const statuses = new Set(quotes.map(q => q.status));
  if (statuses.has('modified_by_admin')) return 'action_required';
  if (statuses.has('pdf_pending'))       return 'pdf_pending';
  if (statuses.has('pending'))           return 'pending';
  if (statuses.has('draft'))             return 'draft';
  if ([...statuses].every(s => s === 'locked'))    return 'locked';
  if ([...statuses].every(s => s === 'validated')) return 'validated';
  if ([...statuses].every(s => s === 'cancelled')) return 'cancelled';
  return 'mixed';
}

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'action_required': return 'Action requise';
    case 'pdf_pending':     return 'PDF en cours';
    case 'pending':         return "En cours d'étude";
    case 'draft':           return 'Brouillon';
    case 'locked':          return 'Confirmé ✓';
    case 'validated':       return 'Validé';
    case 'cancelled':       return 'Annulé';
    case 'mixed':           return 'Mixte';
  }
}

export function projectStatusColors(status: ProjectStatus): { bg: string; color: string } {
  switch (status) {
    case 'action_required': return { bg: '#fef3c7', color: '#92400e' };
    case 'pdf_pending':     return { bg: '#fff8ed', color: '#b45309' };
    case 'pending':         return { bg: '#e8f1fd', color: '#0071e3' };
    case 'draft':           return { bg: '#e8e8ed', color: '#6e6e73' };
    case 'locked':          return { bg: '#e2fbe8', color: '#1db954' };
    case 'validated':       return { bg: '#f0fdf4', color: '#15803d' };
    case 'cancelled':       return { bg: '#fef2f2', color: '#ef4444' };
    case 'mixed':           return { bg: '#f5f5f7', color: '#86868b' };
  }
}

export function projectDocSummary(quotes: Quote[]): string {
  const byStatus = {
    draft:     quotes.filter(q => q.status === 'draft').length,
    active:    quotes.filter(q => ['pending', 'modified_by_admin', 'pdf_pending'].includes(q.status)).length,
    validated: quotes.filter(q => q.status === 'validated').length,
    locked:    quotes.filter(q => q.status === 'locked').length,
    cancelled: quotes.filter(q => q.status === 'cancelled').length,
  };
  const parts: string[] = [];
  if (byStatus.draft)     parts.push(`${byStatus.draft} brouillon${byStatus.draft > 1 ? 's' : ''}`);
  if (byStatus.active)    parts.push(`${byStatus.active} en cours`);
  if (byStatus.locked)    parts.push(`${byStatus.locked} confirmé${byStatus.locked > 1 ? 's' : ''}`);
  if (byStatus.validated) parts.push(`${byStatus.validated} validé${byStatus.validated > 1 ? 's' : ''}`);
  if (byStatus.cancelled) parts.push(`${byStatus.cancelled} annulé${byStatus.cancelled > 1 ? 's' : ''}`);
  return parts.join(' · ') || 'Aucun document';
}
