'use client';

import { useState, useEffect, use, useRef } from 'react';
import { Loader2, CheckCircle, Upload, FileText, XCircle, AlertTriangle } from 'lucide-react';

const DOC_TYPE_LABELS: Record<string, string> = {
  id_card_recto: "Carte d'identité — Recto",
  id_card_verso: "Carte d'identité — Verso",
  proof_of_address: 'Justificatif de domicile',
  insurance_certificate: "Attestation d'assurance",
  other: 'Autre document',
};

const DOC_TYPE_ACCEPT: Record<string, string> = {
  id_card_recto: 'image/*',
  id_card_verso: 'image/*',
  proof_of_address: 'image/*,application/pdf',
  insurance_certificate: 'image/*,application/pdf',
  other: 'image/*,application/pdf',
};

interface RequestInfo {
  id: string;
  customerId: string;
  clientName: string;
  requestedTypes: string[];
  expiresAt: string;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

type PageState = 'loading' | 'invalid' | 'expired' | 'completed_already' | 'ready' | 'uploading' | 'success';

export default function DocumentUploadPage({ params }: PageProps) {
  const { token } = use(params);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`/api/documents/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          if (data.error === 'EXPIRED') setPageState('expired');
          else if (data.error === 'ALREADY_COMPLETED') setPageState('completed_already');
          else setPageState('invalid');
        } else {
          setRequestInfo(data.request);
          setPageState('ready');
        }
      })
      .catch(() => setPageState('invalid'));
  }, [token]);

  const handleFileChange = (docType: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [docType]: file }));
  };

  const handleSubmit = async () => {
    if (!requestInfo) return;
    const types = requestInfo.requestedTypes;
    const missing = types.filter(t => !files[t]);
    if (missing.length) {
      setUploadError(`Veuillez fournir tous les documents requis (${missing.map(t => DOC_TYPE_LABELS[t] ?? t).join(', ')}).`);
      return;
    }

    setUploadError(null);
    setPageState('uploading');

    const formData = new FormData();
    for (const t of types) {
      if (files[t]) formData.append(t, files[t]!);
    }

    const res = await fetch(`/api/documents/${token}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      setPageState('success');
    } else {
      setUploadError(data.error ?? 'Une erreur est survenue lors du dépôt.');
      setPageState('ready');
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#f5f5f7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
  };

  if (pageState === 'loading') {
    return (
      <div style={containerStyle}>
        <Loader2 style={{ width: 40, height: 40, color: '#0071e3', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <XCircle style={{ width: 52, height: 52, color: '#ef4444', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', margin: '0 0 12px' }}>Lien invalide</h1>
            <p style={{ fontSize: 15, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
              Ce lien de dépôt de documents n'est pas valide. Veuillez contacter Sonelyx pour obtenir un nouveau lien.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'expired') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <AlertTriangle style={{ width: 52, height: 52, color: '#d97706', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', margin: '0 0 12px' }}>Lien expiré</h1>
            <p style={{ fontSize: 15, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
              Ce lien de dépôt a expiré. Contactez Sonelyx à l'adresse <strong>contact@sonelyx.fr</strong> pour en obtenir un nouveau.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'completed_already') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <CheckCircle style={{ width: 52, height: 52, color: '#30d158', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', margin: '0 0 12px' }}>Documents déjà envoyés</h1>
            <p style={{ fontSize: 15, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
              Vos documents ont déjà été transmis à Sonelyx. Aucune action supplémentaire n'est requise.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <CheckCircle style={{ width: 64, height: 64, color: '#30d158', margin: '0 auto 24px' }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1d1d1f', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
              Documents déposés !
            </h1>
            <p style={{ fontSize: 16, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
              Vos pièces justificatives ont bien été reçues par Sonelyx. Notre équipe les examinera prochainement.<br/><br/>
              Merci pour votre confiance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', display: 'block', marginBottom: 20 }}>
            Sonelyx
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Dépôt de documents
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
            Bonjour <strong>{requestInfo?.clientName}</strong>, merci de déposer les documents requis ci-dessous pour finaliser votre dossier.
          </p>
        </div>

        {/* Document upload zones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          {requestInfo?.requestedTypes.map(docType => {
            const file = files[docType];
            return (
              <div key={docType} style={{ border: `2px dashed ${file ? '#30d158' : 'rgba(0,0,0,0.15)'}`, borderRadius: 16, padding: '20px', backgroundColor: file ? '#f0fdf4' : '#fafafa', transition: 'all 0.2s' }}>
                <input
                  type="file"
                  accept={DOC_TYPE_ACCEPT[docType] ?? 'image/*,application/pdf'}
                  id={`file-${docType}`}
                  ref={el => { fileRefs.current[docType] = el; }}
                  onChange={e => handleFileChange(docType, e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor={`file-${docType}`} style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: file ? '#dcfce7' : '#e8f1fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {file
                        ? <CheckCircle style={{ width: 22, height: 22, color: '#15803d' }} />
                        : <Upload style={{ width: 22, height: 22, color: '#0071e3' }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1d1d1f', marginBottom: 2 }}>
                        {DOC_TYPE_LABELS[docType] ?? docType}
                      </div>
                      {file ? (
                        <div style={{ fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText style={{ width: 11, height: 11 }} />
                          {file.name}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#86868b' }}>
                          Appuyez pour choisir un fichier (photo ou PDF)
                        </div>
                      )}
                    </div>
                    {file && (
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); handleFileChange(docType, null); if (fileRefs.current[docType]) fileRefs.current[docType]!.value = ''; }}
                        style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#86868b', flexShrink: 0 }}
                      >
                        <XCircle style={{ width: 18, height: 18 }} />
                      </button>
                    )}
                  </div>
                </label>
              </div>
            );
          })}
        </div>

        {uploadError && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>
            {uploadError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={pageState === 'uploading'}
          style={{
            width: '100%', padding: '16px', borderRadius: 980,
            backgroundColor: pageState === 'uploading' ? '#86868b' : '#0071e3',
            color: '#fff', border: 'none', cursor: pageState === 'uploading' ? 'default' : 'pointer',
            fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit', transition: 'background 0.2s',
          }}
        >
          {pageState === 'uploading'
            ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Envoi en cours…</>
            : <><Upload style={{ width: 18, height: 18 }} /> Envoyer mes documents</>
          }
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#86868b', marginTop: 20, lineHeight: 1.6, marginBottom: 0 }}>
          Vos documents sont transmis de façon sécurisée et utilisés uniquement dans le cadre de votre dossier Sonelyx.
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
