'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  CreditCard, Landmark, Copy, Check, Download,
  Shield, Loader2, CheckCircle2, Lock, Info, ArrowRight,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STRIPE_THRESHOLD = 1500; // EUR — above this, wire transfer is required

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentRouterProps {
  /** Invoice / quote total (TTC) in euros */
  totalAmount: number;
  quoteId: string;
  /** IBAN from settings — shown for wire transfer */
  iban: string;
  /** BIC/SWIFT from settings */
  bic: string;
  /** Account holder name — defaults to "Sonelyx" */
  holder?: string;
  /** Optional extra instructions shown below the RIB card */
  paymentInstructions?: string;
  /** Pre-populate from the quote's stored status so the success state survives a page refresh */
  initialPaymentStatus?: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CASH' | null;
  /** Called after a successful Stripe payment so the parent can re-fetch */
  onSuccess?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/** Adds a space every 4 characters for readability: FR76 1234 5678 … */
const formatIBAN = (raw: string) =>
  raw.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();

// ─── Stripe payment form (must be rendered inside <Elements>) ─────────────────

function StripeForm({
  totalAmount,
  quoteId,
  onSuccess,
}: {
  totalAmount: number;
  quoteId: string;
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

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // quoteId is included so the profil page can confirm after a 3DS redirect
        return_url: `${window.location.origin}/profil?payment=success&quoteId=${quoteId}`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Une erreur est survenue.');
      setSubmitting(false);
      return;
    }

    // Non-redirect path: confirm server-side so the DB reflects SUCCEEDED immediately.
    // Without this, invoicePaymentStatus stays PENDING until a webhook fires (which it
    // won't while STRIPE_WEBHOOK_SECRET is a placeholder).
    try {
      await fetch('/api/payments/confirm-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
    } catch {}

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 12, color: '#86868b', lineHeight: 1.65 }}>
        Vos coordonnées bancaires sont transmises directement à{' '}
        <strong style={{ color: '#1d1d1f' }}>Stripe</strong>, notre prestataire certifié PCI-DSS.
        Sonelyx ne stocke jamais vos données de carte.
      </p>

      <div style={{
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: '16px 18px',
        backgroundColor: '#fff',
      }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 14px', borderRadius: 10,
          backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)',
          color: '#ef4444', fontSize: 13, fontWeight: 600,
        }}>
          <Info style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '13px 24px', borderRadius: 980,
          backgroundColor: submitting ? '#86868b' : '#0071e3',
          color: '#fff', border: 'none',
          cursor: submitting ? 'default' : 'pointer',
          fontWeight: 700, fontSize: 15,
          transition: 'background 0.2s',
          fontFamily: 'inherit',
        }}
      >
        {submitting ? (
          <>
            <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            Traitement en cours…
          </>
        ) : (
          <>
            <Lock style={{ width: 15, height: 15 }} />
            Payer {fmt(totalAmount)} maintenant
          </>
        )}
      </button>
    </form>
  );
}

// ─── Stripe zone — shown when amount ≤ STRIPE_THRESHOLD ──────────────────────

function StripePaymentZone({
  quoteId,
  totalAmount,
  initialSucceeded,
  onSuccess,
}: {
  quoteId: string;
  totalAmount: number;
  initialSucceeded: boolean;
  onSuccess: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(initialSucceeded);

  const initiate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/create-invoice-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Impossible d\'initialiser le paiement.');
      setClientSecret(data.clientSecret);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (succeeded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '16px 20px', borderRadius: 16,
        backgroundColor: '#f0fdf4', border: '1px solid rgba(21,128,61,.2)',
      }}>
        <CheckCircle2 style={{ width: 22, height: 22, color: '#15803d', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>Paiement confirmé</div>
          <div style={{ fontSize: 12, color: '#86868b', marginTop: 3 }}>
            {fmt(totalAmount)} débité avec succès. Un reçu vous a été envoyé par e-mail.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Available payment methods */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['Visa / Mastercard', 'Apple Pay', 'Google Pay'].map(m => (
          <span
            key={m}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 980,
              border: '1px solid rgba(0,0,0,0.12)',
              fontSize: 11, fontWeight: 600, color: '#3c3c43',
              backgroundColor: '#fff',
            }}
          >
            <CreditCard style={{ width: 11, height: 11, opacity: 0.6 }} />
            {m}
          </span>
        ))}
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 14px', borderRadius: 10,
          backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.2)',
          color: '#ef4444', fontSize: 13, fontWeight: 600,
        }}>
          <Info style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {!clientSecret ? (
        <button
          onClick={initiate}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 980,
            backgroundColor: loading ? '#86868b' : '#1d1d1f',
            color: '#fff', border: 'none',
            cursor: loading ? 'default' : 'pointer',
            fontWeight: 700, fontSize: 14,
            alignSelf: 'flex-start',
            fontFamily: 'inherit',
            transition: 'background 0.2s',
          }}
        >
          {loading ? (
            <>
              <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
              Préparation…
            </>
          ) : (
            <>
              <ArrowRight style={{ width: 15, height: 15 }} />
              Procéder au paiement
            </>
          )}
        </button>
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
          <StripeForm
            totalAmount={totalAmount}
            quoteId={quoteId}
            onSuccess={() => {
              setSucceeded(true);
              setClientSecret(null);
              onSuccess();
            }}
          />
        </Elements>
      )}
    </div>
  );
}

