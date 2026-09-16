import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(key)
  }
  return _resend
}

const FROM = 'VestaAI <noreply@vestaai.nl>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestaai.nl'

/**
 * Merk van de ontvanger: een mail aan een makelaar hoort het kantoor te tonen waar hij
 * werkt, niet het platform erachter. Zonder merk valt alles terug op VestaAI zelf.
 * (De afzender blijft noreply@vestaai.nl tot een kantoordomein in Resend geverifieerd is.)
 */
type Merk = { naam: string; kleur?: string | null }

const VESTA_GROEN = '#1A6B45'

function baseTemplate(content: string, merk?: Merk) {
  const naam = merk?.naam ?? 'VestaAI'
  const voettekst = merk
    ? esc(merk.naam)
    : `VestaAI · De AI-assistent voor makelaars<br/><a href="${APP_URL}" style="color:#9ca3af;text-decoration:underline;">vestaai.nl</a>`
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(naam)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo / brand -->
          <tr>
            <td style="padding-bottom:24px;text-align:left;">
              <span style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.3px;">${esc(naam)}</span>
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
              <p style="margin:0;font-size:12px;color:#9ca3af;">${voettekst}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(href: string, label: string, kleur: string = VESTA_GROEN) {
  return `<a href="${href}" style="display:inline-block;background:${kleur};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:24px;">${label} →</a>`
}

export async function sendWelcomeEmail(email: string, name: string, merk?: Merk) {
  const kleur = merk?.kleur ?? VESTA_GROEN
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Welkom — je werkomgeving staat klaar',
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Welkom, ${name}!</h2>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        Je werkomgeving staat klaar. Maak je eerste woning aan en zie wat er direct voor je geschreven wordt.
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
      ${btn(`${APP_URL}/object/new`, 'Maak je eerste woning aan', kleur)}
      <p style="margin:28px 0 0;font-size:13px;color:#6b7280;">
        Vragen? Reageer gewoon op deze mail — we helpen je graag.
      </p>
    `, merk),
  })
}

export async function sendTeamInviteConfirmation(adminEmail: string, uitgenodigdEmail: string) {
  await getResend().emails.send({
    from: FROM,
    to: adminEmail,
    subject: `VestaAI — uitnodiging verstuurd naar ${uitgenodigdEmail}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Uitnodiging verstuurd</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        We hebben een uitnodigingsmail gestuurd naar <strong>${uitgenodigdEmail}</strong>.
        Zodra uw collega de link heeft geopend en een account heeft aangemaakt, verschijnt hij of zij automatisch in uw teamoverzicht.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-top:8px;">
        <p style="margin:0;font-size:13px;color:#166534;">
          De uitnodigingslink is 24 uur geldig. Heeft uw collega de mail niet ontvangen? Stuur de uitnodiging opnieuw vanuit uw teaminstellingen.
        </p>
      </div>
      ${btn(`${APP_URL}/settings`, 'Beheer uw team')}
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">— Quinn, VestaAI</p>
    `),
  })
}

/** Klantdata (naam/e-mail) komt uit registratie-invoer → escapen vóór HTML-interpolatie. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendAccountToegevoegdEmail(email: string, name: string, kantoorNaam: string, kantoorKleur?: string | null) {
  const kleur = kantoorKleur ?? VESTA_GROEN
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `${kantoorNaam} — je account staat klaar`,
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Welkom, ${esc(name)}!</h2>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        Je account bij <strong>${esc(kantoorNaam)}</strong> staat klaar. Je kunt nu inloggen.
      </p>
      ${btn(`${APP_URL}/login`, 'Naar inloggen', kleur)}
      <p style="margin:28px 0 0;font-size:13px;color:#6b7280;">
        Vragen? Reageer gewoon op deze mail — we helpen je graag.
      </p>
    `, { naam: kantoorNaam, kleur }),
  })
}

export async function sendNieuweKlantMelding(
  to: string[],
  klantNaam: string,
  klantEmail: string,
  kantoorNaam: string,
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'VestaAI — nieuw kantoor aangemaakt',
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Nieuw kantoor aangemaakt</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        Er is een nieuw kantoor aangemaakt. Toegang is puur admin-beheerd — controleer of dit klopt:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Naam</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;">${esc(klantNaam)}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">E-mail</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;">${esc(klantEmail)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;">Kantoor</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;">${esc(kantoorNaam)}</td>
        </tr>
      </table>
      ${btn(`${APP_URL}/admin`, 'Bekijk in beheer')}
    `),
  })
}
