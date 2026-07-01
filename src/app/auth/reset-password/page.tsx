'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

export default function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error: linkError } = use(searchParams);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const invalidLink = linkError === 'INVALID_TOKEN' || !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message || 'Une erreur est survenue lors de la réinitialisation.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/sign-in');
      }, 2500);
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Back to Home Link */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#86868b', fontSize: '15px', fontWeight: 600 }}>
          ← Retour à Sonelyx
        </Link>
      </div>

      {/* Card */}
      <div className="auth-card" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', boxShadow: '0 20px 40px -15px rgba(0,0,0,.06)', padding: '40px 32px' }}>

        {/* Card Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '32px', lineHeight: 1.1, letterSpacing: '-.03em', margin: '0 0 10px', color: '#1d1d1f' }}>
            Nouveau mot de passe
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#6e6e73', fontWeight: 500 }}>
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        {invalidLink ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px', padding: '20px', marginBottom: '8px' }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#ef4444', fontWeight: 500, lineHeight: 1.6 }}>
                Ce lien de réinitialisation est invalide ou a expiré.
              </p>
            </div>
            <Link href="/auth/forgot-password" style={{ display: 'inline-block', marginTop: '16px', color: '#0071e3', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
              Demander un nouveau lien →
            </Link>
          </div>
        ) : success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '16px', padding: '20px', marginBottom: '8px' }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#166534', fontWeight: 500, lineHeight: 1.6 }}>
                Votre mot de passe a bien été réinitialisé. Redirection vers la connexion...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                {error}
              </div>
            )}

            {/* New password input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '980px',
                  border: '1px solid rgba(0,0,0,.12)',
                  backgroundColor: '#ffffff',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  color: '#1d1d1f',
                  outline: 'none',
                  transition: 'border-color .2s, box-shadow .2s'
                }}
              />
            </div>

            {/* Confirm password input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="confirmPassword" style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '980px',
                  border: '1px solid rgba(0,0,0,.12)',
                  backgroundColor: '#ffffff',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  color: '#1d1d1f',
                  outline: 'none',
                  transition: 'border-color .2s, box-shadow .2s'
                }}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '980px',
                backgroundColor: '#1d1d1f',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color .2s',
                marginTop: '10px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#000000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1d1d1f'; }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Réinitialisation...
                </>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </button>
          </form>
        )}

      </div>

      <style>{`
        @media (max-width: 480px) {
          .auth-card { padding: 28px 20px !important; border-radius: 20px !important; }
        }
      `}</style>
    </div>
  );
}
