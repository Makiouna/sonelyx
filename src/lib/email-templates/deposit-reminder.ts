interface DepositReminderParams {
  clientName: string;
  depositAmount: number;
  eventDate: string;
  depositLink: string;
  quoteId: string;
}

export function buildDepositReminderEmail(params: DepositReminderParams): { html: string; subject: string } {
  const { clientName, depositAmount, eventDate, depositLink, quoteId } = params;

  const formattedDate = new Date(eventDate).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedAmount = depositAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const subject = `Action requise : votre caution de ${formattedAmount} — événement dans 3 jours`;

  const html = `<!DOCTYPE html>
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

                <!-- Icon -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="display:inline-block;width:52px;height:52px;background-color:#e8f1fd;border-radius:14px;text-align:center;line-height:52px;font-size:26px;">
                      🔐
                    </div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td style="padding-bottom:10px;">
                    <h1 style="margin:0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
                      Déposez votre<br/>empreinte bancaire
                    </h1>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <p style="margin:0;font-size:16px;color:#6e6e73;line-height:1.6;">
                      Bonjour <strong style="color:#1d1d1f;">${clientName}</strong>,<br/>
                      votre événement approche — il démarre le <strong style="color:#1d1d1f;">${formattedDate}</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Info box -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;">
                      <tr>
                        <td>
                          <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#86868b;text-transform:uppercase;letter-spacing:0.06em;">Montant de la caution</p>
                          <p style="margin:0;font-size:32px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;">${formattedAmount}</p>
                          <p style="margin:8px 0 0 0;font-size:13px;color:#86868b;">Devis <span style="font-family:monospace;font-weight:700;color:#6e6e73;">#${quoteId}</span></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Explanation -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <p style="margin:0 0 12px 0;font-size:15px;color:#1d1d1f;line-height:1.6;">
                      Pour sécuriser votre location, nous vous demandons de déposer une <strong>empreinte bancaire</strong> (pré-autorisation). Vos fonds sont simplement <em>bloqués</em>, jamais débités — sauf en cas de dommage constaté.
                    </p>
                    <p style="margin:0;font-size:14px;color:#86868b;line-height:1.6;">
                      Cette autorisation expire au bout de 7 jours, c'est pourquoi nous vous contactons 3 jours avant votre événement.
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <a href="${depositLink}" style="display:inline-block;background-color:#0071e3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:980px;letter-spacing:-0.01em;">
                      Déposer mon empreinte bancaire →
                    </a>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="border-top:1px solid rgba(0,0,0,0.06);padding-top:24px;padding-bottom:8px;">
                    <p style="margin:0;font-size:13px;color:#86868b;line-height:1.6;">
                      Le lien ci-dessus vous redirige vers votre espace client sécurisé sur <strong>sonelyx.fr</strong>. Vos données de carte sont traitées exclusivement par <strong>Stripe</strong> — nous n'y avons jamais accès.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#86868b;line-height:1.7;">
                © ${new Date().getFullYear()} Sonelyx — Location de matériel sono &amp; lumière<br/>
                Orléans, France
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  return { html, subject };
}
