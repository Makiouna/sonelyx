'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Camera, AlertTriangle, Smartphone, Wifi } from 'lucide-react';
import { useRemoteScanner } from '@/lib/remote-scanner-context';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => Promise<void> | void;
  title?: string;
}

type ScanTab = 'local' | 'mobile';

export default function ScannerModal({ isOpen, onClose, onScanSuccess, title = 'Scanner un QR Code' }: ScannerModalProps) {
  const [activeTab, setActiveTab] = useState<ScanTab>('local');
  const [hasError, setHasError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<any>(null);
  const [manualCode, setManualCode] = useState('');
  const { isPolling } = useRemoteScanner();

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

  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(850, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (_) {}
  };

  const handleManualSubmit = () => {
    const finalCode = cleanScannedCode(manualCode);
    if (finalCode) {
      playBeep();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      onScanSuccess(finalCode);
      setManualCode('');
    }
  };

  // Local Scanner loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'local') {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((_: any) => {});
      }
      return;
    }

    setHasError(null);
    setIsInitializing(true);

    let html5QrCode: any;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      setTimeout(() => {
        const qrReaderEl = document.getElementById('qr-reader');
        if (!qrReaderEl) {
          setIsInitializing(false);
          return;
        }
        try {
          html5QrCode = new Html5Qrcode('qr-reader');
          scannerRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: (width: number, height: number) => ({
                width: Math.min(width * 0.85, 300),
                height: Math.min(height * 0.85, 300),
              }),
              aspectRatio: 1.0,
            },
            async (decodedText: string) => {
              if (html5QrCode.isScanning) await html5QrCode.stop();
              playBeep();
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
              }
              onScanSuccess(cleanScannedCode(decodedText));
            },
            () => {}
          ).then(() => setIsInitializing(false))
            .catch((_: any) => {
              setHasError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
              setIsInitializing(false);
            });
        } catch (_: any) {
          setHasError("Erreur d'initialisation du scanner.");
          setIsInitializing(false);
        }
      }, 300);
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((_: any) => {});
      }
    };
  }, [isOpen, activeTab]);

  const handleClose = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try { await scannerRef.current.stop(); } catch (_) {}
    }
    onClose();
  };

  if (!isOpen) return null;

  const scannerPageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/admin/scan-remote`
    : '/admin/scan-remote';

  const pairingQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(scannerPageUrl)}`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        backgroundColor: '#1c1c1e', borderRadius: '30px',
        width: '100%', maxWidth: '460px',
        border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff',
        overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', position: 'relative',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-.015em' }}>{title}</h3>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
              padding: '6px', cursor: 'pointer', color: '#8e8e93',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#8e8e93'; }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '980px' }}>
            {(['local', 'mobile'] as ScanTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '980px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s',
                  backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                  color: activeTab === tab ? '#000000' : '#8e8e93',
                }}
              >
                {tab === 'local' ? <Camera style={{ width: '14px', height: '14px' }} /> : <Smartphone style={{ width: '14px', height: '14px' }} />}
                {tab === 'local' ? 'Scanner Local' : 'Scanner Mobile'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{
          padding: '24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', minHeight: '300px',
        }}>
          {activeTab === 'local' ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {hasError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px', padding: '20px' }}>
                  <div style={{ backgroundColor: 'rgba(255,69,58,0.15)', color: '#ff453a', padding: '16px', borderRadius: '50%', display: 'flex' }}>
                    <AlertTriangle style={{ width: '32px', height: '32px' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#ff453a', fontWeight: 600 }}>{hasError}</p>
                </div>
              ) : (
                <div style={{ width: '100%', position: 'relative', borderRadius: '20px', overflow: 'hidden', backgroundColor: '#000000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isInitializing && (
                    <div style={{
                      position: 'absolute', inset: 0, backgroundColor: '#000000',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '12px', zIndex: 2,
                    }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#0a84ff', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '13px', color: '#8e8e93' }}>Démarrage de la caméra...</span>
                    </div>
                  )}
                  <div id="qr-reader" style={{ width: '100%', border: 'none' }} />
                </div>
              )}

              {/* Manual input fallback */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <label style={{ fontSize: '12px', color: '#8e8e93', fontWeight: 600 }}>Saisie manuelle (Secours / Test)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Saisissez ou collez le code (ex: 0093994)"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManualSubmit(); } }}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: '980px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                  <button
                    type="button" onClick={handleManualSubmit}
                    style={{ padding: '10px 20px', borderRadius: '980px', backgroundColor: '#0a84ff', color: '#ffffff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0070e3'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0a84ff'}
                  >
                    Valider
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Mobile tab — permanent scanner, no pairing session needed
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', textAlign: 'center' }}>

              {/* Status badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '7px 16px', borderRadius: '980px',
                backgroundColor: isPolling ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
                border: `1px solid ${isPolling ? 'rgba(48,209,88,0.3)' : 'rgba(255,159,10,0.3)'}`,
              }}>
                <Wifi style={{ width: '13px', height: '13px', color: isPolling ? '#30d158' : '#ff9f0a' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: isPolling ? '#30d158' : '#ff9f0a' }}>
                  {isPolling ? 'Douchette sans fil active' : 'Démarrage...'}
                </span>
              </div>

              {/* QR for initial setup */}
              <div style={{
                padding: '16px', borderRadius: '24px', backgroundColor: '#ffffff',
                boxShadow: '0 10px 25px rgba(0,0,0,0.4)', animation: 'scaleIn 0.3s ease-out',
              }}>
                <img src={pairingQrUrl} alt="Scanner mobile" style={{ width: '160px', height: '160px', display: 'block' }} />
              </div>

              <div style={{ fontSize: '13px', color: '#8e8e93', lineHeight: 1.55, maxWidth: '310px' }}>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '6px' }}>Association permanente</strong>
                Scannez ce QR <strong style={{ color: '#ffffff' }}>une seule fois</strong> depuis votre téléphone pour ouvrir la page scanner.
                Ensuite, chaque scan sur le téléphone sera capturé automatiquement par le PC selon le contexte actif.
              </div>

              <div style={{ fontSize: '11px', color: '#48484a', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {scannerPageUrl}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px 20px', textAlign: 'center', fontSize: '13px', color: '#8e8e93', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {activeTab === 'local'
            ? "Placez le QR code de l'exemplaire au centre de la zone."
            : "Le téléphone doit être connecté au même compte administrateur."}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        #qr-reader video {
          border-radius: 20px !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
