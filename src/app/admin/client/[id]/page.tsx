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
  Trash2,
  Mail,
  Calendar,
  Download,
  Upload,
  AlertTriangle,
  Percent,
} from 'lucide-react';

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
  status: 'draft' | 'pending' | 'modified_by_admin' | 'pdf_pending' | 'validated' | 'cancelled';
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

  // Core lists
  const [client, setClient] = useState<ClientUser | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [tvaRate, setTvaRate] = useState(20);
  
  // Coefficients
  const [coeffWeekend, setCoeffWeekend] = useState(1.4);
  const [coeff3Jours, setCoeff3Jours] = useState(1.8);
  const [coeffSemaine, setCoeffSemaine] = useState(3.0);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Tab state: 'devis' | 'factures' | 'avoirs'
  const [activeTab, setActiveTab] = useState<'devis' | 'factures' | 'avoirs'>('devis');

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
          status: 'modified_by_admin', // changes status to modified which client needs to validate
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

  // Filter quotes into categories
  // Devis: pending, modified_by_admin, pdf_pending
  const clientDevis = quotes.filter(q => ['pending', 'modified_by_admin', 'pdf_pending'].includes(q.status));
  // Factures: validated (validated devis with attached PDF)
  const clientFactures = quotes.filter(q => q.status === 'validated');
  // Avoirs: cancelled
  const clientAvoirs = quotes.filter(q => q.status === 'cancelled');

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header subTitle="Administration - Client" links={[]} />

      <main style={{ flex: 1, maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '40px clamp(20px, 4vw, 40px)' }}>
        
        {/* Return link */}
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#86868b', fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>
          <ChevronLeft style={{ width: '16px', height: '16px' }} /> Retour au Dashboard
        </Link>

        {/* Client identity folder header */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,.02)', marginBottom: '30px' }}>
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

          {/* User role details */}
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0071e3', backgroundColor: '#e8f1fd', padding: '6px 12px', borderRadius: '980px' }}>
            Dossier Client N° {client.id.slice(0, 8)}
          </span>
        </div>

        {/* File tabs switch bar */}
        <div style={{ display: 'inline-flex', gap: '8px', backgroundColor: '#e8e8ed', padding: '4px', borderRadius: '980px', marginBottom: '30px' }}>
          <button
            onClick={() => setActiveTab('devis')}
            style={{
              padding: '8px 24px',
              borderRadius: '980px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all .2s',
              backgroundColor: activeTab === 'devis' ? '#ffffff' : 'transparent',
              color: '#1d1d1f',
              boxShadow: activeTab === 'devis' ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
            }}
          >
            Devis ({clientDevis.length})
          </button>
          <button
            onClick={() => setActiveTab('factures')}
            style={{
              padding: '8px 24px',
              borderRadius: '980px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all .2s',
              backgroundColor: activeTab === 'factures' ? '#ffffff' : 'transparent',
              color: '#1d1d1f',
              boxShadow: activeTab === 'factures' ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
            }}
          >
            Factures ({clientFactures.length})
          </button>
          <button
            onClick={() => setActiveTab('avoirs')}
            style={{
              padding: '8px 24px',
              borderRadius: '980px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all .2s',
              backgroundColor: activeTab === 'avoirs' ? '#ffffff' : 'transparent',
              color: '#1d1d1f',
              boxShadow: activeTab === 'avoirs' ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
            }}
          >
            Avoirs / Annulés ({clientAvoirs.length})
          </button>
        </div>

        {/* Dynamic tabs folders panel view */}
        
        {/* TAB 1: DEVIS PANEL */}
        {activeTab === 'devis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {clientDevis.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '50px 20px', textAlign: 'center', color: '#86868b', fontSize: '14px' }}>
                Aucune demande de devis en cours d'évaluation pour ce client.
              </div>
            ) : (
              clientDevis.map((q) => {
                const isEditing = editingQuoteId === q.id;

                if (isEditing) {
                  const { totalHT: liveHT, totalTTC: liveTTC, duration: liveDur, coeff: liveCoeff } = calculateEditTotals();
                  return (
                    <form key={q.id} onSubmit={handleSaveEdit} style={{ border: '2px solid #0071e3', borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '16px', color: '#0071e3' }}>Modification du Devis #{q.id}</div>
                          <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>Modifications soumises à la validation finale du client</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '980px', backgroundColor: '#e8f1fd', color: '#0071e3', textTransform: 'uppercase' }}>Mode Édition</span>
                      </div>

                      {/* Dates */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Date de début</label>
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={e => setEditStartDate(e.target.value)}
                            style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                            required
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Date de fin</label>
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={e => setEditEndDate(e.target.value)}
                            style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                            required
                          />
                        </div>
                      </div>

                      {/* Client remarks */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Notes ou remarques du dossier</label>
                        <textarea
                          rows={3}
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Instructions spéciales, notes sur la livraison..."
                          style={{ padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </div>

                      {/* Items lists */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Articles du devis :</label>
                        <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: '16px', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f5f5f7', borderBottom: '1px solid rgba(0,0,0,.06)', fontWeight: 600 }}>
                                <th style={{ padding: '12px 20px' }}>Matériel</th>
                                <th style={{ padding: '12px 20px' }}>Quantité</th>
                                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Tarif (HT)</th>
                                <th style={{ padding: '12px 20px', width: '50px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {editItems.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < editItems.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                  <td style={{ padding: '12px 20px' }}><strong>{it.brand}</strong> - {it.name}</td>
                                  <td style={{ padding: '12px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button type="button" onClick={() => handleUpdateEditItemQty(it.id, -1)} style={{ border: '1px solid #d1d1d6', backgroundColor: '#fff', borderRadius: '6px', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>-</button>
                                      <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{it.quantity}</span>
                                      <button type="button" onClick={() => handleUpdateEditItemQty(it.id, 1)} style={{ border: '1px solid #d1d1d6', backgroundColor: '#fff', borderRadius: '6px', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>+</button>
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                    {it.priceType === 'on_request' ? (
                                      <span style={{ color: '#86868b' }}>Sur devis</span>
                                    ) : (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                          type="number"
                                          value={it.price}
                                          onChange={e => handleUpdateEditItemPrice(it.id, Number(e.target.value))}
                                          style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,.15)', outline: 'none', textAlign: 'right' }}
                                          min="0"
                                          step="0.01"
                                        />
                                        <span>€</span>
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                                    <button type="button" onClick={() => handleRemoveEditItem(it.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                      <Trash2 style={{ width: '16px', height: '16px' }} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Add line */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                          <select
                            value={editAddItemSelect}
                            onChange={e => setEditAddItemSelect(e.target.value)}
                            style={{ flex: 1, padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px' }}
                          >
                            <option value="">-- Choisir un équipement à ajouter --</option>
                            {equipment.map(e => (
                              <option key={e.id} value={e.id}>
                                {e.brand} - {e.name} ({e.priceType === 'on_request' ? 'Sur devis' : `${e.price} € ${e.priceTax}`})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAddEditItem(editAddItemSelect)}
                            style={{ padding: '10px 22px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}
                          >
                            + Ajouter
                          </button>
                        </div>

                        {/* Discount */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', maxWidth: '300px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>Remise / Promo (%) :</label>
                          <input
                            type="number"
                            value={editDiscount}
                            onChange={e => setEditDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                            style={{ width: '80px', padding: '6px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', textAlign: 'center', fontSize: '13px' }}
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: '#6e6e73' }}>
                          <div>Durée : <strong>{liveDur} jour{liveDur > 1 ? 's' : ''}</strong></div>
                          <div>Coefficient : <strong>x{liveCoeff.toFixed(2)}</strong></div>
                          <div>Total Estimé HT : <strong style={{ color: '#1d1d1f', fontSize: '16px' }}>{liveHT.toLocaleString('fr-FR')} €</strong></div>
                          <div>Total TTC : <strong style={{ color: '#86868b' }}>{liveTTC.toLocaleString('fr-FR')} €</strong></div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="submit"
                            disabled={actionLoading === q.id}
                            style={{ padding: '10px 22px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            {actionLoading === q.id ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : 'Enregistrer'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuoteId(null)}
                            style={{ padding: '10px 22px', borderRadius: '980px', backgroundColor: '#e8e8ed', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                }

                // Normal template view
                return (
                  <div key={q.id} style={{ backgroundColor: '#ffffff', border: `1px solid ${q.status === 'pdf_pending' ? 'rgba(217,119,6,.35)' : 'rgba(0,0,0,.08)'}`, borderRadius: '20px', overflow: 'hidden', boxShadow: q.status === 'pdf_pending' ? '0 0 0 3px rgba(217,119,6,.08)' : '0 4px 18px rgba(0,0,0,.01)' }}>
                    {/* Banner for pdf_pending */}
                    {q.status === 'pdf_pending' && (
                      <div style={{ backgroundColor: '#fef3c7', borderBottom: '1px solid rgba(217,119,6,.2)', padding: '10px 26px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Upload style={{ width: '16px', height: '16px', color: '#b45309', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>Action requise — Envoi du PDF en cours. Uploadez le document signé ci-dessous.</span>
                      </div>
                    )}
                    <div style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>Devis #{q.id}</div>
                        <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>Demandé le {new Date(q.createdAt).toLocaleDateString('fr-FR')}</div>
                      </div>

                      {/* State badge */}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: '980px',
                        backgroundColor:
                          q.status === 'pending' ? '#fff3cd' :
                          q.status === 'modified_by_admin' ? '#e8f1fd' :
                          '#fef3c7',
                        color:
                          q.status === 'pending' ? '#856404' :
                          q.status === 'modified_by_admin' ? '#0071e3' :
                          '#b45309',
                        textTransform: 'uppercase'
                      }}>
                        {q.status === 'pending' && "En attente d'étude"}
                        {q.status === 'modified_by_admin' && "Modifié (validation client requise)"}
                        {q.status === 'pdf_pending' && "Envoi de devis en cours"}
                      </span>
                    </div>

                    {/* Rental Period */}
                    <div style={{ display: 'flex', gap: '16px', backgroundColor: '#f5f5f7', borderRadius: '12px', padding: '14px 18px', fontSize: '13px' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#6e6e73' }}>Période de location : </span>
                        <span>du {new Date(q.startDate).toLocaleDateString('fr-FR')} au {new Date(q.endDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {q.discount > 0 && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px', color: '#15803d', fontWeight: 700 }}>
                          <Percent style={{ width: '14px', height: '14px' }} /> Remise de {q.discount}% appliquée
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {q.notes && (
                      <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#6e6e73', borderLeft: '3px solid #0071e3', paddingLeft: '12px', margin: '4px 0' }}>
                        "{q.notes}"
                      </div>
                    )}

                    {/* Table of items */}
                    <div style={{ border: '1px solid rgba(0,0,0,.04)', borderRadius: '12px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f5f5f7', borderBottom: '1px solid rgba(0,0,0,.06)', fontWeight: 600 }}>
                            <th style={{ padding: '8px 16px' }}>Matériel</th>
                            <th style={{ padding: '8px 16px' }}>Quantité</th>
                            <th style={{ padding: '8px 16px', textAlign: 'right' }}>Tarif Unitaire (HT)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.items.map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < q.items.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                              <td style={{ padding: '8px 16px' }}><strong>{it.brand}</strong> - {it.name}</td>
                              <td style={{ padding: '8px 16px' }}>{it.quantity}</td>
                              <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                                {it.priceType === 'on_request' ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} €`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action rows & pricing */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '16px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                        <div>
                          <span style={{ color: '#86868b' }}>Total HT : </span>
                          <strong style={{ color: '#1d1d1f', fontSize: '16px' }}>{q.totalHT.toLocaleString('fr-FR')} €</strong>
                        </div>
                        <div>
                          <span style={{ color: '#86868b' }}>Total TTC : </span>
                          <strong style={{ color: '#86868b' }}>{q.totalTTC.toLocaleString('fr-FR')} €</strong>
                        </div>
                      </div>

                      {/* Status-specific actions */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {q.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(q.id, 'pdf_pending')}
                              disabled={actionLoading === q.id}
                              style={{ padding: '10px 20px', borderRadius: '980px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              {actionLoading === q.id ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : 'Valider'}
                            </button>
                            <button
                              onClick={() => startEditing(q)}
                              disabled={actionLoading === q.id}
                              style={{ padding: '10px 20px', borderRadius: '980px', backgroundColor: '#f5f5f7', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(q.id, 'cancelled')}
                              disabled={actionLoading === q.id}
                              style={{ padding: '10px 20px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                            >
                              Refuser
                            </button>
                          </>
                        )}

                        {q.status === 'modified_by_admin' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: '#6e6e73', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle style={{ width: '14px', height: '14px', color: '#b78103' }} /> Modifié. En attente client.
                            </span>
                            <button
                              onClick={() => handleUpdateStatus(q.id, 'pdf_pending')}
                              disabled={actionLoading === q.id}
                              style={{ padding: '8px 16px', borderRadius: '980px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              {actionLoading === q.id ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : 'Valider'}
                            </button>
                            <button
                              onClick={() => startEditing(q)}
                              disabled={actionLoading === q.id}
                              style={{ padding: '8px 16px', borderRadius: '980px', backgroundColor: '#f5f5f7', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                            >
                              Modifier à nouveau
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(q.id, 'cancelled')}
                              disabled={actionLoading === q.id}
                              style={{ padding: '8px 16px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                            >
                              Annuler le devis
                            </button>
                          </div>
                        )}

                        {q.status === 'pdf_pending' && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', backgroundColor: '#fff8ed', borderRadius: '16px', padding: '12px 16px', border: '1px solid rgba(234,179,8,.25)', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#b45309', flexBasis: '100%' }}>
                              <Upload style={{ width: '16px', height: '16px' }} /> Uploader le fichier PDF du devis signé :
                            </div>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={e => setPdfFileMap(prev => ({ ...prev, [q.id]: e.target.files?.[0] ?? null }))}
                              style={{ fontSize: '12px', flex: 1, minWidth: '200px', cursor: 'pointer' }}
                            />
                            <button
                              onClick={() => handleUploadPdf(q.id)}
                              disabled={actionLoading === q.id || !pdfFileMap[q.id]}
                              style={{ padding: '7px 16px', borderRadius: '980px', backgroundColor: pdfFileMap[q.id] ? '#d97706' : '#e5e7eb', color: pdfFileMap[q.id] ? '#fff' : '#9ca3af', border: 'none', cursor: pdfFileMap[q.id] ? 'pointer' : 'default', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'background .15s', flexShrink: 0 }}
                            >
                              {actionLoading === q.id ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: '12px', height: '12px' }} />}
                              Envoyer le PDF
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: FACTURES PANEL (Validated quotes with PDF Attached) */}
        {activeTab === 'factures' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {clientFactures.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '50px 20px', textAlign: 'center', color: '#86868b', fontSize: '14px' }}>
                Aucune facture disponible (devis validé avec PDF) pour ce client.
              </div>
            ) : (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,.06)', backgroundColor: '#f5f5f7', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      <th style={{ padding: '14px 20px' }}>N° Facture (Devis)</th>
                      <th style={{ padding: '14px 20px' }}>Période de location</th>
                      <th style={{ padding: '14px 20px' }}>Articles</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Total (HT)</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Total (TTC)</th>
                      <th style={{ padding: '14px 20px', textAlign: 'center' }}>Document PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientFactures.map((q) => (
                      <tr key={q.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 800 }}>FACT-{q.id}</td>
                        <td style={{ padding: '16px 20px' }}>
                          du {new Date(q.startDate).toLocaleDateString('fr-FR')} au {new Date(q.endDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 600 }}>{q.items.reduce((sum, it) => sum + it.quantity, 0)} articles</span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700, textAlign: 'right' }}>
                          {q.totalHT.toLocaleString('fr-FR')} €
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700, textAlign: 'right', color: '#15803d' }}>
                          {q.totalTTC.toLocaleString('fr-FR')} €
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {q.pdfUrl ? (
                            <a
                              href={`/api/quotes/${q.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#e2fbe8', color: '#1db954', textDecoration: 'none', fontWeight: 700, fontSize: '12px' }}
                            >
                              <Download style={{ width: '14px', height: '14px' }} /> Télécharger
                            </a>
                          ) : (
                            <span style={{ color: '#86868b', fontSize: '12px', fontStyle: 'italic' }}>Aucun fichier</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AVOIRS / ANNULÉS PANEL */}
        {activeTab === 'avoirs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {clientAvoirs.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '50px 20px', textAlign: 'center', color: '#86868b', fontSize: '14px' }}>
                Aucun devis refusé ou annulé pour ce client.
              </div>
            ) : (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,.06)', backgroundColor: '#f5f5f7', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      <th style={{ padding: '14px 20px' }}>ID Devis</th>
                      <th style={{ padding: '14px 20px' }}>Période de location</th>
                      <th style={{ padding: '14px 20px' }}>Total Estimé (HT)</th>
                      <th style={{ padding: '14px 20px' }}>Statut du Dossier</th>
                      <th style={{ padding: '14px 20px', textAlign: 'center' }}>Date d'Annulation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientAvoirs.map((q) => (
                      <tr key={q.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: '#86868b' }}>#{q.id}</td>
                        <td style={{ padding: '16px 20px', color: '#6e6e73' }}>
                          du {new Date(q.startDate).toLocaleDateString('fr-FR')} au {new Date(q.endDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#86868b', fontWeight: 600 }}>
                          {q.totalHT.toLocaleString('fr-FR')} €
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '980px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef2f2', color: '#ef4444' }}>
                            Refusé / Annulé
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', color: '#86868b' }}>
                          {new Date(q.updatedAt).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
