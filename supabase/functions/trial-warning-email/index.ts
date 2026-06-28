// Supabase Edge Function — stuur trial-warning email 3 dagen voor afloop
// Deploy: supabase functions deploy trial-warning-email
// Schedule via Supabase Dashboard → Edge Functions → Schedule: "0 8 * * *" (dagelijks 08:00 UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://vestaai.nl'
const FROM = 'VestaAI <noreply@vestaai.nl>'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /><title>VestaAI</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding-bottom:24px;"><span style="font-size:18px;font-weight:700;color:#111827;">VestaAI</span></td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:40px;">${content}</td></tr>
        <tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#9ca3af;">VestaAI · <a href="${APP_URL}" style="color:#9ca3af;">vestaai.nl</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend fout: ${err}`)
  }
}

Deno.serve(async () => {
  try {
    const now = new Date()
    const drie_dagen = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const vier_dagen = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

    // Vind alle kantoren waarvan de proefperiode over 3 dagen verloopt (±24 uur window)
    const { data: kantoren, error } = await supabase
      .from('kantoren')
      .select('id, name')
      .is('plan', null)
      .gte('trial_ends_at', drie_dagen.toISOString())
      .lt('trial_ends_at', vier_dagen.toISOString())

    if (error) throw error

    let verstuurd = 0

    for (const kantoor of (kantoren ?? [])) {
      // Admin-makelaar ophalen
      const { data: admin } = await supabase
        .from('makelaars')
        .select('name, email')
        .eq('kantoor_id', kantoor.id)
        .eq('role', 'admin')
        .single()

      if (!admin?.email) continue

      const naam = admin.name ?? admin.email.split('@')[0]
      const dagLabel = 'dagen'

      const html = baseTemplate(`
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">⏰ Nog 3 ${dagLabel} proefperiode</p>
        </div>
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Hoi ${naam},</h2>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
          Je proefperiode van VestaAI verloopt over <strong>3 ${dagLabel}</strong>.
          Kies nu een abonnement om toegang te houden.
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
        <a href="${APP_URL}/settings" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:24px;">Kies een abonnement →</a>
        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">— Quinn, VestaAI</p>
      `)

      await sendEmail(
        admin.email,
        'VestaAI — je proefperiode verloopt over 3 dagen',
        html,
      )

      verstuurd++
    }

    return new Response(
      JSON.stringify({ ok: true, verstuurd }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
