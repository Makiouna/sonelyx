'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { CategoryItem, PublicEquipmentItem } from '@/lib/catalogue-types';

interface Props {
  items: PublicEquipmentItem[];
  categories: CategoryItem[];
}

export default function HomeCatalogueSection({ items, categories }: Props) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

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

  const count = Object.keys(selected).length;
  const selectionLabel = `${count} article${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;

  const filteredItems = items.filter((e) => filter === 'all' || e.cat === filter);
  const filterDefs = [{ key: 'all', label: 'Tout' }, ...categories.map((c) => ({ key: c.id, label: c.label }))];

  return (
    <>
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

        {filteredItems.length > 0 ? (
          <div className="parc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
            {filteredItems.slice(0, 8).map((e) => {
              const isRequest = e.priceType === 'on_request';
              const available = e.quantity > 0;
              return (
                <div key={e.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0,0,0,.09)', boxShadow: '0 1px 2px rgba(0,0,0,.04)', transition: 'transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s' }}>
                  <Link href={`/location/catalogue/${e.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ position: 'relative', aspectRatio: '16/11', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                      {e.image ? (
                        <Image
                          src={e.image}
                          alt={`Location ${e.name} ${e.brand} Orléans - Événementiel`}
                          fill
                          sizes="(max-width: 680px) 90vw, (max-width: 1280px) 45vw, 300px"
                          style={{ objectFit: 'contain' }}
                          unoptimized
                        />
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
    </>
  );
}
