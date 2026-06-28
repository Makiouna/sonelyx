'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (authError) {
      setError(authError.message || 'Une erreur est survenue lors de la création du compte.');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
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

      {/* SignUp Card */}
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', boxShadow: '0 20px 40px -15px rgba(0,0,0,.06)', padding: '40px 32px' }}>
        
        {/* Card Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '32px', lineHeight: 1.1, letterSpacing: '-.03em', margin: '0 0 10px', color: '#1d1d1f' }}>
            Créer un compte
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#6e6e73', fontWeight: 500 }}>
            Rejoignez Sonelyx en quelques instants
          </p>
        </div>

        {/* Card Content / Form */}
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Name input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="name" style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
              Nom complet
            </label>
            <input
              id="name"
              type="text"
              placeholder="Jean Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
              Mot de passe
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
                Création...
              </>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,.06)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#6e6e73' }}>
            Déjà inscrit ?{' '}
            <Link href="/auth/sign-in" style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
              Se connecter
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
}
