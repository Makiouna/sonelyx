'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Loader2 } from 'lucide-react';

interface EquipmentItem {
  id: string;
  slug: string;
  cat: string;
  catLabel: string;
  brand: string;
  name: string;
  desc: string;
  specs: string[];
  price: number;
  priceType: 'numeric' | 'on_request';
  priceTax: 'HT' | 'TTC';
  image: string | null;
  quantity: number;
}

interface CategoryItem {
  id: string;
  label: string;
}

const NAV_LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Le parc', href: '#parc' },
  { label: 'Méthode', href: '#process' },
  { label: 'Boutique', href: '/location/catalogue' },
];

const stats = [
  { big: '24/7', label: 'Assistance permanente, sur site et à distance.', rule: 'none' },
  { big: '100%', label: 'Matériel testé, étiqueté et calibré avant départ.', rule: '1px solid rgba(0,0,0,.12)' },
  { big: '<24h', label: 'Délai de réponse pour un devis sur-mesure.', rule: '1px solid rgba(0,0,0,.12)' },
];

const features = [
  { title: 'Assistance 24/7', desc: 'Techniciens disponibles en amont et pendant l’événement, en cas d’urgence.' },
  { title: 'Matériel calibré', desc: 'Chaque équipement est testé, étiqueté et garanti opérationnel.' },
  { title: 'Son & light design', desc: 'Une conception sur-mesure, pensée pour votre lieu et votre public.' },
  { title: 'Devis transparent', desc: 'Un tarif clair sous 24h, sans surprise et sans frais cachés.' },
];

const processSteps = [
  { no: '01', title: 'Choisir', desc: 'Parcourez le parc et composez votre sélection de matériel.' },
  { no: '02', title: 'Réserver', desc: 'Ajoutez au devis et précisez vos dates et votre lieu.' },
  { no: '03', title: 'Devis 24h', desc: 'Nous étudions la faisabilité et renvoyons un tarif sur-mesure.' },
  { no: '04', title: 'Confirmé', desc: 'Livraison, installation et exploitation par nos équipes.' },
];

const commitments = [
  'Des équipes certifiées et des procédures de sécurité conformes.',
  'Un matériel de secours et un remplacement rapide en cas d’incident.',
  'Une assistance continue, du montage à l’extinction des feux.',
];

const perks = [
  'Réponse et devis sur-mesure sous 24h.',
  'Étude technique de votre événement offerte.',
  'Livraison avec ou sans technicien, partout en région.',
];

