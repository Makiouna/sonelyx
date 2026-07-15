import type { Metadata } from 'next';
import Header from '@/components/header';
import Footer from '@/components/footer';
import CatalogueGrid from '@/components/catalogue-grid';
import { getPublicEquipmentList, getCategories } from '@/db/queries';

const SITE_URL = 'https://sonelyx.fr';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Catalogue Location Son, Lumière, DJ | Sonelyx Orléans',
  description: 'Catalogue complet de location de matériel événementiel à Orléans : sonorisation, éclairage scénique, régie DJ et structure. Testé, calibré, livré avec ou sans technicien. Devis sous 24h.',
  alternates: { canonical: `${SITE_URL}/location/catalogue` },
  openGraph: {
    title: 'Catalogue Location Son, Lumière, DJ | Sonelyx Orléans',
    description: 'Systèmes son line-array, éclairages asservis, régies et structures — testés, calibrés et livrés avec ou sans technicien à Orléans.',
    url: `${SITE_URL}/location/catalogue`,
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
    { '@type': 'ListItem', position: 2, name: 'Catalogue', item: `${SITE_URL}/location/catalogue` },
  ],
};

const included = [
  { tag: 'Qualité', title: 'Matériel testé & calibré', desc: 'Chaque équipement est contrôlé et étiqueté avant chaque départ.' },
  { tag: 'Logistique', title: 'Livraison & installation', desc: 'Avec ou sans technicien, partout en région — montage inclus en option.' },
  { tag: 'Support', title: 'Assistance technique', desc: 'Une hotline dédiée joignable avant et pendant votre événement.' },
  { tag: 'Sérénité', title: 'Remplacement garanti', desc: 'Matériel de secours et remplacement rapide en cas d’incident.' }
];

const steps = [
  { no: '01', title: 'Sélection', desc: 'Composez votre liste de matériel directement depuis le catalogue.' },
  { no: '02', title: 'Devis sous 24h', desc: 'Étude de faisabilité et tarif sur-mesure adapté à votre événement.' },
  { no: '03', title: 'Livraison ou retrait', desc: 'Mise à disposition avec ou sans technicien, install possible sur site.' },
  { no: '04', title: 'Retour', desc: 'Reprise du matériel et contrôle complet après votre événement.' }
];

const catalogueLinks = [
  { label: 'Catalogue', href: '#catalogue' },
  { label: 'Comment ça marche', href: '#methode' },
  { label: 'Accueil', href: '/' },
];

export default async function LocationCatalogue() {
  const [catalogue, categories] = await Promise.all([
    getPublicEquipmentList(),
    getCategories(),
  ]);

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Header subTitle="Location" links={catalogueLinks} />

      {/* ===== HERO ===== */}
      <section style={{ padding: 'clamp(60px,9vw,110px) clamp(20px,4vw,40px) clamp(40px,5vw,60px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0071e3', marginBottom: '20px' }}>Location de matériel professionnel</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '34px' }}>
            <h1 style={{ fontWeight: 800, fontSize: 'clamp(38px,6.6vw,80px)', lineHeight: 1.03, letterSpacing: '-.035em', margin: 0, maxWidth: '16ch' }}>Le parc, ouvert à la location.</h1>
            <p style={{ maxWidth: '420px', margin: 0, fontSize: 'clamp(16px,1.6vw,19px)', lineHeight: 1.55, color: '#6e6e73' }}>Systèmes son line-array, éclairages asservis, régies et structures — testés, calibrés et livrés avec ou sans technicien.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 26px', alignItems: 'center', marginTop: '36px' }}>
            <a href="#catalogue" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 30px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '16px', transition: 'background .25s, transform .15s' }}>
              Composer ma sélection
            </a>
            <a href="#methode" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0071e3', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
              Comment ça marche <span style={{ fontWeight: 400 }}>›</span>
            </a>
          </div>
        </div>
      </section>

      {/* ===== CATALOGUE (interactive, client) ===== */}
      <CatalogueGrid items={catalogue} categories={categories} />

      {/* ===== METHOD SECTION ===== */}
      <section id="methode" style={{ backgroundColor: '#ffffff', padding: 'clamp(80px,9vw,130px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(54px,7vw,80px)' }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(28px,4.2vw,48px)', lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 16px' }}>Une méthode rigoureuse.</h2>
            <p style={{ maxWidth: '580px', margin: '0 auto', fontSize: 'clamp(15px,1.5vw,18px)', lineHeight: 1.5, color: '#6e6e73' }}>
              De la réservation à la reprise sur site, nous suivons un protocole strict pour garantir le parfait déroulement de vos événements.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '34px' }}>
            {steps.map(step => (
              <div key={step.no} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '40px', fontWeight: 800, color: '#e8e8ed', lineHeight: 1 }}>{step.no}</div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#1d1d1f' }}>{step.title}</h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#6e6e73', margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ENGAGEMENT SECTION ===== */}
      <section style={{ backgroundColor: '#f5f5f7', padding: 'clamp(80px,9vw,130px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
            {included.map((inc, index) => (
              <div key={index} style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '22px', border: '1px solid rgba(0,0,0,.04)', boxShadow: '0 2px 12px rgba(0,0,0,.01)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', color: '#0071e3', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>{inc.tag}</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: '#1d1d1f' }}>{inc.title}</h3>
                <p style={{ fontSize: '13px', lineHeight: 1.55, color: '#6e6e73', margin: 0 }}>{inc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
