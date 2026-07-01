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
  Shield,
  ShieldCheck,
  ShieldAlert,
  Euro,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  ExternalLink,
  X,
  Banknote,
  ClipboardList,
  FileImage,
  Send,
  PenLine,
  Plus,
  FolderOpen,
  Eye,
  FileCheck2,
} from 'lucide-react';
import { groupQuotesByProject, getProjectStatus, projectStatusLabel, projectStatusColors } from '@/lib/project-grouping';
import ScannerModal from '@/components/scanner-modal';
import SignaturePad from '@/components/signature-pad';
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
  depositAmount: number | null;
  depositStatus: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'RELEASED' | 'BYPASSED' | null;
  stripePaymentIntentId: string | null;
  invoiceStripePaymentIntentId: string | null;
  invoicePaymentStatus: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CASH' | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
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

interface Inspection {
  id: string;
  quoteId: string;
  type: 'DEPART' | 'RETOUR';
  photoUrls: string[];
  adminSignature: string;
  adminSignedAt: string;
  clientSignature: string | null;
  clientSignedAt: string | null;
  clientIp: string | null;
  clientDevice: string | null;
  clientGeoLocation: string | null;
  clientUserId: string | null;
  status: 'PENDING_CLIENT' | 'COMPLETED';
  createdAt: string;
  // enriched from API join
  clientName?: string;
  clientEmail?: string;
}

interface DocumentRequest {
  id: string;
  customerId: string;
  requestedTypes: string;
  token: string;
  status: 'PENDING' | 'COMPLETED';
  expiresAt: string;
  createdAt: string;
}

interface CustomerDocument {
  id: string;
  customerId: string;
  requestId: string | null;
  documentType: string;
  filePath: string;
  uploadedAt: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  id_card_recto: "Carte d'identité (Recto)",
  id_card_verso: "Carte d'identité (Verso)",
  proof_of_address: 'Justificatif de domicile',
  insurance_certificate: "Attestation d'assurance",
  other: 'Autre document',
};

