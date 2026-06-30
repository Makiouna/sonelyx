'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Loader2, Key, Calendar, PackageCheck, ChevronRight } from 'lucide-react';
import {
  groupQuotesByProject, getProjectStatus, projectStatusLabel, projectStatusColors, projectDocSummary,
  type Quote,
} from '@/lib/project-grouping';

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

  useEffect(() => {
    if (!sessionPending && !session) router.push('/auth/sign-in');
  }, [sessionPending, session, router]);

  async function fetchQuotes() {
    try {
      const res = await fetch('/api/quotes', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setQuotes(data.quotes);
    } catch (e) {
      console.error(e);
    } finally {
      setQuotesLoading(false);
    }
  }

  useEffect(() => { if (session) fetchQuotes(); }, [session]);

  // Handle Stripe 3DS redirect return: /profil?payment=success&quoteId=xxx
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get('quoteId');
    if (params.get('payment') === 'success' && quoteId) {
      fetch('/api/payments/confirm-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      })
        .catch(() => {})
        .finally(() => {
          fetchQuotes();
          window.history.replaceState({}, '', '/profil');
        });
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

  const projects = groupQuotesByProject(quotes);
  const actionRequiredCount = projects.filter(p => getProjectStatus(p.quotes) === 'action_required').length;

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
                  {new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
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
                <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Nouveau mot de passe</label>
                <input type="password" placeholder="Minimum 8 caractères" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Confirmer le nouveau mot de passe</label>
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} />
              </div>

              <button type="submit" disabled={passwordLoading}
                style={{ width: '100%', padding: '12px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                {passwordLoading ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </div>

        </div>

        {/* Right column: Projects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <PackageCheck style={{ width: '18px', height: '18px', color: '#0071e3' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Mes Projets</h3>
              {actionRequiredCount > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '980px' }}>
                  {actionRequiredCount} action{actionRequiredCount > 1 ? 's' : ''} requise{actionRequiredCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {quotesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : projects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {projects.map(project => {
                  const pStatus = getProjectStatus(project.quotes);
                  const pColors = projectStatusColors(pStatus);
                  const summary = projectDocSummary(project.quotes);
                  const isActionRequired = pStatus === 'action_required';

                  return (
                    <Link key={project.id} href={`/profil/projet/${project.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        border: `1px solid ${isActionRequired ? 'rgba(245,158,11,.4)' : 'rgba(0,0,0,.06)'}`,
                        borderRadius: '16px',
                        padding: '16px 18px',
                        backgroundColor: isActionRequired ? '#fffbeb' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        cursor: 'pointer',
                        transition: 'box-shadow .15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                      >
                        {/* Icon */}
                        <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isActionRequired ? '#fef3c7' : '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <PackageCheck style={{ width: 20, height: 20, color: isActionRequired ? '#d97706' : '#86868b' }} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1d1d1f', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {project.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#86868b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar style={{ width: 11, height: 11 }} />
                            {new Date(project.rentalStart).toLocaleDateString('fr-FR')} — {new Date(project.rentalEnd).toLocaleDateString('fr-FR')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#86868b', marginTop: 2 }}>{summary}</div>
                        </div>

                        {/* Status + arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '980px', backgroundColor: pColors.bg, color: pColors.color }}>
                            {projectStatusLabel(pStatus)}
                          </span>
                          <ChevronRight style={{ width: 16, height: 16, color: '#86868b' }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', backgroundColor: '#f5f5f7', borderRadius: '16px' }}>
                <PackageCheck style={{ width: 32, height: 32, color: '#c7c7cc', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#6e6e73' }}>Aucun projet pour l'instant.</p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#86868b' }}>Créez votre première demande depuis l'espace location.</p>
                <Link href="/location/catalogue"
                  style={{ display: 'inline-block', marginTop: 14, padding: '8px 20px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}>
                  Voir le catalogue
                </Link>
              </div>
            )}
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
