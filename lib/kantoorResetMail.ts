/**
 * E-mailsjabloon voor "wachtwoord vergeten" op de kantoorlogin (`/login/<slug>`,
 * item 9.2, docs/roadmap.md § Fase 9). Pure functie (geen I/O, geen Resend-call)
 * zodat het sjabloon zonder mailverkeer te testen is — zie
 * `lib/kantoorResetMail.test.ts`. De verzendlogica zelf staat in `lib/email.ts`
 * (`sendKantoorResetEmail`), net als alle andere Resend-mails.
 *
 * Bewust los van `lib/email.ts`'s `baseTemplate`: deze mail toont een echt
 * kantoorlogo (geen tekstwordmerk) en noemt nergens "VestaAI" — de kantoorlogin
 * is de voordeur van het kantoor zelf, niet van het platform erachter (zie
 * CLAUDE.md § Conventies "Geen productnaam in de kantooromgeving"). De
 * afzender blijft de technische `noreply@vestaai.nl`, onopvallend in het
 * "Van"-veld — dat is toegestaan, alleen de zíchtbare inhoud mag niet naar
 * VestaAI verwijzen.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type KantoorResetMailInput = {
  /** Kantoornaam, bv. "i4 Housing". */
  naam: string
  /** Al gecontroleerd op bereikbaarheid (`bruikbaarLogo()`) — `null` = geen logo tonen. */
  logoUrl: string | null
  /** Primaire merkkleur van het kantoor, hex (`#RRGGBB`). */
  kleur: string
  /** Leesbare tekstkleur bovenop `kleur` (zwart of wit) — zie `lib/branding.ts` `tekstOp()`. */
  opKleur: string
  /** Kant-en-klare, al gegenereerde reset-link (Supabase `auth.admin.generateLink` `action_link`). */
  resetUrl: string
}

export type KantoorResetMail = { subject: string; html: string; text: string }

export function bouwKantoorResetMail(input: KantoorResetMailInput): KantoorResetMail {
  const naam = input.naam.trim() || 'je kantoor'
  const subject = `Wachtwoord opnieuw instellen — ${naam}`

  const logoBlok = input.logoUrl
    ? `<img src="${esc(input.logoUrl)}" alt="${esc(naam)}" style="display:block;max-height:44px;max-width:220px;width:auto;object-fit:contain;border:0;" />`
    : `<span style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.3px;">${esc(naam)}</span>`

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Kantoorlogo -->
          <tr>
            <td style="padding-bottom:24px;text-align:left;">${logoBlok}</td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Wachtwoord opnieuw instellen</h2>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                Je hebt een nieuw wachtwoord aangevraagd voor je account bij <strong>${esc(naam)}</strong>.
                Klik op de knop hieronder om een nieuw wachtwoord te kiezen.
              </p>
              <a href="${esc(input.resetUrl)}" style="display:inline-block;background:${esc(input.kleur)};color:${esc(input.opKleur)};font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:16px;">
                Nieuw wachtwoord instellen →
              </a>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — er verandert niets aan je account.
                Deze link is eenmalig en verloopt na een tijdje.
              </p>
            </td>
          </tr>
          <!-- Footer: alleen de kantoornaam, geen productnaam -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${esc(naam)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `Wachtwoord opnieuw instellen — ${naam}`,
    '',
    `Je hebt een nieuw wachtwoord aangevraagd voor je account bij ${naam}.`,
    'Open deze link om een nieuw wachtwoord te kiezen:',
    input.resetUrl,
    '',
    'Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — er verandert niets aan je account.',
    'Deze link is eenmalig en verloopt na een tijdje.',
  ].join('\n')

  return { subject, html, text }
}