export default function Home() {
  const [filter, setFilter] = useState('all');
  const [catalogue, setCatalogue] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sonelyx_devis');
      if (stored) {
        setSelected(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [reqEquip, reqCats] = await Promise.all([
          fetch('/api/equipment'),
          fetch('/api/categories'),
        ]);
        const [dataEquip, dataCats] = await Promise.all([
          reqEquip.json(),
          reqCats.json(),
        ]);
        if (dataEquip.success) {
          setCatalogue(dataEquip.items);
        }
        if (dataCats.success) {
          setCategories(dataCats.categories);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const persist = (next: Record<string, boolean>) => {
    try {
      localStorage.setItem('sonelyx_devis', JSON.stringify(next));
      window.dispatchEvent(new Event('cart-updated'));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (id: string) => {
    const next = { ...selected };
    if (next[id]) {
      delete next[id];
    } else {
      next[id] = true;
    }
    setSelected(next);
    persist(next);
  };

  const clearSelection = () => {
    setSelected({});
    persist({});
  };

  const count = Object.keys(selected).length;
  const selectionLabel = `${count} article${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;

  const items = catalogue.filter((e) => filter === 'all' || e.cat === filter);
  const filterDefs = [{ key: 'all', label: 'Tout' }, ...categories.map((c) => ({ key: c.id, label: c.label }))];

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#0b0e14', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.015em', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      <Header links={NAV_LINKS} />

      {/* ===== HERO CARD ===== */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(14px,2vw,22px) clamp(14px,2vw,22px) 0', width: '100%' }}>
        <div className="hero-card" style={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', minHeight: 'clamp(420px,58vh,600px)', backgroundColor: '#1d1d1f' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 1px, transparent 1px 16px)' }}></div>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 90% at 78% 20%, rgba(0,113,227,.28), transparent 60%)' }}></div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(11,14,20,.55) 0%, rgba(11,14,20,.2) 46%, rgba(11,14,20,.05) 78%)', pointerEvents: 'none' }}></div>

          <div style={{ position: 'relative', zIndex: 3, padding: 'clamp(40px,6vw,72px) clamp(20px,3vw,44px) clamp(48px,7vw,80px)', maxWidth: '760px' }}>
            <h1 style={{ fontWeight: 800, fontSize: 'clamp(36px,6vw,74px)', lineHeight: 1.02, letterSpacing: '-.03em', margin: 0, color: '#fff' }}>
              Trouvez, réservez<br />&amp; équipez facilement.
            </h1>
            <p style={{ margin: '22px 0 0', maxWidth: '440px', fontSize: 'clamp(14px,1.5vw,17px)', lineHeight: 1.55, color: 'rgba(255,255,255,.72)' }}>
              Un parc professionnel son, lumière et régie — testé, calibré et livré avec ou sans technicien pour vos événements.
            </p>
            <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginTop: '30px', padding: '8px 8px 8px 26px', borderRadius: '980px', backgroundColor: '#fff', color: '#0b0e14', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}>
              Choisir mon matériel
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#0071e3', color: '#fff' }}>›</span>
            </Link>
          </div>
        </div>
        <style>{`
          @media (max-width: 680px) {
            .hero-card { min-height: auto !important; }
          }
        `}</style>
      </section>

      {/* ===== STATS ===== */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(36px,5vw,64px) clamp(20px,3vw,40px)', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'clamp(20px,3vw,10px)' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 clamp(10px,3vw,40px)', borderLeft: s.rule }}>
              <div style={{ fontWeight: 800, fontSize: 'clamp(30px,3.6vw,46px)', letterSpacing: '-.03em' }}>{s.big}</div>
              <div style={{ fontSize: '14px', color: '#6b6b73', lineHeight: 1.4, maxWidth: '22ch' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES (dark) ===== */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(14px,2vw,22px)', width: '100%' }}>
        <div style={{ borderRadius: '28px', backgroundColor: '#1d1d1f', color: '#fff', padding: 'clamp(40px,5vw,72px) clamp(24px,4vw,60px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(20px,3vw,40px)', alignItems: 'start', marginBottom: 'clamp(38px,4vw,56px)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5b9bff', marginBottom: '16px' }}>Fiabilité</div>
              <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.6vw,44px)', lineHeight: 1.08, letterSpacing: '-.025em', margin: 0 }}>La sérénité, avant même le premier réglage.</h2>
            </div>
            <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'rgba(255,255,255,.6)', maxWidth: '44ch', margin: 0, alignSelf: 'end' }}>Chaque prestation Sonelyx s'appuie sur du matériel contrôlé, des équipes certifiées et une assistance continue.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 'clamp(20px,2.5vw,36px)' }}>
            {features.map((f, i) => (
              <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,.14)', paddingTop: '22px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-.01em', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,.55)', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FLEET / PARC ===== */}
      <section id="parc" style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(56px,7vw,110px) clamp(20px,3vw,40px)', width: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto clamp(28px,3.5vw,42px)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#0071e3', marginBottom: '14px' }}>Le parc</div>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px,4.4vw,52px)', lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 14px' }}>Notre parc matériel</h2>
          <p style={{ fontSize: '16px', lineHeight: 1.55, color: '#6b6b73', margin: 0 }}>Un catalogue professionnel complet : diffusion, éclairage, régie et structure, prêt à louer.</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: 'clamp(26px,3vw,38px)' }}>
          {filterDefs.map((ft) => {
            const on = ft.key === filter;
            return (
              <button
                key={ft.key}
                onClick={() => setFilter(ft.key)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '980px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all .25s',
                  whiteSpace: 'nowrap',
                  backgroundColor: on ? '#0b0e14' : '#fff',
                  color: on ? '#fff' : '#5b5b63',
                  border: on ? '1px solid #0b0e14' : '1px solid rgba(0,0,0,.14)',
                }}
              >
                {ft.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <Loader2 style={{ width: '36px', height: '36px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : items.length > 0 ? (
          <div className="parc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
            {items.slice(0, 8).map((e) => {
              const isRequest = e.priceType === 'on_request';
              const available = e.quantity > 0;
              return (
                <div key={e.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0,0,0,.09)', boxShadow: '0 1px 2px rgba(0,0,0,.04)', transition: 'transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s' }}>
                  <Link href={`/location/catalogue/${e.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ position: 'relative', aspectRatio: '16/11', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                      {e.image ? (
                        <img src={e.image} alt={`Location ${e.name} - Sonelyx`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <>
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.028) 0 1px, transparent 1px 16px)' }}></div>
                          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 120%, rgba(0,113,227,.07), transparent 62%)' }}></div>
                        </>
                      )}
                      <span style={{ position: 'absolute', top: '12px', left: '12px', padding: '6px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(6px)', fontSize: '11px', fontWeight: 700, letterSpacing: '.02em', color: '#0b0e14' }}>{e.brand}</span>
                    </div>
                    <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#f5f5f7' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-.02em', margin: 0 }}>{e.name}</h3>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', whiteSpace: 'nowrap' }}>
                          {isRequest ? 'Sur devis' : `${e.price} € ${e.priceTax || 'HT'}`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,.08)' }}>
                        <span style={{ fontSize: '13px', color: '#8c8c94', fontWeight: 500 }}>{categories.find((c) => c.id === e.cat)?.label || e.catLabel}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: available ? '#1d7a3e' : '#8c8c94' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: available ? '#1db954' : '#c8c8ce' }}></span>
                          {available ? 'Disponible' : 'Indisponible'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div style={{ padding: '0 20px 20px', backgroundColor: '#f5f5f7' }}>
                    <button
                      onClick={() => toggleSelect(e.id)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '980px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        transition: 'all .2s',
                        backgroundColor: selected[e.id] ? '#e8f1fd' : '#0b0e14',
                        color: selected[e.id] ? '#0071e3' : '#ffffff',
                      }}
                    >
                      {selected[e.id] ? '✓ Sélectionné' : 'Ajouter au devis'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#86868b' }}>Aucun équipement disponible dans cette catégorie.</div>
        )}

        <div style={{ textAlign: 'center', marginTop: 'clamp(30px,4vw,48px)' }}>
          <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '8px 8px 8px 26px', borderRadius: '980px', backgroundColor: '#0b0e14', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}>
            Voir tout le matériel
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0071e3' }}>›</span>
          </Link>
        </div>
        <style>{`
          @media (max-width: 680px) {
            .parc-grid > *:nth-child(n+4) { display: none; }
          }
        `}</style>
      </section>

      {/* ===== PROCESS ===== */}
      <section id="process" style={{ backgroundColor: '#f5f5f7', padding: 'clamp(56px,7vw,110px) clamp(20px,3vw,40px)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'clamp(28px,4vw,56px)', alignItems: 'center', marginBottom: 'clamp(40px,5vw,64px)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#0071e3', marginBottom: '16px' }}>Méthode</div>
              <h2 style={{ fontWeight: 800, fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 22px' }}>Réserver votre matériel, étape par étape.</h2>
              <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 8px 8px 24px', borderRadius: '980px', backgroundColor: '#0b0e14', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
                Composer ma sélection
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#0071e3' }}>›</span>
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 'clamp(20px,2.5vw,32px)' }}>
            {processSteps.map((p) => (
              <div key={p.no} style={{ borderTop: '2px solid #0b0e14', paddingTop: '20px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#0b0e14', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', marginBottom: '18px' }}>{p.no}</div>
                <h3 style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-.01em', margin: '0 0 8px' }}>{p.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#6b6b73', margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SAFETY / QUALITY (dark) ===== */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(20px,3vw,40px) clamp(14px,2vw,22px)', width: '100%' }}>
        <div style={{ borderRadius: '28px', backgroundColor: '#1d1d1f', color: '#fff', padding: 'clamp(36px,5vw,68px) clamp(24px,4vw,60px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'clamp(30px,4vw,56px)', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5b9bff', marginBottom: '16px' }}>Notre engagement</div>
              <h2 style={{ fontWeight: 800, fontSize: 'clamp(28px,3.8vw,46px)', lineHeight: 1.07, letterSpacing: '-.025em', margin: '0 0 26px' }}>Votre événement est notre priorité.</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {commitments.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <span style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(0,113,227,.16)', border: '1px solid rgba(0,113,227,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8fb0ff', fontSize: '12px', fontWeight: 700 }}>✓</span>
                    <span style={{ fontSize: '15px', lineHeight: 1.5, color: 'rgba(255,255,255,.78)' }}>{c}</span>
                  </div>
                ))}
              </div>
              <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 8px 8px 24px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
                Explorer le parc
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0071e3' }}>›</span>
              </Link>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5b9bff', marginBottom: '16px' }}>Contrôle qualité</div>
              <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.4vw,42px)', lineHeight: 1.08, letterSpacing: '-.025em', margin: '0 0 18px' }}>Un matériel calibré, à chaque sortie.</h2>
              <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'rgba(255,255,255,.6)', margin: '0 0 28px', maxWidth: '46ch' }}>Chaque équipement est testé, étiqueté et garanti opérationnel avant de partir. Un parc entretenu qui réduit les imprévus et protège votre événement.</p>
              <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 8px 8px 24px', borderRadius: '980px', backgroundColor: '#fff', color: '#0b0e14', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
                Voir le parc matériel
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0071e3', color: '#fff' }}>›</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTACT / DEVIS ===== */}
      <section id="contact" style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(56px,7vw,110px) clamp(20px,3vw,40px)', width: '100%' }}>
        <div style={{ backgroundColor: '#f5f5f7', borderRadius: '28px', padding: 'clamp(28px,4vw,56px)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#0071e3', marginBottom: '16px' }}>Contact</div>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 22px', maxWidth: '18ch' }}>Recevez votre devis sur-mesure.</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '30px', maxWidth: '520px' }}>
            {perks.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(0,113,227,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0071e3', fontSize: '12px', fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: '15px', lineHeight: 1.5, color: '#3a3a42' }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', borderRadius: '980px', backgroundColor: '#0b0e14', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}>
              Demander un devis
            </Link>
            <a href="mailto:contact@sonelyx.fr" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0b0e14', textDecoration: 'none', fontWeight: 600, fontSize: '15px', borderBottom: '1px solid rgba(0,0,0,.25)', paddingBottom: '3px' }}>
              Nous écrire directement ›
            </a>
          </div>
        </div>
      </section>

      {/* ===== FLOATING DEVIS BAR ===== */}
      {count > 0 && (
        <>
          <div className="devis-float-bar" style={{ position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 70, display: 'flex', alignItems: 'center', gap: '16px', padding: '11px 11px 11px 22px', borderRadius: '980px', backgroundColor: 'rgba(29,29,31,.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 20px 54px -18px rgba(0,0,0,.6)', color: '#fff', maxWidth: 'calc(100vw - 32px)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{selectionLabel}</span>
            <Link href="/location/panier" className="devis-float-cta" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 22px', borderRadius: '980px', backgroundColor: '#fff', color: '#1d1d1f', textDecoration: 'none', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' }}>
              Demander un devis
            </Link>
            <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: '13px', fontWeight: 500, padding: '6px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Effacer
            </button>
          </div>
          <style>{`
            @media (max-width: 480px) {
              .devis-float-bar { flex-direction: column; align-items: stretch; width: calc(100vw - 32px); border-radius: 20px; padding: 14px 16px 16px; gap: 10px; text-align: center; }
              .devis-float-bar .devis-float-cta { width: 100%; }
            }
          `}</style>
        </>
      )}

      <Footer />
    </div>
  );
}
