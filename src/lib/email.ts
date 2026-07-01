import { resend } from './resend';

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  id_card_recto: "Carte d'identité (Recto)",
  id_card_verso: "Carte d'identité (Verso)",
  proof_of_address: 'Justificatif de domicile',
  insurance_certificate: "Attestation d'assurance",
  other: 'Autre document',
};

interface EmailResult {
  success: boolean;
  error?: string;
}

// Reusable email wrapper to maintain branding
function buildEmailHtml(subject: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <!-- Logo / Header -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;text-decoration:none;">Sonelyx</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <!-- Accent top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#0071e3 0%,#34aadc 100%);"></td>
                </tr>
              </table>
              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 44px;">
                <tr>
                  <td>
                    ${innerHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#86868b;line-height:1.7;">
                © ${new Date().getFullYear()} Sonelyx — Prestation technique &amp; location événementielle<br/>
                Orléans, France · contact@sonelyx.fr
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Variable replacement helper
function replaceVariables(
  text: string,
  vars: { client_name: string; project_name: string; date: string; time: string }
): string {
  return text
    .replace(/{client_name}/g, vars.client_name)
    .replace(/{project_name}/g, vars.project_name)
    .replace(/{date}/g, vars.date)
    .replace(/{time}/g, vars.time);
}

// Formats amount to EUR
function formatAmount(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

// Formats date to readable French format
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Email 1 : Inscription Réussie (Bienvenue)
export async function sendWelcomeEmail(email: string, clientName: string): Promise<EmailResult> {
  const subject = 'Bienvenue chez Sonelyx — Votre compte est prêt';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonelyx.fr';
  
  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8f1fd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      👋
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Ravi de vous compter<br/>parmi nous !
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Votre compte a bien été créé sur Sonelyx. Vous pouvez désormais composer votre sélection de matériel son, lumière, structure et énergie directement depuis notre catalogue en ligne, puis effectuer vos demandes de devis en quelques clics.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:32px;">
      <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:0.04em;">Vos avantages client :</h3>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#515154;line-height:1.6;display:flex;flex-direction:column;gap:8px;">
        <li>Accès complet à notre catalogue de matériel professionnel premium.</li>
        <li>Demandes de devis gratuites en ligne avec étude technique sous 24/48h.</li>
        <li>Suivi en temps réel de vos réservations et contrats.</li>
        <li>Paiements et dépôts de cautions simplifiés via Stripe.</li>
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${appUrl}/location/catalogue" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
        Découvrir le catalogue →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"/>
    <p style="margin:0;font-size:13px;color:#86868b;line-height:1.6;">
      Besoin d'un renseignement ou d'une étude technique sur-mesure pour un événement ? Répondez simplement à cet email ou contactez notre régie technique à contact@sonelyx.fr.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email : Réinitialisation de mot de passe
export async function sendPasswordResetEmail(
  email: string,
  clientName: string,
  resetUrl: string
): Promise<EmailResult> {
  const subject = 'Sonelyx — Réinitialisation de votre mot de passe';

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8f1fd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      🔒
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Réinitialisation<br/>de mot de passe
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Vous avez demandé la réinitialisation du mot de passe de votre compte Sonelyx. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
        Réinitialiser mon mot de passe →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"/>
    <p style="margin:0;font-size:13px;color:#86868b;line-height:1.6;">
      Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité — votre mot de passe restera inchangé.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email 2 : Panier Abandonné (Relance Panier Mort)
export async function sendAbandonedCartEmail(
  email: string,
  clientName: string,
  quoteId: string,
  items: Array<{ name: string; quantity: number }>
): Promise<EmailResult> {
  const subject = 'Votre sélection de matériel vous attend chez Sonelyx';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonelyx.fr';
  const cartLink = `${appUrl}/location/panier`;

  const itemsListHtml = items
    .map(
      item => `<li style="margin-bottom:6px;"><strong>${item.quantity}x</strong> ${item.name}</li>`
    )
    .join('');

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#fff3cd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      🛒
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Vous avez oublié<br/>quelque chose ?
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Nous avons remarqué que vous avez initié une sélection de matériel événementiel sur notre site, mais que vous n'avez pas finalisé votre demande de devis.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:32px;">
      <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;color:#86868b;text-transform:uppercase;letter-spacing:0.06em;">Votre sélection :</p>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#1d1d1f;line-height:1.6;">
        ${itemsListHtml}
      </ul>
    </div>
    <p style="margin:0 0 24px 0;font-size:15px;color:#1d1d1f;line-height:1.6;">
      Les stocks pour ces équipements professionnels sont limités. Finalisez votre demande de devis dès aujourd'hui pour bloquer le matériel pour vos dates d'événement.
    </p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${cartLink}" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
        Finaliser mon devis en un clic →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"/>
    <p style="margin:0;font-size:13px;color:#86868b;line-height:1.6;">
      Notre équipe se tient à votre entière disposition pour ajuster votre projet ou vous conseiller sur la configuration idéale.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send abandoned cart email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email 3 : Confirmation de Demande de Devis
export async function sendQuoteConfirmationEmail(
  email: string,
  clientName: string,
  quoteId: string,
  projectName: string,
  totalTTC: number,
  startDate: string,
  endDate: string
): Promise<EmailResult> {
  const subject = `Confirmation de demande de devis #${quoteId}`;
  
  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8fdf0;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      📄
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Demande bien reçue !
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Nous vous confirmons la bonne réception de votre demande de devis pour votre projet <strong style="color:#1d1d1f;">${projectName}</strong>.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;color:#1d1d1f;">
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Numéro de demande :</td>
          <td style="padding-bottom:8px;font-family:monospace;font-weight:700;text-align:right;">#${quoteId}</td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Début de location :</td>
          <td style="padding-bottom:8px;font-weight:600;text-align:right;">${formatDate(startDate)}</td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Fin de location :</td>
          <td style="padding-bottom:8px;font-weight:600;text-align:right;">${formatDate(endDate)}</td>
        </tr>
        <tr style="border-top:1px solid rgba(0,0,0,0.06);">
          <td style="padding-top:8px;font-weight:700;">Estimation totale :</td>
          <td style="padding-top:8px;font-weight:800;color:#0071e3;font-size:16px;text-align:right;">${formatAmount(totalTTC)} <span style="font-size:12px;color:#86868b;font-weight:400;">TTC</span></td>
        </tr>
      </table>
    </div>
    <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1d1d1f;">Quelle est la suite ?</h3>
    <p style="margin:0 0 24px 0;font-size:15px;color:#6e6e73;line-height:1.6;">
      Notre équipe technique étudie la disponibilité des équipements demandés ainsi que la faisabilité logistique pour vos dates. Vous recevrez une validation définitive (ou une proposition ajustée avec contrat et dépôt de caution en ligne) sous <strong>24 à 48 heures ouvrées</strong>.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send quote confirmation email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email 4 : Devis Modifié / Validé par l'Admin
export async function sendQuoteStatusUpdatedEmail(
  email: string,
  clientName: string,
  quoteId: string,
  projectName: string,
  status: string,
  totalTTC: number,
  pdfUrl?: string | null
): Promise<EmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonelyx.fr';
  const quoteLink = `${appUrl}/profil`;
  
  const isValidated = status === 'validated' || status === 'pdf_pending';
  const actionText = isValidated ? 'validé par notre régie' : 'mis à jour par notre régie';
  const subject = isValidated 
    ? `Votre devis #${quoteId} pour ${projectName} est disponible !`
    : `Mise à jour de votre demande de devis #${quoteId}`;

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8f1fd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      ✨
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Votre devis est prêt !
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Bonne nouvelle, votre dossier pour le projet <strong>${projectName}</strong> a été <strong>${actionText}</strong>.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;color:#1d1d1f;">
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Numéro de devis :</td>
          <td style="padding-bottom:8px;font-family:monospace;font-weight:700;text-align:right;">#${quoteId}</td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Montant total :</td>
          <td style="padding-bottom:8px;font-weight:800;color:#1d1d1f;text-align:right;">${formatAmount(totalTTC)} TTC</td>
        </tr>
        <tr>
          <td style="color:#6e6e73;">Statut de validation :</td>
          <td style="font-weight:700;color:#34c759;text-align:right;">Prêt pour signature</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 24px 0;font-size:15px;color:#1d1d1f;line-height:1.6;">
      Vous pouvez dès à présent consulter la proposition mise à jour dans votre espace client, valider ou modifier vos options, signer le contrat de location et déposer votre caution (empreinte de garantie bancaire Stripe) pour bloquer définitivement le matériel.
    </p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${quoteLink}" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
        Consulter mon devis →
      </a>
    </div>
    ${pdfUrl ? `
    <p style="text-align:center;margin:0 0 24px 0;">
      <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" style="color:#6e6e73;text-decoration:underline;font-size:14px;">Télécharger le document PDF</a>
    </p>` : ''}
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"/>
    <p style="margin:0;font-size:13px;color:#86868b;line-height:1.6;">
      Si vous souhaitez apporter de nouvelles modifications ou avez des questions techniques, contactez notre support à contact@sonelyx.fr ou refusez simplement les modifications depuis votre espace client pour repasser le devis en cours d'édition.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send quote updated email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email 5 : Rappel Avant Retrait du Matériel (J-1)
export async function sendPickupReminderEmail(
  email: string,
  clientName: string,
  projectName: string,
  date: string,
  time: string,
  rawTemplateText: string
): Promise<EmailResult> {
  const subject = `Rappel : retrait de votre matériel demain — ${projectName}`;
  
  // Format variables
  const formattedDate = formatDate(date);
  
  // Apply variable replacement
  const emailBodyText = replaceVariables(rawTemplateText, {
    client_name: clientName,
    project_name: projectName,
    date: formattedDate,
    time: time,
  });

  // Convert line breaks to HTML tags
  const bodyHtml = emailBodyText.replace(/\n/g, '<br/>');

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8f1fd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      📦
    </div>
    <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Votre retrait de matériel
    </h1>
    <div style="font-size:15px;color:#1d1d1f;line-height:1.6;margin-bottom:28px;">
      ${bodyHtml}
    </div>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:24px;">
      <h4 style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#86868b;text-transform:uppercase;letter-spacing:0.06em;">Informations de retrait</h4>
      <p style="margin:0 0 8px 0;font-size:14px;color:#1d1d1f;line-height:1.5;">
        <strong>Date :</strong> Demain (${formattedDate})<br/>
        <strong>Horaire recommandé :</strong> à partir de ${time}<br/>
        <strong>Adresse entrepôt :</strong> 45000 Orléans, France
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send pickup reminder email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email inspections — Demande de signature client
export async function sendInspectionSignatureRequestEmail(
  email: string,
  clientName: string,
  projectName: string,
  inspectionId: string,
  type: 'DEPART' | 'RETOUR'
): Promise<EmailResult> {
  const subject = `État des lieux ${type === 'DEPART' ? 'Départ' : 'Retour'} à signer — ${projectName}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sonelyx.fr';
  const signLink = `${appUrl}/espace-client/signature/${inspectionId}`;
  const typeLabel = type === 'DEPART' ? 'de départ' : 'de retour';
  const typeEmoji = type === 'DEPART' ? '📦' : '🚛';

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8f1fd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      ${typeEmoji}
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      État des lieux ${typeLabel}<br/>à signer
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Notre équipe a effectué l'état des lieux <strong>${typeLabel}</strong> du matériel pour votre projet <strong style="color:#1d1d1f;">${projectName}</strong> et a joint les photos de vérification.<br/><br/>
      Merci de consulter les photos et d'apposer votre signature électronique pour valider cet état des lieux. Ce document sera conservé comme preuve pour votre dossier.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;color:#1d1d1f;">
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Projet :</td>
          <td style="padding-bottom:8px;font-weight:700;text-align:right;">${projectName}</td>
        </tr>
        <tr>
          <td style="color:#6e6e73;">Type d'état des lieux :</td>
          <td style="font-weight:700;text-align:right;color:#0071e3;">${type === 'DEPART' ? 'Départ (Check-out)' : 'Retour (Check-in)'}</td>
        </tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${signLink}" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
        Consulter et signer l'état des lieux →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"/>
    <p style="margin:0;font-size:12px;color:#86868b;line-height:1.7;">
      Ce document électronique a valeur de preuve. En cas de question, contactez notre équipe à contact@sonelyx.fr.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send inspection signature request email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email inspections — Accusé de réception client (état des lieux signé)
export async function sendInspectionCompletedClientEmail(
  email: string,
  clientName: string,
  projectName: string,
  type: 'DEPART' | 'RETOUR',
  signedAt: Date
): Promise<EmailResult> {
  const subject = `Confirmation de signature — État des lieux ${type === 'DEPART' ? 'Départ' : 'Retour'} — ${projectName}`;
  const signedAtStr = signedAt.toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8fdf0;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      ✅
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Signature enregistrée !
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Nous confirmons la bonne réception de votre signature électronique pour l'état des lieux <strong>${type === 'DEPART' ? 'de départ' : 'de retour'}</strong> du projet <strong style="color:#1d1d1f;">${projectName}</strong>.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;color:#1d1d1f;">
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Projet :</td>
          <td style="padding-bottom:8px;font-weight:700;text-align:right;">${projectName}</td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Type :</td>
          <td style="padding-bottom:8px;font-weight:700;text-align:right;">${type === 'DEPART' ? 'Départ (Check-out)' : 'Retour (Check-in)'}</td>
        </tr>
        <tr style="border-top:1px solid rgba(0,0,0,0.06);">
          <td style="padding-top:8px;color:#6e6e73;">Horodatage :</td>
          <td style="padding-top:8px;font-weight:700;color:#15803d;text-align:right;">${signedAtStr}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 24px 0;font-size:14px;color:#6e6e73;line-height:1.6;">
      Cet état des lieux doublement signé (par notre équipe et par vous-même) est conservé dans votre dossier et peut servir de document de référence en cas de litige.
    </p>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"/>
    <p style="margin:0;font-size:12px;color:#86868b;line-height:1.7;">
      Conservez cet email comme preuve. Pour toute question : contact@sonelyx.fr.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send inspection completed client email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email inspections — Notification admin (état des lieux signé par le client)
export async function sendInspectionCompletedAdminEmail(
  clientName: string,
  projectName: string,
  type: 'DEPART' | 'RETOUR',
  signedAt: Date
): Promise<EmailResult> {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? 'admin@sonelyx.fr';
  const subject = `[Admin] État des lieux signé — ${clientName} — ${projectName}`;
  const signedAtStr = signedAt.toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#f3e8ff;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      🖊️
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      État des lieux signé<br/>par le client
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Le client <strong>${clientName}</strong> a signé l'état des lieux <strong>${type === 'DEPART' ? 'de départ' : 'de retour'}</strong> pour le projet <strong style="color:#1d1d1f;">${projectName}</strong>.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;color:#1d1d1f;">
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Client :</td>
          <td style="padding-bottom:8px;font-weight:700;text-align:right;">${clientName}</td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Projet :</td>
          <td style="padding-bottom:8px;font-weight:700;text-align:right;">${projectName}</td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;color:#6e6e73;">Type :</td>
          <td style="padding-bottom:8px;font-weight:700;text-align:right;color:#7c3aed;">${type === 'DEPART' ? 'Départ (Check-out)' : 'Retour (Check-in)'}</td>
        </tr>
        <tr style="border-top:1px solid rgba(0,0,0,0.06);">
          <td style="padding-top:8px;color:#6e6e73;">Signé le :</td>
          <td style="padding-top:8px;font-weight:700;color:#15803d;text-align:right;">${signedAtStr}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0;font-size:13px;color:#86868b;line-height:1.6;">
      Le dossier est disponible dans le tableau de bord administrateur.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: adminEmail,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send inspection completed admin email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email 6 : Rappel Avant Retour (Jour J ou J-1)
export async function sendReturnReminderEmail(
  email: string,
  clientName: string,
  projectName: string,
  date: string,
  time: string,
  rawTemplateText: string
): Promise<EmailResult> {
  const subject = `Rappel : retour de votre matériel de location — ${projectName}`;
  
  // Format variables
  const formattedDate = formatDate(date);
  
  // Apply variable replacement
  const emailBodyText = replaceVariables(rawTemplateText, {
    client_name: clientName,
    project_name: projectName,
    date: formattedDate,
    time: time,
  });

  // Convert line breaks to HTML tags
  const bodyHtml = emailBodyText.replace(/\n/g, '<br/>');

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#fff2f2;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      🚛
    </div>
    <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Retour de matériel
    </h1>
    <div style="font-size:15px;color:#1d1d1f;line-height:1.6;margin-bottom:28px;">
      ${bodyHtml}
    </div>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:24px;">
      <h4 style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#86868b;text-transform:uppercase;letter-spacing:0.06em;">Informations de retour</h4>
      <p style="margin:0 0 8px 0;font-size:14px;color:#1d1d1f;line-height:1.5;">
        <strong>Date limite :</strong> ${formattedDate}<br/>
        <strong>Horaire convenu :</strong> avant ${time}<br/>
        <strong>Adresse entrepôt :</strong> 45000 Orléans, France
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send return reminder email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email : Confirmation de paiement de facture
export async function sendInvoicePaymentConfirmationEmail(
  email: string,
  clientName: string,
  projectName: string,
  startDate: string,
  totalTTC: number,
  paymentMethod: 'card' | 'cash',
): Promise<EmailResult> {
  const subject = `Paiement confirmé — ${projectName}`;
  const formattedStart = formatDate(startDate);
  const formattedTotal = formatAmount(totalTTC);
  const methodLabel = paymentMethod === 'cash' ? 'Règlement en espèces' : 'Paiement par carte';

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e2fbe8;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      ✅
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Paiement reçu,<br/>vous êtes prêt !
    </h1>
    <p style="margin:0 0 28px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Votre paiement pour le projet <strong>${projectName}</strong> a bien été enregistré. Votre dossier est maintenant finalisé.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
      <h4 style="margin:0 0 12px 0;font-size:12px;font-weight:700;color:#86868b;text-transform:uppercase;letter-spacing:0.06em;">Récapitulatif</h4>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:13px;color:#86868b;padding:4px 0;">Projet</td>
          <td style="font-size:13px;color:#1d1d1f;font-weight:700;text-align:right;">${projectName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#86868b;padding:4px 0;">Montant réglé</td>
          <td style="font-size:13px;color:#1d1d1f;font-weight:700;text-align:right;">${formattedTotal} TTC</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#86868b;padding:4px 0;">Mode de règlement</td>
          <td style="font-size:13px;color:#1d1d1f;font-weight:700;text-align:right;">${methodLabel}</td>
        </tr>
      </table>
    </div>
    <div style="background-color:#e8f1fd;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
      <h4 style="margin:0 0 10px 0;font-size:12px;font-weight:700;color:#0071e3;text-transform:uppercase;letter-spacing:0.06em;">📦 Retrait du matériel</h4>
      <p style="margin:0;font-size:14px;color:#1d1d1f;line-height:1.7;">
        <strong>Date prévue :</strong> ${formattedStart}<br/>
        <strong>Adresse :</strong> 45000 Orléans, France<br/>
        <strong>À prévoir :</strong> pièce d'identité + contrat signé
      </p>
    </div>
    <div style="background-color:#fff9e6;border:1px solid rgba(217,119,6,.2);border-radius:16px;padding:16px 20px;margin-bottom:8px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.65;">
        🔔 <strong>J-1 avant votre retrait</strong>, vous recevrez automatiquement un email de rappel avec toutes les informations à préparer.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send invoice payment confirmation email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email : Demande de documents administratifs (vers le client)
export async function sendDocumentRequestEmail(
  email: string,
  clientName: string,
  requestedTypes: string[],
  uploadUrl: string,
  expiresAt: Date,
): Promise<EmailResult> {
  const subject = 'Sonelyx — Dépôt de documents requis pour votre dossier';
  const typeLabels: Record<string, string> = {
    id_card_recto: "Carte d'identité (Recto)",
    id_card_verso: "Carte d'identité (Verso)",
    proof_of_address: 'Justificatif de domicile',
    insurance_certificate: "Attestation d'assurance",
    other: 'Autre document',
  };
  const formattedExpiry = expiresAt.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const docList = requestedTypes
    .map(t => `<li style="margin-bottom:6px;">${typeLabels[t] ?? t}</li>`)
    .join('');

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e8f4fd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      📋
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Documents requis<br/>pour votre dossier
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Bonjour <strong>${clientName}</strong>,<br/><br/>
      Dans le cadre de votre dossier de location, nous avons besoin des pièces justificatives suivantes. Vous disposez d'un lien sécurisé pour les déposer directement en ligne.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
      <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:0.04em;">Documents à fournir :</h3>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#515154;line-height:1.6;">
        ${docList}
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${uploadUrl}" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
        Déposer mes documents →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"/>
    <p style="margin:0;font-size:13px;color:#86868b;line-height:1.6;">
      Ce lien est valable jusqu'au <strong>${formattedExpiry}</strong>. Au-delà, contactez-nous pour obtenir un nouveau lien.
    </p>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: email,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send document request email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Email : Notification admin — le client a déposé ses pièces
export async function sendDocumentsReceivedAdminEmail(
  adminEmail: string,
  clientName: string,
  clientEmail: string,
  uploadedTypes: string[],
  adminUrl: string,
): Promise<EmailResult> {
  const subject = `Sonelyx — Documents reçus de ${clientName}`;
  const typeLabels: Record<string, string> = {
    id_card_recto: "Carte d'identité (Recto)",
    id_card_verso: "Carte d'identité (Verso)",
    proof_of_address: 'Justificatif de domicile',
    insurance_certificate: "Attestation d'assurance",
    other: 'Autre document',
  };
  const docList = uploadedTypes
    .map(t => `<li style="margin-bottom:6px;">${typeLabels[t] ?? t}</li>`)
    .join('');

  const innerHtml = `
    <div style="display:inline-block;width:52px;height:52px;background-color:#e2fbe8;border-radius:14px;text-align:center;line-height:52px;font-size:26px;margin-bottom:24px;">
      ✅
    </div>
    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
      Pièces justificatives<br/>reçues
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6e6e73;line-height:1.6;">
      Le client <strong>${clientName}</strong> (${clientEmail}) vient de déposer ses documents administratifs sur Sonelyx.
    </p>
    <div style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
      <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:0.04em;">Documents reçus :</h3>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#515154;line-height:1.6;">
        ${docList}
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${adminUrl}" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
        Voir le dossier client →
      </a>
    </div>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Sonelyx <noreply@sonelyx.fr>',
      to: adminEmail,
      subject,
      html: buildEmailHtml(subject, innerHtml),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send documents received admin email:', error);
    return { success: false, error: error.message || String(error) };
  }
}
