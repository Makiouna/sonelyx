'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Loader2, AlertTriangle, CheckCircle, Wifi } from 'lucide-react';

const LS_PAIRED_KEY = 'sonelyx_remote_scanner_paired';
const SAME_CODE_COOLDOWN_MS = 2000;

function playBeep(type: 'success' | 'error') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      // Sharp ascending double-beep — loud & crisp
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.setValueAtTime(1320, ctx.currentTime + 0.07);
      gain1.gain.setValueAtTime(0.55, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.18);
    } else {
      // Low buzzer — square wave, two pulses
      const buzz = (start: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, start);
        gain.gain.setValueAtTime(0.45, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.18);
      };
      buzz(ctx.currentTime);
      buzz(ctx.currentTime + 0.22);
    }
  } catch (_) {}
}

function ScanRemoteContent() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [hasError, setHasError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [scannedCode, setScannedCode] = useState<string>('');
  const [wasPaired, setWasPaired] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const isSendingRef = useRef(false);
  const lastCodeRef = useRef<string>('');
  const lastCodeTimeRef = useRef<number>(0);
  const barcodeDetectorRef = useRef<any>(null);
  const jsQRRef = useRef<any>(null);
  const isDetectingRef = useRef(false);

  // Security guard
  useEffect(() => {
    if (!isPending && (!session || (session.user as any).role !== 'admin')) {
      router.push('/');
    }
  }, [isPending, session, router]);

  // Restore pairing state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWasPaired(localStorage.getItem(LS_PAIRED_KEY) === 'true');
    }
  }, []);

  const cleanCode = (raw: string): string => {
    const s = raw.trim();
    if (!s) return '';
    try {
      if (s.startsWith('http://') || s.startsWith('https://')) {
        const url = new URL(s);
        const sp = url.searchParams.get('session');
        if (sp) return sp;
        const segs = url.pathname.split('/').filter(Boolean);
        if (segs.length) return segs[segs.length - 1];
      }
    } catch (_) {}
    return s;
  };

  const handleScan = useCallback(async (qrCodeId: string) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setScanStatus('SENDING');
    setScannedCode(qrCodeId);

    if (navigator.vibrate) navigator.vibrate(100);

    try {
      const res = await fetch('/api/remote-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeId }),
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_PAIRED_KEY, 'true');
          setWasPaired(true);
        }
        playBeep('success');
        setScanStatus('SUCCESS');
        setTimeout(() => { setScanStatus('IDLE'); isSendingRef.current = false; }, 1600);
      } else {
        playBeep('error');
        if (navigator.vibrate) navigator.vibrate([150, 70, 150, 70, 150]);
        setScanStatus('ERROR');
        setTimeout(() => { setScanStatus('IDLE'); isSendingRef.current = false; }, 2200);
      }
    } catch (_) {
      playBeep('error');
      if (navigator.vibrate) navigator.vibrate([150, 70, 150, 70, 150]);
      setScanStatus('ERROR');
      setTimeout(() => { setScanStatus('IDLE'); isSendingRef.current = false; }, 2200);
    }
  }, []);

  const onCodeDetected = useCallback((raw: string) => {
    const code = cleanCode(raw);
    if (!code) return;
    const now = Date.now();
    // Instant on new code, 2s cooldown on same code
    if (code === lastCodeRef.current && now - lastCodeTimeRef.current < SAME_CODE_COOLDOWN_MS) return;
    lastCodeRef.current = code;
    lastCodeTimeRef.current = now;
    handleScan(code);
  }, [handleScan]);

  // Camera + detection loop
  useEffect(() => {
    if (isPending || !session || (session.user as any).role !== 'admin') return;

    let active = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const vid = videoRef.current;
        if (!vid) return;
        vid.srcObject = stream;
        vid.setAttribute('playsinline', 'true');
        await vid.play();
        setIsInitializing(false);

        // Prefer hardware BarcodeDetector
        if ('BarcodeDetector' in window) {
          try {
            barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          } catch (_) {}
        }

        // Pre-load jsQR for fallback
        if (!barcodeDetectorRef.current) {
          import('jsqr').then(mod => { jsQRRef.current = mod.default; });
        }

        const tick = () => {
          if (!active) return;
          const v = videoRef.current;
          if (!v || v.readyState < 2 || v.videoWidth === 0) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          if (barcodeDetectorRef.current && !isDetectingRef.current) {
            // Hardware path — async, chain next tick in finally
            isDetectingRef.current = true;
            barcodeDetectorRef.current.detect(v)
              .then((codes: any[]) => {
                if (active && codes.length > 0) onCodeDetected(codes[0].rawValue);
              })
              .catch(() => {})
              .finally(() => {
                isDetectingRef.current = false;
                if (active) rafRef.current = requestAnimationFrame(tick);
              });
          } else if (!barcodeDetectorRef.current && jsQRRef.current) {
            // Software path — sync canvas decode
            try {
              const canvas = canvasRef.current!;
              const ctx2d = canvas.getContext('2d', { willReadFrequently: true })!;
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
              ctx2d.drawImage(v, 0, 0);
              const img = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
              const result = jsQRRef.current(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
              if (result) onCodeDetected(result.data);
            } catch (_) {}
            rafRef.current = requestAnimationFrame(tick);
          } else {
            // jsQR not loaded yet, keep waiting
            rafRef.current = requestAnimationFrame(tick);
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (_) {
        if (active) {
          setHasError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
          setIsInitializing(false);
        }
      }
    };

    start();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [isPending, session, onCodeDetected]);

  const handleManualSubmit = () => {
    const code = cleanCode(manualCode);
    if (code) { handleScan(code); setManualCode(''); }
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

  const statusColors = { IDLE: '#0a84ff', SENDING: '#ff9f0a', SUCCESS: '#30d158', ERROR: '#ff453a' };
  const statusLabels = {
    IDLE: 'Scanner prêt',
    SENDING: `Envoi de ${scannedCode}…`,
    SUCCESS: `✓ ${scannedCode} envoyé !`,
    ERROR: 'Erreur — réessayez',
  };
  const col = statusColors[scanStatus];

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.6)', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Scanner Mobile</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 980, backgroundColor: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.25)' }}>
          <Wifi style={{ width: 13, height: 13, color: '#30d158' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#30d158' }}>{wasPaired ? 'Connecté au PC' : 'Prêt'}</span>
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
            <div style={{ padding: '7px 16px', borderRadius: 980, backgroundColor: `${col}1a`, border: `1px solid ${col}40`, fontSize: 13, fontWeight: 700, color: col, display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.25s' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: col, display: 'inline-block', animation: scanStatus === 'IDLE' ? 'remotePulse 2s infinite' : 'none' }} />
              {statusLabels[scanStatus]}
            </div>

            {/* Camera viewport */}
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 24, overflow: 'hidden', backgroundColor: '#1c1c1e', border: `2px solid ${col}30`, position: 'relative', boxShadow: `0 0 30px ${col}18`, transition: 'border-color 0.25s, box-shadow 0.25s' }}>
              {isInitializing && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#1c1c1e', zIndex: 2 }}>
                  <Loader2 style={{ width: 28, height: 28, animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
                  <span style={{ fontSize: 13, color: '#8e8e93' }}>Caméra en cours…</span>
                </div>
              )}
              {scanStatus === 'SUCCESS' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(48,209,88,0.18)', zIndex: 3, animation: 'flashIn 0.15s ease-out' }}>
                  <CheckCircle style={{ width: 72, height: 72, color: '#30d158' }} />
                </div>
              )}
              {/* Raw video — no wrapper div, fills the container */}
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Hidden canvas for jsQR fallback */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

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
                  style={{ flex: 1, padding: '10px 16px', borderRadius: 980, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  style={{ padding: '10px 20px', borderRadius: 980, backgroundColor: '#0a84ff', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Envoyer
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes remotePulse { 0%, 100% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes flashIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function ScanRemotePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#0a84ff' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ScanRemoteContent />
    </Suspense>
  );
}
