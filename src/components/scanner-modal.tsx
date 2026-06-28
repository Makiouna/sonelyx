'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Camera, AlertTriangle, Smartphone, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => Promise<void> | void;
  title?: string;
}

type ScanTab = 'local' | 'mobile';
type SseStatus = 'DISCONNECTED' | 'CONNECTING' | 'WAITING' | 'SCANNED' | 'ERROR';

export default function ScannerModal({ isOpen, onClose, onScanSuccess, title = 'Scanner un QR Code' }: ScannerModalProps) {
  const [activeTab, setActiveTab] = useState<ScanTab>('local');
  const [hasError, setHasError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<any>(null);

  // Mobile pairing states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<SseStatus>('DISCONNECTED');
  const eventSourceRef = useRef<EventSource | null>(null);
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
      console.error("Error parsing QR URL:", e);
    }
    return clean;
  };

  const handleManualSubmit = () => {
    const finalCode = cleanScannedCode(manualCode);
    if (finalCode) {
      onScanSuccess(finalCode);
      setManualCode('');
    }
  };

  // Local Scanner loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'local') {
      // If switched away or closed, clean up local scanner
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err: any) => console.error('Stop error:', err));
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
                height: Math.min(height * 0.85, 300)
              }),
              aspectRatio: 1.0,
            },
            async (decodedText: string) => {
              if (html5QrCode.isScanning) {
                await html5QrCode.stop();
              }
              onScanSuccess(cleanScannedCode(decodedText));
            },
            () => {}
          ).then(() => {
            setIsInitializing(false);
          }).catch((err: any) => {
            console.error('Html5Qrcode error:', err);
            setHasError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
            setIsInitializing(false);
          });
        } catch (e: any) {
          console.error('Initialization error:', e);
          setHasError("Erreur d'initialisation du scanner.");
          setIsInitializing(false);
        }
      }, 300);
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err: any) => console.error('Clean up error:', err));
      }
    };
  }, [isOpen, activeTab]);

  const [retryTrigger, setRetryTrigger] = useState(0);

  // Mobile Scanner pairing loop (Polling fallback to avoid serverless SSE issues)
  useEffect(() => {
    if (!isOpen || activeTab !== 'mobile') {
      setSessionId(null);
      setSseStatus('DISCONNECTED');
      return;
    }

    let intervalId: any;
    setSseStatus('CONNECTING');

    const initializeMobileSession = async () => {
      try {
        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);

        // Register session on backend
        const res = await fetch('/api/scan-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newSessionId })
        });
        const data = await res.json();
        if (!data.success) {
          setSseStatus('ERROR');
          return;
        }

        setSseStatus('WAITING');

        // Poll every 1.5 seconds
        intervalId = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/scan-session/${newSessionId}`);
            const checkData = await checkRes.json();
            if (checkData.success) {
              if (checkData.status === 'SCANNED' && checkData.qrCodeId) {
                setSseStatus('SCANNED');
                clearInterval(intervalId);
                onScanSuccess(checkData.qrCodeId);
              }
            } else {
              console.error("Polling error:", checkData.error);
              setSseStatus('ERROR');
              clearInterval(intervalId);
            }
          } catch (e) {
            console.error("Polling fetch error:", e);
          }
        }, 1500);

      } catch (err) {
        console.error('Mobile pairing initialization error:', err);
        setSseStatus('ERROR');
      }
    };

    initializeMobileSession();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      setSessionId(null);
      setSseStatus('DISCONNECTED');
    };
  }, [isOpen, activeTab, retryTrigger]);

  const handleClose = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error('Stop error:', e);
      }
    }
    setSessionId(null);
    setSseStatus('DISCONNECTED');
    onClose();
  };

  if (!isOpen) return null;

  const mobileUrl = typeof window !== 'undefined' && sessionId
    ? `${window.location.origin}/admin/scan-remote?session=${sessionId}`
    : '';

  const qrImageUrl = mobileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileUrl)}`
    : '';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div style={{
        backgroundColor: '#1c1c1e',
        borderRadius: '30px',
        width: '100%',
        maxWidth: '460px',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#ffffff',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-.015em' }}>{title}</h3>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              padding: '6px',
              cursor: 'pointer',
              color: '#8e8e93',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = '#8e8e93';
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Custom Tabs */}
        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '980px' }}>
            <button
              onClick={() => setActiveTab('local')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '980px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                backgroundColor: activeTab === 'local' ? '#ffffff' : 'transparent',
                color: activeTab === 'local' ? '#000000' : '#8e8e93'
              }}
            >
              <Camera style={{ width: '14px', height: '14px' }} />
              Scanner Local
            </button>
            <button
              onClick={() => setActiveTab('mobile')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '980px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                backgroundColor: activeTab === 'mobile' ? '#ffffff' : 'transparent',
                color: activeTab === 'mobile' ? '#000000' : '#8e8e93'
              }}
            >
              <Smartphone style={{ width: '14px', height: '14px' }} />
              Scanner avec mon téléphone
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px'
        }}>
          {activeTab === 'local' ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {hasError ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '16px',
                  padding: '20px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255,69,58,0.15)',
                    color: '#ff453a',
                    padding: '16px',
                    borderRadius: '50%',
                    display: 'flex'
                  }}>
                    <AlertTriangle style={{ width: '32px', height: '32px' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#ff453a', fontWeight: 600 }}>
                    {hasError}
                  </p>
                </div>
              ) : (
                <div style={{ width: '100%', position: 'relative', borderRadius: '20px', overflow: 'hidden', backgroundColor: '#000000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isInitializing && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#000000',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      zIndex: 2
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#0a84ff',
                        animation: 'spin 1s linear infinite'
                      }} />
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
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0070e3'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0a84ff'}
                  >
                    Valider
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Mobile pairing view
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
              {sseStatus === 'CONNECTING' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 0' }}>
                  <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
                  <span style={{ fontSize: '14px', color: '#8e8e93' }}>Génération de la session...</span>
                </div>
              )}

              {sseStatus === 'ERROR' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '30px 0', textAlign: 'center' }}>
                  <AlertTriangle style={{ width: '36px', height: '36px', color: '#ff453a' }} />
                  <span style={{ fontSize: '14px', color: '#ff453a', fontWeight: 600 }}>Erreur de connexion.</span>
                  <button
                    onClick={() => setRetryTrigger(prev => prev + 1)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '980px',
                      border: 'none',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw style={{ width: '14px', height: '14px' }} /> Réessayer
                  </button>
                </div>
              )}

              {(sseStatus === 'WAITING' || sseStatus === 'SCANNED') && qrImageUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                  
                  {/* QR code box */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '24px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    animation: 'scaleIn 0.3s ease-out'
                  }}>
                    <img src={qrImageUrl} alt="Pairing QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                  </div>

                  {/* Status Indicator Badge */}
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '980px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: sseStatus === 'SCANNED' ? 'rgba(48,209,88,0.15)' : 'rgba(255,159,10,0.15)',
                    color: sseStatus === 'SCANNED' ? '#30d158' : '#ff9f0a'
                  }}>
                    {sseStatus === 'SCANNED' ? (
                      <>
                        <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                        Scanné avec succès !
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#ff9f0a',
                          animation: 'pulse 1.5s infinite'
                        }} />
                        En attente du scan mobile...
                      </>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', color: '#8e8e93', textAlign: 'center', maxWidth: '300px', lineHeight: '1.4' }}>
                    Scannez ce QR Code avec l'appareil photo de votre téléphone pour le connecter instantanément.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '16px 24px 20px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#8e8e93',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          {activeTab === 'local'
            ? 'Placez le QR code de l\'exemplaire au centre de la zone.'
            : 'Le téléphone doit être connecté au même compte administrateur.'}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.4; }
        }
        #qr-reader video {
          border-radius: 20px !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