const ALL_DOC_TYPES = Object.keys(DOC_TYPE_LABELS);

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

  const fetchInspections = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/admin/inspections/${quoteId}`);
      const data = await res.json();
      if (data.success) {
        setInspections(prev => ({ ...prev, [quoteId]: data.inspections }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendInspection = async (quoteId: string) => {
    const type = inspectionType[quoteId] ?? 'DEPART';
    const photos = inspectionPhotos[quoteId] ?? [];
    const signature = inspectionSignature[quoteId] ?? '';

    if (!signature) {
      alert('Veuillez apposer votre signature avant d\'envoyer.');
      return;
    }

    setInspectionLoading(quoteId);
    try {
      const formData = new FormData();
      formData.append('quoteId', quoteId);
      formData.append('type', type);
      formData.append('adminSignature', signature);
      for (const photo of photos) {
        formData.append('photos', photo);
      }
      const res = await fetch('/api/admin/inspections', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setInspectionPhotos(prev => ({ ...prev, [quoteId]: [] }));
        setInspectionSignature(prev => ({ ...prev, [quoteId]: '' }));
        setShowInspectionForm(prev => ({ ...prev, [quoteId]: false }));
        await fetchInspections(quoteId);
      } else {
        alert(data.error || 'Erreur lors de la création de l\'état des lieux.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setInspectionLoading(null);
    }
  };

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
      fetchInspections(devisId);
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

  // Deposit / caution admin state
  const [depositAmountInput, setDepositAmountInput] = useState<{ [quoteId: string]: string }>({});
  const [depositActionLoading, setDepositActionLoading] = useState<string | null>(null);
  const [captureAmountInput, setCaptureAmountInput] = useState<{ [quoteId: string]: string }>({});
  const [showCaptureModal, setShowCaptureModal] = useState<string | null>(null);

  // Payment settings (IBAN/BIC for display under invoices)
  const [paymentSettings, setPaymentSettings] = useState<{ iban: string; bic: string; instructions: string } | null>(null);

  // Cancellation modal state
  const [cancellingQuoteId, setCancellingQuoteId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Inspection (état des lieux) states
  const [inspections, setInspections] = useState<Record<string, Inspection[]>>({});
  const [showInspectionForm, setShowInspectionForm] = useState<Record<string, boolean>>({});
  const [inspectionType, setInspectionType] = useState<Record<string, 'DEPART' | 'RETOUR'>>({});
  const [inspectionPhotos, setInspectionPhotos] = useState<Record<string, File[]>>({});
  const [inspectionSignature, setInspectionSignature] = useState<Record<string, string>>({});
  const [inspectionLoading, setInspectionLoading] = useState<string | null>(null);
  const [inspectionLightbox, setInspectionLightbox] = useState<string | null>(null);

  // Document management
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [clientDocs, setClientDocs] = useState<CustomerDocument[]>([]);
  const [docSectionLoading, setDocSectionLoading] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [docRequestLoading, setDocRequestLoading] = useState(false);

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
      fetchDocuments(clientId);
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

  const fetchDocuments = async (id: string) => {
    setDocSectionLoading(true);
    try {
      const res = await fetch(`/api/admin/document-requests/${id}`);
      const data = await res.json();
      if (data.success) {
        setDocRequests(data.requests);
        setClientDocs(data.documents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDocSectionLoading(false);
    }
  };

  const handleSendDocRequest = async () => {
    if (!selectedDocTypes.length) return;
    setDocRequestLoading(true);
    try {
      const res = await fetch('/api/admin/document-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: clientId, requestedTypes: selectedDocTypes }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDocModal(false);
        setSelectedDocTypes([]);
        fetchDocuments(clientId);
      } else {
        alert(data.error || 'Erreur lors de l\'envoi de la demande.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setDocRequestLoading(false);
    }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      const res = await fetch('/api/admin/documents/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      const data = await res.json();
      if (data.success) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Impossible de générer l\'URL de visualisation.');
      }
    } catch {
      alert('Erreur réseau.');
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

  const handleSetDepositAmount = async (quoteId: string) => {
    const amount = parseFloat(depositAmountInput[quoteId] ?? '0');
    if (isNaN(amount) || amount < 0) { alert('Montant invalide.'); return; }
    setDepositActionLoading(quoteId + '-set');
    try {
      const res = await fetch('/api/admin/deposits/set-amount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, depositAmount: amount }),
      });
      const data = await res.json();
      if (data.success) { fetchClientData(); } else { alert(data.error || 'Erreur'); }
    } catch { alert('Erreur réseau.'); }
    finally { setDepositActionLoading(null); }
  };

  const handleDepositRelease = async (quoteId: string) => {
    if (!confirm('Libérer la caution ? L\'empreinte bancaire sera annulée.')) return;
    setDepositActionLoading(quoteId + '-release');
    try {
      const res = await fetch('/api/admin/deposits/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (data.success) { fetchClientData(); } else { alert(data.error || 'Erreur'); }
    } catch { alert('Erreur réseau.'); }
    finally { setDepositActionLoading(null); }
  };

  const handleDepositCapture = async (quoteId: string) => {
    const partial = parseFloat(captureAmountInput[quoteId] ?? '');
    setDepositActionLoading(quoteId + '-capture');
    try {
      const res = await fetch('/api/admin/deposits/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, amountToCapture: isNaN(partial) ? undefined : partial }),
      });
      const data = await res.json();
      if (data.success) { setShowCaptureModal(null); fetchClientData(); } else { alert(data.error || 'Erreur'); }
    } catch { alert('Erreur réseau.'); }
    finally { setDepositActionLoading(null); }
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

  const handleMarkCash = async (quoteId: string) => {
    if (!window.confirm(`Confirmer le paiement en espèces pour #${quoteId} ?`)) return;
    setActionLoading(quoteId + '-cash');
    try {
      const res = await fetch('/api/admin/invoices/mark-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchClientData();
      } else {
        alert(data.error || 'Erreur lors de la mise à jour.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQuote = async (quoteId: string, docType: string) => {
    const label = docType === 'facture' ? 'cette facture' : docType === 'avoir' ? 'cet avoir' : 'ce devis';
    if (!window.confirm(`Supprimer définitivement ${label} (#${quoteId}) ? Cette action est irréversible.`)) return;
    setActionLoading(quoteId + '-delete');
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchClientData();
      } else {
        alert(data.error || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelQuote = async () => {
    if (!cancellingQuoteId) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/admin/quotes/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: cancellingQuoteId, reason: cancelReason }),
      });
      const data = await res.json();
      if (data.success) {
        setCancellingQuoteId(null);
        setCancelReason('');
        fetchClientData();
      } else {
        alert(data.error || 'Erreur lors de l\'annulation.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setCancelLoading(false);
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

        {/* ── Documents Administratifs ─────────────────────────────── */}
        {(() => {
          const pendingRequest = docRequests.find(r => r.status === 'PENDING' && new Date(r.expiresAt) > new Date());
          const hasDocuments = clientDocs.length > 0;

          return (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
              <div style={{ padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e8f1fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FolderOpen style={{ width: '18px', height: '18px', color: '#0071e3' }} />
                  </div>
                  Documents administratifs
                </h3>
                {!pendingRequest && !hasDocuments && !docSectionLoading && (
                  <button
                    onClick={() => setShowDocModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} /> Demander des documents
                  </button>
                )}
              </div>

              <div style={{ padding: '20px 26px' }}>
                {docSectionLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86868b', fontSize: '13px' }}>
                    <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Chargement…
                  </div>
                ) : hasDocuments ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <FileCheck2 style={{ width: '14px', height: '14px', color: '#15803d' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>{clientDocs.length} document{clientDocs.length > 1 ? 's' : ''} reçu{clientDocs.length > 1 ? 's' : ''}</span>
                    </div>
                    {clientDocs.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#f5f5f7', gap: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</div>
                          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>
                            Reçu le {new Date(doc.uploadedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewDocument(doc.filePath)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '980px', backgroundColor: '#e8f1fd', color: '#0071e3', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit', flexShrink: 0 }}
                        >
                          <Eye style={{ width: '12px', height: '12px' }} /> Visualiser
                        </button>
                      </div>
                    ))}
                  </div>
                ) : pendingRequest ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '14px', backgroundColor: '#fff3cd', border: '1px solid rgba(217,119,6,.2)' }}>
                    <Clock style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400e' }}>En attente des documents du client</div>
                      <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                        Lien envoyé — expire le {new Date(pendingRequest.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' · '}Documents demandés : {(JSON.parse(pendingRequest.requestedTypes) as string[]).map(t => DOC_TYPE_LABELS[t] ?? t).join(', ')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#86868b', fontSize: '13px' }}>
                    Aucun document administratif n'a encore été demandé ou reçu pour ce client.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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

            const devisDoc = project.quotes.find(q => q.docType === 'devis' && (q.status === 'validated' || q.status === 'locked'));
            const isLogisticsEligible = !!devisDoc;

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
                        const devis = project.quotes.find(q => q.docType === 'devis' && (q.status === 'validated' || q.status === 'locked'));
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
                      const devis = project.quotes.find(q => q.docType === 'devis' && (q.status === 'validated' || q.status === 'locked'));
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

                          {/* ── États des lieux ───────────────────────────────────────── */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClipboardList style={{ width: '16px', height: '16px', color: '#0071e3' }} />
                                États des lieux
                              </h4>
                              <button
                                onClick={() => setShowInspectionForm(prev => ({ ...prev, [devis.id]: !prev[devis.id] }))}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '980px', backgroundColor: showInspectionForm[devis.id] ? '#f5f5f7' : '#0071e3', color: showInspectionForm[devis.id] ? '#1d1d1f' : '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit' }}
                              >
                                <Plus style={{ width: '13px', height: '13px' }} />
                                {showInspectionForm[devis.id] ? 'Annuler' : 'Créer un état des lieux'}
                              </button>
                            </div>

                            {/* Existing inspections */}
                            {(inspections[devis.id] ?? []).map(insp => {
                              const fmtDT = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                              return (
                                <div key={insp.id} style={{ border: `1px solid ${insp.status === 'COMPLETED' ? 'rgba(21,128,61,.2)' : 'rgba(0,113,227,.2)'}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 800, padding: '3px 10px', borderRadius: '980px', backgroundColor: insp.type === 'DEPART' ? '#e8f1fd' : '#dcfce7', color: insp.type === 'DEPART' ? '#0071e3' : '#15803d' }}>
                                        {insp.type === 'DEPART' ? '📦 Départ' : '🚛 Retour'}
                                      </span>
                                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: insp.status === 'COMPLETED' ? '#e2fbe8' : '#fff3cd', color: insp.status === 'COMPLETED' ? '#15803d' : '#d97706' }}>
                                        {insp.status === 'COMPLETED' ? '✓ Signé' : 'En attente client'}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#86868b' }}>{fmtDT(insp.createdAt)}</span>
                                  </div>

                                  {/* Photos thumbnails */}
                                  {insp.photoUrls.length > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {insp.photoUrls.map((url, i) => (
                                        <div key={i} onClick={() => setInspectionLightbox(url)} style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }}>
                                          <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Signatures côte à côte */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                      <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Signature Admin</p>
                                      <img src={insp.adminSignature} alt="Signature admin" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(0,0,0,.08)', backgroundColor: '#fafaf9' }} />
                                      <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#86868b' }}>{fmtDT(insp.adminSignedAt)}</p>
                                    </div>
                                    <div>
                                      <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Signature Client</p>
                                      {insp.clientSignature ? (
                                        <>
                                          <img src={insp.clientSignature} alt="Signature client" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(0,0,0,.08)', backgroundColor: '#fafaf9' }} />
                                          <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#15803d', fontWeight: 600 }}>{fmtDT(insp.clientSignedAt!)}</p>
                                        </>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', borderRadius: '8px', border: '1px dashed rgba(0,0,0,.12)', backgroundColor: '#fafaf9' }}>
                                          <span style={{ fontSize: '11px', color: '#c7c7cc', fontStyle: 'italic' }}>En attente de la signature client…</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Certificat de Validation Juridique (COMPLETED seulement) */}
                                  {insp.status === 'COMPLETED' && (
                                    <div style={{ borderRadius: '12px', border: '1px solid rgba(21,128,61,.25)', backgroundColor: '#f0fdf4', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <ShieldCheck style={{ width: '14px', height: '14px', color: '#15803d', flexShrink: 0 }} />
                                        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#15803d' }}>
                                          Certificat de Validation Juridique
                                        </span>
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '11px', color: '#1d1d1f' }}>
                                        <div>
                                          <span style={{ color: '#6e6e73', display: 'block', marginBottom: '1px', fontSize: '10px' }}>Statut</span>
                                          <strong style={{ color: '#15803d' }}>✓ Validé et signé numériquement</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: '#6e6e73', display: 'block', marginBottom: '1px', fontSize: '10px' }}>Date et heure (horodatage)</span>
                                          <strong>{insp.clientSignedAt ? new Date(insp.clientSignedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: '#6e6e73', display: 'block', marginBottom: '1px', fontSize: '10px' }}>Compte utilisateur</span>
                                          <strong>{insp.clientName ?? '—'}</strong>
                                          {insp.clientEmail && <span style={{ display: 'block', color: '#6e6e73', fontFamily: 'monospace', fontSize: '10px' }}>{insp.clientEmail}</span>}
                                        </div>
                                        <div>
                                          <span style={{ color: '#6e6e73', display: 'block', marginBottom: '1px', fontSize: '10px' }}>Adresse IP</span>
                                          <strong style={{ fontFamily: 'monospace' }}>{insp.clientIp ?? '—'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: '#6e6e73', display: 'block', marginBottom: '1px', fontSize: '10px' }}>Localisation estimée</span>
                                          <strong>{insp.clientGeoLocation ?? '—'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: '#6e6e73', display: 'block', marginBottom: '1px', fontSize: '10px' }}>Appareil utilisé</span>
                                          <strong>{insp.clientDevice ?? '—'}</strong>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {(inspections[devis.id] ?? []).length === 0 && !showInspectionForm[devis.id] && (
                              <div style={{ padding: '20px', textAlign: 'center', borderRadius: '14px', border: '1px dashed rgba(0,0,0,.12)', color: '#86868b', fontSize: '13px' }}>
                                Aucun état des lieux créé pour ce projet.
                              </div>
                            )}

                            {/* New inspection form */}
                            {showInspectionForm[devis.id] && (
                              <div style={{ border: '2px solid #0071e3', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px', backgroundColor: '#fafcff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <PenLine style={{ width: '16px', height: '16px', color: '#0071e3' }} />
                                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#0071e3' }}>Nouvel état des lieux</span>
                                </div>

                                {/* Type selector */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1d1d1f' }}>Type d'état des lieux</label>
                                  <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.05)', padding: '3px', borderRadius: '980px', width: 'fit-content' }}>
                                    {(['DEPART', 'RETOUR'] as const).map(t => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => setInspectionType(prev => ({ ...prev, [devis.id]: t }))}
                                        style={{ padding: '7px 18px', borderRadius: '980px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', backgroundColor: (inspectionType[devis.id] ?? 'DEPART') === t ? '#1d1d1f' : 'transparent', color: (inspectionType[devis.id] ?? 'DEPART') === t ? '#fff' : '#6e6e73' }}
                                      >
                                        {t === 'DEPART' ? '📦 Départ' : '🚛 Retour'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Photo upload */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileImage style={{ width: '13px', height: '13px' }} />
                                    Photos du matériel (max 10)
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={e => {
                                      const files = Array.from(e.target.files ?? []).slice(0, 10);
                                      setInspectionPhotos(prev => ({ ...prev, [devis.id]: files }));
                                    }}
                                    style={{ fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                                  />
                                  {(inspectionPhotos[devis.id] ?? []).length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                      {(inspectionPhotos[devis.id] ?? []).map((f, i) => (
                                        <div key={i} style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,.1)', flexShrink: 0 }}>
                                          <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Admin signature */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <PenLine style={{ width: '13px', height: '13px' }} />
                                    Votre signature (Admin)
                                  </label>
                                  <SignaturePad
                                    onChange={sig => setInspectionSignature(prev => ({ ...prev, [devis.id]: sig }))}
                                  />
                                </div>

                                {/* Send button */}
                                <button
                                  type="button"
                                  onClick={() => handleSendInspection(devis.id)}
                                  disabled={!inspectionSignature[devis.id] || inspectionLoading === devis.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    backgroundColor: inspectionSignature[devis.id] && inspectionLoading !== devis.id ? '#0071e3' : '#c7c7cc',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: inspectionSignature[devis.id] && inspectionLoading !== devis.id ? 'pointer' : 'default',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    fontFamily: 'inherit',
                                    transition: 'background 0.2s',
                                  }}
                                >
                                  {inspectionLoading === devis.id
                                    ? <><Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Envoi en cours…</>
                                    : <><Send style={{ width: '14px', height: '14px' }} /> Envoyer la demande de signature au client</>
                                  }
                                </button>
                              </div>
                            )}
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
                                    <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: '10px', overflowX: 'auto' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: 380 }}>
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
                                    <div style={{ border: '1px solid rgba(0,0,0,.05)', borderRadius: '8px', overflowX: 'auto', fontSize: '12px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 300 }}>
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
                                            <button onClick={() => { setCancellingQuoteId(q.id); setCancelReason(''); }} disabled={actionLoading === q.id} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              <Ban style={{ width: '11px', height: '11px' }} /> Refuser
                                            </button>
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
                                            <button onClick={() => { setCancellingQuoteId(q.id); setCancelReason(''); }} disabled={actionLoading === q.id} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              <Ban style={{ width: '11px', height: '11px' }} /> Annuler
                                            </button>
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
                                              <button onClick={() => { setCancellingQuoteId(q.id); setCancelReason(''); }} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,.4)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Ban style={{ width: '11px', height: '11px' }} /> Annuler la location
                                              </button>
                                            </>
                                          );
                                        })()}
                                        {q.status === 'locked' && (
                                          <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', backgroundColor: '#e2fbe8', border: '1px solid #bbf7d0' }}>
                                              <Lock style={{ width: '11px', height: '11px', color: '#1db954' }} />
                                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>Règlement confirmé — inventaire verrouillé</span>
                                            </div>
                                            <button onClick={() => { setCancellingQuoteId(q.id); setCancelReason(''); }} style={{ padding: '7px 12px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,.4)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              <Ban style={{ width: '11px', height: '11px' }} /> Annuler la location
                                            </button>
                                          </>
                                        )}
                                        <button
                                          title={`Supprimer ${q.docType === 'facture' ? 'la facture' : q.docType === 'avoir' ? "l'avoir" : 'le devis'}`}
                                          onClick={() => handleDeleteQuote(q.id, q.docType)}
                                          disabled={actionLoading === q.id + '-delete'}
                                          style={{ marginLeft: 'auto', padding: '6px', borderRadius: '8px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: actionLoading === q.id + '-delete' ? 0.5 : 1 }}
                                        >
                                          {actionLoading === q.id + '-delete'
                                            ? <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />
                                            : <Trash2 style={{ width: '13px', height: '13px' }} />}
                                        </button>
                                      </div>
                                    </div>

                                    {/* ── Deposit / Caution panel (validated & locked devis) ── */}
                                    {(q.status === 'validated' || q.status === 'locked') && (
                                      <div style={{ marginTop: '14px', padding: '16px', borderRadius: '14px', backgroundColor: '#f5f5f7', border: '1px solid rgba(0,0,0,.06)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                          <Shield style={{ width: '15px', height: '15px', color: '#6e6e73' }} />
                                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#1d1d1f', textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>Caution / Empreinte bancaire</span>
                                          {q.depositStatus && (
                                            <span style={{
                                              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px',
                                              backgroundColor: q.depositStatus === 'AUTHORIZED' ? '#e8f1fd' : q.depositStatus === 'CAPTURED' ? '#fef2f2' : q.depositStatus === 'RELEASED' ? '#e2fbe8' : '#fff3cd',
                                              color: q.depositStatus === 'AUTHORIZED' ? '#0071e3' : q.depositStatus === 'CAPTURED' ? '#ef4444' : q.depositStatus === 'RELEASED' ? '#15803d' : '#d97706',
                                            }}>
                                              {q.depositStatus === 'AUTHORIZED' ? 'Autorisée' : q.depositStatus === 'CAPTURED' ? 'Encaissée' : q.depositStatus === 'RELEASED' ? 'Libérée' : 'En attente'}
                                            </span>
                                          )}
                                        </div>

                                        {/* Set/update deposit amount */}
                                        {(!q.depositStatus || q.depositStatus === 'PENDING') && (
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: q.depositAmount ? '12px' : '0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', backgroundColor: '#fff', flex: 1, maxWidth: '180px' }}>
                                              <Euro style={{ width: '12px', height: '12px', color: '#86868b', flexShrink: 0 }} />
                                              <input
                                                type="number"
                                                placeholder="Montant"
                                                min="0"
                                                step="0.01"
                                                value={depositAmountInput[q.id] ?? (q.depositAmount ? String(q.depositAmount) : '')}
                                                onChange={e => setDepositAmountInput(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', fontFamily: 'inherit', backgroundColor: 'transparent' }}
                                              />
                                            </div>
                                            <button
                                              onClick={() => handleSetDepositAmount(q.id)}
                                              disabled={depositActionLoading === q.id + '-set'}
                                              style={{ padding: '6px 14px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' as const }}
                                            >
                                              {depositActionLoading === q.id + '-set' ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : <Shield style={{ width: '11px', height: '11px' }} />}
                                              {q.depositAmount ? 'Modifier' : 'Définir la caution'}
                                            </button>
                                          </div>
                                        )}

                                        {/* AUTHORIZED: offer release or capture */}
                                        {q.depositStatus === 'AUTHORIZED' && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0071e3' }}>
                                              <ShieldCheck style={{ width: '15px', height: '15px' }} />
                                              {q.depositAmount?.toLocaleString('fr-FR')} € bloqués
                                            </div>
                                            <button
                                              onClick={() => handleDepositRelease(q.id)}
                                              disabled={depositActionLoading === q.id + '-release'}
                                              style={{ padding: '6px 14px', borderRadius: '980px', backgroundColor: '#e2fbe8', color: '#15803d', border: '1px solid rgba(21,128,61,.2)', cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            >
                                              {depositActionLoading === q.id + '-release' ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : <ShieldCheck style={{ width: '11px', height: '11px' }} />}
                                              Libérer la caution
                                            </button>
                                            <button
                                              onClick={() => setShowCaptureModal(q.id)}
                                              disabled={depositActionLoading === q.id + '-capture'}
                                              style={{ padding: '6px 14px', borderRadius: '980px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)', cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            >
                                              <ShieldAlert style={{ width: '11px', height: '11px' }} />
                                              Encaisser la caution
                                            </button>

                                            {/* Inline capture modal */}
                                            {showCaptureModal === q.id && (
                                              <div style={{ width: '100%', marginTop: '8px', padding: '14px', backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c' }}>
                                                  Montant à encaisser (laisser vide pour encaisser la totalité : {q.depositAmount?.toLocaleString('fr-FR')} €)
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '980px', border: '1px solid rgba(239,68,68,.25)', backgroundColor: '#fff', flex: 1, maxWidth: '160px' }}>
                                                    <Euro style={{ width: '12px', height: '12px', color: '#ef4444', flexShrink: 0 }} />
                                                    <input
                                                      type="number"
                                                      placeholder={`max ${q.depositAmount}`}
                                                      min="1"
                                                      max={q.depositAmount ?? undefined}
                                                      step="0.01"
                                                      value={captureAmountInput[q.id] ?? ''}
                                                      onChange={e => setCaptureAmountInput(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                      style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', fontFamily: 'inherit', backgroundColor: 'transparent' }}
                                                    />
                                                  </div>
                                                  <button
                                                    onClick={() => handleDepositCapture(q.id)}
                                                    disabled={depositActionLoading === q.id + '-capture'}
                                                    style={{ padding: '6px 14px', borderRadius: '980px', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                  >
                                                    {depositActionLoading === q.id + '-capture' ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> : 'Confirmer encaissement'}
                                                  </button>
                                                  <button onClick={() => setShowCaptureModal(null)} style={{ padding: '6px 10px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', backgroundColor: 'transparent', cursor: 'pointer', color: '#6e6e73', fontSize: '12px' }}>
                                                    Annuler
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {q.depositStatus === 'CAPTURED' && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>
                                            <ShieldAlert style={{ width: '15px', height: '15px' }} />
                                            Caution encaissée — {q.depositAmount?.toLocaleString('fr-FR')} €
                                          </div>
                                        )}

                                        {q.depositStatus === 'RELEASED' && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                                            <ShieldCheck style={{ width: '15px', height: '15px' }} />
                                            Caution libérée — aucun prélèvement
                                          </div>
                                        )}
                                        {q.stripePaymentIntentId && (
                                          <a
                                            href={`https://dashboard.stripe.com/payments/${q.stripePaymentIntentId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#86868b', marginTop: '6px', textDecoration: 'none', fontFamily: 'monospace' }}
                                          >
                                            <ExternalLink style={{ width: '10px', height: '10px' }} />
                                            {q.stripePaymentIntentId}
                                          </a>
                                        )}
                                      </div>
                                    )}

                                    {/* ── Cancellation info (if cancelled) ── */}
                                    {q.status === 'cancelled' && (
                                      <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)', display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                          <Ban style={{ width: '13px', height: '13px', color: '#ef4444' }} />
                                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444' }}>
                                            Annulée{(q as any).cancelledAt ? ` le ${new Date((q as any).cancelledAt).toLocaleDateString('fr-FR')}` : ''}
                                          </span>
                                        </div>
                                        {(q as any).cancellationReason && (
                                          <p style={{ margin: 0, fontSize: '12px', color: '#6e6e73', lineHeight: 1.6, paddingLeft: '20px', fontStyle: 'italic' }}>
                                            "{(q as any).cancellationReason}"
                                          </p>
                                        )}
                                      </div>
                                    )}
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
                                  {/* ── Activité de paiement ── */}
                                  <div style={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,.08)', overflow: 'hidden' }}>
                                    <div style={{ padding: '9px 14px', backgroundColor: '#f5f5f7', borderBottom: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                      <CreditCard style={{ width: '12px', height: '12px', color: '#3c3c43' }} />
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#3c3c43', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Activité de paiement</span>
                                    </div>

                                    {q.invoicePaymentStatus === 'CASH' ? (
                                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Banknote style={{ width: '16px', height: '16px', color: '#15803d', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                                            Paiement en espèces — Réglé ✓
                                          </div>
                                          <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>
                                            Enregistré manuellement par l'administrateur
                                          </div>
                                        </div>
                                      </div>
                                    ) : q.invoiceStripePaymentIntentId ? (
                                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {q.invoicePaymentStatus === 'SUCCEEDED'
                                          ? <CheckCircle2 style={{ width: '16px', height: '16px', color: '#15803d', flexShrink: 0 }} />
                                          : q.invoicePaymentStatus === 'FAILED'
                                          ? <XCircle style={{ width: '16px', height: '16px', color: '#ef4444', flexShrink: 0 }} />
                                          : <Clock style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0 }} />
                                        }
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '12px', fontWeight: 700, color: q.invoicePaymentStatus === 'SUCCEEDED' ? '#15803d' : q.invoicePaymentStatus === 'FAILED' ? '#ef4444' : '#d97706' }}>
                                            Carte / Stripe —{' '}
                                            {q.invoicePaymentStatus === 'SUCCEEDED' ? 'Paiement réussi ✓' : q.invoicePaymentStatus === 'FAILED' ? 'Paiement échoué' : 'En cours / tentative'}
                                          </div>
                                          <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                            {q.invoiceStripePaymentIntentId}
                                          </div>
                                        </div>
                                        <a
                                          href={`https://dashboard.stripe.com/payments/${q.invoiceStripePaymentIntentId}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#0071e3', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' as const, flexShrink: 0 }}
                                        >
                                          <ExternalLink style={{ width: '11px', height: '11px' }} /> Stripe
                                        </a>
                                      </div>
                                    ) : (
                                      <div style={{ padding: '10px 14px', fontSize: '12px', color: '#86868b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <Clock style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                                        Aucune tentative de paiement en ligne enregistrée.
                                      </div>
                                    )}

                                    {/* Bouton paiement en espèces — visible tant que non réglé */}
                                    {q.invoicePaymentStatus !== 'SUCCEEDED' && q.invoicePaymentStatus !== 'CASH' && (
                                      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(0,0,0,.05)', backgroundColor: '#fafafa' }}>
                                        <button
                                          onClick={() => handleMarkCash(q.id)}
                                          disabled={actionLoading === q.id + '-cash'}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '980px', backgroundColor: 'transparent', color: '#15803d', border: '1px solid rgba(21,128,61,.3)', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}
                                        >
                                          {actionLoading === q.id + '-cash'
                                            ? <Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} />
                                            : <Banknote style={{ width: '11px', height: '11px' }} />
                                          }
                                          Marquer payé en espèces
                                        </button>
                                      </div>
                                    )}

                                    {/* Virement possible — remind admin of IBAN if amount > 1500 */}
                                    {!q.invoiceStripePaymentIntentId && paymentSettings && (paymentSettings.iban || paymentSettings.bic) && (
                                      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(0,0,0,.05)', backgroundColor: '#fafafa', display: 'flex', flexWrap: 'wrap' as const, gap: '12px' }}>
                                        {paymentSettings.iban && (
                                          <span style={{ fontSize: '11px', color: '#86868b' }}>
                                            IBAN : <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d1d1f' }}>{paymentSettings.iban}</span>
                                          </span>
                                        )}
                                        {paymentSettings.bic && (
                                          <span style={{ fontSize: '11px', color: '#86868b' }}>
                                            BIC : <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d1d1f' }}>{paymentSettings.bic}</span>
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
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
                                    <button
                                      title="Supprimer la facture"
                                      onClick={() => handleDeleteQuote(q.id, q.docType)}
                                      disabled={actionLoading === q.id + '-delete'}
                                      style={{ marginLeft: 'auto', padding: '6px', borderRadius: '8px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: actionLoading === q.id + '-delete' ? 0.5 : 1 }}
                                    >
                                      {actionLoading === q.id + '-delete' ? <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} /> : <Trash2 style={{ width: '13px', height: '13px' }} />}
                                    </button>
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
                                  <button
                                    title={`Supprimer ${dt === 'avoir' ? "l'avoir" : 'le contrat'}`}
                                    onClick={() => handleDeleteQuote(q.id, q.docType)}
                                    disabled={actionLoading === q.id + '-delete'}
                                    style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: actionLoading === q.id + '-delete' ? 0.5 : 1 }}
                                  >
                                    {actionLoading === q.id + '-delete' ? <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} /> : <Trash2 style={{ width: '13px', height: '13px' }} />}
                                  </button>
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

      {/* ── Cancellation modal ──────────────────────────────────────────────── */}
      {cancellingQuoteId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) { setCancellingQuoteId(null); setCancelReason(''); } }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px',
            padding: '28px', width: '100%', maxWidth: '480px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            fontFamily: 'var(--font-hanken-grotesk), -apple-system, sans-serif',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ban style={{ width: 20, height: 20, color: '#ef4444' }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1d1d1f' }}>Annuler la location</div>
                  <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>#{cancellingQuoteId}</div>
                </div>
              </div>
              <button
                onClick={() => { setCancellingQuoteId(null); setCancelReason(''); }}
                style={{ padding: 6, borderRadius: 8, border: '1px solid rgba(0,0,0,.1)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#86868b' }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Warning */}
            <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: '#fff3cd', border: '1px solid rgba(217,119,6,.25)', marginBottom: 20, fontSize: 13, color: '#92400e', lineHeight: 1.65 }}>
              <strong>Attention :</strong> Cette action va annuler la location et libérer automatiquement tous les articles physiques associés (RENTED → AVAILABLE). Si une caution est autorisée, elle sera également annulée.
            </div>

            {/* Reason textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>
                Motif d'annulation <span style={{ color: '#86868b', fontWeight: 400 }}>(optionnel mais recommandé)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ex : Annulation client pour force majeure — événement reporté au..."
                rows={4}
                style={{
                  padding: '12px 14px', borderRadius: 12,
                  border: '1px solid rgba(0,0,0,.15)', outline: 'none',
                  fontSize: 13, color: '#1d1d1f',
                  fontFamily: 'inherit', resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setCancellingQuoteId(null); setCancelReason(''); }}
                disabled={cancelLoading}
                style={{ padding: '10px 18px', borderRadius: 980, backgroundColor: '#f5f5f7', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}
              >
                Fermer
              </button>
              <button
                onClick={handleCancelQuote}
                disabled={cancelLoading}
                style={{ padding: '10px 20px', borderRadius: 980, backgroundColor: cancelLoading ? '#86868b' : '#ef4444', color: '#fff', border: 'none', cursor: cancelLoading ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', transition: 'background 0.2s' }}
              >
                {cancelLoading
                  ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Annulation…</>
                  : <><Ban style={{ width: 14, height: 14 }} /> Confirmer l'annulation</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Request Modal */}
      {showDocModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowDocModal(false); setSelectedDocTypes([]); } }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', fontFamily: 'var(--font-hanken-grotesk), -apple-system, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#e8f1fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FolderOpen style={{ width: 20, height: 20, color: '#0071e3' }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1d1d1f' }}>Demander des documents</div>
                  <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>{client?.name}</div>
                </div>
              </div>
              <button
                onClick={() => { setShowDocModal(false); setSelectedDocTypes([]); }}
                style={{ padding: 6, borderRadius: 8, border: '1px solid rgba(0,0,0,.1)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#86868b' }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 18px', lineHeight: 1.6 }}>
              Sélectionnez les pièces à demander. Un email avec un lien sécurisé sera envoyé au client.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {ALL_DOC_TYPES.map(type => {
                const checked = selectedDocTypes.includes(type);
                return (
                  <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${checked ? '#0071e3' : 'rgba(0,0,0,.1)'}`, backgroundColor: checked ? '#f0f7ff' : '#fafafa', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setSelectedDocTypes(prev => e.target.checked ? [...prev, type] : prev.filter(t => t !== type))}
                      style={{ width: 16, height: 16, accentColor: '#0071e3', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: checked ? 700 : 500, color: checked ? '#0071e3' : '#1d1d1f' }}>
                      {DOC_TYPE_LABELS[type]}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDocModal(false); setSelectedDocTypes([]); }}
                disabled={docRequestLoading}
                style={{ padding: '10px 18px', borderRadius: 980, backgroundColor: '#f5f5f7', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSendDocRequest}
                disabled={docRequestLoading || !selectedDocTypes.length}
                style={{ padding: '10px 20px', borderRadius: 980, backgroundColor: docRequestLoading || !selectedDocTypes.length ? '#86868b' : '#0071e3', color: '#fff', border: 'none', cursor: docRequestLoading || !selectedDocTypes.length ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', transition: 'background 0.2s' }}
              >
                {docRequestLoading
                  ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Envoi…</>
                  : <><Send style={{ width: 14, height: 14 }} /> Envoyer la demande</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Scanner Modal */}
      <ScannerModal
        isOpen={isLogisticsScannerOpen}
        onClose={() => setIsLogisticsScannerOpen(false)}
        onScanSuccess={handleLogisticsScanSuccess}
        title="Scanner matériel logistique"
      />

      {/* Inspection photo lightbox */}
      {inspectionLightbox && (
        <div
          onClick={() => setInspectionLightbox(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'zoom-out' }}
        >
          <img
            src={inspectionLightbox}
            alt="Photo agrandie"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', cursor: 'default' }}
          />
        </div>
      )}

      <Footer />
    </div>
  );
}
