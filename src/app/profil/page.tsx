'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Loader2, FileText, Key, FileSpreadsheet, Trash2, Send, Clock, Calendar, AlertTriangle, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

interface QuoteItem {
  id: string;
  name: string;
  brand: string;
  catLabel: string;
  price: number;
  priceType: 'numeric' | 'on_request';
  priceTax: 'HT' | 'TTC';
  quantity: number;
}

interface QuoteSnapshot {
  items: QuoteItem[];
  totalHT: number;
  totalTTC: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  discount: number;
}

interface Quote {
  id: string;
  status: 'draft' | 'pending' | 'modified_by_admin' | 'pdf_pending' | 'validated' | 'cancelled';
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

export default function UserProfile() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Quotes state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quoteActionLoading, setQuoteActionLoading] = useState<string | null>(null);

  // Approval / refusal state
  const [refusingQuoteId, setRefusingQuoteId] = useState<string | null>(null);
  const [refusalNote, setRefusalNote] = useState('');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/auth/sign-in');
    }
  }, [sessionPending, session, router]);

  // Fetch user quotes from API
  async function fetchQuotes() {
    try {
      const res = await fetch('/api/quotes', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setQuotes(data.quotes);
      }
    } catch (e) {
      console.error('Error fetching quotes:', e);
    } finally {
      setQuotesLoading(false);
    }
  }

  useEffect(() => {
    if (session) {
      fetchQuotes();
    }
  }, [session]);

  const handlePasswordChange = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Veuillez remplir tous les champs de mot de passe.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        setPasswordError(error.message || 'Erreur lors de la modification du mot de passe.');
      } else {
        setPasswordSuccess('Votre mot de passe a été modifié avec succès.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Une erreur est survenue.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Convert draft to pending (envoyer le devis)
  const handleSendDraft = async (id: string) => {
    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' })
      });
      const data = await res.json();
      if (data.success) {
        fetchQuotes();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    } finally {
      setQuoteActionLoading(null);
    }
  };

  const handleApprove = async (id: string) => {
    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: true }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchQuotes();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch {
      alert('Une erreur est survenue.');
    } finally {
      setQuoteActionLoading(null);
    }
  };

  const handleRefuse = async (id: string, note: string) => {
    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refuse: true, clientRefusalNote: note }),
      });
      const data = await res.json();
      if (data.success) {
        setRefusingQuoteId(null);
        setRefusalNote('');
        await fetchQuotes();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch {
      alert('Une erreur est survenue.');
    } finally {
      setQuoteActionLoading(null);
    }
  };

  // Delete draft quote
  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce brouillon de devis ?')) {
      return;
    }

    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchQuotes();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    } finally {
      setQuoteActionLoading(null);
    }
  };

  if (sessionPending || !session) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-hanken-grotesk), sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 style={{ width: '32px', height: '32px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#6e6e73' }}>Chargement de votre profil...</span>
        </div>
      </div>
    );
  }

  const { user } = session;

  // Filter quotes by status
  const draftQuotes = quotes.filter(q => q.status === 'draft');
  const activeQuotes = quotes.filter(q => ['pending', 'modified_by_admin', 'pdf_pending'].includes(q.status));
  const finishedQuotes = quotes.filter(q => q.status === 'validated' || q.status === 'cancelled');

  const profileLinks = [
    { label: 'Espace Location', href: '/location/catalogue' },
    { label: 'Mon Panier', href: '/location/panier' },
    { label: 'Accueil', href: '/' },
  ];

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <Header subTitle="Profil" links={profileLinks} />

      <main style={{ flex: 1, maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '40px clamp(20px, 4vw, 40px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* Left column: User info & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* User Details Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-.02em' }}>{user.name}</h2>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', color: (user as any).role === 'admin' ? '#ef4444' : '#0071e3', textTransform: 'uppercase' }}>
                  {(user as any).role === 'admin' ? 'Administrateur' : 'Membre Sonelyx'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#86868b' }}>Identifiant compte</span>
                <span style={{ fontSize: '14px', fontFamily: 'monospace', color: '#1d1d1f', userSelect: 'all', wordBreak: 'break-all' }}>{user.id}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#86868b' }}>Adresse email</span>
                <span style={{ fontSize: '14px', color: '#1d1d1f' }}>{user.email}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#86868b' }}>Inscription</span>
                <span style={{ fontSize: '14px', color: '#1d1d1f' }}>
                  {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key style={{ width: '18px', height: '18px', color: '#86868b' }} /> Sécurité &amp; Mot de passe
            </h3>

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {passwordError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
                  {passwordSuccess}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Mot de passe actuel</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Nouveau mot de passe</label>
                <input
                  type="password"
                  placeholder="Minimum 8 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '980px',
                  backgroundColor: '#1d1d1f',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '6px'
                }}
              >
                {passwordLoading ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </div>

        </div>

        {/* Right column: Documents (Quotes & Invoices) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Brouillons de Devis Section */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet style={{ width: '18px', height: '18px', color: '#86868b' }} /> Brouillons de devis
            </h3>

            {quotesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : draftQuotes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {draftQuotes.map(dq => {
                  const isOpen = openDetailId === dq.id;
                  return (
                    <div key={dq.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: '14px', overflow: 'hidden' }}>
                      {/* Compact header */}
                      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>{dq.id}</div>
                          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar style={{ width: '11px', height: '11px' }} />
                            {new Date(dq.startDate).toLocaleDateString('fr-FR')} — {new Date(dq.endDate).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>{dq.totalHT.toLocaleString('fr-FR')} € HT</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#e8e8ed', color: '#6e6e73' }}>Brouillon</span>
                          <button
                            onClick={() => setOpenDetailId(isOpen ? null : dq.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#86868b' }}
                          >
                            {isOpen ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                          </button>
                        </div>
                      </div>

                      {/* Detail panel */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', padding: '14px 16px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>Article</th>
                                <th style={{ textAlign: 'center', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)', width: '40px' }}>Qté</th>
                                <th style={{ textAlign: 'right', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>Prix unit.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dq.items.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < dq.items.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                  <td style={{ padding: '6px 0' }}>
                                    <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{it.name}</div>
                                    <div style={{ color: '#86868b', fontSize: '11px' }}>{it.brand}</div>
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '6px 8px', color: '#1d1d1f' }}>×{it.quantity}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#1d1d1f', fontWeight: 600 }}>
                                    {it.priceType === 'on_request' ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} €`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {dq.notes && (
                            <div style={{ fontSize: '12px', color: '#6e6e73', fontStyle: 'italic', borderLeft: '2px solid #e8e8ed', paddingLeft: '8px' }}>{dq.notes}</div>
                          )}
                          {dq.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: '#6e6e73' }}>Remise</span>
                              <span style={{ color: '#1db954', fontWeight: 700 }}>−{dq.discount}%</span>
                            </div>
                          )}
                          <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                              <span>Total HT</span><span>{dq.totalHT.toLocaleString('fr-FR')} €</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868b' }}>
                              <span>Total TTC</span><span>{dq.totalTTC.toLocaleString('fr-FR')} €</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ borderTop: '1px solid rgba(0,0,0,.04)', padding: '10px 16px', display: 'flex', gap: '8px', backgroundColor: '#fff' }}>
                        <button
                          onClick={() => handleSendDraft(dq.id)}
                          disabled={quoteActionLoading !== null}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          {quoteActionLoading === dq.id ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: '12px', height: '12px' }} />} Envoyer
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(dq.id)}
                          disabled={quoteActionLoading !== null}
                          style={{ padding: '8px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <Trash2 style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f5f5f7', borderRadius: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#6e6e73' }}>Aucun brouillon de devis.</p>
              </div>
            )}
          </div>

          {/* Devis en cours Section */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock style={{ width: '18px', height: '18px', color: '#0071e3' }} /> Demandes de devis en cours
              {activeQuotes.filter(q => q.status === 'modified_by_admin').length > 0 && (
                <span style={{ marginLeft: '4px', fontSize: '11px', fontWeight: 800, backgroundColor: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '980px' }}>
                  {activeQuotes.filter(q => q.status === 'modified_by_admin').length} action{activeQuotes.filter(q => q.status === 'modified_by_admin').length > 1 ? 's' : ''} requise{activeQuotes.filter(q => q.status === 'modified_by_admin').length > 1 ? 's' : ''}
                </span>
              )}
            </h3>

            {quotesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : activeQuotes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeQuotes.map(q => {
                  const isModified = q.status === 'modified_by_admin';
                  const isRefusing = refusingQuoteId === q.id;
                  const isExpanded = expandedQuoteId === q.id;
                  const previousVersion: QuoteSnapshot | null = q.previousVersion ? (() => { try { return JSON.parse(q.previousVersion!); } catch { return null; } })() : null;

                  return (
                    <div key={q.id} style={{ border: `1px solid ${isModified ? 'rgba(245,158,11,.35)' : 'rgba(0,0,0,.06)'}`, borderRadius: '16px', overflow: 'hidden', backgroundColor: isModified ? '#fffbeb' : '#fff' }}>

                      {/* Approval banner for modified_by_admin */}
                      {isModified && (
                        <div style={{ backgroundColor: '#fef3c7', borderBottom: '1px solid rgba(245,158,11,.2)', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                          <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', flex: 1 }}>L'administrateur a modifié ce devis — votre validation est requise.</span>
                          {!isRefusing && (
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleApprove(q.id)}
                                disabled={quoteActionLoading === q.id}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '980px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}
                              >
                                {quoteActionLoading === q.id ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: '12px', height: '12px' }} />}
                                Accepter
                              </button>
                              <button
                                onClick={() => { setRefusingQuoteId(q.id); setRefusalNote(''); }}
                                disabled={quoteActionLoading === q.id}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}
                              >
                                <X style={{ width: '12px', height: '12px' }} /> Refuser
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Refusal note form */}
                      {isRefusing && (
                        <div style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid rgba(239,68,68,.15)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c' }}>Motif du refus (facultatif — visible par l'admin) :</span>
                          <textarea
                            rows={2}
                            value={refusalNote}
                            onChange={e => setRefusalNote(e.target.value)}
                            placeholder="Ex: les dates ne correspondent plus à mes disponibilités..."
                            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(239,68,68,.3)', outline: 'none', fontSize: '12px', fontFamily: 'inherit', resize: 'vertical', backgroundColor: '#fff' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleRefuse(q.id, refusalNote)}
                              disabled={quoteActionLoading === q.id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 16px', borderRadius: '980px', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}
                            >
                              {quoteActionLoading === q.id ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : 'Confirmer le refus'}
                            </button>
                            <button
                              onClick={() => setRefusingQuoteId(null)}
                              style={{ padding: '6px 14px', borderRadius: '980px', backgroundColor: 'transparent', color: '#6e6e73', border: '1px solid rgba(0,0,0,.12)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit' }}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Quote body */}
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>{q.id}</div>
                            <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar style={{ width: '11px', height: '11px' }} />
                              {new Date(q.startDate).toLocaleDateString('fr-FR')} — {new Date(q.endDate).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>{q.totalHT.toLocaleString('fr-FR')} € HT</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px',
                              backgroundColor: q.status === 'pending' ? '#e8f1fd' : q.status === 'modified_by_admin' ? '#fef3c7' : '#f0fdf4',
                              color: q.status === 'pending' ? '#0071e3' : q.status === 'modified_by_admin' ? '#92400e' : '#15803d'
                            }}>
                              {q.status === 'pending' ? 'En cours d\'étude' : q.status === 'modified_by_admin' ? 'Modifié' : 'PDF en préparation'}
                            </span>
                            <button
                              onClick={() => setOpenDetailId(openDetailId === q.id ? null : q.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#86868b' }}
                            >
                              {openDetailId === q.id ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible detail */}
                        {openDetailId === q.id && (
                          <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>Article</th>
                                  <th style={{ textAlign: 'center', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)', width: '40px' }}>Qté</th>
                                  <th style={{ textAlign: 'right', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>Prix unit.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {q.items.map((it, idx) => (
                                  <tr key={idx} style={{ borderBottom: idx < q.items.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                    <td style={{ padding: '6px 0' }}>
                                      <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{it.name}</div>
                                      <div style={{ color: '#86868b', fontSize: '11px' }}>{it.brand}</div>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '6px 8px', color: '#1d1d1f' }}>×{it.quantity}</td>
                                    <td style={{ textAlign: 'right', padding: '6px 0', color: '#1d1d1f', fontWeight: 600 }}>
                                      {it.priceType === 'on_request' ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} €`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {q.notes && (
                              <div style={{ fontSize: '12px', color: '#6e6e73', fontStyle: 'italic', borderLeft: '2px solid #e8e8ed', paddingLeft: '8px' }}>{q.notes}</div>
                            )}
                            {q.discount > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span style={{ color: '#6e6e73' }}>Remise</span>
                                <span style={{ color: '#1db954', fontWeight: 700 }}>−{q.discount}%</span>
                              </div>
                            )}
                            <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span>Total HT</span><span>{q.totalHT.toLocaleString('fr-FR')} €</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868b' }}>
                                <span>Total TTC</span><span>{q.totalTTC.toLocaleString('fr-FR')} €</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Version history — show previous version when admin modified */}
                        {isModified && previousVersion && (
                          <div>
                            <button
                              onClick={() => setExpandedQuoteId(isExpanded ? null : q.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontFamily: 'inherit' }}
                            >
                              {isExpanded ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
                              {isExpanded ? 'Masquer' : 'Voir'} la version originale (V1)
                            </button>
                            {isExpanded && (
                              <div style={{ marginTop: '8px', border: '1px dashed rgba(0,0,0,.12)', borderRadius: '10px', padding: '10px', fontSize: '12px', backgroundColor: '#fafafa' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#86868b', letterSpacing: '.05em', marginBottom: '8px' }}>VERSION ORIGINALE (V1 — avant modification admin)</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#86868b', marginBottom: '6px' }}>
                                  <span><Calendar style={{ width: '10px', height: '10px', display: 'inline', marginRight: '3px' }} />{new Date(previousVersion.startDate).toLocaleDateString('fr-FR')} au {new Date(previousVersion.endDate).toLocaleDateString('fr-FR')}</span>
                                  <span style={{ fontWeight: 700 }}>{previousVersion.totalHT.toLocaleString('fr-FR')} € HT</span>
                                </div>
                                {previousVersion.items.map((it, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#6e6e73' }}>
                                    <span>{it.name} (x{it.quantity})</span>
                                    <span>{it.priceType === 'on_request' ? 'Sur devis' : `${it.price} €`}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Client refusal note (shown after a refusal was sent) */}
                        {q.clientRefusalNote && q.status === 'pending' && (
                          <div style={{ fontSize: '11px', color: '#6e6e73', fontStyle: 'italic', borderLeft: '2px solid #d97706', paddingLeft: '8px' }}>
                            Votre note : "{q.clientRefusalNote}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f5f5f7', borderRadius: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#6e6e73' }}>Aucune demande de devis en cours d'étude.</p>
              </div>
            )}
          </div>

          {/* Historique des Devis Section */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText style={{ width: '18px', height: '18px', color: '#86868b' }} /> Historique des devis
            </h3>

            {quotesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : finishedQuotes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {finishedQuotes.map(fq => {
                  const isOpen = openDetailId === fq.id;
                  return (
                    <div key={fq.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: '14px', overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>{fq.id}</div>
                          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar style={{ width: '11px', height: '11px' }} />
                            {new Date(fq.startDate).toLocaleDateString('fr-FR')} — {new Date(fq.endDate).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>{fq.totalHT.toLocaleString('fr-FR')} € HT</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: fq.status === 'validated' ? '#e2fbe8' : '#fef2f2', color: fq.status === 'validated' ? '#1db954' : '#ef4444' }}>
                            {fq.status === 'validated' ? 'Validé' : 'Annulé'}
                          </span>
                          <button
                            onClick={() => setOpenDetailId(isOpen ? null : fq.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#86868b' }}
                          >
                            {isOpen ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                          </button>
                        </div>
                      </div>

                      {/* Detail panel */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', padding: '14px 16px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>Article</th>
                                <th style={{ textAlign: 'center', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)', width: '40px' }}>Qté</th>
                                <th style={{ textAlign: 'right', color: '#86868b', fontWeight: 600, paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>Prix unit.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fq.items.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < fq.items.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                  <td style={{ padding: '6px 0' }}>
                                    <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{it.name}</div>
                                    <div style={{ color: '#86868b', fontSize: '11px' }}>{it.brand}</div>
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '6px 8px', color: '#1d1d1f' }}>×{it.quantity}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#1d1d1f', fontWeight: 600 }}>
                                    {it.priceType === 'on_request' ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} €`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {fq.notes && (
                            <div style={{ fontSize: '12px', color: '#6e6e73', fontStyle: 'italic', borderLeft: '2px solid #e8e8ed', paddingLeft: '8px' }}>{fq.notes}</div>
                          )}
                          {fq.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: '#6e6e73' }}>Remise</span>
                              <span style={{ color: '#1db954', fontWeight: 700 }}>−{fq.discount}%</span>
                            </div>
                          )}
                          <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                              <span>Total HT</span><span>{fq.totalHT.toLocaleString('fr-FR')} €</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868b' }}>
                              <span>Total TTC</span><span>{fq.totalTTC.toLocaleString('fr-FR')} €</span>
                            </div>
                          </div>
                          {fq.status === 'validated' && fq.hasPdf && (
                            <a
                              href={`/api/quotes/${fq.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '980px', backgroundColor: '#e2fbe8', color: '#1db954', textDecoration: 'none', fontWeight: 700, fontSize: '12px', alignSelf: 'flex-start' }}
                            >
                              <FileText style={{ width: '14px', height: '14px' }} /> Télécharger le PDF
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f5f5f7', borderRadius: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#6e6e73' }}>Aucun devis archivé.</p>
              </div>
            )}
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
