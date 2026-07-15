'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PackIcon from '@/components/pack-icon';
import EquipmentIcon from '@/components/equipment-icon';
import type { CategoryItem, PublicEquipmentItem } from '@/lib/catalogue-types';

interface Props {
  items: PublicEquipmentItem[];
  categories: CategoryItem[];
}

export default function CatalogueGrid({ items, categories }: Props) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sonelyx_devis');
      if (stored) setSelected(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
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

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const q = query.trim().toLowerCase();
  const filteredItems = items.filter(e => {
    if (filter !== 'all' && e.cat !== filter) return false;
    if (!q) return true;
    const haystack = (e.name + ' ' + e.brand + ' ' + e.desc + ' ' + e.catLabel + ' ' + (e.specs || []).join(' ')).toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filterDefs = [
    { key: 'all', label: 'Tout' },
    ...categories.map(c => ({ key: c.id, label: c.label }))
  ];

  const count = Object.keys(selected).length;
  const selectionLabel = `${count} article${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;

  return (
    <>
      <section id="catalogue" style={{ backgroundColor: '#f5f5f7', padding: 'clamp(54px,7vw,96px) clamp(20px,4vw,40px) clamp(80px,9vw,130px)', flex: 1 }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.08, letterSpacing: '-.03em', margin: '0 0 8px' }}>Catalogue</h2>
            <div style={{ fontSize: '15px', color: '#6e6e73', fontWeight: 500 }}>
              {`${filteredItems.length} références · page ${currentPage} sur ${totalPages || 1}`}
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

          {filteredItems.length > 0 ? (
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
                      <Link href={`/location/catalogue/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ position: 'relative', aspectRatio: '4/3', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={`Location ${item.name} ${item.brand} Orléans - Événementiel`}
                              fill
                              sizes="(max-width: 680px) 90vw, (max-width: 1180px) 45vw, 320px"
                              style={{ objectFit: 'contain' }}
                              unoptimized
                            />
                          ) : item.isPack ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                              <PackIcon size={80} />
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', letterSpacing: '.08em', textTransform: 'uppercase' }}>Pack / Kit</span>
                            </div>
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <EquipmentIcon cat={item.cat} size={80} />
                            </div>
                          )}
                          <span style={{ position: 'absolute', top: '16px', left: '16px', padding: '6px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontSize: '12px', fontWeight: 700, color: '#1d1d1f' }}>
                            {item.brand}
                          </span>
                        </div>
                      </Link>

                      {/* Product Details */}
                      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, backgroundColor: '#f9f9fb' }}>
                        <Link href={`/location/catalogue/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', color: '#86868b', marginBottom: '8px' }}>
                              {categories.find(c => c.id === item.cat)?.label || item.catLabel}
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-.02em', margin: '0 0 6px', color: '#1d1d1f' }}>
                              {item.name}
                            </h3>
                            <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#6e6e73', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.desc}
                            </p>
                          </div>
                        </Link>

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
                    onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
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
                    onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
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
    </>
  );
}