// ─── Bank transfer zone — shown when amount > STRIPE_THRESHOLD ────────────────

function BankTransferZone({
  totalAmount,
  iban,
  bic,
  holder,
  quoteId,
  paymentInstructions,
}: {
  totalAmount: number;
  iban: string;
  bic: string;
  holder: string;
  quoteId: string;
  paymentInstructions?: string;
}) {
  const [copied, setCopied] = useState(false);
  const formattedIBAN = formatIBAN(iban);

  const copyIBAN = async () => {
    try {
      await navigator.clipboard.writeText(iban.replace(/\s/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const downloadRib = () => {
    const html = buildRibHtml({ holder, iban: formattedIBAN, bic, quoteId, totalAmount });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `RIB-Sonelyx-${quoteId}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const ribFields = [
    { label: 'Titulaire du compte', value: holder, mono: false },
    { label: 'IBAN',                value: formattedIBAN, mono: true },
    { label: 'BIC / SWIFT',         value: bic, mono: true },
    { label: 'Motif à indiquer',    value: `Règlement ${quoteId}`, mono: false },
  ];

  const hasBankInfo = iban.trim().length > 0 && bic.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Security notice ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: '14px 16px', borderRadius: 14,
        backgroundColor: '#f0f9ff', border: '1px solid rgba(14,165,233,.25)',
      }}>
        <Shield style={{ width: 18, height: 18, color: '#0284c7', flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 13, color: '#0369a1', lineHeight: 1.65 }}>
          Au vu du montant de cette transaction et pour garantir la sécurité des transferts
          de fonds, notre système privilégie le règlement par{' '}
          <strong>virement bancaire traditionnel</strong>.
        </p>
      </div>

      {/* ── RIB card ──────────────────────────────────────────────────────────── */}
      {hasBankInfo ? (
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
        }}>
          {/* Card header */}
          <div style={{
            padding: '11px 18px',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            backgroundColor: '#f5f5f7',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Landmark style={{ width: 14, height: 14, color: '#3c3c43' }} />
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#3c3c43',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Coordonnées bancaires
            </span>
          </div>

          {/* Fields */}
          <div>
            {ribFields.map(({ label, value, mono }, i) => (
              <div
                key={label}
                className="rib-field-row"
                style={{
                  display: 'grid', gridTemplateColumns: '148px 1fr',
                  padding: '11px 18px', gap: 12,
                  borderBottom: i < ribFields.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: '#86868b', fontWeight: 500, paddingTop: 1 }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 13, color: '#1d1d1f', fontWeight: 600,
                  fontFamily: mono
                    ? '"SF Mono", "Fira Code", "Roboto Mono", monospace'
                    : 'inherit',
                  overflowWrap: 'break-word', lineHeight: 1.5,
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
          <style>{`
            @media (max-width: 480px) {
              .rib-field-row { grid-template-columns: 1fr !important; gap: 4px !important; }
            }
          `}</style>
        </div>
      ) : (
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          backgroundColor: '#fafafa', border: '1px solid rgba(0,0,0,0.1)',
          fontSize: 13, color: '#86868b', fontStyle: 'italic',
        }}>
          Les coordonnées bancaires sont en cours de configuration. Contactez-nous pour procéder au règlement.
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────────────────────────── */}
      {hasBankInfo && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={copyIBAN}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 980,
              backgroundColor: copied ? '#f0fdf4' : '#1d1d1f',
              color: copied ? '#15803d' : '#fff',
              border: copied ? '1px solid rgba(21,128,61,.25)' : '1px solid transparent',
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            {copied ? (
              <><Check style={{ width: 14, height: 14 }} />Copié !</>
            ) : (
              <><Copy style={{ width: 14, height: 14 }} />Copier l'IBAN</>
            )}
          </button>

          <button
            onClick={downloadRib}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 980,
              backgroundColor: 'transparent',
              color: '#1d1d1f',
              border: '1px solid rgba(0,0,0,0.18)',
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Télécharger le RIB (PDF)
          </button>
        </div>
      )}

      {/* ── Optional free-text instructions ─────────────────────────────────── */}
      {paymentInstructions && (
        <p style={{
          margin: 0, fontSize: 12, color: '#86868b', lineHeight: 1.7,
          padding: '10px 14px', borderRadius: 10,
          backgroundColor: '#f5f5f7',
          borderLeft: '3px solid #d1d1d6',
        }}>
          {paymentInstructions}
        </p>
      )}
    </div>
  );
}

// ─── Printable RIB HTML generator ────────────────────────────────────────────

function buildRibHtml({
  holder, iban, bic, quoteId, totalAmount,
}: {
  holder: string;
  iban: string;
  bic: string;
  quoteId: string;
  totalAmount: number;
}): string {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const amountStr = totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RIB — ${holder}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      max-width: 600px;
      margin: 48px auto;
      padding: 0 24px;
      color: #1d1d1f;
      background: #fff;
    }
    header { margin-bottom: 32px; }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .meta { font-size: 13px; color: #86868b; margin-top: 4px; }
    .card {
      border: 1px solid #e5e5e7;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .card-header {
      padding: 10px 18px;
      background: #f5f5f7;
      border-bottom: 1px solid #e5e5e7;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #3c3c43;
    }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 11px 18px; vertical-align: top; border-bottom: 1px solid #f0f0f2; }
    tr:last-child td { border-bottom: none; }
    td:first-child { font-size: 12px; color: #86868b; font-weight: 500; width: 148px; padding-top: 13px; }
    td:last-child { font-size: 13px; font-weight: 600; font-family: "SF Mono", "Fira Code", monospace; word-break: break-all; }
    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: #f5f5f7;
      border: 1px solid #e5e5e7;
      border-radius: 14px;
      margin-bottom: 20px;
    }
    .amount-label { font-size: 13px; color: #86868b; }
    .amount-value { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    footer { font-size: 11px; color: #aeaeb2; margin-top: 32px; text-align: center; }
    @media print {
      body { margin: 0; }
      @page { margin: 24px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Relevé d'Identité Bancaire</h1>
    <p class="meta">Généré le ${date} · Référence ${quoteId}</p>
  </header>

  <div class="amount-row">
    <span class="amount-label">Montant à virer</span>
    <span class="amount-value">${amountStr}</span>
  </div>

  <div class="card">
    <div class="card-header">Coordonnées bancaires</div>
    <table>
      <tr><td>Titulaire du compte</td><td style="font-family:inherit">${holder}</td></tr>
      <tr><td>IBAN</td><td>${iban}</td></tr>
      <tr><td>BIC / SWIFT</td><td>${bic}</td></tr>
      <tr><td>Motif à indiquer</td><td style="font-family:inherit">Règlement ${quoteId}</td></tr>
    </table>
  </div>

  <footer>
    Ouvrez ce fichier dans votre navigateur puis utilisez Fichier → Imprimer → Enregistrer en PDF
  </footer>
</body>
</html>`;
}

// ─── Main exported component ──────────────────────────────────────────────────

export default function PaymentRouter({
  totalAmount,
  quoteId,
  iban,
  bic,
  holder = 'Sonelyx',
  paymentInstructions,
  initialPaymentStatus,
  onSuccess = () => {},
}: PaymentRouterProps) {
  const isStripeMode = totalAmount <= STRIPE_THRESHOLD;

  // Cash payment already recorded by admin — show confirmation, no action needed
  if (initialPaymentStatus === 'CASH') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderRadius: 20,
        backgroundColor: '#f0fdf4', border: '1px solid rgba(21,128,61,.2)',
        fontFamily: 'var(--font-hanken-grotesk), -apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <CheckCircle2 style={{ width: 22, height: 22, color: '#15803d', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>Règlement en espèces confirmé</div>
          <div style={{ fontSize: 12, color: '#86868b', marginTop: 3 }}>
            {fmt(totalAmount)} — enregistré par l'administrateur.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.1)',
      backgroundColor: '#fff',
      overflow: 'hidden',
      fontFamily: 'var(--font-hanken-grotesk), -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '16px 20px',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {isStripeMode
            ? <CreditCard style={{ width: 17, height: 17, color: '#3c3c43' }} />
            : <Landmark style={{ width: 17, height: 17, color: '#3c3c43' }} />
          }
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>
            {isStripeMode ? 'Paiement en ligne sécurisé' : 'Virement bancaire'}
          </span>
        </div>
        <div style={{
          padding: '5px 13px', borderRadius: 980,
          backgroundColor: '#f5f5f7', border: '1px solid rgba(0,0,0,0.09)',
          fontSize: 15, fontWeight: 800, color: '#1d1d1f',
          letterSpacing: '-0.01em',
        }}>
          {fmt(totalAmount)}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 20px' }}>
        {isStripeMode ? (
          <StripePaymentZone
            quoteId={quoteId}
            totalAmount={totalAmount}
            initialSucceeded={initialPaymentStatus === 'SUCCEEDED'}
            onSuccess={onSuccess}
          />
        ) : (
          <BankTransferZone
            totalAmount={totalAmount}
            iban={iban}
            bic={bic}
            holder={holder}
            quoteId={quoteId}
            paymentInstructions={paymentInstructions}
          />
        )}
      </div>
    </div>
  );
}
