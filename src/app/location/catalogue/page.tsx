'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  quantity: number;
}

interface CategoryItem {
  id: string;
  label: string;
}

export default function LocationCatalogue() {
  const [catalogue, setCatalogue] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

  // Fetch catalogue and categories on mount
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

  const persist = (next: Record<string, boolean>) => {
    try {
      localStorage.setItem('sonelyx_devis', JSON.stringify(next));
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

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const q = query.trim().toLowerCase();
  const filteredItems = catalogue.filter(e => {
    if (filter !== 'all' && e.cat !== filter) return false;
    if (!q) return true;
    const haystack = (e.name + ' ' + e.brand + ' ' + e.desc + ' ' + e.catLabel + ' ' + (e.specs || []).join(' ')).toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dynamic filter pills matching database categories
  const filterDefs = [
    { key: 'all', label: 'Tout' },
    ...categories.map(c => ({ key: c.id, label: c.label }))
  ];

  const count = Object.keys(selected).length;
  const selectionLabel = `${count} article${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;

  const catalogueLinks = [
    { label: 'Catalogue', href: '#catalogue' },
    { label: 'Comment ça marche', href: '#methode' },
    { label: 'Accueil', href: '/' },
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

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

      {/* ===== CATALOGUE ===== */}
      <section id="catalogue" style={{ backgroundColor: '#f5f5f7', padding: 'clamp(54px,7vw,96px) clamp(20px,4vw,40px) clamp(80px,9vw,130px)', flex: 1 }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.08, letterSpacing: '-.03em', margin: '0 0 8px' }}>Catalogue</h2>
            <div style={{ fontSize: '15px', color: '#6e6e73', fontWeight: 500 }}>
              {loading ? 'Chargement en cours...' : `${filteredItems.length} références · page {currentPage} sur ${totalPages || 1}`}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '480px' }}>
              <input
                type="text"
                placeholder="Rechercher par marque, modèle, spécificité..."
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '980px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxShadow: '0 2px 14px rgba(0,0,0,.03)'
                }}
              />
            </div>

            {/* Category filter pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {filterDefs.map(def => {
                const isActive = filter === def.key;
                return (
                  <button
                    key={def.key}
                    onClick={() => handleFilterChange(def.key)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '980px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      transition: 'all .25s',
                      backgroundColor: isActive ? '#1d1d1f' : '#ffffff',
                      color: isActive ? '#ffffff' : '#1d1d1f',
                      boxShadow: '0 2px 10px rgba(0,0,0,.02)'
                    }}
                  >
                    {def.label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <Loader2 style={{ width: '36px', height: '36px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              {/* Catalogue Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
                {paginatedItems.map(item => {
                  const isAdded = !!selected[item.id];
                  const isRequest = item.priceType === 'on_request';
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,.02)',
                        border: `1px solid ${isAdded ? 'rgba(0,113,227,.5)' : 'rgba(0,0,0,.07)'}`,
                        transition: 'transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .3s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 20px 38px -10px rgba(0,0,0,.07)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.02)';
                      }}
                    >
                      {/* Product Header Visual area */}
                      <Link href={`/location/catalogue/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ position: 'relative', aspectRatio: '4/3', backgroundColor: '#f5f5f7', overflow: 'hidden' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.02) 0 1px, transparent 1px 16px)' }}></div>
                          )}
                          <span style={{ position: 'absolute', top: '16px', left: '16px', padding: '6px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontSize: '12px', fontWeight: 700, color: '#1d1d1f' }}>
                            {item.brand}
                          </span>
                          <span style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                            Dispo: {item.quantity}
                          </span>
                        </div>
                      </Link>

                      {/* Product Details */}
                      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                        <Link href={`/location/catalogue/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', color: '#86868b', marginBottom: '8px' }}>
                              {categories.find(c => c.id === item.cat)?.label || item.catLabel}
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-.02em', margin: '0 0 6px', color: '#1d1d1f' }}>
                              {item.name}
                            </h3>
                            <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#6e6e73', margin: 0 }}>
                              {item.desc}
                            </p>
                          </div>
                        </Link>

                        {/* Specs badges preview */}
                        {item.specs && item.specs.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {item.specs.slice(0, 3).map((spec, sidx) => (
                              <span key={sidx} style={{ padding: '5px 10px', borderRadius: '8px', backgroundColor: '#f5f5f7', fontSize: '11px', fontWeight: 600, color: '#424245' }}>
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price tag & add button */}
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#86868b' }}>À partir de</span>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1d1d1f' }}>
                              {isRequest ? (
                                <span style={{ color: '#0071e3' }}>Sur devis</span>
                              ) : (
                                <span>{item.price} € <span style={{ fontSize: '11px', fontWeight: 500, color: '#86868b' }}>{item.priceTax || 'HT'}</span></span>
                              )}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleSelect(item.id)}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '980px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              transition: 'all .2s',
                              backgroundColor: isAdded ? '#e8f1fd' : '#1d1d1f',
                              color: isAdded ? '#0071e3' : '#ffffff'
                            }}
                          >
                            {isAdded ? '✓ Sélectionné' : 'Ajouter'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '54px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '980px',
                      border: '1px solid rgba(0,0,0,.08)',
                      backgroundColor: '#ffffff',
                      color: currentPage === 1 ? '#86868b' : '#1d1d1f',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    Précédent
                  </button>

                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', padding: '0 12px' }}>
                    Page {currentPage} sur {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '980px',
                      border: '1px solid rgba(0,0,0,.08)',
                      backgroundColor: '#ffffff',
                      color: currentPage === totalPages ? '#86868b' : '#1d1d1f',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.01)' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1d1d1f', marginBottom: '8px' }}>Aucun matériel ne correspond à votre recherche</div>
              <div style={{ fontSize: '14px', color: '#86868b', marginBottom: '24px' }}>Essayez d'ajuster vos filtres ou l'orthographe de votre recherche.</div>
              <button
                onClick={() => { setFilter('all'); setQuery(''); }}
                style={{ padding: '10px 20px', borderRadius: '980px', border: 'none', backgroundColor: '#1d1d1f', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </section>

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

      {/* ===== FLOATING DEVIS BAR ===== */}
      {count > 0 && (
        <div style={{ position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 70, display: 'flex', alignItems: 'center', gap: '16px', padding: '11px 11px 11px 22px', borderRadius: '980px', backgroundColor: 'rgba(29,29,31,.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 20px 54px -18px rgba(0,0,0,.6)', color: '#fff', maxWidth: 'calc(100vw - 32px)', animation: 'barUp .35s cubic-bezier(.22,1,.36,1)' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{selectionLabel}</span>
          <Link href="/location/panier" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 22px', borderRadius: '980px', backgroundColor: '#fff', color: '#1d1d1f', textDecoration: 'none', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', transition: 'transform .15s' }}>
            Demander un devis
          </Link>
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: '13px', fontWeight: 500, padding: '6px', fontFamily: 'inherit', transition: 'color .2s' }}>
            Effacer
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
