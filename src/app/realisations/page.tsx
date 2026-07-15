import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';

const SITE_URL = 'https://sonelyx.fr';
const PAGE_URL = `${SITE_URL}/realisations`;

export const metadata: Metadata = {
  title: 'Réalisations | Sonelyx - Prestations Événementielles à Orléans',
  description: 'Découvrez les réalisations de Sonelyx : prestations son, lumière et structure pour des événements à Orléans et dans les communes du Loiret.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Réalisations | Sonelyx - Prestations Événementielles à Orléans',
    description: 'Prestations son, lumière et structure réalisées par Sonelyx à Orléans et dans le Loiret.',
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
    { '@type': 'ListItem', position: 2, name: 'Réalisations', item: PAGE_URL },
  ],
};

const missionTypes = [
  { title: 'Mariages', desc: 'Sonorisation de cérémonie, éclairage de soirée et régie DJ.' },
  { title: 'Concerts & festivals', desc: 'Diffusion line-array, light design scénique et structures.' },
  { title: 'Événements d\'entreprise', desc: 'Séminaires, lancements de produits, soirées de fin d\'année.' },
  { title: 'Salons & inaugurations', desc: 'Mise en lumière de stands, sonorisation d\'espaces d\'accueil.' },
];

const areas = [
  'Orléans', 'Fleury-les-Aubrais', 'Olivet', 'Saint-Jean-de-Braye',
  'La Chapelle-Saint-Mesmin', 'Saran', 'Ingré', 'Saint-Jean-de-la-Ruelle',
  'Chécy', 'Meung-sur-Loire',
];

export default function Realisations() {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Header subTitle="Réalisations" links={[{ label: 'Catalogue', href: '/location/catalogue' }, { label: 'Accueil', href: '/' }]} />

      {/* HERO */}
      <section style={{ padding: 'clamp(60px,9vw,110px) clamp(20px,4vw,40px) clamp(40px,5vw,60px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0071e3', marginBottom: '20px' }}>Réalisations</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(32px,5.4vw,60px)', lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 20px' }}>
            Nos prestations son, lumière et structure à Orléans
          </h1>
          <p style={{ maxWidth: '640px', margin: 0, fontSize: 'clamp(16px,1.6vw,19px)', lineHeight: 1.6, color: '#6e6e73' }}>
            Direction technique, sound &amp; light design et location de matériel événementiel : découvrez les types de prestations que nous assurons à Orléans et dans les communes du Loiret.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 26px', alignItems: 'center', marginTop: '32px' }}>
            <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 30px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
              Voir le catalogue
            </Link>
            <a href="mailto:contact@sonelyx.fr" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0071e3', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
              Nous confier votre projet ›
            </a>
          </div>
        </div>
      </section>

      {/* MISSION TYPES */}
      <section style={{ backgroundColor: '#f5f5f7', padding: 'clamp(60px,8vw,100px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.08, letterSpacing: '-.03em', margin: '0 0 40px' }}>Nos domaines d&apos;intervention</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {missionTypes.map((m) => (
              <div key={m.title} style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '20px', border: '1px solid rgba(0,0,0,.06)' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>{m.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.55, color: '#6e6e73', margin: 0 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AREAS SERVED */}
      <section style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.08, letterSpacing: '-.03em', margin: '0 0 16px' }}>Une équipe mobile dans tout le Loiret</h2>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#6e6e73', margin: '0 0 28px', maxWidth: '640px' }}>
            Basée à Orléans, notre équipe intervient sur l&apos;ensemble de l&apos;agglomération orléanaise et des communes environnantes.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {areas.map((a) => (
              <span key={a} style={{ padding: '9px 18px', borderRadius: '980px', backgroundColor: '#f5f5f7', fontSize: '14px', fontWeight: 600, color: '#3a3a42' }}>{a}</span>
            ))}
          </div>
          <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginTop: '40px', padding: '8px 8px 8px 24px', borderRadius: '980px', backgroundColor: '#0b0e14', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
            Demander un devis pour votre événement
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#0071e3' }}>›</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
