'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Loader2, ShoppingCart, Calendar, FileText, ArrowRight, ArrowLeft, Trash2, ShieldCheck, Lock, User, Plus, Minus } from 'lucide-react';

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
  priceHT: number;
  priceTTC: number;
  quantity: number;
  image: string | null;
}

export default function CartPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();

  // Multi-step: 1 = Cart summary, 2 = Dates & Notes, 3 = Submit / Auth
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [tvaRate, setTvaRate] = useState(20);
  const [coeffWeekend, setCoeffWeekend] = useState(1.4);
  const [coeff3Jours, setCoeff3Jours] = useState(1.8);
  const [coeffSemaine, setCoeffSemaine] = useState(3.0);
  const [loadingItems, setLoadingItems] = useState(true);

  // Step 2 Form fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [dateError, setDateError] = useState('');

  // Inline Auth tab: 'signin' | 'signup'
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Submit states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Availability check
  const [availability, setAvailability] = useState<Record<string, number> | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // 1. Fetch catalog data & settings
  useEffect(() => {
    async function loadCatalogAndSettings() {
      setLoadingItems(true);
      try {
        const res = await fetch('/api/equipment');
        const data = await res.json();
        if (data.success) {
          setEquipmentList(data.items);
        }

        const settingsRes = await fetch('/api/settings');
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
          setTvaRate(settingsData.tvaRate);
          setCoeffWeekend(settingsData.coeffWeekend);
          setCoeff3Jours(settingsData.coeff3Jours);
          setCoeffSemaine(settingsData.coeffSemaine);
        }
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoadingItems(false);
      }
    }
    loadCatalogAndSettings();
  }, []);

  // 2. Load cart selections from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sonelyx_devis');
      if (stored) {
        const parsed = JSON.parse(stored);
        const cartData: Record<string, number> = {};
        
        Object.keys(parsed).forEach(id => {
          // Backward compatibility: convert `true` to 1, or read existing quantity
          const val = parsed[id];
          cartData[id] = typeof val === 'number' ? val : 1;
        });
        
        setCart(cartData);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveCart = (nextCart: Record<string, number>) => {
    setCart(nextCart);
    try {
      localStorage.setItem('sonelyx_devis', JSON.stringify(nextCart));
    } catch (e) {
      console.error(e);
    }
  };

  const updateQty = (id: string, delta: number) => {
    const item = equipmentList.find(e => e.id === id);
    if (!item) return;

    const currentQty = cart[id] || 1;
    const nextQty = Math.max(1, Math.min(item.quantity, currentQty + delta));
    
    const nextCart = { ...cart, [id]: nextQty };
    saveCart(nextCart);
  };

  const removeItem = (id: string) => {
    const nextCart = { ...cart };
    delete nextCart[id];
    saveCart(nextCart);
  };

  // Match items in cart with equipment catalog
  const cartItems = Object.keys(cart).map(id => {
    const item = equipmentList.find(e => e.id === id);
    return item ? { ...item, requestedQty: cart[id] } : null;
  }).filter(Boolean) as (EquipmentItem & { requestedQty: number })[];

  // Calculate totals
  let totalHT = 0;
  let totalTTC = 0;
  let hasOnRequest = false;

  cartItems.forEach(item => {
    if (item.priceType === 'on_request') {
      hasOnRequest = true;
    } else {
      totalHT += item.priceHT * item.requestedQty;
      totalTTC += item.priceTTC * item.requestedQty;
    }
  });

  // Calculate rental duration in days
  let durationDays = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }

  // Calculate duration coefficient based on dynamic coefficients
  let durationCoeff = 1.0;
  if (durationDays === 2) {
    durationCoeff = coeffWeekend;
  } else if (durationDays === 3) {
    durationCoeff = coeff3Jours;
  } else if (durationDays >= 4 && durationDays <= 6) {
    durationCoeff = durationDays * 0.7;
  } else if (durationDays >= 7) {
    durationCoeff = coeffSemaine * (durationDays / 7);
  }

  // Multiply pricing by coefficient
  const finalTotalHT = totalHT * durationCoeff;
  const finalTotalTTC = totalTTC * durationCoeff;

  // Fetch availability when dates change
  useEffect(() => {
    if (!startDate || !endDate) { setAvailability(null); return; }
    if (new Date(endDate) < new Date(startDate)) return;
    setAvailabilityLoading(true);
    fetch(`/api/availability?startDate=${startDate}&endDate=${endDate}`)
      .then(r => r.json())
      .then(data => { if (data.success) setAvailability(data.available); })
      .catch(() => {})
      .finally(() => setAvailabilityLoading(false));
  }, [startDate, endDate]);

  // Items that exceed available stock for the chosen period
  const overBookedItems = availability
    ? cartItems.filter(item => (availability[item.id] ?? item.quantity) < item.requestedQty)
    : [];

  // Alternative items per unavailable item (same category, has stock)
  const alternatives = overBookedItems.flatMap(item =>
    equipmentList.filter(eq => eq.cat === item.cat && eq.id !== item.id && (availability?.[eq.id] ?? eq.quantity) > 0)
  );

  // Navigation handlers
  const handleGoToStep2 = () => {
    if (cartItems.length === 0) return;
    setStep(2);
  };

  const handleGoToStep3 = () => {
    setDateError('');
    if (!startDate || !endDate) {
      setDateError('Veuillez renseigner les dates de début et de fin de location.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setDateError('La date de fin ne peut pas être antérieure à la date de début.');
      return;
    }
    setStep(3);
  };

  // Inline Auth handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authTab === 'signin') {
        const { error } = await authClient.signIn.email({
          email: authEmail,
          password: authPassword,
        });
        if (error) {
          setAuthError(error.message || 'Identifiants invalides.');
        }
      } else {
        if (!authName) {
          setAuthError('Veuillez renseigner votre nom.');
          setAuthLoading(false);
          return;
        }
        const { error } = await authClient.signUp.email({
          email: authEmail,
          password: authPassword,
          name: authName,
        });
        if (error) {
          setAuthError(error.message || 'Erreur lors de la création du compte.');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Une erreur est survenue.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit Quote handlers (draft or pending)
  const handleSubmitQuote = async (status: 'draft' | 'pending') => {
    setSubmitError('');
    setSubmitLoading(true);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          startDate,
          endDate,
          notes,
          cart,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Clear cart selections
        localStorage.removeItem('sonelyx_devis');
        // Redirect to profile page to see submitted quote
        router.push('/profil');
        router.refresh();
      } else {
        setSubmitError(data.error || 'Erreur lors de la soumission.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const cartLinks = [
    { label: 'Espace Location', href: '/location/catalogue' },
    { label: 'Accueil', href: '/' },
  ];

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <Header subTitle="Votre Panier" links={cartLinks} />

      <main style={{ flex: 1, maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '40px clamp(20px, 4vw, 40px)' }}>
        
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 1 ? '#0071e3' : '#86868b', fontWeight: step === 1 ? 800 : 600 }}>
            <span style={{ display: 'inline-flex', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: step >= 1 ? '#0071e3' : 'transparent', color: step >= 1 ? '#fff' : '#86868b', border: step >= 1 ? 'none' : '1px solid #86868b', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>1</span>
            <span>Panier</span>
          </div>
          <div style={{ width: '40px', height: '1px', backgroundColor: 'rgba(0,0,0,.12)' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 2 ? '#0071e3' : '#86868b', fontWeight: step === 2 ? 800 : 600 }}>
            <span style={{ display: 'inline-flex', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: step >= 2 ? '#0071e3' : 'transparent', color: step >= 2 ? '#fff' : '#86868b', border: step >= 2 ? 'none' : '1px solid #86868b', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>2</span>
            <span>Période &amp; Notes</span>
          </div>
          <div style={{ width: '40px', height: '1px', backgroundColor: 'rgba(0,0,0,.12)' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 3 ? '#0071e3' : '#86868b', fontWeight: step === 3 ? 800 : 600 }}>
            <span style={{ display: 'inline-flex', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: step >= 3 ? '#0071e3' : 'transparent', color: step >= 3 ? '#fff' : '#86868b', border: step >= 3 ? 'none' : '1px solid #86868b', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>3</span>
            <span>Validation</span>
          </div>
        </div>

        {loadingItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
            <Loader2 style={{ width: '32px', height: '32px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '14px', color: '#86868b', fontWeight: 600 }}>Chargement de vos sélections...</span>
          </div>
        ) : cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: '#f5f5f7', color: '#86868b', marginBottom: '20px' }}>
              <ShoppingCart style={{ width: '32px', height: '32px' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>Votre panier est vide</h2>
            <p style={{ color: '#6e6e73', maxWidth: '380px', margin: '0 auto 24px', fontSize: '14px', lineHeight: 1.5 }}>
              Parcourez le catalogue pour ajouter des systèmes son, des jeux de lumières, ou des structures à votre demande.
            </p>
            <Link href="/location/catalogue" style={{ display: 'inline-flex', padding: '12px 26px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>
              Voir le catalogue de matériel
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
            
            {/* LEFT COLUMN: STEP CONTENT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* STEP 1: CART LIST */}
              {step === 1 && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 24px', letterSpacing: '-.02em' }}>Matériel Sélectionné</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {cartItems.map((item, idx) => {
                      const isRequest = item.priceType === 'on_request';
                      return (
                        <div key={item.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', paddingBottom: idx < cartItems.length - 1 ? '20px' : '0', borderBottom: idx < cartItems.length - 1 ? '1px solid rgba(0,0,0,.06)' : 'none', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: '1 1 240px' }}>
                            <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f5f5f7', border: '1px solid rgba(0,0,0,.06)', flexShrink: 0 }}>
                              {item.image ? (
                                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.025) 0 1px, transparent 1px 8px)' }}></div>
                              )}
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700 }}>{item.name}</h4>
                              <span style={{ fontSize: '11px', color: '#86868b', fontWeight: 600, textTransform: 'uppercase' }}>{item.brand}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between', flex: '1 1 auto' }}>
                            {/* Quantity selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f5f5f7', padding: '4px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.06)' }}>
                              <button
                                onClick={() => updateQty(item.id, -1)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', color: '#1d1d1f', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
                              >
                                <Minus style={{ width: '12px', height: '12px' }} />
                              </button>
                              <span style={{ fontSize: '13px', fontWeight: 700, padding: '0 10px', width: '28px', textAlign: 'center' }}>
                                {item.requestedQty}
                              </span>
                              <button
                                onClick={() => updateQty(item.id, 1)}
                                disabled={item.requestedQty >= item.quantity}
                                style={{ border: 'none', background: 'none', cursor: item.requestedQty >= item.quantity ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', color: '#1d1d1f', borderRadius: '50%', backgroundColor: item.requestedQty >= item.quantity ? 'rgba(0,0,0,.02)' : '#fff', boxShadow: item.requestedQty >= item.quantity ? 'none' : '0 1px 4px rgba(0,0,0,.06)', opacity: item.requestedQty >= item.quantity ? 0.4 : 1 }}
                              >
                                <Plus style={{ width: '12px', height: '12px' }} />
                              </button>
                            </div>

                            {/* Pricing tag */}
                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                              {isRequest ? (
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3' }}>Sur devis</span>
                              ) : (
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 800 }}>{(item.priceHT * item.requestedQty).toLocaleString('fr-FR')} € <span style={{ fontSize: '10px', color: '#86868b', fontWeight: 500 }}>HT</span></div>
                                  <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>{(item.priceTTC * item.requestedQty).toLocaleString('fr-FR')} € TTC</div>
                                </div>
                              )}
                            </div>

                            {/* Delete button */}
                            <button
                              onClick={() => removeItem(item.id)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444', borderRadius: '8px', transition: 'background .15s' }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <Trash2 style={{ width: '16px', height: '16px' }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: DATES AND REMARKS */}
              {step === 2 && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 24px', letterSpacing: '-.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar style={{ width: '20px', height: '20px', color: '#0071e3' }} /> Dates &amp; Notes
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {dateError && (
                      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                        {dateError}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>Date de début *</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>Date de fin *</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>Remarques ou notes sur l'événement</label>
                      <textarea
                        rows={5}
                        placeholder="Ex : Besoin de livraison sur site, montage par vos soins, contraintes d'horaires spécifiques, etc..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        style={{ padding: '14px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>

                    {/* Availability warnings */}
                    {availabilityLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#86868b' }}>
                        <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Vérification des disponibilités...
                      </div>
                    )}
                    {!availabilityLoading && overBookedItems.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ backgroundColor: '#fef3c7', border: '1px solid rgba(245,158,11,.3)', borderRadius: '14px', padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400e', marginBottom: '8px' }}>
                            Certains équipements ont une disponibilité limitée sur cette période :
                          </div>
                          {overBookedItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#b45309', marginBottom: '4px' }}>
                              <span>{item.name}</span>
                              <span style={{ fontWeight: 700 }}>
                                {availability![item.id] ?? 0} disponible{(availability![item.id] ?? 0) > 1 ? 's' : ''} (demandé : {item.requestedQty})
                              </span>
                            </div>
                          ))}
                          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#92400e', lineHeight: 1.4 }}>
                            Vous pouvez tout de même soumettre votre demande — l'administrateur vous contactera pour ajuster les quantités.
                          </p>
                        </div>
                        {alternatives.length > 0 && (
                          <div style={{ backgroundColor: '#e8f1fd', border: '1px solid rgba(0,113,227,.2)', borderRadius: '14px', padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0071e3', marginBottom: '8px' }}>
                              Alternatives disponibles dans les mêmes catégories :
                            </div>
                            {alternatives.map(alt => (
                              <div key={alt.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1d1d1f', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600 }}>{alt.brand} {alt.name}</span>
                                <span style={{ color: '#0071e3', fontWeight: 700 }}>
                                  {availability![alt.id] ?? alt.quantity} dispo{(availability![alt.id] ?? alt.quantity) > 1 ? 's' : ''}
                                  {alt.priceType === 'numeric' ? ` · ${alt.price} € HT/j` : ' · Sur devis'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: SUBMIT AND AUTH */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Validation Summary info card */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px' }}>Résumé de la Demande</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,.04)', paddingBottom: '10px' }}>
                        <span style={{ color: '#86868b', fontWeight: 500 }}>Durée de location</span>
                        <span style={{ fontWeight: 700 }}>{durationDays} jour{durationDays > 1 ? 's' : ''} ({new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,.04)', paddingBottom: '10px' }}>
                        <span style={{ color: '#86868b', fontWeight: 500 }}>Volume d'équipements</span>
                        <span style={{ fontWeight: 700 }}>{cartItems.reduce((sum, item) => sum + item.requestedQty, 0)} articles</span>
                      </div>
                      {notes && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(0,0,0,.04)', paddingBottom: '10px' }}>
                          <span style={{ color: '#86868b', fontWeight: 500 }}>Vos remarques</span>
                          <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: '#6e6e73' }}>{notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Authentication required panel */}
                  {sessionPending ? (
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', display: 'flex', justifyContent: 'center' }}>
                      <Loader2 style={{ width: '28px', height: '28px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : !session ? (
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#e8f1fd', color: '#0071e3', marginBottom: '14px' }}>
                          <Lock style={{ width: '24px', height: '24px' }} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>Création de compte requise</h3>
                        <p style={{ fontSize: '13px', color: '#6e6e73', margin: 0, lineHeight: 1.5 }}>
                          Pour enregistrer votre brouillon ou envoyer votre demande de devis aux administrateurs, vous devez vous connecter ou créer un compte. Votre panier est préservé.
                        </p>
                      </div>

                      {/* Sign in / Sign up Tabs */}
                      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,.06)', marginBottom: '20px', gap: '20px' }}>
                        <button
                          onClick={() => { setAuthTab('signin'); setAuthError(''); }}
                          style={{
                            padding: '10px 0',
                            border: 'none',
                            background: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: authTab === 'signin' ? '#0071e3' : '#86868b',
                            borderBottom: authTab === 'signin' ? '2px solid #0071e3' : 'none'
                          }}
                        >
                          Se connecter
                        </button>
                        <button
                          onClick={() => { setAuthTab('signup'); setAuthError(''); }}
                          style={{
                            padding: '10px 0',
                            border: 'none',
                            background: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: authTab === 'signup' ? '#0071e3' : '#86868b',
                            borderBottom: authTab === 'signup' ? '2px solid #0071e3' : 'none'
                          }}
                        >
                          Créer un compte
                        </button>
                      </div>

                      {/* Inline Auth Form */}
                      <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {authError && (
                          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                            {authError}
                          </div>
                        )}

                        {authTab === 'signup' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Nom complet *</label>
                            <input
                              type="text"
                              placeholder="ex: Jean Dupont"
                              value={authName}
                              onChange={e => setAuthName(e.target.value)}
                              style={{ padding: '10px 14px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px' }}
                              required
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Adresse email *</label>
                          <input
                            type="email"
                            placeholder="ex: jean@dupont.fr"
                            value={authEmail}
                            onChange={e => setAuthEmail(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px' }}
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600 }}>Mot de passe *</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={authPassword}
                            onChange={e => setAuthPassword(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px' }}
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={authLoading}
                          style={{
                            width: '100%',
                            padding: '11px',
                            borderRadius: '980px',
                            backgroundColor: '#1d1d1f',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '10px'
                          }}
                        >
                          {authLoading ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : (authTab === 'signin' ? 'Se connecter' : 'Créer mon compte')}
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* Final submit options card when authenticated */
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#e2fbe8', padding: '12px 18px', borderRadius: '16px', color: '#1db954' }}>
                        <ShieldCheck style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Authentifié en tant que <strong>{session.user.name}</strong></span>
                      </div>

                      {submitError && (
                        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                          {submitError}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                          onClick={() => handleSubmitQuote('pending')}
                          disabled={submitLoading}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '980px',
                            backgroundColor: '#0071e3',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          {submitLoading ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : 'Envoyer la demande de devis'}
                        </button>

                        <button
                          onClick={() => handleSubmitQuote('draft')}
                          disabled={submitLoading}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '980px',
                            backgroundColor: 'transparent',
                            color: '#0071e3',
                            border: '1px solid #0071e3',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          Enregistrer en brouillon
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                {step > 1 && (
                  <button
                    onClick={() => setStep(prev => prev - 1)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 28px',
                      borderRadius: '980px',
                      backgroundColor: 'transparent',
                      color: '#1d1d1f',
                      border: '1px solid rgba(0,0,0,.12)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '15px'
                    }}
                  >
                    <ArrowLeft style={{ width: '18px', height: '18px' }} /> Retour
                  </button>
                )}

                {step < 3 ? (
                  <button
                    onClick={step === 1 ? handleGoToStep2 : handleGoToStep3}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px 28px',
                      borderRadius: '980px',
                      backgroundColor: '#1d1d1f',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '15px',
                      marginLeft: 'auto'
                    }}
                  >
                    Suivant <ArrowRight style={{ width: '18px', height: '18px' }} />
                  </button>
                ) : null}
              </div>

            </div>

            {/* RIGHT COLUMN: PRICING CARD */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', position: 'sticky', top: '100px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', borderBottom: '1px solid rgba(0,0,0,.06)', paddingBottom: '12px' }}>Détails de la Facture</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Cost breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                  {cartItems.map(item => {
                    const isRequest = item.priceType === 'on_request';
                    return (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6e6e73' }}>{item.name} (x{item.requestedQty})</span>
                        <span style={{ fontWeight: 600 }}>
                          {isRequest ? 'Sur devis' : `${(item.priceHT * item.requestedQty).toLocaleString('fr-FR')} € HT`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,.06)', margin: '4px 0' }}></div>

                {/* TVA settings display */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6e6e73' }}>Total HT (par jour)</span>
                    <span style={{ fontWeight: 700 }}>{totalHT.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6e6e73' }}>TVA ({tvaRate}%)</span>
                    <span style={{ fontWeight: 700 }}>{(totalTTC - totalHT).toLocaleString('fr-FR')} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6e6e73' }}>Total TTC (par jour)</span>
                    <span style={{ fontWeight: 700 }}>{totalTTC.toLocaleString('fr-FR')} €</span>
                  </div>
                </div>

                {startDate && endDate && durationDays > 1 && (
                  <>
                    <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,.06)', margin: '4px 0' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6e6e73' }}>Durée de location</span>
                        <span style={{ fontWeight: 700 }}>{durationDays} jours</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6e6e73' }}>Coefficient durée</span>
                        <span style={{ fontWeight: 700 }}>x{durationCoeff.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,.08)', margin: '8px 0' }}></div>

                {/* GRAND TOTALS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800 }}>Total Général HT</span>
                    <span style={{ fontSize: '20px', fontWeight: 800 }}>{finalTotalHT.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#86868b' }}>Total Général TTC</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#86868b' }}>{finalTotalTTC.toLocaleString('fr-FR')} €</span>
                  </div>
                </div>

                {hasOnRequest && (
                  <div style={{ backgroundColor: '#e8f1fd', border: '1px solid #d0e3ff', borderRadius: '12px', padding: '12px', fontSize: '12px', color: '#0071e3', lineHeight: 1.5, fontWeight: 500, marginTop: '8px' }}>
                    * Certains articles de votre panier sont configurés <strong>"Sur devis"</strong>. Leur coût n'est pas intégré dans ces totaux indicatifs et fera l'objet d'une estimation sur-mesure.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
