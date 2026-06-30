import { resend } from './resend';

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
