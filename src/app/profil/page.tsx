'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Loader2, FileText, CheckCircle, ShieldAlert, Key, User, FileSpreadsheet, Lock, Trash2, Send, Clock, Calendar } from 'lucide-react';

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

interface Quote {
  id: string;
  status: 'draft' | 'pending' | 'modified_by_admin' | 'pdf_pending' | 'validated' | 'cancelled';
  startDate: string;
  endDate: string;
  notes: string | null;
  items: QuoteItem[];
  totalHT: number;
  totalTTC: number;
  pdfUrl: string | null;
  discount: number;
  createdAt: string;
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

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/auth/sign-in');
    }
  }, [sessionPending, session, router]);

  // Fetch user quotes from API
  async function fetchQuotes() {
    try {
      const res = await fetch('/api/quotes');
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

  const handlePasswordChange = async (e: React.FormEvent) => {
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
  const pendingQuotes = quotes.filter(q => q.status === 'pending');
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {draftQuotes.map(dq => (
                  <div key={dq.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>ID: {dq.id}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#e8e8ed', color: '#6e6e73' }}>Brouillon</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f5f5f7', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                      {dq.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{it.name} (x{it.quantity})</span>
                          <span style={{ color: '#86868b' }}>{it.brand}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar style={{ width: '12px', height: '12px' }} /> {new Date(dq.startDate).toLocaleDateString('fr-FR')} au {new Date(dq.endDate).toLocaleDateString('fr-FR')}</span>
                      <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{dq.totalHT.toLocaleString('fr-FR')} € HT</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(0,0,0,.04)', paddingTop: '10px' }}>
                      <button
                        onClick={() => handleSendDraft(dq.id)}
                        disabled={quoteActionLoading !== null}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px',
                          borderRadius: '980px',
                          backgroundColor: '#0071e3',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '12px'
                        }}
                      >
                        {quoteActionLoading === dq.id ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: '12px', height: '12px' }} />} Envoyer
                      </button>
                      
                      <button
                        onClick={() => handleDeleteDraft(dq.id)}
                        disabled={quoteActionLoading !== null}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '980px',
                          border: '1px solid rgba(0,0,0,.12)',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </div>
                ))}
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
            </h3>

            {quotesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : pendingQuotes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingQuotes.map(pq => (
                  <div key={pq.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>ID: {pq.id}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#e8f1fd', color: '#0071e3' }}>En cours d'étude</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f5f5f7', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                      {pq.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{it.name} (x{it.quantity})</span>
                          <span style={{ color: '#86868b' }}>{it.brand}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar style={{ width: '12px', height: '12px' }} /> {new Date(pq.startDate).toLocaleDateString('fr-FR')} au {new Date(pq.endDate).toLocaleDateString('fr-FR')}</span>
                      <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{pq.totalHT.toLocaleString('fr-FR')} € HT</span>
                    </div>
                  </div>
                ))}
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
                {finishedQuotes.map(fq => (
                  <div key={fq.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1d1d1f' }}>Devis #{fq.id}</div>
                        <div style={{ fontSize: '11px', color: '#86868b', marginTop: '4px' }}>
                          {new Date(fq.startDate).toLocaleDateString('fr-FR')} au {new Date(fq.endDate).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '980px',
                          backgroundColor: fq.status === 'validated' ? '#e2fbe8' : '#fef2f2',
                          color: fq.status === 'validated' ? '#1db954' : '#ef4444'
                        }}>
                          {fq.status === 'validated' ? 'Validé' : 'Annulé'}
                        </span>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d1d1f' }}>{fq.totalHT.toLocaleString('fr-FR')} € HT</div>
                      </div>
                    </div>

                    {fq.status === 'validated' && fq.pdfUrl && (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,.04)', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <a
                          href={fq.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#e2fbe8',
                            color: '#1db954',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '12px'
                          }}
                        >
                          Télécharger mon Devis PDF
                        </a>
                      </div>
                    )}
                  </div>
                ))}
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
