import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';

const SITE_URL = 'https://sonelyx.fr';
const PAGE_URL = `${SITE_URL}/location-eclairage-loiret`;

export const metadata: Metadata = {
  title: 'Location Éclairage Scénique DMX & Wolfmix dans le Loiret | Sonelyx',
  description: 'Location d\'éclairage événementiel dans le Loiret : lyres asservies, projecteurs DMX, contrôleurs Wolfmix. Light design sur-mesure, livraison avec ou sans technicien, devis sous 24h.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Location Éclairage Scénique DMX & Wolfmix dans le Loiret | Sonelyx',
    description: 'Lyres asservies, projecteurs DMX et contrôleurs Wolfmix à louer dans le Loiret pour vos événements.',
    url: PAGE_URL,
    siteName: 'Sonelyx',
    locale: 'fr_FR',
    type: 'website',
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Location Éclairage Loiret', item: PAGE_URL },
  ],
};

const useCases = [
  { title: 'Scène & concerts', desc: 'Lyres asservies et projecteurs washs pilotés en DMX pour un rendu scénique professionnel.' },
  { title: 'Soirées & mariages', desc: 'Ambiances lumineuses programmables, effets et éclairage de piste de danse.' },
  { title: 'Salons & inaugurations', desc: 'Mise en lumière de stands et façades, éclairage d\'accueil et de signalétique.' },
  { title: 'Structures itinérantes', desc: 'Kits légers et contrôleurs Wolfmix pour les prestataires en tournée.' },
];

const equipmentTypes = [
  'Lyres asservies (spot & wash)',
  'Projecteurs à LED DMX',
  'Contrôleurs et consoles Wolfmix',
  'Machines à fumée et effets',
  'Structures et pieds de levage',
  'Câblage et distribution DMX',
];

export default function LocationEclairageLoiret() {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Header subTitle="Éclairage" links={[{ label: 'Catalogue', href: '/location/catalogue' }, { label: 'Accueil', href: '/' }]} />

      {/* HERO */}
      <section style={{ padding: 'clamp(60px,9vw,110px) clamp(20px,4vw,40px) clamp(40px,5vw,60px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0071e3', marginBottom: '20px' }}>Éclairage scénique</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(32px,5.4vw,60px)', lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 20px' }}>
            Location d&apos;éclairage événementiel DMX &amp; Wolfmix dans le Loiret
          </h1>
          <p style={{ maxWidth: '640px', margin: 0, fontSize: 'clamp(16px,1.6vw,19px)', lineHeight: 1.6, color: '#6e6e73' }}>
            Lyres asservies, projecteurs DMX et contrôleurs Wolfmix pour un light design sur-mesure, pensé pour votre lieu et votre public. Livraison avec ou sans technicien dans tout le Loiret.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 26px', alignItems: 'center', marginTop: '32px' }}>
            <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 30px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
              Voir le catalogue lumière
            </Link>
            <a href="mailto:contact@sonelyx.fr" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0071e3', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
              Demander un devis ›
            </a>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section style={{ backgroundColor: '#f5f5f7', padding: 'clamp(60px,8vw,100px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.08, letterSpacing: '-.03em', margin: '0 0 40px' }}>Pour tous vos événements dans le Loiret</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {useCases.map((u) => (
              <div key={u.title} style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '20px', border: '1px solid rgba(0,0,0,.06)' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>{u.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.55, color: '#6e6e73', margin: 0 }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EQUIPMENT */}
      <section style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.08, letterSpacing: '-.03em', margin: '0 0 24px' }}>Notre matériel d&apos;éclairage</h2>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px 30px', listStyle: 'none', margin: 0, padding: 0, fontSize: '15px', color: '#3a3a42' }}>
            {equipmentTypes.map((e) => (
              <li key={e} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0071e3', flexShrink: 0 }} />
                {e}
              </li>
            ))}
          </ul>
          <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginTop: '36px', padding: '8px 8px 8px 24px', borderRadius: '980px', backgroundColor: '#0b0e14', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
            Composer ma sélection
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#0071e3' }}>›</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
