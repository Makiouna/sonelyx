'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import SignaturePad from '@/components/signature-pad';
import {
  Loader2, Calendar, CheckCircle2, Image as ImageIcon, AlertTriangle,
  ClipboardCheck, Lock,
} from 'lucide-react';

interface InspectionData {
  id: string;
  quoteId: string;
  type: 'DEPART' | 'RETOUR';
  photoUrls: string[];
  adminSignature: string;
  adminSignedAt: string;
  clientSignature: string | null;
  clientSignedAt: string | null;
  status: 'PENDING_CLIENT' | 'COMPLETED';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientSignaturePage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`/auth/sign-in?redirect=/espace-client/signature/${id}`);
    }
  }, [isPending, session, id, router]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/inspections/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setInspection(data.inspection);
          setProjectName(data.projectName);
          setStartDate(data.startDate);
          setEndDate(data.endDate);
          if (data.inspection.status === 'COMPLETED') setDone(true);
        } else {
          setError(data.error || 'État des lieux introuvable.');
        }
      })
      .catch(() => setError('Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  }, [session, id]);

  const handleSign = async () => {
    if (!clientSignature) {
      setError('Veuillez apposer votre signature avant de valider.');
      return;
    }
    setSigning(true);
    setError('');
    try {
      const res = await fetch(`/api/inspections/${id}/client-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSignature }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        setError(data.error || 'Erreur lors de la signature.');
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSigning(false);
    }
  };

  if (isPending || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7' }}>
        <Loader2 style={{ width: '36px', height: '36px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error && !inspection) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', display: 'flex', flexDirection: 'column' }}>
        <Header subTitle="État des lieux" links={[]} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '480px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
            <AlertTriangle style={{ width: '40px', height: '40px', color: '#ef4444', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '16px', color: '#1d1d1f', fontWeight: 700 }}>{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!inspection) return null;

  const typeLabel = inspection.type === 'DEPART' ? 'Départ' : 'Retour';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header subTitle="État des lieux" links={[]} />

      <main style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '40px clamp(16px, 4vw, 40px)', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Title card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: inspection.type === 'DEPART' ? '#e8f1fd' : '#e8fdf0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ClipboardCheck style={{ width: '22px', height: '22px', color: inspection.type === 'DEPART' ? '#0071e3' : '#15803d' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-.02em' }}>
                État des lieux {typeLabel}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6e6e73' }}>{projectName}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: '#6e6e73' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Calendar style={{ width: '13px', height: '13px' }} />
              {fmtDate(startDate)} — {fmtDate(endDate)}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px',
              backgroundColor: done ? '#e2fbe8' : '#e8f1fd',
              color: done ? '#15803d' : '#0071e3',
            }}>
              {done ? 'Signé' : 'En attente de votre signature'}
            </span>
          </div>
        </div>

        {/* Completed state */}
        {done && (
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.07)' }}>
            <CheckCircle2 style={{ width: '52px', height: '52px', color: '#15803d', margin: '0 auto 16px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800 }}>Signature enregistrée</h2>
            <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
              Votre signature a bien été enregistrée.
              {inspection.clientSignedAt && (
                <><br />Horodatage : <strong style={{ color: '#1d1d1f' }}>{fmtDateTime(inspection.clientSignedAt)}</strong></>
              )}
            </p>
            {/* Signature comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left' }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Signature Admin</p>
                <img src={inspection.adminSignature} alt="Signature admin" style={{ width: '100%', borderRadius: '10px', border: '1px solid rgba(0,0,0,.1)', backgroundColor: '#fafaf9' }} />
              </div>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Votre signature</p>
                {inspection.clientSignature && (
                  <img src={inspection.clientSignature} alt="Votre signature" style={{ width: '100%', borderRadius: '10px', border: '1px solid rgba(0,0,0,.1)', backgroundColor: '#fafaf9' }} />
                )}
              </div>
            </div>
          </div>
        )}

        {!done && (
          <>
            {/* Photo gallery */}
            {inspection.photoUrls.length > 0 && (
              <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <ImageIcon style={{ width: '16px', height: '16px', color: '#6e6e73' }} />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                    Photos de vérification ({inspection.photoUrls.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                  {inspection.photoUrls.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedPhoto(url)}
                      style={{ aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(0,0,0,.08)' }}
                    >
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin signature */}
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.07)' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Signature de notre équipe
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6e6e73' }}>
                Apposée le {fmtDateTime(inspection.adminSignedAt)}
              </p>
              <img
                src={inspection.adminSignature}
                alt="Signature de l'administrateur"
                style={{ maxWidth: '340px', width: '100%', borderRadius: '10px', border: '1px solid rgba(0,0,0,.1)', backgroundColor: '#fafaf9', display: 'block' }}
              />
            </div>

            {/* Client signature */}
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.07)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>Votre signature</p>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6e6e73', lineHeight: 1.5 }}>
                En signant, vous attestez avoir pris connaissance des photos et valider l'état du matériel tel que constaté lors de ce {typeLabel.toLowerCase()}.
              </p>
              <SignaturePad onChange={setClientSignature} />

              {error && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)', fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button
                onClick={handleSign}
                disabled={!clientSignature || signing}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '14px',
                  backgroundColor: clientSignature && !signing ? '#0071e3' : '#c7c7cc',
                  color: '#fff',
                  border: 'none',
                  cursor: clientSignature && !signing ? 'pointer' : 'default',
                  fontWeight: 700,
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s',
                }}
              >
                {signing
                  ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Enregistrement…</>
                  : <><Lock style={{ width: '16px', height: '16px' }} /> Valider et signer l'état des lieux</>
                }
              </button>
              <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#86868b', textAlign: 'center', lineHeight: 1.5 }}>
                Ce document électronique est horodaté et conservé comme preuve juridique.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'zoom-out' }}
        >
          <img
            src={selectedPhoto}
            alt="Photo agrandie"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', cursor: 'default' }}
          />
        </div>
      )}

      <Footer />
    </div>
  );
}
