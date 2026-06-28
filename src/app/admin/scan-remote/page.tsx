'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Loader2, Camera, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

function ScanRemoteContent() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [hasError, setHasError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [scannedCode, setScannedCode] = useState<string>('');
  const scannerRef = useRef<any>(null);
  const [manualCode, setManualCode] = useState('');

  const cleanScannedCode = (code: string): string => {
    let clean = code.trim();
    if (!clean) return '';

    try {
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        const url = new URL(clean);
        const sessionParam = url.searchParams.get('session');
        if (sessionParam) return sessionParam;

        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          return pathSegments[pathSegments.length - 1];
        }
      }
    } catch (e) {
      console.error(e);
    }
    return clean;
  };

  const handleManualSubmit = () => {
    const finalCode = cleanScannedCode(manualCode);
    if (finalCode) {
      handleScan(finalCode);
      setManualCode('');
    }
  };

  // Security guard: redirect if not admin
  useEffect(() => {
    if (!isPending && (!session || (session.user as any).role !== 'admin')) {
      router.push('/');
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (!sessionId) {
      setHasError("Aucune session spécifiée. Veuillez scanner le QR Code sur l'écran du PC.");
      setIsInitializing(false);
      return;
    }

    if (isPending || !session || (session.user as any).role !== 'admin') {
      return;
    }

    let html5QrCode: any;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      setTimeout(() => {
        const el = document.getElementById('remote-qr-reader');
        if (!el) {
          setIsInitializing(false);
          return;
        }

        try {
          html5QrCode = new Html5Qrcode('remote-qr-reader');
          scannerRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: (width: number, height: number) => ({
                width: Math.min(width * 0.85, 280),
                height: Math.min(height * 0.85, 280)
              }),
              aspectRatio: 1.0,
            },
            async (decodedText: string) => {
              handleScan(cleanScannedCode(decodedText));
            },
            () => {}
          ).then(() => {
            setIsInitializing(false);
          }).catch((err: any) => {
            console.error(err);
            setHasError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
            setIsInitializing(false);
          });
        } catch (e) {
          console.error(e);
          setHasError("Erreur d'initialisation du scanner.");
          setIsInitializing(false);
        }
      }, 300);
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err: any) => console.error(err));
      }
    };
  }, [sessionId, isPending, session]);

  const handleScan = async (qrCodeId: string) => {
    if (!sessionId || scanStatus === 'SENDING') return;

    setScanStatus('SENDING');
    setScannedCode(qrCodeId);

    // Vibrate to give feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(200);
    }

    try {
      const res = await fetch(`/api/scan-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeId })
      });
      const data = await res.json();
      if (data.success) {
        setScanStatus('SUCCESS');
        setTimeout(() => setScanStatus('IDLE'), 2500);
      } else {
        setScanStatus('ERROR');
        setTimeout(() => setScanStatus('IDLE'), 3000);
      }
    } catch (e) {
      console.error(e);
      setScanStatus('ERROR');
      setTimeout(() => setScanStatus('IDLE'), 3000);
    }
  };

  if (isPending) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', color: '#ffffff' }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
        <span style={{ marginTop: '16px', fontSize: '15px', color: '#8e8e93' }}>Vérification de la session...</span>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'admin') {
    return null; // Security guard redirect handles this
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => router.push('/admin')}
          style={{
            background: 'none',
            border: 'none',
            color: '#0a84ff',
            fontSize: '15px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ArrowLeft style={{ width: '18px', height: '18px' }} /> Dashboard
        </button>
        <span style={{ fontSize: '15px', fontWeight: 700 }}>Scanner Mobile</span>
        <div style={{ width: '56px' }} />
      </div>

      {/* Main scanner display */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '24px'
      }}>
        {hasError ? (
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '320px'
          }}>
            <div style={{ backgroundColor: 'rgba(255,69,58,0.15)', color: '#ff453a', padding: '16px', borderRadius: '50%' }}>
              <AlertTriangle style={{ width: '40px', height: '40px' }} />
            </div>
            <p style={{ margin: 0, fontSize: '15px', color: '#ff453a', fontWeight: 600 }}>
              {hasError}
            </p>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            
            {/* Connection badge */}
            <div style={{
              padding: '6px 14px',
              borderRadius: '980px',
              backgroundColor: 'rgba(10,132,255,0.15)',
              color: '#0a84ff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0a84ff', display: 'inline-block' }} />
              Session Connectée
            </div>

            {/* Video container */}
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: '24px',
              overflow: 'hidden',
              backgroundColor: '#1c1c1e',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              {isInitializing && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  backgroundColor: '#1c1c1e'
                }}>
                  <Loader2 style={{ width: '28px', height: '28px', animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
                  <span style={{ fontSize: '13px', color: '#8e8e93' }}>Caméra en cours de chargement...</span>
                </div>
              )}
              <div id="remote-qr-reader" style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Scan feedback status */}
            <div style={{ width: '100%', minHeight: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {scanStatus === 'SENDING' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8e8e93', fontSize: '14px' }}>
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  Transmission du code ({scannedCode})...
                </div>
              )}
              {scanStatus === 'SUCCESS' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#30d158',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(48,209,88,0.15)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  animation: 'bounceIn 0.3s'
                }}>
                  <CheckCircle style={{ width: '16px', height: '16px' }} />
                  Code envoyé avec succès !
                </div>
              )}
              {scanStatus === 'ERROR' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ff453a',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255,69,58,0.15)',
                  padding: '8px 16px',
                  borderRadius: '12px'
                }}>
                  <AlertTriangle style={{ width: '16px', height: '16px' }} />
                  Erreur de transmission. Réessayez.
                </div>
              )}
              {scanStatus === 'IDLE' && (
                <div style={{ fontSize: '13px', color: '#8e8e93', textAlign: 'center', maxWidth: '240px' }}>
                  Visez un QR Code d'exemplaire matériel pour l'envoyer au PC.
                </div>
              )}
            </div>

            {/* Manual input fallback */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', marginTop: '10px' }}>
              <label style={{ fontSize: '12px', color: '#8e8e93', fontWeight: 600 }}>Saisie manuelle (Secours / Test)</label>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Saisissez ou collez le code QR"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '980px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '980px',
                    backgroundColor: '#0a84ff',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  Envoyer
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        #remote-qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        @keyframes bounceIn {
          0% { transform: scale(0.9); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function ScanRemotePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', color: '#ffffff' }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
        <span style={{ marginTop: '16px', fontSize: '15px', color: '#8e8e93' }}>Chargement...</span>
      </div>
    }>
      <ScanRemoteContent />
    </Suspense>
  );
}
