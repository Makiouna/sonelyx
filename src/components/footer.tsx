'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#f5f5f7', borderTop: '1px solid rgba(0,0,0,.07)', color: '#6e6e73' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: 'clamp(54px,6vw,80px) clamp(20px,4vw,40px) 30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '40px 30px' }}>
          <div style={{ minWidth: '220px' }}>
            <div style={{ fontWeight: 700, fontSize: '22px', letterSpacing: '-.02em', color: '#1d1d1f', marginBottom: '14px' }}>Sonelyx</div>
            <p style={{ fontSize: '14px', lineHeight: 1.6, maxWidth: '280px', margin: '0 0 22px' }}>Prestation technique &amp; location de matériel événementiel professionnel.</p>
            <Link href="/location/catalogue#contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 22px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'background .25s' }}>
              Demander un devis
            </Link>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px' }}>Catégories</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <li><Link href="/location/catalogue" style={{ color: 'inherit', textDecoration: 'none' }}>Diffusion / Line-array</Link></li>
              <li><Link href="/location/catalogue" style={{ color: 'inherit', textDecoration: 'none' }}>Éclairage scénique</Link></li>
              <li><Link href="/location/catalogue" style={{ color: 'inherit', textDecoration: 'none' }}>Régie &amp; contrôle</Link></li>
              <li><Link href="/location/catalogue" style={{ color: 'inherit', textDecoration: 'none' }}>Structure &amp; énergie</Link></li>
            </ul>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px' }}>Sonelyx</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <li><Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Accueil</Link></li>
              <li><Link href="/#metiers" style={{ color: 'inherit', textDecoration: 'none' }}>Prestation technique</Link></li>
              <li><Link href="/#fiabilite" style={{ color: 'inherit', textDecoration: 'none' }}>Fiabilité</Link></li>
            </ul>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px' }}>Contact</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <li><a href="mailto:contact@sonelyx.fr" style={{ color: 'inherit', textDecoration: 'none' }}>contact@sonelyx.fr</a></li>
              <li><a href="tel:+33000000000" style={{ color: 'inherit', textDecoration: 'none' }}>+33 (0)0 00 00 00 00</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Instagram</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: 'clamp(44px,5vw,68px)', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,.09)', fontSize: '13px' }}>
          <div>© 2026 Sonelyx. Tous droits réservés.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <Link href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Mentions légales</Link>
            <Link href="#" style={{ color: 'inherit', textDecoration: 'none' }}>CGV</Link>
            <Link href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
