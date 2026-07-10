import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestaai.nl'

function emailHtml(naam: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /><title>VestaAI</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding-bottom:24px;"><span style="font-size:18px;font-weight:700;color:#111827;">VestaAI</span></td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:40px;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">⏰ Nog 3 dagen proefperiode</p>
          </div>
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Hoi ${naam},</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
            Je proefperiode van VestaAI verloopt over <strong>3 dagen</strong>.
            Kies nu een abonnement om toegang te houden.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">Starter</p>
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">5 objecten/maand · 1 gebruiker</p>
                <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">€60<span style="font-size:13px;font-weight:400;color:#9ca3af;">/maand</span></p>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#f0fdf4;border:2px solid #1A6B45;border-radius:10px;padding:16px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">Pro</p>
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">25 objecten/maand · 5 gebruikers · Huisstijl</p>
                <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">€150<span style="font-size:13px;font-weight:400;color:#9ca3af;">/maand</span></p>
              </td>
            </tr>
          </table>
          <a href="${APP_URL}/prijzen" style="display:inline-block;background:#1A6B45;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:24px;">Kies een abonnement →</a>
          <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">— Quinn, VestaAI</p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#9ca3af;">VestaAI · <a href="${APP_URL}" style="color:#9ca3af;">vestaai.nl</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function GET(req: NextRequest) {
  // Vercel stuurt automatisch een Authorization header met CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY ontbreekt' }, { status: 503 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date()
  const driedagen = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const vierdagen = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

  const { data: kantoren, error } = await supabase
    .from('kantoren')
    .select('id, name')
    .is('plan', null)
    .gte('trial_ends_at', driedagen.toISOString())
    .lt('trial_ends_at', vierdagen.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  let verstuurd = 0

  for (const kantoor of (kantoren ?? [])) {
    const { data: admin } = await supabase
      .from('makelaars')
      .select('name, email')
      .eq('kantoor_id', kantoor.id)
      .eq('role', 'admin')
      .single()

    if (!admin?.email) continue

    const naam = admin.name ?? admin.email.split('@')[0]

    await resend.emails.send({
      from: 'VestaAI <noreply@vestaai.nl>',
      to: admin.email,
      subject: 'VestaAI — je proefperiode verloopt over 3 dagen',
      html: emailHtml(naam),
    })

    verstuurd++
  }

  return NextResponse.json({ ok: true, verstuurd })
}
