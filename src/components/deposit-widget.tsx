'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ── Inner form (must be inside <Elements>) ────────────────────────────────────
function DepositForm({
  quoteId,
  depositAmount,
  onSuccess,
}: {
  quoteId: string;
  depositAmount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/profil?deposit=success`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Une erreur est survenue.');
      setSubmitting(false);
      return;
    }

    // No redirect required — confirm server-side so the status updates
    // even without a webhook configured (e.g. in local dev).
    try {
      await fetch('/api/payments/confirm-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
    } catch {}

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ fontSize: '13px', color: '#6e6e73', lineHeight: 1.6 }}>
        Vos coordonnées bancaires sont saisies directement chez <strong style={{ color: '#1d1d1f' }}>Stripe</strong>. La somme sera simplement <em>bloquée</em> sur votre carte — jamais débitée sauf en cas de dommage.
      </div>

      <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '14px', padding: '16px 18px', backgroundColor: '#fff' }}>
        <PaymentElement />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)', color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
          <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '14px 24px',
          borderRadius: '980px',
          backgroundColor: submitting ? '#86868b' : '#0071e3',
          color: '#ffffff',
          border: 'none',
          cursor: submitting ? 'default' : 'pointer',
          fontWeight: 700,
          fontSize: '15px',
          transition: 'background 0.2s',
        }}
      >
        {submitting ? (
          <>
            <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
            Vérification en cours…
          </>
        ) : (
          <>
            <Shield style={{ width: '16px', height: '16px' }} />
            Autoriser {depositAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </>
        )}
      </button>
    </form>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
interface DepositWidgetProps {
  quoteId: string;
  depositAmount: number;
  depositStatus: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'RELEASED' | 'BYPASSED';
  onStatusChange?: () => void;
}

export default function DepositWidget({ quoteId, depositAmount, depositStatus, onStatusChange }: DepositWidgetProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(depositStatus === 'AUTHORIZED');

  // If status is already set from server, reflect it immediately
  useEffect(() => {
    setSuccess(depositStatus === 'AUTHORIZED');
  }, [depositStatus]);

  const handleInitiate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/create-deposit-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Impossible d\'initialiser la caution.');
      } else {
        setClientSecret(data.clientSecret);
      }
    } catch {
      setError('Une erreur réseau est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (depositStatus === 'CAPTURED') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderRadius: '16px', backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)' }}>
        <AlertTriangle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>Caution encaissée</div>
          <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>Le montant de {depositAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} a été prélevé suite à un dommage constaté.</div>
        </div>
      </div>
    );
  }

  if (depositStatus === 'RELEASED') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderRadius: '16px', backgroundColor: '#f0fdf4', border: '1px solid rgba(21,128,61,.2)' }}>
        <CheckCircle style={{ width: '18px', height: '18px', color: '#15803d', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>Caution libérée</div>
          <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>Votre empreinte bancaire a été annulée. Aucun prélèvement n'a eu lieu.</div>
        </div>
      </div>
    );
  }

  if (success || depositStatus === 'AUTHORIZED') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderRadius: '16px', backgroundColor: '#f0fdf4', border: '1px solid rgba(21,128,61,.2)' }}>
        <CheckCircle style={{ width: '18px', height: '18px', color: '#15803d', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>Empreinte bancaire enregistrée</div>
          <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>
            {depositAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} bloqués sur votre carte. Libération automatique après votre événement si aucun dommage.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fff3cd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield style={{ width: '20px', height: '20px', color: '#d97706' }} />
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1d1d1f' }}>
            Caution requise — {depositAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
          <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>
            Empreinte bancaire (pré-autorisation) · non débitée
          </div>
        </div>
      </div>

      {!clientSecret ? (
        <>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)', color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
              <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
              {error}
            </div>
          )}
          <button
            onClick={handleInitiate}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 22px',
              borderRadius: '980px',
              backgroundColor: loading ? '#86868b' : '#1d1d1f',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              fontWeight: 700,
              fontSize: '14px',
              alignSelf: 'flex-start',
            }}
          >
            {loading ? <Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Shield style={{ width: '15px', height: '15px' }} />}
            {loading ? 'Préparation…' : 'Déposer mon empreinte bancaire'}
          </button>
        </>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'flat',
              variables: {
                colorPrimary: '#0071e3',
                colorBackground: '#f5f5f7',
                colorText: '#1d1d1f',
                colorDanger: '#ef4444',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                borderRadius: '10px',
                spacingUnit: '4px',
              },
            },
          }}
        >
          <DepositForm
            quoteId={quoteId}
            depositAmount={depositAmount}
            onSuccess={() => {
              setSuccess(true);
              setClientSecret(null);
              onStatusChange?.();
            }}
          />
        </Elements>
      )}
    </div>
  );
}
