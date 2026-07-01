'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    if (authError) {
      setError(authError.message || 'Une erreur est survenue lors de la connexion.');
      setLoading(false);
    } else {
      // Full reload (not router.push) so every client picks up the fresh session
      // cookie immediately — a soft navigation can briefly show stale cached
      // "no session" state and bounce the user back to this page.
      window.location.href = '/dashboard';
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

      {/* Login Card */}
      <div className="auth-card" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', boxShadow: '0 20px 40px -15px rgba(0,0,0,.06)', padding: '40px 32px' }}>
        
        {/* Card Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '32px', lineHeight: 1.1, letterSpacing: '-.03em', margin: '0 0 10px', color: '#1d1d1f' }}>
            Bon retour
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#6e6e73', fontWeight: 500 }}>
            Connectez-vous à votre espace Sonelyx
          </p>
        </div>

        {/* Card Content / Form */}
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Email input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              placeholder="nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {/* Password input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
                Mot de passe
              </label>
              <Link href="/auth/forgot-password" style={{ fontSize: '13px', color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
                Mot de passe oublié ?
              </Link>
            </div>
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
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,.06)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#6e6e73' }}>
            Nouveau sur Sonelyx ?{' '}
            <Link href="/auth/sign-up" style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
              Créer un compte
            </Link>
          </p>
        </div>

      </div>

      <style>{`
        @media (max-width: 480px) {
          .auth-card { padding: 28px 20px !important; border-radius: 20px !important; }
        }
      `}</style>
    </div>
  );
}
