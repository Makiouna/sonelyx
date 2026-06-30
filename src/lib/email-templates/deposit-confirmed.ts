interface DepositConfirmedParams {
  clientName: string;
  depositAmount: number;
  quoteId: string;
}

export function buildDepositConfirmedEmail(params: DepositConfirmedParams): { html: string; subject: string } {
  const { clientName, depositAmount, quoteId } = params;

  const formattedAmount = depositAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const subject = `Caution de ${formattedAmount} bien enregistrée`;

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
                  <td style="height:4px;background:linear-gradient(90deg,#15803d 0%,#34c759 100%);"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 44px;">

                <!-- Icon -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="display:inline-block;width:52px;height:52px;background-color:#e2fbe8;border-radius:14px;text-align:center;line-height:52px;font-size:26px;">
                      ✅
                    </div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td style="padding-bottom:10px;">
                    <h1 style="margin:0;font-size:26px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;line-height:1.2;">
                      Caution bien<br/>enregistrée
                    </h1>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <p style="margin:0;font-size:16px;color:#6e6e73;line-height:1.6;">
                      Bonjour <strong style="color:#1d1d1f;">${clientName}</strong>,<br/>
                      votre empreinte bancaire a bien été enregistrée auprès de Stripe.
                    </p>
                  </td>
                </tr>

                <!-- Info box -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;border-radius:16px;padding:20px 24px;">
                      <tr>
                        <td>
                          <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#86868b;text-transform:uppercase;letter-spacing:0.06em;">Montant bloqué</p>
                          <p style="margin:0;font-size:32px;font-weight:800;color:#1d1d1f;letter-spacing:-0.03em;">${formattedAmount}</p>
                          <p style="margin:8px 0 0 0;font-size:13px;color:#86868b;">Devis <span style="font-family:monospace;font-weight:700;color:#6e6e73;">#${quoteId}</span></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Explanation -->
                <tr>
                  <td style="padding-bottom:8px;">
                    <p style="margin:0;font-size:15px;color:#1d1d1f;line-height:1.6;">
                      Ce montant est simplement <strong>bloqué</strong> sur votre carte, jamais débité — sauf en cas de dommage constaté sur le matériel loué. Il sera automatiquement libéré après votre événement si tout est en ordre.
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
