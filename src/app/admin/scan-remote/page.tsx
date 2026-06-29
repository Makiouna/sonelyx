'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Loader2, AlertTriangle, CheckCircle, Wifi } from 'lucide-react';

const LS_PAIRED_KEY = 'sonelyx_remote_scanner_paired';

function ScanRemoteContent() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [hasError, setHasError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [scannedCode, setScannedCode] = useState<string>('');
  const [wasPaired, setWasPaired] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<any>(null);
  const isSendingRef = useRef(false);

  // Security guard: redirect if not admin
  useEffect(() => {
    if (!isPending && (!session || (session.user as any).role !== 'admin')) {
      router.push('/');
    }
  }, [isPending, session, router]);

  // Check localStorage for previous pairing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWasPaired(localStorage.getItem(LS_PAIRED_KEY) === 'true');
    }
  }, []);

  const cleanScannedCode = (code: string): string => {
    let clean = code.trim();
    if (!clean) return '';
    try {
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        const url = new URL(clean);
        const sessionParam = url.searchParams.get('session');
        if (sessionParam) return sessionParam;
        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) return pathSegments[pathSegments.length - 1];
      }
    } catch (_) {}
    return clean;
  };

  const handleScan = useCallback(async (qrCodeId: string) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setScanStatus('SENDING');
    setScannedCode(qrCodeId);

    // Vibrate: success pattern
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    try {
      const res = await fetch('/api/remote-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeId }),
      });
      const data = await res.json();
      if (data.success) {
        // Mark as paired in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_PAIRED_KEY, 'true');
          setWasPaired(true);
        }
        setScanStatus('SUCCESS');
        setTimeout(() => {
          setScanStatus('IDLE');
          isSendingRef.current = false;
        }, 1800);
      } else {
        setScanStatus('ERROR');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        setTimeout(() => {
          setScanStatus('IDLE');
          isSendingRef.current = false;
        }, 2500);
      }
    } catch (_) {
      setScanStatus('ERROR');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setTimeout(() => {
        setScanStatus('IDLE');
        isSendingRef.current = false;
      }, 2500);
    }
  }, []);

  // Initialize html5-qrcode scanner
  useEffect(() => {
    if (isPending || !session || (session.user as any).role !== 'admin') return;

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
              qrbox: (w: number, h: number) => ({
                width: Math.min(w * 0.85, 280),
                height: Math.min(h * 0.85, 280),
              }),
              aspectRatio: 1.0,
            },
            (decodedText: string) => {
              const code = cleanScannedCode(decodedText);
              if (code) handleScan(code);
            },
            () => {}
          ).then(() => setIsInitializing(false))
            .catch(() => {
              setHasError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
              setIsInitializing(false);
            });
        } catch (_) {
          setHasError("Erreur d'initialisation du scanner.");
          setIsInitializing(false);
        }
      }, 300);
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [isPending, session, handleScan]);

  const handleManualSubmit = () => {
    const code = cleanScannedCode(manualCode);
    if (code) {
      handleScan(code);
      setManualCode('');
    }
  };

  if (isPending) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
        <span style={{ marginTop: 16, fontSize: 15, color: '#8e8e93' }}>Vérification...</span>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'admin') return null;

  const statusColors = {
    IDLE: '#0a84ff',
    SENDING: '#ff9f0a',
    SUCCESS: '#30d158',
    ERROR: '#ff453a',
  };

  const statusLabels = {
    IDLE: 'Scanner prêt',
    SENDING: `Envoi de ${scannedCode}…`,
    SUCCESS: `✓ ${scannedCode} envoyé !`,
    ERROR: 'Erreur — réessayez',
  };

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(0,0,0,0.6)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Scanner Mobile</span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 980,
          backgroundColor: 'rgba(48,209,88,0.12)',
          border: '1px solid rgba(48,209,88,0.25)',
        }}>
          <Wifi style={{ width: 13, height: 13, color: '#30d158' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#30d158' }}>
            {wasPaired ? 'Connecté au PC' : 'Prêt'}
          </span>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 20 }}>

        {hasError ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 320 }}>
            <div style={{ backgroundColor: 'rgba(255,69,58,0.15)', padding: 16, borderRadius: '50%' }}>
              <AlertTriangle style={{ width: 40, height: 40, color: '#ff453a' }} />
            </div>
            <p style={{ margin: 0, fontSize: 15, color: '#ff453a', fontWeight: 600 }}>{hasError}</p>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>

            {/* Status badge */}
            <div style={{
              padding: '7px 16px',
              borderRadius: 980,
              backgroundColor: `${statusColors[scanStatus]}1a`,
              border: `1px solid ${statusColors[scanStatus]}40`,
              fontSize: 13,
              fontWeight: 700,
              color: statusColors[scanStatus],
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              transition: 'all 0.3s',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: statusColors[scanStatus], display: 'inline-block', animation: scanStatus === 'IDLE' ? 'remotePulse 2s infinite' : 'none' }} />
              {statusLabels[scanStatus]}
            </div>

            {/* Camera viewport */}
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: '#1c1c1e',
              border: `2px solid ${statusColors[scanStatus]}30`,
              position: 'relative',
              boxShadow: `0 0 30px ${statusColors[scanStatus]}15`,
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}>
              {isInitializing && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#1c1c1e' }}>
                  <Loader2 style={{ width: 28, height: 28, animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
                  <span style={{ fontSize: 13, color: '#8e8e93' }}>Caméra en cours…</span>
                </div>
              )}
              {scanStatus === 'SUCCESS' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(48,209,88,0.15)', zIndex: 2 }}>
                  <CheckCircle style={{ width: 64, height: 64, color: '#30d158' }} />
                </div>
              )}
              <div id="remote-qr-reader" style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Info */}
            <p style={{ margin: 0, fontSize: 12, color: '#636366', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
              Visez un QR code d'exemplaire pour l'envoyer instantanément au PC.
            </p>

            {/* Manual input */}
            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#636366', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Saisie manuelle</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Code QR (ex: 0093994)"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManualSubmit(); } }}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 980,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  style={{
                    padding: '10px 20px', borderRadius: 980,
                    backgroundColor: '#0a84ff', color: '#fff',
                    border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes remotePulse {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default function ScanRemotePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
      </div>
    }>
      <ScanRemoteContent />
    </Suspense>
  );
}
