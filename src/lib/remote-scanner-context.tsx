'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { authClient } from './auth-client';

export type ScanHandler = (qrCodeId: string) => Promise<void> | void;

interface ScanConsumer {
  id: string;
  priority: number;
  handler: ScanHandler;
}

interface ScanToastState {
  visible: boolean;
  code: string;
  status: 'success' | 'error';
  message: string;
}

interface RemoteScannerContextValue {
  registerConsumer: (id: string, priority: number, handler: ScanHandler) => void;
  unregisterConsumer: (id: string) => void;
  isPolling: boolean;
}

const RemoteScannerContext = createContext<RemoteScannerContextValue | null>(null);

export function useRemoteScanner() {
  const ctx = useContext(RemoteScannerContext);
  if (!ctx) throw new Error('useRemoteScanner must be used within RemoteScannerProvider');
  return ctx;
}

function playSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.setValueAtTime(1400, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

function playErrorBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.setValueAtTime(200, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

function ScanToast({ toast }: { toast: ScanToastState }) {
  if (!toast.visible) return null;
  const isSuccess = toast.status === 'success';
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 18px',
      borderRadius: '16px',
      backgroundColor: isSuccess ? '#1c1c1e' : '#1c1c1e',
      border: `1px solid ${isSuccess ? 'rgba(48,209,88,0.35)' : 'rgba(255,69,58,0.35)'}`,
      boxShadow: `0 8px 30px ${isSuccess ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`,
      color: '#fff',
      fontSize: '13px',
      fontWeight: 600,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animation: 'remoteScanSlideIn 0.25s ease-out',
      maxWidth: '320px',
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: isSuccess ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '14px',
      }}>
        {isSuccess ? '✓' : '✕'}
      </div>
      <div>
        <div style={{ color: isSuccess ? '#30d158' : '#ff453a', marginBottom: '2px' }}>
          {isSuccess ? 'Scan reçu' : 'Scan échoué'}
        </div>
        <div style={{ color: '#8e8e93', fontWeight: 500, fontSize: '12px' }}>
          {toast.message}
        </div>
      </div>
      <style>{`
        @keyframes remoteScanSlideIn {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function RemoteScannerProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const consumers = useRef<ScanConsumer[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [toast, setToast] = useState<ScanToastState>({ visible: false, code: '', status: 'success', message: '' });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = !!(session && (session.user as any).role === 'admin');

  const showToast = useCallback((code: string, status: 'success' | 'error', message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, code, status, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  const registerConsumer = useCallback((id: string, priority: number, handler: ScanHandler) => {
    consumers.current = consumers.current.filter(c => c.id !== id);
    consumers.current.push({ id, priority, handler });
    consumers.current.sort((a, b) => b.priority - a.priority);
  }, []);

  const unregisterConsumer = useCallback((id: string) => {
    consumers.current = consumers.current.filter(c => c.id !== id);
  }, []);

  const pollForScans = useCallback(async () => {
    try {
      const res = await fetch('/api/remote-scan');
      if (!res.ok) return;
      const data = await res.json();

      if (!data.success || !data.scan) return;

      const { qrCodeId } = data.scan;
      const consumer = consumers.current[0];

      if (!consumer) {
        showToast(qrCodeId, 'error', `Code ${qrCodeId} — aucun contexte actif`);
        playErrorBeep();
        return;
      }

      try {
        await consumer.handler(qrCodeId);
        playSuccessBeep();
        showToast(qrCodeId, 'success', `Code ${qrCodeId} traité`);
      } catch (e: any) {
        playErrorBeep();
        showToast(qrCodeId, 'error', e?.message || `Erreur sur le code ${qrCodeId}`);
      }
    } catch (_) {
      // Network error — ignore silently
    }
  }, [showToast]);

  useEffect(() => {
    if (!isAdmin) {
      setIsPolling(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setIsPolling(true);
    intervalRef.current = setInterval(pollForScans, 1500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPolling(false);
    };
  }, [isAdmin, pollForScans]);

  return (
    <RemoteScannerContext.Provider value={{ registerConsumer, unregisterConsumer, isPolling }}>
      {children}
      <ScanToast toast={toast} />
    </RemoteScannerContext.Provider>
  );
}
