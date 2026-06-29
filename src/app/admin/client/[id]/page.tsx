'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import {
  Loader2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
  Mail,
  Calendar,
  Download,
  Upload,
  AlertTriangle,
  Percent,
  CheckCircle,
  Receipt,
  Lock,
  PackageCheck,
  Camera,
} from 'lucide-react';
import { groupQuotesByProject, getProjectStatus, projectStatusLabel, projectStatusColors } from '@/lib/project-grouping';
import ScannerModal from '@/components/scanner-modal';
import { useRemoteScanner } from '@/lib/remote-scanner-context';

interface EquipmentItem {
  id: string;
  cat: string;
  catLabel: string;
  brand: string;
  name: string;
  desc: string;
  specs: string[];
  price: number;
  priceType: 'numeric' | 'on_request';
  priceTax: 'HT' | 'TTC';
  purchasePrice: number;
  quantity: number;
  image: string | null;
}

interface QuoteItem {
  id: string;
  name: string;
  brand: string;
  catLabel: string;
  price: number;
  priceType: 'numeric' | 'on_request';
  priceTax: 'HT' | 'TTC';
  quantity: number;
  image: string | null;
}

interface Quote {
  id: string;
  userId: string;
  status: 'draft' | 'pending' | 'modified_by_admin' | 'pdf_pending' | 'validated' | 'cancelled' | 'locked';
  docType: string;
  linkedDevisId: string | null;
  previousVersion?: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  items: QuoteItem[];
  totalHT: number;
  totalTTC: number;
  pdfUrl: string | null;
  discount: number;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
}

interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientFolderPage({ params }: PageProps) {
  const { id: clientId } = use(params);
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const { registerConsumer, unregisterConsumer } = useRemoteScanner();

  // Core lists
  const [client, setClient] = useState<ClientUser | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [tvaRate, setTvaRate] = useState(20);

  // Logistics states
  const [projectTabs, setProjectTabs] = useState<Record<string, 'docs' | 'logistics'>>({});
  const [logisticsData, setLogisticsData] = useState<Record<string, { reserved: any[], scanned: any[] }>>({});
  const [loadingLogistics, setLoadingLogistics] = useState<Record<string, boolean>>({});
  const [scannerAction, setScannerAction] = useState<Record<string, 'check-out' | 'check-in'>>({});
  const [activeScannerQuoteId, setActiveScannerQuoteId] = useState<string | null>(null);
  const [isLogisticsScannerOpen, setIsLogisticsScannerOpen] = useState(false);
  // Tracks the last logistics tab that was activated (enables passive remote scanning without opening modal)
  const [activeLogisticsQuoteId, setActiveLogisticsQuoteId] = useState<string | null>(null);

  const fetchLogistics = async (quoteId: string) => {
    setLoadingLogistics(prev => ({ ...prev, [quoteId]: true }));
    try {
      const res = await fetch(`/api/quotes/${quoteId}/logistics`);
      const data = await res.json();
      if (data.success) {
        setLogisticsData(prev => ({ ...prev, [quoteId]: { reserved: data.reserved, scanned: data.scanned } }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogistics(prev => ({ ...prev, [quoteId]: false }));
    }
  };

  const handleSwitchTab = (projectId: string, tab: 'docs' | 'logistics', devisId?: string) => {
    setProjectTabs(prev => ({ ...prev, [projectId]: tab }));
    if (tab === 'logistics' && devisId) {
      fetchLogistics(devisId);
      setActiveLogisticsQuoteId(devisId);
    } else if (tab === 'docs') {
      setActiveLogisticsQuoteId(prev => (prev === devisId ? null : prev));
    }
  };

  const handleLogisticsScanSuccess = async (qrCodeId: string) => {
    if (!activeScannerQuoteId) return;
    const action = scannerAction[activeScannerQuoteId] ?? 'check-out';

    try {
      const res = await fetch(`/api/quotes/${activeScannerQuoteId}/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, qrCodeId })
      });
      const data = await res.json();
      if (data.success) {
        fetchLogistics(activeScannerQuoteId);
        setIsLogisticsScannerOpen(false);
      } else {
        alert(data.error || 'Erreur lors du scan.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue lors de la transmission.');
    }
  };

  // Coefficients
  const [coeffWeekend, setCoeffWeekend] = useState(1.4);
  const [coeff3Jours, setCoeff3Jours] = useState(1.8);
  const [coeffSemaine, setCoeffSemaine] = useState(3.0);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Track which projects are collapsed (empty = all expanded)
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  // Edit Quote State
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<QuoteItem[]>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editAddItemSelect, setEditAddItemSelect] = useState('');

  // PDF file upload state
  const [pdfFileMap, setPdfFileMap] = useState<{ [quoteId: string]: File | null }>({});

  // Payment settings (IBAN/BIC for display under invoices)
  const [paymentSettings, setPaymentSettings] = useState<{ iban: string; bic: string; instructions: string } | null>(null);

  // Security check on load
  useEffect(() => {
    if (!isPending && (!session || (session.user as any).role !== 'admin')) {
      router.push('/');
    }
  }, [session, isPending, router]);

  // Load everything
  useEffect(() => {
    if (session && (session.user as any).role === 'admin') {
      fetchClientData();
    }
  }, [session, clientId]);

  // Remote scanner — PRIORITY 80: logistics modal open (explicit scan intent)
  useEffect(() => {
    if (!isLogisticsScannerOpen || !activeScannerQuoteId) {
      unregisterConsumer('logistics-modal');
      return;
    }
    registerConsumer('logistics-modal', 80, async (qrCodeId) => {
      await handleLogisticsScanSuccess(qrCodeId);
    });
    return () => unregisterConsumer('logistics-modal');
  }, [isLogisticsScannerOpen, activeScannerQuoteId, registerConsumer, unregisterConsumer]);

  // Remote scanner — PRIORITY 70: logistics tab active (passive scan, no modal needed)
  useEffect(() => {
    if (!activeLogisticsQuoteId) {
      unregisterConsumer('logistics-passive');
      return;
    }
    const action = scannerAction[activeLogisticsQuoteId] ?? 'check-out';
    registerConsumer('logistics-passive', 70, async (qrCodeId) => {
      const res = await fetch(`/api/quotes/${activeLogisticsQuoteId}/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, qrCodeId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur lors du scan logistique.');
      fetchLogistics(activeLogisticsQuoteId);
    });
    return () => unregisterConsumer('logistics-passive');
  }, [activeLogisticsQuoteId, scannerAction, registerConsumer, unregisterConsumer]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // 1. Fetch settings (TVA & Coeffs)
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setTvaRate(settingsData.tvaRate);
        setCoeffWeekend(settingsData.coeffWeekend);
        setCoeff3Jours(settingsData.coeff3Jours);
        setCoeffSemaine(settingsData.coeffSemaine);
      }

      // 2. Fetch catalog equipment (for add-line dropdown)
      const eqRes = await fetch('/api/equipment');
      const eqData = await eqRes.json();
      if (eqData.success) {
        setEquipment(eqData.items);
      }

      // 3. Fetch client details from users endpoint
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersData.success) {
        const found = usersData.users.find((u: any) => u.id === clientId);
        if (found) {
          setClient(found);
        }
      }

      // 3b. Fetch payment settings (IBAN/BIC)
      const psRes = await fetch('/api/settings');
      const psData = await psRes.json();
      if (psData.success && (psData.iban || psData.bic || psData.paymentInstructions)) {
        setPaymentSettings({ iban: psData.iban || '', bic: psData.bic || '', instructions: psData.paymentInstructions || '' });
      }

      // 4. Fetch all quotes & filter for this client
      const quotesRes = await fetch('/api/admin/quotes');
      const quotesData = await quotesRes.json();
      if (quotesData.success) {
        const clientQuotes = quotesData.quotes.filter((q: any) => q.userId === clientId);
        setQuotes(clientQuotes);
      }
    } catch (err) {
      console.error('Error fetching client dossier data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleUpdateStatus = async (quoteId: string, newStatus: Quote['status']) => {
    setActionLoading(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchClientData();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateFacture = async (devisId: string) => {
    setActionLoading(devisId + '-facture');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId })
      });
      const data = await res.json();
      if (data.success) {
        fetchClientData();
      } else {
        alert(data.error || 'Erreur lors de la création de la facture.');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockDevis = async (devisId: string) => {
    setActionLoading(devisId + '-lock');
    try {
      const res = await fetch(`/api/quotes/${devisId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' })
      });
      const data = await res.json();
      if (data.success) {
        fetchClientData();
      } else {
        alert(data.error || 'Erreur.');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUploadPdf = async (quoteId: string) => {
    const file = pdfFileMap[quoteId];
    if (!file) {
      alert('Veuillez sélectionner un fichier PDF.');
      return;
    }
    setActionLoading(quoteId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/quotes/${quoteId}/upload-pdf`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPdfFileMap(prev => ({ ...prev, [quoteId]: null }));
        fetchClientData();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'upload du PDF.');
    } finally {
      setActionLoading(null);
    }
  };

  // Inline Edit logic
  const startEditing = (q: Quote) => {
    setEditingQuoteId(q.id);
    setEditStartDate(q.startDate);
    setEditEndDate(q.endDate);
    setEditNotes(q.notes || '');
    setEditItems([...q.items]);
    setEditDiscount(q.discount);
    setEditAddItemSelect(equipment.length > 0 ? equipment[0].id : '');
  };

  const handleAddEditItem = (itemId: string) => {
    if (!itemId) return;
    const eqItem = equipment.find(e => e.id === itemId);
    if (!eqItem) return;

    if (editItems.some(i => i.id === itemId)) {
      alert("Cet équipement est déjà dans le devis.");
      return;
    }

    setEditItems([
      ...editItems,
      {
        id: eqItem.id,
        name: eqItem.name,
        brand: eqItem.brand,
        catLabel: eqItem.catLabel,
        price: eqItem.price,
        priceType: eqItem.priceType,
        priceTax: eqItem.priceTax,
        quantity: 1,
        image: eqItem.image,
      }
    ]);
  };

  const handleUpdateEditItemQty = (itemId: string, delta: number) => {
    const eqItem = equipment.find(e => e.id === itemId);
    const maxQty = eqItem ? eqItem.quantity : 999;

    setEditItems(
      editItems.map(item => {
        if (item.id === itemId) {
          const nextQty = Math.max(1, Math.min(maxQty, item.quantity + delta));
          return { ...item, quantity: nextQty };
        }
        return item;
      })
    );
  };

  const handleUpdateEditItemPrice = (itemId: string, newPrice: number) => {
    setEditItems(
      editItems.map(item => {
        if (item.id === itemId) {
          return { ...item, price: newPrice };
        }
        return item;
      })
    );
  };

  const handleRemoveEditItem = (itemId: string) => {
    setEditItems(editItems.filter(item => item.id !== itemId));
  };

  const calculateEditTotals = () => {
    let subtotalHT = 0;
    let subtotalTTC = 0;
    const discountVal = Number(editDiscount) || 0;

    editItems.forEach(item => {
      if (item.priceType === 'numeric') {
        let priceHT = item.price;
        let priceTTC = item.price;

        if (item.priceTax === 'HT') {
          priceTTC = priceHT * (1 + tvaRate / 100);
        } else {
          priceHT = priceTTC / (1 + tvaRate / 100);
        }

        subtotalHT += priceHT * item.quantity;
        subtotalTTC += priceTTC * item.quantity;
      }
    });

    let duration = 1;
    if (editStartDate && editEndDate) {
      const start = new Date(editStartDate);
      const end = new Date(editEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    let coeff = 1.0;
    if (duration === 2) {
      coeff = coeffWeekend;
    } else if (duration === 3) {
      coeff = coeff3Jours;
    } else if (duration >= 4 && duration <= 6) {
      coeff = duration * 0.7;
    } else if (duration >= 7) {
      coeff = coeffSemaine * (duration / 7);
    }

    const rawHT = subtotalHT * coeff;
    const rawTTC = subtotalTTC * coeff;
    const totalHT = Math.round(rawHT * (1 - discountVal / 100) * 100) / 100;
    const totalTTC = Math.round(rawTTC * (1 - discountVal / 100) * 100) / 100;

    return { totalHT, totalTTC, duration, coeff };
  };

  const handleSaveEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editingQuoteId) return;

    if (editItems.length === 0) {
      alert("Le devis doit contenir au moins un article.");
      return;
    }

    const { totalHT, totalTTC } = calculateEditTotals();
    setActionLoading(editingQuoteId);

    try {
      const res = await fetch(`/api/quotes/${editingQuoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: editStartDate,
          endDate: editEndDate,
          notes: editNotes,
          items: editItems,
          totalHT,
          totalTTC,
          discount: editDiscount,
          status: 'modified_by_admin',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingQuoteId(null);
        fetchClientData();
      } else {
        alert(data.error || "Erreur lors de l'enregistrement.");
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isPending || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7' }}>
        <Loader2 style={{ width: '40px', height: '40px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7', gap: '16px' }}>
        <p style={{ fontSize: '16px', color: '#86868b' }}>Dossier client introuvable.</p>
        <Link href="/admin" style={{ padding: '8px 16px', backgroundColor: '#1d1d1f', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}>Retour</Link>
      </div>
    );
  }

  // Group all client quotes into projects
  const projects = groupQuotesByProject(quotes as any);

  const DOC_ORDER = ['devis', 'facture', 'avoir', 'contrat'] as const;
  const DOC_META: Record<string, { label: string; color: string; bg: string }> = {
    devis:   { label: 'Devis',    color: '#0071e3', bg: '#e8f1fd' },
    facture: { label: 'Factures', color: '#7c3aed', bg: '#f3e8ff' },
    avoir:   { label: 'Avoirs',   color: '#0891b2', bg: '#e0f7fa' },
    contrat: { label: 'Contrats', color: '#16a34a', bg: '#dcfce7' },
  };

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header subTitle="Administration - Client" links={[]} />

      <main style={{ flex: 1, maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '40px clamp(20px, 4vw, 40px)', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#86868b', fontSize: '14px', fontWeight: 600, alignSelf: 'flex-start' }}>
          <ChevronLeft style={{ width: '16px', height: '16px' }} /> Retour au Dashboard
        </Link>

        {/* Client identity header */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-.02em' }}>{client.name}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px', fontSize: '13px', color: '#86868b' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Mail style={{ width: '14px', height: '14px' }} /> {client.email}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar style={{ width: '14px', height: '14px' }} /> Inscrit le {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0071e3', backgroundColor: '#e8f1fd', padding: '6px 12px', borderRadius: '980px' }}>
            {projects.length} projet{projects.length !== 1 ? 's' : ''} · N° {client.id.slice(0, 8)}
          </span>
        </div>

        {/* Projects list */}
        {projects.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '60px 20px', textAlign: 'center', color: '#86868b', fontSize: '14px' }}>
            Aucun projet pour ce client.
          </div>
        ) : (
          projects.map(project => {
            const pStatus = getProjectStatus(project.quotes as any);
            const pColors = projectStatusColors(pStatus);
            const isCollapsed = !!collapsedProjects[project.id];

            const byDocType: Record<string, any[]> = {};
            for (const q of project.quotes) {
              const dt = (q as any).docType ?? 'devis';
              if (!byDocType[dt]) byDocType[dt] = [];
              byDocType[dt].push(q);
            }

            const actionCount = project.quotes.filter(
              (q: any) => q.status === 'pending' || q.status === 'modified_by_admin' || q.status === 'pdf_pending'
            ).length;

            const devisDoc = project.quotes.find(q => q.docType === 'devis');
            const isLogisticsEligible = devisDoc && (devisDoc.status === 'validated' || devisDoc.status === 'locked');

            return (
              <div key={project.id} style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>

                {/* Project header — click to collapse/expand */}
                <div
                  onClick={() => setCollapsedProjects(prev => ({ ...prev, [project.id]: !prev[project.id] }))}
                  style={{ padding: '20px 26px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid rgba(0,0,0,.06)', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PackageCheck style={{ width: '20px', height: '20px', color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#1d1d1f' }}>{project.name}</div>
                      <div style={{ fontSize: '12px', color: '#86868b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar style={{ width: '11px', height: '11px' }} />
                        {new Date(project.rentalStart).toLocaleDateString('fr-FR')} — {new Date(project.rentalEnd).toLocaleDateString('fr-FR')}
                        <span style={{ opacity: 0.4 }}>·</span>
                        {project.quotes.length} document{project.quotes.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {actionCount > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#0071e3', color: '#fff', padding: '3px 9px', borderRadius: '980px' }}>
                        {actionCount} action{actionCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '980px', backgroundColor: pColors.bg, color: pColors.color }}>
                      {projectStatusLabel(pStatus)}
                    </span>
                    {isCollapsed
                      ? <ChevronDown style={{ width: '16px', height: '16px', color: '#86868b' }} />
                      : <ChevronUp style={{ width: '16px', height: '16px', color: '#86868b' }} />
                    }
                  </div>
                </div>

                {/* Tab selectors for validated/locked projects */}
                {!isCollapsed && isLogisticsEligible && (
                  <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,.06)', padding: '0 26px' }}>
                    <button
                      onClick={() => handleSwitchTab(project.id, 'docs')}
                      style={{
                        padding: '12px 20px',
                        border: 'none',
                        background: 'none',
                        borderBottom: (projectTabs[project.id] ?? 'docs') === 'docs' ? '2px solid #0071e3' : 'none',
                        color: (projectTabs[project.id] ?? 'docs') === 'docs' ? '#0071e3' : '#6e6e73',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Documents
                    </button>
                    <button
                      onClick={() => {
                        const devis = project.quotes.find(q => q.docType === 'devis');
                        handleSwitchTab(project.id, 'logistics', devis?.id);
                      }}
                      style={{
                        padding: '12px 20px',
                        border: 'none',
                        background: 'none',
                        borderBottom: projectTabs[project.id] === 'logistics' ? '2px solid #0071e3' : 'none',
                        color: projectTabs[project.id] === 'logistics' ? '#0071e3' : '#6e6e73',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Logistique
                    </button>
                  </div>
                )}

                {/* Project body */}
                {!isCollapsed && (
                  <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {projectTabs[project.id] === 'logistics' ? (() => {
                      const devis = project.quotes.find(q => q.docType === 'devis');
                      if (!devis) {
                        return (
                          <div style={{ padding: '30px', textAlign: 'center', color: '#86868b' }}>
                            Aucun devis trouvé pour ce projet.
                          </div>
                        );
                      }
                      
                      const data = logisticsData[devis.id];
                      const loading = loadingLogistics[devis.id];
                      const currentAction = scannerAction[devis.id] ?? 'check-out';

                      if (loading) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86868b', fontSize: '14px', padding: '30px', justifyContent: 'center' }}>
                            <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                            Chargement des données logistiques...
                          </div>
                        );
                      }

                      if (!data) {
                        return (
                          <div style={{ padding: '30px', textAlign: 'center', color: '#86868b' }}>
                            Données logistiques non chargées. Veuillez actualiser.
                          </div>
                        );
                      }

                      const stillRented = data.scanned.filter(item => item.status === 'RENTED');

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          
                          {/* Alerts for non-returned items */}
                          {stillRented.length > 0 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '16px 20px',
                              borderRadius: '16px',
                              backgroundColor: 'rgba(255,159,10,0.12)',
                              border: '1px solid rgba(255,159,10,0.24)',
                              color: '#bf5af2'
                            }}>
                              <AlertTriangle style={{ width: '20px', height: '20px', color: '#ff9f0a', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <strong style={{ fontSize: '14px', color: '#ff9f0a', display: 'block' }}>Attention : Matériel non restitué</strong>
                                <span style={{ fontSize: '13px', color: '#6e6e73', marginTop: '4px', display: 'block' }}>
                                  Il y a {stillRented.length} exemplaire(s) physique(s) encore marqué(s) comme "Loué" (Check-out effectué, mais retour non validé).
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                  {stillRented.map(item => (
                                    <span key={item.id} style={{ fontSize: '12px', fontFamily: 'monospace', padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}>
                                      {item.itemName}{item.qrCodeId ? ` (${item.qrCodeId})` : ' (QR en attente)'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Scan Actions Panel */}
                          <div style={{
                            backgroundColor: '#f5f5f7',
                            borderRadius: '20px',
                            padding: '20px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.05)', padding: '3px', borderRadius: '980px' }}>
                                <button
                                  onClick={() => setScannerAction(prev => ({ ...prev, [devis.id]: 'check-out' }))}
                                  style={{
                                    padding: '6px 16px',
                                    borderRadius: '980px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    backgroundColor: currentAction === 'check-out' ? '#1d1d1f' : 'transparent',
                                    color: currentAction === 'check-out' ? '#ffffff' : '#6e6e73'
                                  }}
                                >
                                  Départ (Check-out)
                                </button>
                                <button
                                  onClick={() => setScannerAction(prev => ({ ...prev, [devis.id]: 'check-in' }))}
                                  style={{
                                    padding: '6px 16px',
                                    borderRadius: '980px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    backgroundColor: currentAction === 'check-in' ? '#1d1d1f' : 'transparent',
                                    color: currentAction === 'check-in' ? '#ffffff' : '#6e6e73'
                                  }}
                                >
                                  Retour (Check-in)
                                </button>
                              </div>
                              
                              <span style={{ fontSize: '13px', color: '#6e6e73' }}>
                                Mode actuel : <strong>{currentAction === 'check-out' ? 'Scanner pour charger' : 'Scanner pour restituer'}</strong>
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setActiveScannerQuoteId(devis.id);
                                setIsLogisticsScannerOpen(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                borderRadius: '980px',
                                backgroundColor: '#0071e3',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '13px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0077ed'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0071e3'}
                            >
                              <Camera style={{ width: '16px', height: '16px' }} />
                              {currentAction === 'check-out' ? 'Scanner Départ' : 'Scanner Retour'}
                            </button>
                          </div>

                          {/* Progress Gauges Grid */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Statut de préparation</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {data.reserved.map(item => {
                                const scannedQty = data.scanned.filter(
                                  s => s.productId === item.id && s.status === 'RENTED'
                                ).length;
                                const progressPct = Math.min(100, (scannedQty / item.quantity) * 100);

                                return (
                                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', border: '1px solid rgba(0,0,0,.06)', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <strong style={{ fontSize: '14px' }}>{item.brand} - {item.name}</strong>
                                        <span style={{ fontSize: '12px', color: '#86868b', marginLeft: '8px' }}>
                                          Quota : {item.quantity}
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '13px', fontWeight: 700, color: progressPct === 100 ? '#15803d' : '#1d1d1f' }}>
                                        {scannedQty} / {item.quantity} scanné(s)
                                      </span>
                                    </div>

                                    {/* Progress bar container */}
                                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{
                                        width: `${progressPct}%`,
                                        height: '100%',
                                        backgroundColor: progressPct === 100 ? '#30d158' : '#0071e3',
                                        borderRadius: '4px',
                                        transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.3, 1)'
                                      }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })() : (
                      DOC_ORDER.map(dt => {
                      const docs = byDocType[dt];
                      if (!docs || docs.length === 0) return null;
                      const meta = DOC_META[dt];

                      return (
                        <div key={dt}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                            <span style={{ fontWeight: 800, fontSize: '13px', color: meta.color }}>{meta.label}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: meta.bg, color: meta.color }}>{docs.length}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* ── DEVIS ── */}
                            {dt === 'devis' && docs.map((q: any) => {
                              const isEditing = editingQuoteId === q.id;

                              if (isEditing) {
                                const { totalHT: liveHT, totalTTC: liveTTC, duration: liveDur, coeff: liveCoeff } = calculateEditTotals();
                                return (
                                  <form key={q.id} onSubmit={handleSaveEdit} style={{ border: '2px solid #0071e3', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px', backgroundColor: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0071e3' }}>Modification #{q.id}</div>
                                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '980px', backgroundColor: '#e8f1fd', color: '#0071e3', textTransform: 'uppercase' as const }}>Mode Édition</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Date de début</label>
                                        <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ padding: '9px 14px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit' }} required />
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Date de fin</label>
                                        <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} style={{ padding: '9px 14px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit' }} required />
                                      </div>
                                    </div>
                                    <textarea rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..." style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
                                    <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: '10px', overflow: 'hidden' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#f5f5f7', borderBottom: '1px solid rgba(0,0,0,.06)', fontWeight: 600 }}>
                                            <th style={{ padding: '8px 14px' }}>Matériel</th>
                                            <th style={{ padding: '8px 14px' }}>Qté</th>
                                            <th style={{ padding: '8px 14px', textAlign: 'right' }}>HT</th>
                                            <th style={{ padding: '8px 14px', width: '36px' }}></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {editItems.map((it, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < editItems.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                              <td style={{ padding: '8px 14px' }}><strong>{it.brand}</strong> - {it.name}</td>
                                              <td style={{ padding: '8px 14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <button type="button" onClick={() => handleUpdateEditItemQty(it.id, -1)} style={{ border: '1px solid #d1d1d6', backgroundColor: '#fff', borderRadius: '5px', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '11px' }}>-</button>
                                                  <span style={{ fontWeight: 700, minWidth: '16px', textAlign: 'center', fontSize: '12px' }}>{it.quantity}</span>
                                                  <button type="button" onClick={() => handleUpdateEditItemQty(it.id, 1)} style={{ border: '1px solid #d1d1d6', backgroundColor: '#fff', borderRadius: '5px', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '11px' }}>+</button>
                                                </div>
                                              </td>
                                              <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                                                {it.priceType === 'on_request' ? <span style={{ color: '#86868b' }}>Sur devis</span> : (
                                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <input type="number" value={it.price} onChange={e => handleUpdateEditItemPrice(it.id, Number(e.target.value))} style={{ width: '60px', padding: '3px 6px', borderRadius: '5px', border: '1px solid rgba(0,0,0,.15)', outline: 'none', textAlign: 'right', fontSize: '12px' }} min="0" step="0.01" />
                                                    <span>€</span>
                                                  </div>
                                                )}
                                              </td>
                                              <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                                <button type="button" onClick={() => handleRemoveEditItem(it.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                                                  <Trash2 style={{ width: '13px', height: '13px' }} />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <select value={editAddItemSelect} onChange={e => setEditAddItemSelect(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '12px' }}>
                                        <option value="">-- Ajouter un équipement --</option>
                                        {equipment.map(e => <option key={e.id} value={e.id}>{e.brand} - {e.name} ({e.priceType === 'on_request' ? 'Sur devis' : `${e.price} € ${e.priceTax}`})</option>)}
                                      </select>
                                      <button type="button" onClick={() => handleAddEditItem(editAddItemSelect)} style={{ padding: '8px 16px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>+ Ajouter</button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <Percent style={{ width: '13px', height: '13px', color: '#86868b' }} />
                                      <label style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>Remise</label>
                                      <input type="number" value={editDiscount} onChange={e => setEditDiscount(Math.max(0, Math.min(100, Number(e.target.value))))} style={{ width: '65px', padding: '5px 8px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', textAlign: 'center', fontSize: '12px' }} min="0" max="100" />
                                      <span style={{ fontSize: '12px', color: '#86868b' }}>%</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '14px' }}>
                                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#6e6e73', flexWrap: 'wrap' }}>
                                        <span>Durée : <strong>{liveDur}j</strong></span>
                                        <span>Coeff : <strong>×{liveCoeff.toFixed(2)}</strong></span>
                                        <span>HT : <strong style={{ color: '#1d1d1f', fontSize: '14px' }}>{liveHT.toLocaleString('fr-FR')} €</strong></span>
                                        <span>TTC : <strong style={{ color: '#86868b' }}>{liveTTC.toLocaleString('fr-FR')} €</strong></span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="submit" disabled={actionLoading === q.id} style={{ padding: '8px 18px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                          {actionLoading === q.id ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : 'Enregistrer'}
                                        </button>
                                        <button type="button" onClick={() => setEditingQuoteId(null)} style={{ padding: '8px 16px', borderRadius: '980px', backgroundColor: '#e8e8ed', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Annuler</button>
                                      </div>
                                    </div>
                                  </form>
                                );
                              }

                              // Normal devis card
                              return (
                                <div key={q.id} style={{ border: `1px solid ${q.status === 'locked' ? 'rgba(29,185,84,.25)' : q.status === 'pdf_pending' ? 'rgba(217,119,6,.3)' : 'rgba(0,0,0,.07)'}`, borderRadius: '14px', overflow: 'hidden' }}>
                                  {q.status === 'pdf_pending' && (
                                    <div style={{ backgroundColor: '#fef3c7', borderBottom: '1px solid rgba(217,119,6,.2)', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                      <Upload style={{ width: '13px', height: '13px', color: '#b45309', flexShrink: 0 }} />
                                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>Action requise — Uploadez le PDF du devis signé.</span>
                                    </div>
                                  )}
                                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: '13px' }}>#{q.id}</div>
                                        <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>Créé le {new Date(q.createdAt).toLocaleDateString('fr-FR')}</div>
                                      </div>
                                      <span style={{
                                        fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', textTransform: 'uppercase' as const,
                                        backgroundColor: q.status === 'pending' ? '#fff3cd' : q.status === 'modified_by_admin' ? '#e8f1fd' : q.status === 'validated' ? '#f0fdf4' : q.status === 'locked' ? '#e2fbe8' : q.status === 'cancelled' ? '#fef2f2' : '#fef3c7',
                                        color: q.status === 'pending' ? '#856404' : q.status === 'modified_by_admin' ? '#0071e3' : q.status === 'validated' ? '#15803d' : q.status === 'locked' ? '#1db954' : q.status === 'cancelled' ? '#ef4444' : '#b45309',
                                      }}>
                                        {q.status === 'pending' ? 'En attente' : q.status === 'modified_by_admin' ? 'Modifié — attente client' : q.status === 'pdf_pending' ? 'PDF en cours' : q.status === 'validated' ? 'Validé' : q.status === 'locked' ? 'Règlement reçu ✓' : q.status === 'cancelled' ? 'Annulé' : q.status}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6e6e73', backgroundColor: '#f5f5f7', padding: '8px 12px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                      <span>{new Date(q.startDate).toLocaleDateString('fr-FR')} → {new Date(q.endDate).toLocaleDateString('fr-FR')}</span>
                                      {q.discount > 0 && <span style={{ color: '#15803d', fontWeight: 700, marginLeft: 'auto' }}>Remise {q.discount}%</span>}
                                    </div>
                                    {q.notes && <div style={{ fontSize: '12px', color: '#6e6e73', fontStyle: 'italic', borderLeft: '3px solid #0071e3', paddingLeft: '8px' }}>"{q.notes}"</div>}
                                    <div style={{ border: '1px solid rgba(0,0,0,.05)', borderRadius: '8px', overflow: 'hidden', fontSize: '12px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#f5f5f7', borderBottom: '1px solid rgba(0,0,0,.06)', fontWeight: 600 }}>
                                            <th style={{ padding: '7px 12px' }}>Matériel</th>
                                            <th style={{ padding: '7px 12px' }}>Qté</th>
                                            <th style={{ padding: '7px 12px', textAlign: 'right' }}>HT</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {q.items.map((it: any, idx: number) => (
                                            <tr key={idx} style={{ borderBottom: idx < q.items.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                              <td style={{ padding: '6px 12px' }}><strong>{it.brand}</strong> - {it.name}</td>
                                              <td style={{ padding: '6px 12px' }}>{it.quantity}</td>
                                              <td style={{ padding: '6px 12px', textAlign: 'right' }}>{it.priceType === 'on_request' ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} €`}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(0,0,0,.05)', paddingTop: '10px' }}>
                                      <div style={{ fontSize: '13px', display: 'flex', gap: '12px' }}>
                                        <span>HT : <strong style={{ color: '#1d1d1f', fontSize: '14px' }}>{q.totalHT.toLocaleString('fr-FR')} €</strong></span>
                                        <span style={{ color: '#86868b' }}>TTC : <strong>{q.totalTTC.toLocaleString('fr-FR')} €</strong></span>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                        {q.status === 'pending' && (
                                          <>
                                            <button onClick={() => handleUpdateStatus(q.id, 'pdf_pending')} disabled={actionLoading === q.id} style={{ padding: '7px 14px', borderRadius: '980px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              {actionLoading === q.id ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : 'Valider'}
                                            </button>
                                            <button onClick={() => startEditing(q as unknown as Quote)} disabled={actionLoading === q.id} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: '#f5f5f7', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Modifier</button>
                                            <button onClick={() => handleUpdateStatus(q.id, 'cancelled')} disabled={actionLoading === q.id} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Refuser</button>
                                          </>
                                        )}
                                        {q.status === 'modified_by_admin' && (
                                          <>
                                            <span style={{ fontSize: '11px', color: '#6e6e73', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              <AlertTriangle style={{ width: '11px', height: '11px', color: '#b78103' }} /> Attente client
                                            </span>
                                            <button onClick={() => handleUpdateStatus(q.id, 'pdf_pending')} disabled={actionLoading === q.id} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              {actionLoading === q.id ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : 'Valider'}
                                            </button>
                                            <button onClick={() => startEditing(q as unknown as Quote)} disabled={actionLoading === q.id} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: '#f5f5f7', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Modifier</button>
                                            <button onClick={() => handleUpdateStatus(q.id, 'cancelled')} disabled={actionLoading === q.id} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Annuler</button>
                                          </>
                                        )}
                                        {q.status === 'pdf_pending' && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', width: '100%' }}>
                                            <input type="file" accept="application/pdf" onChange={e => setPdfFileMap(prev => ({ ...prev, [q.id]: e.target.files?.[0] ?? null }))} style={{ fontSize: '12px', flex: 1, minWidth: '140px', cursor: 'pointer' }} />
                                            <button onClick={() => handleUploadPdf(q.id)} disabled={actionLoading === q.id || !pdfFileMap[q.id]} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: pdfFileMap[q.id] ? '#d97706' : '#e5e7eb', color: pdfFileMap[q.id] ? '#fff' : '#9ca3af', border: 'none', cursor: pdfFileMap[q.id] ? 'pointer' : 'default', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              {actionLoading === q.id ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: '11px', height: '11px' }} />} PDF
                                            </button>
                                          </div>
                                        )}
                                        {q.status === 'validated' && (() => {
                                          const hasFacture = quotes.some(f => f.docType === 'facture' && f.linkedDevisId === q.id);
                                          return (
                                            <>
                                              {!hasFacture && (
                                                <button onClick={() => handleCreateFacture(q.id)} disabled={actionLoading === q.id + '-facture'} style={{ padding: '7px 14px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                  {actionLoading === q.id + '-facture' ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : <Receipt style={{ width: '11px', height: '11px' }} />} Créer facture
                                                </button>
                                              )}
                                              {hasFacture && <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '12px', height: '12px' }} /> Facture créée</span>}
                                              <button onClick={() => handleLockDevis(q.id)} disabled={actionLoading === q.id + '-lock'} style={{ padding: '7px 14px', borderRadius: '980px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {actionLoading === q.id + '-lock' ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : <Lock style={{ width: '11px', height: '11px' }} />} Règlement reçu
                                              </button>
                                            </>
                                          );
                                        })()}
                                        {q.status === 'locked' && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', backgroundColor: '#e2fbe8', border: '1px solid #bbf7d0' }}>
                                            <Lock style={{ width: '11px', height: '11px', color: '#1db954' }} />
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>Règlement confirmé — inventaire verrouillé</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* ── FACTURES ── */}
                            {dt === 'facture' && docs.map((q: any) => (
                              <div key={q.id} style={{ border: `1px solid ${q.status === 'pdf_pending' ? 'rgba(217,119,6,.3)' : 'rgba(0,0,0,.07)'}`, borderRadius: '14px', overflow: 'hidden' }}>
                                {q.status === 'pdf_pending' && (
                                  <div style={{ backgroundColor: '#fef3c7', borderBottom: '1px solid rgba(217,119,6,.2)', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <Upload style={{ width: '13px', height: '13px', color: '#b45309', flexShrink: 0 }} />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>Action requise — Uploadez le PDF de la facture.</span>
                                  </div>
                                )}
                                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <div>
                                      <div style={{ fontWeight: 800, fontSize: '13px' }}>Facture #{q.id}</div>
                                      <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>Source : Devis #{q.linkedDevisId}</div>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', textTransform: 'uppercase' as const, backgroundColor: q.status === 'pdf_pending' ? '#fef3c7' : '#e2fbe8', color: q.status === 'pdf_pending' ? '#b45309' : '#1db954' }}>
                                      {q.status === 'pdf_pending' ? 'PDF requis' : 'Facture émise'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#6e6e73' }}>
                                    {new Date(q.startDate).toLocaleDateString('fr-FR')} → {new Date(q.endDate).toLocaleDateString('fr-FR')}
                                    <span style={{ marginLeft: '12px' }}>HT : <strong>{q.totalHT.toLocaleString('fr-FR')} €</strong></span>
                                    <span style={{ marginLeft: '8px' }}>TTC : <strong style={{ color: '#15803d' }}>{q.totalTTC.toLocaleString('fr-FR')} €</strong></span>
                                  </div>
                                  {paymentSettings && (paymentSettings.iban || paymentSettings.bic) && (
                                    <div style={{ backgroundColor: '#e8f1fd', border: '1px solid rgba(0,113,227,.15)', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#0071e3', letterSpacing: '.04em', textTransform: 'uppercase' as const }}>Coordonnées de paiement envoyées au client</div>
                                      {paymentSettings.iban && (
                                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                                          <span style={{ color: '#86868b', fontWeight: 600 }}>IBAN : </span>
                                          <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '.04em' }}>{paymentSettings.iban}</span>
                                        </div>
                                      )}
                                      {paymentSettings.bic && (
                                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                                          <span style={{ color: '#86868b', fontWeight: 600 }}>BIC : </span>
                                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{paymentSettings.bic}</span>
                                        </div>
                                      )}
                                      {paymentSettings.instructions && (
                                        <div style={{ fontSize: '11px', color: '#6e6e73', marginTop: '2px', lineHeight: 1.5 }}>{paymentSettings.instructions}</div>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                    {q.pdfUrl && (
                                      <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '980px', backgroundColor: '#e2fbe8', color: '#1db954', textDecoration: 'none', fontWeight: 700, fontSize: '12px' }}>
                                        <Download style={{ width: '12px', height: '12px' }} /> PDF
                                      </a>
                                    )}
                                    {q.status === 'pdf_pending' && (
                                      <>
                                        <input type="file" accept="application/pdf" onChange={e => setPdfFileMap(prev => ({ ...prev, [q.id]: e.target.files?.[0] ?? null }))} style={{ fontSize: '12px', cursor: 'pointer', maxWidth: '150px' }} />
                                        <button onClick={() => handleUploadPdf(q.id)} disabled={actionLoading === q.id || !pdfFileMap[q.id]} style={{ padding: '6px 12px', borderRadius: '980px', backgroundColor: pdfFileMap[q.id] ? '#d97706' : '#e5e7eb', color: pdfFileMap[q.id] ? '#fff' : '#9ca3af', border: 'none', cursor: pdfFileMap[q.id] ? 'pointer' : 'default', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          {actionLoading === q.id ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: '11px', height: '11px' }} />} Envoyer
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* ── AVOIRS & CONTRATS ── */}
                            {(dt === 'avoir' || dt === 'contrat') && docs.map((q: any) => (
                              <div key={q.id} style={{ border: '1px solid rgba(0,0,0,.07)', borderRadius: '14px', padding: '14px 18px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '13px' }}>#{q.id}</div>
                                  <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>
                                    {new Date(q.startDate).toLocaleDateString('fr-FR')} → {new Date(q.endDate).toLocaleDateString('fr-FR')}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#86868b' }}>{q.totalHT.toLocaleString('fr-FR')} € HT</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', backgroundColor: '#f5f5f7', color: '#6e6e73' }}>{dt === 'avoir' ? 'Avoir' : 'Contrat'}</span>
                                  {q.pdfUrl && (
                                    <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', backgroundColor: '#e2fbe8', color: '#1db954', textDecoration: 'none', fontWeight: 700, fontSize: '11px' }}>
                                      <Download style={{ width: '11px', height: '11px' }} /> PDF
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}

                          </div>
                        </div>
                      );
                    }))}
                  </div>
                )}

              </div>
            );
          })
        )}

      </main>

      {/* Logistics Scanner Modal */}
      <ScannerModal
        isOpen={isLogisticsScannerOpen}
        onClose={() => setIsLogisticsScannerOpen(false)}
        onScanSuccess={handleLogisticsScanSuccess}
        title="Scanner matériel logistique"
      />

      <Footer />
    </div>
  );
}
