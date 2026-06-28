'use client';

import Link from 'next/link';
import UserNav from './user-nav';

interface HeaderProps {
  subTitle?: string;
  links?: { label: string; href: string }[];
}

export default function Header({ subTitle, links }: HeaderProps) {
  // Default landing page links if none provided
  const defaultLinks = links || [
    { label: 'Métiers', href: '/#metiers' },
    { label: 'Le parc', href: '/location/catalogue' },
    { label: 'Fiabilité', href: '/#fiabilite' },
  ];

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 60, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,.78)', borderBottom: '1px solid rgba(0,0,0,.07)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 clamp(20px, 4vw, 40px)', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: '#1d1d1f' }}>
          <span style={{ fontWeight: 700, fontSize: '21px', letterSpacing: '-.02em' }}>Sonelyx</span>
          {subTitle && (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#86868b', paddingLeft: '9px', borderLeft: '1px solid rgba(0,0,0,.14)' }}>
              {subTitle}
            </span>
          )}
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '30px', fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
          {defaultLinks.map((link, idx) => (
            <Link key={idx} href={link.href} style={{ color: 'inherit', textDecoration: 'none', opacity: .78, transition: 'opacity .2s' }}>
              {link.label}
            </Link>
          ))}
          <UserNav />
          <Link href="/location/panier" style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 16px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '13px', transition: 'background .25s' }}>
            Devis
          </Link>
        </nav>
      </div>
    </header>
  );
}
