'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

interface UserNavProps {
  /** 'inline' renders a static, non-floating menu — used inside the mobile drawer where an
   * absolutely-positioned dropdown would overflow the narrow, left-aligned trigger. */
  variant?: 'dropdown' | 'inline';
}

export default function UserNav({ variant = 'dropdown' }: UserNavProps) {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isPending) {
    return (
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f5f5f7', animationDelay: '1s' }} className="animate-pulse" />
    );
  }

  if (!session) {
    if (variant === 'inline') {
      return (
        <Link href="/auth/sign-in" style={{ color: '#1d1d1f', textDecoration: 'none', fontSize: '16px', fontWeight: 500, padding: '13px 4px', display: 'block' }}>
          Connexion
        </Link>
      );
    }
    return (
      <Link href="/auth/sign-in" style={{ color: 'inherit', textDecoration: 'none', opacity: .78, transition: 'opacity .2s', fontSize: '14px', fontWeight: 500 }}>
        Connexion
      </Link>
    );
  }

  const { user } = session;
  const isAdmin = (user as any).role === 'admin';

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/');
            router.refresh();
          }
        }
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (variant === 'inline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ padding: '4px 4px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1d1d1f' }}>{user.name}</div>
          <div style={{ fontSize: '12px', color: '#86868b' }}>{user.email}</div>
        </div>
        <Link href="/profil" style={{ color: '#1d1d1f', textDecoration: 'none', fontSize: '16px', fontWeight: 500, padding: '13px 4px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'block' }}>
          Mon Espace Profil
        </Link>
        {isAdmin && (
          <Link href="/admin" style={{ color: '#ef4444', textDecoration: 'none', fontSize: '16px', fontWeight: 600, padding: '13px 4px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'block' }}>
            Administration
          </Link>
        )}
        <button
          onClick={handleSignOut}
          style={{ textAlign: 'left', color: '#86868b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 500, padding: '13px 4px', fontFamily: 'inherit' }}
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Avatar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          backgroundColor: isAdmin ? '#ef4444' : '#1d1d1f',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,.08)',
          transition: 'transform 0.15s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {user.name ? user.name[0].toUpperCase() : 'U'}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: '8px',
            width: '220px',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0,0,0,.08)',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,.15)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            zIndex: 100,
            fontFamily: 'inherit'
          }}
        >
          {/* User Info Header */}
          <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid rgba(0,0,0,.05)', marginBottom: '4px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1d1d1f', truncate: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' } as any}>{user.name}</div>
            <div style={{ fontSize: '11px', color: '#86868b', truncate: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' } as any}>{user.email}</div>
          </div>

          {/* Links */}
          <Link
            href="/profil"
            onClick={() => setIsOpen(false)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              color: '#1d1d1f',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              display: 'block',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Mon Espace Profil
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                color: '#ef4444',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
                display: 'block',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Administration
            </Link>
          )}

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: '8px',
              color: '#86868b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'block',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f7';
              e.currentTarget.style.color = '#1d1d1f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#86868b';
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
