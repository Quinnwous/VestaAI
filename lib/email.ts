import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'VestaAI <noreply@vestaai.nl>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestaai.nl'

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VestaAI</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo / brand -->
          <tr>
            <td style="padding-bottom:24px;text-align:left;">
              <span style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.3px;">VestaAI</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                VestaAI · De AI-assistent voor makelaars<br/>
                <a href="${APP_URL}" style="color:#9ca3af;text-decoration:underline;">vestaai.nl</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:24px;">${label} →</a>`
}

export async function sendWelcomeEmail(email: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Welkom bij VestaAI — je proefperiode is gestart',
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Welkom, ${name}!</h2>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        Je 14-daagse proefperiode is actief. Maak nu je eerste object aan en zie wat je AI-assistent voor je schrijft.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
        Vul 8 velden in en ontvang direct:
      </p>
      <ul style="margin:12px 0 0;padding-left:20px;font-size:14px;line-height:1.8;color:#374151;">
        <li>Funda-tekst (600–800 woorden)</li>
        <li>Brochure kort + lang</li>
        <li>3 Instagram-varianten</li>
        <li>2 LinkedIn-posts</li>
        <li>Koper-e-mail + buurtomschrijving</li>
      </ul>
      ${btn(`${APP_URL}/object/new`, 'Maak je eerste object aan')}
      <p style="margin:28px 0 0;font-size:13px;color:#6b7280;">
        Vragen? Reageer gewoon op deze mail — ik help je graag.
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">— Quinn, VestaAI</p>
    `),
  })
}

export async function sendTrialWarningEmail(email: string, name: string, trialEndsAt: Date) {
  const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const dagLabel = daysLeft === 1 ? 'dag' : 'dagen'

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `VestaAI — je proefperiode verloopt over ${daysLeft} ${dagLabel}`,
    html: baseTemplate(`
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">
          ⏰ Nog ${daysLeft} ${dagLabel} proefperiode
        </p>
      </div>
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Hoi ${name},</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        Je proefperiode van VestaAI verloopt over <strong>${daysLeft} ${dagLabel}</strong>.
        Kies nu een abonnement om toegang te houden tot alle gegenereerde content en toekomstige objecten.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">Solo</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">30 objecten/maand · 1 gebruiker</p>
            <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">€79<span style="font-size:13px;font-weight:400;color:#9ca3af;">/maand</span></p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background:#eff6ff;border:2px solid #2563eb;border-radius:10px;padding:16px;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">Kantoor</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Onbeperkt · 5 gebruikers · Huisstijl</p>
            <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">€149<span style="font-size:13px;font-weight:400;color:#9ca3af;">/maand</span></p>
          </td>
        </tr>
      </table>
      ${btn(`${APP_URL}/settings`, 'Kies een abonnement')}
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">— Quinn, VestaAI</p>
    `),
  })
}

export async function sendInvoiceConfirmationEmail(
  email: string,
  name: string,
  planName: string,
  amount: number,
) {
  const formatted = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100)

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `VestaAI — betaling ontvangen (${formatted})`,
    html: baseTemplate(`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">
          ✓ Betaling van ${formatted} ontvangen
        </p>
      </div>
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Bedankt, ${name}!</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        Je <strong>${planName}</strong>-abonnement is actief. Je kunt nu onbeperkt aan de slag.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-top:8px;">
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Abonnement</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;">${planName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;">Bedrag</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;">${formatted}</td>
        </tr>
      </table>
      ${btn(`${APP_URL}/object/new`, 'Ga aan de slag')}
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
        Bewaar deze mail als betalingsbewijs. Voor facturen neem contact op via quinn.berkouwer@gmail.com.
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">— Quinn, VestaAI</p>
    `),
  })
}
