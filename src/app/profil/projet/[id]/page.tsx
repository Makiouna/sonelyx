'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import DepositWidget from '@/components/deposit-widget';
import PaymentRouter from '@/components/payment-router';
import {
  Loader2, FileText, Trash2, Send, Calendar,
  AlertTriangle, ChevronDown, ChevronUp, Check, X,
  ChevronLeft, PackageCheck, Receipt, RefreshCcw, FileSignature, Pencil, Ban, Phone,
} from 'lucide-react';
import {
  groupQuotesByProject, getProjectStatus, projectStatusLabel, projectStatusColors,
  type Quote, type QuoteSnapshot, type ProjectGroup, type DocType,
} from '@/lib/project-grouping';

interface PageProps { params: Promise<{ id: string }> }

const fmtLong = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (d: string) => new Date(d).toLocaleDateString('fr-FR');

const DOC_TYPE_META: Record<DocType, { labelPlural: string; icon: React.ReactNode; color: string }> = {
  devis:   { labelPlural: 'Devis',     icon: <FileText style={{ width: 18, height: 18 }} />,       color: '#0071e3' },
  facture: { labelPlural: 'Factures',  icon: <Receipt style={{ width: 18, height: 18 }} />,        color: '#7c3aed' },
  avoir:   { labelPlural: 'Avoirs',    icon: <RefreshCcw style={{ width: 18, height: 18 }} />,     color: '#0891b2' },
  contrat: { labelPlural: 'Contrats',  icon: <FileSignature style={{ width: 18, height: 18 }} />,  color: '#16a34a' },
};

const DOC_TYPE_ORDER: DocType[] = ['devis', 'facture', 'avoir', 'contrat'];

