'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ShoppingCart } from 'lucide-react';
import UserNav from './user-nav';

interface HeaderProps {
  subTitle?: string;
  links?: { label: string; href: string }[];
}

export default function Header({ subTitle, links }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const stored = localStorage.getItem('sonelyx_devis');
        if (stored) {
          const parsed = JSON.parse(stored);
          let total = 0;
          Object.keys(parsed).forEach(id => {
            const val = parsed[id];
            const qty = typeof val === 'number' ? val : (val ? 1 : 0);
            total += qty;
          });
          setCartCount(total);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        console.error(e);
      }
    };

    updateCartCount();

    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cart-updated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  const defaultLinks = links || [
    { label: 'Métiers', href: '/#metiers' },
    { label: 'Le parc', href: '/location/catalogue' },
    { label: 'Fiabilité', href: '/#fiabilite' },
  ];

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 60, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,.78)', borderBottom: '1px solid rgba(0,0,0,.07)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 clamp(20px, 4vw, 40px)', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: '#1d1d1f', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '21px', letterSpacing: '-.02em' }}>Sonelyx</span>
            {subTitle && (
              <span className="header-subtitle" style={{ fontSize: '13px', fontWeight: 600, color: '#86868b', paddingLeft: '9px', borderLeft: '1px solid rgba(0,0,0,.14)' }}>
                {subTitle}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="header-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
            {defaultLinks.map((link, idx) => (
              <Link key={idx} href={link.href} style={{ color: 'inherit', textDecoration: 'none', opacity: .78, transition: 'opacity .2s', whiteSpace: 'nowrap' }}>
                {link.label}
              </Link>
            ))}
            <UserNav />
            <Link href="/location/panier" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 16px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '13px', transition: 'all .25s', whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0071e3'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d1d1f'}>
              <ShoppingCart style={{ width: '15px', height: '15px' }} />
              <span>Devis</span>
              {cartCount > 0 && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#ff453a',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '0 4px',
                  marginLeft: '2px'
                }}>
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Mobile controls: Devis pill + hamburger */}
          <div className="header-mobile-controls" style={{ display: 'none', alignItems: 'center', gap: '12px' }}>
            <Link href="/location/panier" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', position: 'relative' }}>
              <ShoppingCart style={{ width: '16px', height: '16px' }} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#ff453a',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '0 3px'
                }}>
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              style={{ background: 'none', border: '1px solid rgba(0,0,0,.12)', borderRadius: '10px', padding: '7px', cursor: 'pointer', color: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              {mobileMenuOpen
                ? <X style={{ width: '18px', height: '18px' }} />
                : <Menu style={{ width: '18px', height: '18px' }} />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', backgroundColor: 'rgba(255,255,255,.97)', backdropFilter: 'blur(20px)', padding: '8px clamp(20px, 4vw, 40px) 20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {defaultLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: '#1d1d1f', textDecoration: 'none', fontSize: '16px', fontWeight: 500, padding: '13px 4px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'block' }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ paddingTop: '14px' }}>
              <UserNav />
            </div>
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 680px) {
          .header-desktop-nav { display: none !important; }
          .header-mobile-controls { display: flex !important; }
        }
        @media (max-width: 420px) {
          .header-subtitle { display: none; }
        }
      `}</style>
    </>
  );
}
