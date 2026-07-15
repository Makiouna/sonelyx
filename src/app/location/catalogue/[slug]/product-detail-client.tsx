'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ProductExpertChat from '@/components/product-expert-chat';

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
  isPack: boolean;
}

interface Props {
  item: EquipmentItem;
  similarItems: EquipmentItem[];
}

export default function ProductDetailClient({ item, similarItems }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sonelyx_devis');
      if (stored) setSelected(JSON.parse(stored));
    } catch {/* ignore */}
  }, []);

  const persist = (next: Record<string, boolean>) => {
    try {
      localStorage.setItem('sonelyx_devis', JSON.stringify(next));
      window.dispatchEvent(new Event('cart-updated'));
    } catch {/* ignore */}
  };

  const toggleSelect = (itemId: string) => {
    const next = { ...selected };
    if (next[itemId]) delete next[itemId];
    else next[itemId] = true;
    setSelected(next);
    persist(next);
  };

  const isAdded = !!selected[item.id];
  const count = Object.keys(selected).length;
  const selectionLabel = `${count} article${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
  const isRequest = item.priceType === 'on_request';
  const altText = `Location ${item.name} Orléans - Événementiel`;

  const detailLinks = [
    { label: 'Espace Location', href: '/location/catalogue' },
    { label: 'Accueil', href: '/' },
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <Header subTitle="Location" links={detailLinks} />

      <main style={{ flex: 1, maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '40px clamp(20px, 4vw, 40px)' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link href="/location/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0071e3', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>
            ‹ Retour au catalogue
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'start' }}>

          {/* Left Column: Visual */}
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', aspectRatio: '4/3', backgroundColor: '#f5f5f7', border: '1px solid rgba(0,0,0,.08)' }}>
            {item.image ? (
              <img
                src={item.image}
                alt={altText}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.025) 0 1px, transparent 1px 16px)' }}></div>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 120%, rgba(0,113,227,.06), transparent 62%)' }}></div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#86868b', fontWeight: 500 }}>[ Visuel produit - {item.name} ]</div>
              </>
            )}
            <div style={{ position: 'absolute', top: '20px', left: '20px', padding: '6px 14px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontSize: '13px', fontWeight: 700 }}>{item.brand}</div>
            <span style={{ position: 'absolute', top: '20px', right: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontSize: '12px', fontWeight: 600, color: '#1d7a3e' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1db954' }}></span>Disponible à Orléans
            </span>
          </div>

          {/* Right Column: Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', color: '#86868b', marginBottom: '8px' }}>{item.catLabel}</div>
              <h1 style={{ fontWeight: 800, fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.1, letterSpacing: '-.025em', margin: '0 0 16px' }}>{item.name}</h1>
              <p style={{ fontSize: '17px', lineHeight: 1.6, color: '#6e6e73', margin: 0 }}>{item.desc}</p>
            </div>

            {item.specs.length > 0 && (
              <div style={{ backgroundColor: '#f5f5f7', borderRadius: '18px', padding: '24px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#1d1d1f' }}>Caractéristiques techniques</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {item.specs.map((s, idx) => (
                    <span key={idx} style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#fff', fontSize: '13px', fontWeight: 600, color: '#424245', border: '1px solid rgba(0,0,0,.04)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <ProductExpertChat productId={item.id} productName={item.name} />

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,.08)' }}>
              <button
                onClick={() => toggleSelect(item.id)}
                style={{ flex: '1 1 200px', padding: '16px 32px', borderRadius: '980px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px', fontWeight: 600, transition: 'all .25s', backgroundColor: isAdded ? '#e8f1fd' : '#1d1d1f', color: isAdded ? '#0071e3' : '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.05)' }}
              >
                {isAdded ? '✓ Retirer de ma sélection' : '+ Ajouter au devis'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#86868b' }}>Tarif de location / jour</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#1d1d1f' }}>
                  {isRequest ? (
                    <span style={{ color: '#0071e3' }}>Sur devis</span>
                  ) : (
                    <span>{item.price} € <span style={{ fontSize: '12px', fontWeight: 500, color: '#86868b' }}>{item.priceTax || 'HT'}</span></span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Similar products */}
        {similarItems.length > 0 && (
          <section style={{ marginTop: '80px', paddingTop: '48px', borderTop: '1px solid rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-.02em', marginBottom: '28px' }}>Matériel similaire</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {similarItems.map((p) => {
                const added = !!selected[p.id];
                const itemRequest = p.priceType === 'on_request';
                const pAlt = `Location ${p.name} Orléans - Événementiel`;
                return (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '22px', overflow: 'hidden', border: `1px solid ${added ? 'rgba(0,113,227,.5)' : 'rgba(0,0,0,.09)'}`, transition: 'transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .3s' }}>
                    <Link href={`/location/catalogue/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ position: 'relative', aspectRatio: '4/3', backgroundColor: '#f5f5f7', overflow: 'hidden' }}>
                        {p.image ? (
                          <img src={p.image} alt={pAlt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.028) 0 1px, transparent 1px 16px)' }}></div>
                        )}
                        <span style={{ position: 'absolute', top: '12px', left: '12px', padding: '5px 10px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontSize: '11px', fontWeight: 700, color: '#1d1d1f' }}>{p.brand}</span>
                      </div>
                    </Link>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                      <Link href={`/location/catalogue/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '.08em', color: '#86868b', marginBottom: '6px' }}>{p.catLabel}</div>
                          <h3 style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-.02em', margin: '0 0 4px' }}>{p.name}</h3>
                          <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#6e6e73', margin: 0 }}>{p.desc}</p>
                          <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px', color: '#1d1d1f' }}>
                            {itemRequest ? 'Sur devis' : `${p.price} € ${p.priceTax || 'HT'}`}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => toggleSelect(p.id)}
                        style={{ marginTop: 'auto', width: '100%', padding: '10px', borderRadius: '980px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, transition: 'all .2s', backgroundColor: added ? '#e8f1fd' : '#1d1d1f', color: added ? '#0071e3' : '#fff' }}
                      >
                        {added ? '✓ Ajouté' : '+ Ajouter'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Floating quote bar */}
      {count > 0 && (
        <div style={{ position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 70, display: 'flex', alignItems: 'center', gap: '16px', padding: '11px 11px 11px 22px', borderRadius: '980px', backgroundColor: 'rgba(29,29,31,.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 20px 54px -18px rgba(0,0,0,.6)', color: '#fff', maxWidth: 'calc(100vw - 32px)', animation: 'barUp .35s cubic-bezier(.22,1,.36,1)' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{selectionLabel}</span>
          <Link href="/location/panier" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 22px', borderRadius: '980px', backgroundColor: '#fff', color: '#1d1d1f', textDecoration: 'none', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', transition: 'transform .15s' }}>
            Demander un devis
          </Link>
          <button onClick={() => { setSelected({}); persist({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: '13px', fontWeight: 500, padding: '6px', fontFamily: 'inherit', transition: 'color .2s' }}>
            Effacer
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