export default function ProjectPage({ params }: PageProps) {
  const { id: projectId } = use(params);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState<{ iban: string; bic: string; instructions: string } | null>(null);
  const [quoteActionLoading, setQuoteActionLoading] = useState<string | null>(null);
  const [refusingQuoteId, setRefusingQuoteId] = useState<string | null>(null);
  const [refusalNote, setRefusalNote] = useState('');
  const [expandedV1Id, setExpandedV1Id] = useState<string | null>(null);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  // Rename project
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    if (!sessionPending && !session) router.push('/auth/sign-in');
  }, [sessionPending, session, router]);

  async function fetchQuotes() {
    try {
      const res = await fetch('/api/quotes', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setQuotes(data.quotes);
    } catch (e) { console.error(e); }
    finally { setQuotesLoading(false); }
  }

  useEffect(() => { if (session) fetchQuotes(); }, [session]);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data.success && (data.iban || data.bic || data.paymentInstructions)) {
        setPaymentSettings({ iban: data.iban || '', bic: data.bic || '', instructions: data.paymentInstructions || '' });
      }
    }).catch(() => {});
  }, []);

  const handleSendDraft = async (id: string) => {
    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'pending' }) });
      const data = await res.json();
      if (data.success) await fetchQuotes(); else alert(data.error || 'Erreur');
    } catch { alert('Une erreur est survenue.'); }
    finally { setQuoteActionLoading(null); }
  };

  const handleApprove = async (id: string) => {
    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approve: true }) });
      const data = await res.json();
      if (data.success) await fetchQuotes(); else alert(data.error || 'Erreur');
    } catch { alert('Une erreur est survenue.'); }
    finally { setQuoteActionLoading(null); }
  };

  const handleRefuse = async (id: string, note: string) => {
    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refuse: true, clientRefusalNote: note }) });
      const data = await res.json();
      if (data.success) { setRefusingQuoteId(null); setRefusalNote(''); await fetchQuotes(); } else alert(data.error || 'Erreur');
    } catch { alert('Une erreur est survenue.'); }
    finally { setQuoteActionLoading(null); }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Supprimer ce brouillon ?')) return;
    setQuoteActionLoading(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await fetchQuotes(); else alert(data.error || 'Erreur');
    } catch { alert('Une erreur est survenue.'); }
    finally { setQuoteActionLoading(null); }
  };

  if (sessionPending) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7', fontFamily: 'var(--font-hanken-grotesk), sans-serif' }}><Loader2 style={{ width: 32, height: 32, color: '#1d1d1f', animation: 'spin 1s linear infinite' }} /></div>;
  }
  if (!session) return null;

  const projects = groupQuotesByProject(quotes);
  const project: ProjectGroup | undefined = projects.find(p => p.id === projectId);

  if (!quotesLoading && !project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#f5f5f7', fontFamily: 'var(--font-hanken-grotesk), sans-serif' }}>
        <p style={{ fontSize: 15, color: '#86868b' }}>Projet introuvable.</p>
        <Link href="/profil" style={{ padding: '8px 18px', backgroundColor: '#1d1d1f', color: '#fff', borderRadius: '980px', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Retour à mes projets</Link>
      </div>
    );
  }

  const profileLinks = [
    { label: 'Espace Location', href: '/location/catalogue' },
    { label: 'Mes Projets', href: '/profil' },
  ];

  if (quotesLoading || !project) {
    return (
      <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-hanken-grotesk), sans-serif' }}>
        <Header subTitle="Mon Projet" links={profileLinks} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 style={{ width: 32, height: 32, color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
        </main>
        <Footer />
      </div>
    );
  }

  const handleRename = async () => {
    setRenameLoading(true);
    try {
      const res = await fetch(`/api/quotes/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: renameValue.trim() || null }),
      });
      const data = await res.json();
      if (data.success) { setIsRenaming(false); await fetchQuotes(); }
      else alert(data.error || 'Erreur');
    } catch { alert('Une erreur est survenue.'); }
    finally { setRenameLoading(false); }
  };

  const pStatus = getProjectStatus(project.quotes);
  const pColors = projectStatusColors(pStatus);
  const modifiedCount = project.quotes.filter(q => q.status === 'modified_by_admin').length;

  // Group quotes by docType
  const byDocType: Partial<Record<DocType, Quote[]>> = {};
  for (const q of project.quotes) {
    const dt = (q.docType ?? 'devis') as DocType;
    if (!byDocType[dt]) byDocType[dt] = [];
    byDocType[dt]!.push(q);
  }

  const s = { fontFamily: 'var(--font-hanken-grotesk), sans-serif' };

  // ── Shared detail panel ───────────────────────────────────────────────────
  const DetailPanel = ({ q }: { q: Quote }) => (
    <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', padding: '14px 16px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 280 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', color: '#86868b', fontWeight: 600, paddingBottom: 6, borderBottom: '1px solid rgba(0,0,0,.06)' }}>Article</th>
            <th style={{ textAlign: 'center', color: '#86868b', fontWeight: 600, paddingBottom: 6, borderBottom: '1px solid rgba(0,0,0,.06)', width: 40 }}>Qté</th>
            <th style={{ textAlign: 'right', color: '#86868b', fontWeight: 600, paddingBottom: 6, borderBottom: '1px solid rgba(0,0,0,.06)' }}>Prix unit.</th>
          </tr>
        </thead>
        <tbody>
          {q.items.map((it, idx) => (
            <tr key={idx} style={{ borderBottom: idx < q.items.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
              <td style={{ padding: '6px 0' }}>
                <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{it.name}</div>
                <div style={{ color: '#86868b', fontSize: 11 }}>{it.brand}</div>
              </td>
              <td style={{ textAlign: 'center', padding: '6px 8px', color: '#1d1d1f' }}>×{it.quantity}</td>
              <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: '#1d1d1f' }}>
                {it.priceType === 'on_request' ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} €`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {q.notes && <div style={{ fontSize: 12, color: '#6e6e73', fontStyle: 'italic', borderLeft: '2px solid #e8e8ed', paddingLeft: 8 }}>{q.notes}</div>}
      {q.discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#6e6e73' }}>Remise</span>
          <span style={{ color: '#1db954', fontWeight: 700 }}>−{q.discount}%</span>
        </div>
      )}
      <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <span>Total HT</span><span>{q.totalHT.toLocaleString('fr-FR')} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#86868b' }}>
          <span>Total TTC</span><span>{q.totalTTC.toLocaleString('fr-FR')} €</span>
        </div>
      </div>
      {q.hasPdf && (
        <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: '980px', backgroundColor: '#e2fbe8', color: '#1db954', textDecoration: 'none', fontWeight: 700, fontSize: 12, alignSelf: 'flex-start' }}>
          <FileText style={{ width: 13, height: 13 }} /> Télécharger le PDF
        </a>
      )}
    </div>
  );

  // ── Devis section — full workflow (approve/refuse, drafts, etc.) ───────────
  const DevisSection = ({ docs }: { docs: Quote[] }) => {
    const drafts    = docs.filter(q => q.status === 'draft');
    const active    = docs.filter(q => ['pending', 'modified_by_admin', 'pdf_pending'].includes(q.status));
    const validated = docs.filter(q => q.status === 'validated');
    const cancelled = docs.filter(q => q.status === 'cancelled');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {active.map(q => {
          const isModified = q.status === 'modified_by_admin';
          const isRefusing = refusingQuoteId === q.id;
          const isV1Open = expandedV1Id === q.id;
          const isDetailOpen = openDetailId === q.id;
          const previousVersion: QuoteSnapshot | null = q.previousVersion
            ? (() => { try { return JSON.parse(q.previousVersion!); } catch { return null; } })()
            : null;

          return (
            <div key={q.id} style={{ border: `1px solid ${isModified ? 'rgba(245,158,11,.35)' : 'rgba(0,0,0,.06)'}`, borderRadius: 14, overflow: 'hidden', backgroundColor: isModified ? '#fffbeb' : '#fff' }}>
              {isModified && (
                <div style={{ backgroundColor: '#fef3c7', borderBottom: '1px solid rgba(245,158,11,.2)', padding: '11px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle style={{ width: 15, height: 15, color: '#d97706', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e', flex: 1 }}>L'administrateur a modifié ce devis — votre validation est requise.</span>
                  {!isRefusing && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleApprove(q.id)} disabled={quoteActionLoading === q.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: '980px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, ...s }}>
                        {quoteActionLoading === q.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 12, height: 12 }} />} Accepter
                      </button>
                      <button onClick={() => { setRefusingQuoteId(q.id); setRefusalNote(''); }} disabled={quoteActionLoading === q.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 12, ...s }}>
                        <X style={{ width: 12, height: 12 }} /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isRefusing && (
                <div style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid rgba(239,68,68,.15)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>Motif du refus (facultatif) :</span>
                  <textarea rows={2} value={refusalNote} onChange={e => setRefusalNote(e.target.value)} placeholder="Ex : les dates ne correspondent plus..."
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,.3)', outline: 'none', fontSize: 12, ...s, resize: 'vertical', backgroundColor: '#fff' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleRefuse(q.id, refusalNote)} disabled={quoteActionLoading === q.id}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 16px', borderRadius: '980px', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, ...s }}>
                      {quoteActionLoading === q.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : 'Confirmer le refus'}
                    </button>
                    <button onClick={() => setRefusingQuoteId(null)}
                      style={{ padding: '6px 14px', borderRadius: '980px', backgroundColor: 'transparent', color: '#6e6e73', border: '1px solid rgba(0,0,0,.12)', cursor: 'pointer', fontWeight: 600, fontSize: 12, ...s }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>{q.id}</div>
                    <div style={{ fontSize: 11, color: '#86868b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar style={{ width: 11, height: 11 }} /> {fmtShort(q.startDate)} — {fmtShort(q.endDate)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{q.totalHT.toLocaleString('fr-FR')} € HT</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '980px',
                      backgroundColor: q.status === 'pending' ? '#e8f1fd' : q.status === 'modified_by_admin' ? '#fef3c7' : '#f0fdf4',
                      color: q.status === 'pending' ? '#0071e3' : q.status === 'modified_by_admin' ? '#92400e' : '#15803d' }}>
                      {q.status === 'pending' ? "En cours d'étude" : q.status === 'modified_by_admin' ? 'Modifié' : 'PDF en préparation'}
                    </span>
                    <button onClick={() => setOpenDetailId(isDetailOpen ? null : q.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#86868b' }}>
                      {isDetailOpen ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                    </button>
                  </div>
                </div>
                {isDetailOpen && <DetailPanel q={q} />}
                {isModified && previousVersion && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => setExpandedV1Id(isV1Open ? null : q.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0, ...s }}>
                      {isV1Open ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                      {isV1Open ? 'Masquer' : 'Voir'} la version originale (V1)
                    </button>
                    {isV1Open && (
                      <div style={{ marginTop: 8, border: '1px dashed rgba(0,0,0,.12)', borderRadius: 10, padding: 10, fontSize: 12, backgroundColor: '#fafafa' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#86868b', letterSpacing: '.05em', marginBottom: 8 }}>VERSION ORIGINALE (V1)</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#86868b', marginBottom: 6 }}>
                          <span>{fmtShort(previousVersion.startDate)} — {fmtShort(previousVersion.endDate)}</span>
                          <span style={{ fontWeight: 700 }}>{previousVersion.totalHT.toLocaleString('fr-FR')} € HT</span>
                        </div>
                        {previousVersion.items.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#6e6e73' }}>
                            <span>{it.name} (×{it.quantity})</span>
                            <span>{it.priceType === 'on_request' ? 'Sur devis' : `${it.price} €`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {q.clientRefusalNote && q.status === 'pending' && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#6e6e73', fontStyle: 'italic', borderLeft: '2px solid #d97706', paddingLeft: 8 }}>
                    Votre note : "{q.clientRefusalNote}"
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {drafts.map(dq => {
          const isOpen = openDetailId === dq.id;
          return (
            <div key={dq.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>{dq.id}</div>
                  <div style={{ fontSize: 11, color: '#86868b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar style={{ width: 11, height: 11 }} /> {fmtShort(dq.startDate)} — {fmtShort(dq.endDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{dq.totalHT.toLocaleString('fr-FR')} € HT</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#e8e8ed', color: '#6e6e73' }}>Brouillon</span>
                  <button onClick={() => setOpenDetailId(isOpen ? null : dq.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#86868b' }}>
                    {isOpen ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>
              {isOpen && <DetailPanel q={dq} />}
              <div style={{ borderTop: '1px solid rgba(0,0,0,.04)', padding: '10px 16px', display: 'flex', gap: 8 }}>
                <button onClick={() => handleSendDraft(dq.id)} disabled={quoteActionLoading !== null}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, ...s }}>
                  {quoteActionLoading === dq.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: 12, height: 12 }} />} Envoyer la demande
                </button>
                <button onClick={() => handleDeleteDraft(dq.id)} disabled={quoteActionLoading !== null}
                  style={{ padding: '8px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          );
        })}

        {validated.map(vq => {
          const isOpen = openDetailId === vq.id;
          const hasDeposit = !!vq.depositAmount && vq.depositAmount > 0;
          return (
            <div key={vq.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>{vq.id}</div>
                  <div style={{ fontSize: 11, color: '#86868b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar style={{ width: 11, height: 11 }} /> {fmtShort(vq.startDate)} — {fmtShort(vq.endDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{vq.totalHT.toLocaleString('fr-FR')} € HT</span>
                  {hasDeposit && vq.depositStatus === 'PENDING' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#fff3cd', color: '#d97706' }}>Caution requise</span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#e2fbe8', color: '#1db954' }}>Validé</span>
                  <button onClick={() => setOpenDetailId(isOpen ? null : vq.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#86868b' }}>
                    {isOpen ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>
              {isOpen && <DetailPanel q={vq} />}
              {/* Deposit widget — shown for devis with a deposit amount set */}
              {hasDeposit && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', padding: '18px 16px', backgroundColor: vq.depositStatus === 'PENDING' ? '#fffbeb' : '#fafafa' }}>
                  <DepositWidget
                    quoteId={vq.id}
                    depositAmount={vq.depositAmount!}
                    depositStatus={vq.depositStatus ?? 'PENDING'}
                    onStatusChange={fetchQuotes}
                  />
                </div>
              )}
            </div>
          );
        })}

        {cancelled.map(cq => {
          const isOpen = openDetailId === cq.id;
          const hadDeposit = !!cq.depositAmount && cq.depositAmount > 0;
          return (
            <div key={cq.id} style={{ border: '1px solid rgba(239,68,68,.15)', borderRadius: 14, overflow: 'hidden', backgroundColor: '#fef2f2' }}>
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>{cq.id}</div>
                  <div style={{ fontSize: 11, color: '#86868b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar style={{ width: 11, height: 11 }} /> {fmtShort(cq.startDate)} — {fmtShort(cq.endDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#86868b' }}>{cq.totalHT.toLocaleString('fr-FR')} € HT</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}>Annulé</span>
                  <button onClick={() => setOpenDetailId(isOpen ? null : cq.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#86868b' }}>
                    {isOpen ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>

              {/* Cancellation notice — always visible */}
              <div style={{ borderTop: '1px solid rgba(239,68,68,.12)', padding: '14px 16px', backgroundColor: '#fff5f5', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Ban style={{ width: 15, height: 15, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600, lineHeight: 1.55 }}>
                    Cette location a été annulée.
                    {hadDeposit && (
                      <span style={{ fontWeight: 400, color: '#dc2626' }}>
                        {' '}L'acompte de {cq.depositAmount!.toLocaleString('fr-FR')} € a été annulé et libéré.
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Phone style={{ width: 14, height: 14, color: '#86868b', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12, color: '#6e6e73', lineHeight: 1.65 }}>
                    Pour toute question relative au paiement, merci de vous rapprocher directement du loueur.
                  </p>
                </div>
                {cq.cancellationReason && (
                  <div style={{ borderLeft: '2px solid rgba(239,68,68,.3)', paddingLeft: 10, fontSize: 11, color: '#86868b', fontStyle: 'italic' }}>
                    Motif : "{cq.cancellationReason}"
                  </div>
                )}
              </div>

              {isOpen && <DetailPanel q={cq} />}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Simple section for factures / avoirs / contrats ───────────────────────
  const SimpleDocSection = ({ docs }: { docs: Quote[] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {docs.map(doc => {
        const isOpen = openDetailId === doc.id;
        const statusBg    = doc.status === 'validated' ? '#e2fbe8' : doc.status === 'cancelled' ? '#fef2f2' : '#fef3c7';
        const statusColor = doc.status === 'validated' ? '#1db954' : doc.status === 'cancelled' ? '#ef4444' : '#b45309';
        const statusLabel = doc.status === 'validated' ? 'Validé' : doc.status === 'cancelled' ? 'Annulé' : doc.status === 'pdf_pending' ? 'En préparation' : "En cours";

        return (
          <div key={doc.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>{doc.id}</div>
                <div style={{ fontSize: 11, color: '#86868b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar style={{ width: 11, height: 11 }} /> {fmtShort(doc.startDate)} — {fmtShort(doc.endDate)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{doc.totalHT.toLocaleString('fr-FR')} € HT</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: statusBg, color: statusColor }}>{statusLabel}</span>
                <button onClick={() => setOpenDetailId(isOpen ? null : doc.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#86868b' }}>
                  {isOpen ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>
            {isOpen && <DetailPanel q={doc} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header subTitle="Mon Projet" links={profileLinks} />

      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '40px clamp(20px, 4vw, 40px)', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Back */}
        <Link href="/profil" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: '#86868b', fontSize: 14, fontWeight: 600, alignSelf: 'flex-start' }}>
          <ChevronLeft style={{ width: 16, height: 16 }} /> Retour à mes projets
        </Link>

        {/* Project header */}
        <div style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 24, padding: '28px 32px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PackageCheck style={{ width: 26, height: 26, color: '#fff' }} />
            </div>
            <div>
              {isRenaming ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false); }}
                    placeholder={project.name}
                    style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em', border: '1.5px solid #0071e3', borderRadius: 10, padding: '4px 10px', outline: 'none', fontFamily: 'var(--font-hanken-grotesk), sans-serif', width: '100%', maxWidth: 240, minWidth: 120, color: '#1d1d1f' }}
                  />
                  <button onClick={handleRename} disabled={renameLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
                    {renameLoading ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 12, height: 12 }} />}
                  </button>
                  <button onClick={() => setIsRenaming(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 8px', borderRadius: '980px', backgroundColor: 'transparent', color: '#86868b', border: '1px solid rgba(0,0,0,.12)', cursor: 'pointer' }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>{project.name}</h1>
                  <button
                    onClick={() => { setRenameValue(project.name); setIsRenaming(true); }}
                    title="Renommer le projet"
                    style={{ display: 'inline-flex', alignItems: 'center', padding: 5, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: '#86868b', cursor: 'pointer' }}
                  >
                    <Pencil style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
              <div style={{ fontSize: 13, color: '#86868b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar style={{ width: 13, height: 13 }} />
                Du {fmtLong(project.rentalStart)} au {fmtLong(project.rentalEnd)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {modifiedCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '980px' }}>
                {modifiedCount} action{modifiedCount > 1 ? 's' : ''} requise{modifiedCount > 1 ? 's' : ''}
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: '980px', backgroundColor: pColors.bg, color: pColors.color }}>
              {projectStatusLabel(pStatus)}
            </span>
          </div>
        </div>

        {/* One section per doc type, in order, only if documents exist */}
        {DOC_TYPE_ORDER.map(dt => {
          const docs = byDocType[dt];
          if (!docs || docs.length === 0) return null;
          const meta = DOC_TYPE_META[dt];

          return (
            <section key={dt} style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 24, padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>{meta.labelPlural}</h2>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: '980px', backgroundColor: '#e8e8ed', color: '#6e6e73' }}>{docs.length}</span>
              </div>
              {dt === 'devis' ? <DevisSection docs={docs} /> : (
                <>
                  {dt === 'facture' && docs.some(q => q.status === 'validated') && (
                    <div style={{ marginBottom: 16 }}>
                      {docs.filter(q => q.status === 'validated').map(q => (
                        <div key={`pay-${q.id}`} style={{ marginBottom: 12 }}>
                          <PaymentRouter
                            totalAmount={q.totalTTC}
                            quoteId={q.id}
                            iban={paymentSettings?.iban ?? ''}
                            bic={paymentSettings?.bic ?? ''}
                            paymentInstructions={paymentSettings?.instructions}
                            initialPaymentStatus={q.invoicePaymentStatus}
                            onSuccess={fetchQuotes}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <SimpleDocSection docs={docs} />
                </>
              )}
            </section>
          );
        })}

      </main>
      <Footer />
    </div>
  );
}
