'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import UserNav from '@/components/user-nav';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Loader2 } from 'lucide-react';

interface EquipmentItem {
  id: string;
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
}

interface CategoryItem {
  id: string;
  label: string;
}

export default function Home() {
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch dynamic catalogue and categories
  useEffect(() => {
    async function loadData() {
      try {
        const [reqEquip, reqCats] = await Promise.all([
          fetch('/api/equipment'),
          fetch('/api/categories')
        ]);
        const [dataEquip, dataCats] = await Promise.all([
          reqEquip.json(),
          reqCats.json()
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

  const trust = [
    { tag: 'Support', big: '24/7', title: 'Assistance permanente', label: 'Sur site et à distance, en amont comme pendant l’événement.' },
    { tag: 'Qualité', big: '100%', title: 'Matériel testé & calibré', label: 'Contrôlé, étiqueté et garanti opérationnel à chaque sortie.' },
    { tag: 'Expertise', big: 'Certifiée', title: 'Direction technique', label: 'Régisseurs expérimentés, procédures de sécurité conformes.' },
    { tag: 'Logistique', big: 'A→Z', title: 'Logistique intégrée', label: 'Transport, installation, exploitation et démontage inclus.' }
  ];

  const steps = [
    { no: '01', title: 'Étude & repérage', desc: 'Analyse du lieu, des contraintes techniques et de vos objectifs.' },
    { no: '02', title: 'Design & calibration', desc: 'Sound & light design, matériel sélectionné puis calibré en atelier.' },
    { no: '03', title: 'Installation', desc: 'Montage, câblage et réglages réalisés par nos équipes sur site.' },
    { no: '04', title: 'Exploitation & démontage', desc: 'Direction technique en direct, puis démontage et retour atelier.' }
  ];

  const items = catalogue.filter(e => filter === 'all' || e.cat === filter);

  const filterDefs = [
    { key: 'all', label: 'Tout' },
    ...categories.map(c => ({ key: c.id, label: c.label }))
  ];

  const pillarDefs = [
    {
      key: 'presta', no: '01', tag: 'STUDIO TECHNIQUE', title: 'Prestation technique',
      desc: 'Nous prenons la main sur toute la chaîne technique de votre événement, de l’étude préalable à l’exploitation en direct.',
      feats: ['Sound & light design sur-mesure', 'Direction technique d’événement', 'Gestion complète : étude, install, exploitation']
    },
    {
      key: 'loc', no: '02', tag: 'PARC MATÉRIEL', title: 'Location de matériel',
      desc: 'Un parc professionnel premium, prêt à partir, testé et calibré, livré avec ou sans technicien.',
      feats: ['Systèmes son line-array', 'Éclairages asservis & scéniques', 'Régies DJ professionnelles']
    }
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <Header />

      {/* ===== HERO ===== */}
      <section style={{ textAlign: 'center', padding: 'clamp(70px,11vw,140px) clamp(20px,4vw,40px) clamp(40px,6vw,72px)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0071e3', letterSpacing: 0, marginBottom: '22px' }}>Prestation technique &amp; location événementielle</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(40px,7.4vw,88px)', lineHeight: 1.03, letterSpacing: '-.035em', margin: 0, textWrap: 'balance' }}>
            La technique qui s'efface.<br />L'émotion qui s'impose.
          </h1>
          <p style={{ maxWidth: '600px', margin: '26px auto 0', fontSize: 'clamp(17px,1.8vw,22px)', lineHeight: 1.5, color: '#6e6e73', fontWeight: 400 }}>
            Direction technique, sound &amp; light design et location de matériel professionnel pour les événements les plus exigeants.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', justifyContent: 'center', alignItems: 'center', margin: '38px' }}>
            <Link href="/location/catalogue#contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 30px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '16px', transition: 'background .25s, transform .15s' }}>
              Demander un devis sur-mesure
            </Link>
            <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0071e3', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
              Explorer le parc matériel <span style={{ fontWeight: 400 }}>›</span>
            </Link>
          </div>
        </div>

        {/* hero visual */}
        <div style={{ maxWidth: '1180px', margin: 'clamp(48px,6vw,80px) auto 0', padding: '0 clamp(20px,4vw,40px)' }}>
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', aspectRatio: '21/9', backgroundColor: '#f5f5f7', border: '1px solid rgba(0,0,0,.05)' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.025) 0 1px, transparent 1px 16px)' }}></div>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 90% at 50% 120%, rgba(0,113,227,.08), transparent 60%)' }}></div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, color: '#86868b', letterSpacing: '.04em' }}>[ visuel — scène / installation Sonelyx ]</div>
          </div>
        </div>
      </section>

      {/* ===== TRUST / FIABILITÉ ===== */}
      <section id="fiabilite" style={{ backgroundColor: '#f5f5f7', padding: 'clamp(70px,9vw,120px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto clamp(44px,5vw,64px)' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#86868b', letterSpacing: '.02em', marginBottom: '16px' }}>FIABILITÉ</div>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.06, letterSpacing: '-.03em', margin: 0 }}>La confiance, garantie par les détails.</h2>
            <p style={{ margin: '18px auto 0', maxWidth: '520px', fontSize: '18px', lineHeight: 1.5, color: '#6e6e73' }}>Chaque équipement quitte l'atelier testé, étiqueté et opérationnel.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '18px' }}>
            {trust.map((t, i) => (
              <div key={i} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '34px 30px', minHeight: '230px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,.04)' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0071e3' }}>{t.tag}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '46px', lineHeight: 1, letterSpacing: '-.03em', marginBottom: '12px' }}>{t.big}</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{t.title}</div>
                  <div style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.5 }}>{t.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEUX PILIERS ===== */}
      <section id="metiers" style={{ backgroundColor: '#fff', padding: 'clamp(70px,9vw,120px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto clamp(40px,5vw,56px)' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#86868b', letterSpacing: '.02em', marginBottom: '16px' }}>NOS DEUX MÉTIERS</div>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.06, letterSpacing: '-.03em', margin: 0 }}>Un studio technique. Un parc matériel.</h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'stretch' }}>
            {pillarDefs.map((p) => {
              const isActive = active === p.key;
              const dimmed = active && !isActive;
              const flexVal = isActive ? 1.7 : (dimmed ? 0.9 : 1.25);
              const glowVal = isActive ? 1 : 0;
              const shadowVal = isActive ? '0 30px 60px -28px rgba(0,0,0,.3)' : 'none';

              return (
                <div
                  key={p.key}
                  onClick={() => setActive(isActive ? null : p.key)}
                  style={{
                    flex: `${flexVal} 1 300px`,
                    backgroundColor: '#f5f5f7',
                    borderRadius: '24px',
                    padding: 'clamp(30px,4vw,48px)',
                    cursor: 'pointer',
                    transition: 'all .5s cubic-bezier(.16,1,.3,1)',
                    opacity: dimmed ? 0.6 : 1,
                    transform: isActive ? 'scale(1.01)' : 'scale(1)',
                    boxShadow: shadowVal,
                    border: '1px solid rgba(0,0,0,.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '400px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.06em', color: '#0071e3' }}>{p.tag}</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#86868b' }}>{p.no}</span>
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: 'clamp(24px,3vw,34px)', letterSpacing: '-.025em', margin: '0 0 16px', color: '#1d1d1f' }}>{p.title}</h3>
                    <p style={{ fontSize: '15px', lineHeight: 1.55, color: '#6e6e73', margin: '0 0 32px', maxWidth: '38ch' }}>{p.desc}</p>
                  </div>
                  <div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {p.feats.map((f, fi) => (
                        <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0071e3' }}></span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {p.key === 'loc' && (
                      <Link href="/location/catalogue" style={{ display: 'inline-flex', marginTop: '24px', padding: '10px 20px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                        Accéder au catalogue matériel ›
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== PROCESS / MÉTHODE ===== */}
      <section style={{ backgroundColor: '#f5f5f7', padding: 'clamp(70px,9vw,120px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto clamp(40px,5vw,56px)' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#86868b', letterSpacing: '.02em', marginBottom: '16px' }}>MÉTHODE</div>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.06, letterSpacing: '-.03em', margin: 0 }}>Un protocole pour chaque scène.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '18px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '32px 28px', border: '1px solid rgba(0,0,0,.04)', minHeight: '210px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0071e3', letterSpacing: '.02em', marginBottom: 'auto' }}>{s.no}</div>
                <h3 style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '-.02em', margin: '26px 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.55, color: '#6e6e73', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DYNAMIC PREVIEW OF GEAR (PARC) ===== */}
      <section id="parc" style={{ backgroundColor: '#fff', padding: 'clamp(70px,9vw,120px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '28px', marginBottom: '40px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#86868b', letterSpacing: '.02em', marginBottom: '16px' }}>LE PARC</div>
              <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.06, letterSpacing: '-.03em', margin: 0, maxWidth: '14ch' }}>Un parc premium, marques de référence.</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', backgroundColor: '#f5f5f7', padding: '5px', borderRadius: '980px' }}>
              {filterDefs.map((ft) => {
                const on = ft.key === filter;
                return (
                  <button
                    key={ft.key}
                    onClick={() => setFilter(ft.key)}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '980px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'all .25s',
                      backgroundColor: on ? '#fff' : 'transparent',
                      color: on ? '#1d1d1f' : '#6e6e73',
                      boxShadow: on ? '0 2px 8px rgba(0,0,0,.1)' : 'none'
                    }}
                  >
                    {ft.label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <Loader2 style={{ width: '36px', height: '36px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : items.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '18px' }}>
              {items.slice(0, 6).map((e) => {
                const isRequest = e.priceType === 'on_request';
                return (
                  <div key={e.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '22px', overflow: 'hidden', border: '1px solid rgba(0,0,0,.09)', transition: 'transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .4s' }}>
                    <div style={{ position: 'relative', aspectRatio: '4/3', backgroundColor: '#f5f5f7', overflow: 'hidden' }}>
                      {e.image ? (
                        <img src={e.image} alt={e.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.028) 0 1px, transparent 1px 16px)' }}></div>
                          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 120%, rgba(0,113,227,.07), transparent 62%)' }}></div>
                        </>
                      )}
                      <span style={{ position: 'absolute', top: '14px', left: '14px', padding: '6px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontSize: '12px', fontWeight: 700, letterSpacing: '-.01em', color: '#1d1d1f' }}>{e.brand}</span>
                      <span style={{ position: 'absolute', top: '14px', right: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontSize: '11px', fontWeight: 600, color: '#1d7a3e' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1db954' }}></span>Disponible</span>
                    </div>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.08em', color: '#86868b', marginBottom: '9px' }}>{categories.find(c => c.id === e.cat)?.label || e.catLabel}</div>
                        <h3 style={{ fontWeight: 700, fontSize: '21px', letterSpacing: '-.02em', margin: '0 0 8px' }}>{e.name}</h3>
                        <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#6e6e73', margin: 0 }}>{e.desc}</p>
                      </div>
                      {e.specs && e.specs.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                          {e.specs.slice(0, 3).map((s, idx) => (
                            <span key={idx} style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#f5f5f7', fontSize: '12px', fontWeight: 600, color: '#424245' }}>{s}</span>
                          ))}
                        </div>
                      )}
                      
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,.08)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', color: '#86868b' }}>Tarif / jour</span>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f' }}>
                            {isRequest ? 'Sur devis' : `${e.price} € ${e.priceTax || 'HT'}`}
                          </span>
                        </div>
                        <Link href={`/location/catalogue/${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 600, color: '#0071e3', textDecoration: 'none' }}>
                          Fiche tech. <span style={{ fontWeight: 400 }}>›</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#86868b' }}>
              Aucun équipement disponible dans cette catégorie.
            </div>
          )}
        </div>
      </section>

      {/* ===== RÉFÉRENCES ===== */}
      <section style={{ backgroundColor: '#f5f5f7', padding: 'clamp(70px,9vw,120px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto clamp(40px,5vw,52px)' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#86868b', letterSpacing: '.02em', marginBottom: '16px' }}>RÉFÉRENCES</div>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.06, letterSpacing: '-.03em', margin: 0 }}>Ils nous confient leurs événements.</h2>
            <p style={{ margin: '18px auto 0', maxWidth: '520px', fontSize: '18px', lineHeight: 1.5, color: '#6e6e73' }}>Festivals, événements corporate, soirées de marque et productions live.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '14px' }}>
            {[0, 1, 2, 3, 4, 5].map((l) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '96px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,.04)', fontSize: '12px', fontWeight: 500, color: '#b0b0b5', letterSpacing: '.04em' }}>
                [ logo client ]
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section id="contact" style={{ backgroundColor: '#fff', textAlign: 'center', padding: 'clamp(90px,12vw,170px) clamp(20px,4vw,40px)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(38px,6.6vw,84px)', lineHeight: 1.02, letterSpacing: '-.035em', margin: '0 0 24px' }}>Allumons votre prochaine scène.</h2>
          <p style={{ fontSize: 'clamp(17px,1.8vw,21px)', color: '#6e6e73', maxWidth: '500px', margin: '0 auto 40px', lineHeight: 1.5 }}>Parlez-nous de votre projet. Devis sur-mesure sous 24h, étude technique offerte.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', justifyContent: 'center', alignItems: 'center' }}>
            <Link href="/location/catalogue#contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '16px 34px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '17px', transition: 'background .25s, transform .15s' }}>
              Démarrer mon projet
            </Link>
            <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0071e3', textDecoration: 'none', fontWeight: 600, fontSize: '17px' }}>
              Voir le parc ›
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
