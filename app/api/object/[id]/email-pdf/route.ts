import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { PdfTemplate } from '@/components/PdfTemplate'
import type { ContentOutput } from '@/lib/schemas'
import type { Kantoor } from '@/lib/supabase'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'E-mail niet geconfigureerd (RESEND_API_KEY ontbreekt)' }, { status: 503 })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, name, email')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const { email: doelEmail } = await req.json() as { email?: string }
  const ontvangerEmail = doelEmail || user.email
  if (!ontvangerEmail) {
    return NextResponse.json({ error: 'Geen e-mailadres beschikbaar' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('address, outputs_json, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (!object) return NextResponse.json({ error: 'Object niet gevonden' }, { status: 404 })

  const kantoorData = object.kantoren as unknown as Pick<Kantoor, 'name' | 'logo_url' | 'huisstijl_json'> | null

  const pdfBuffer = await renderToBuffer(React.createElement(PdfTemplate, {
    address: object.address,
    output: object.outputs_json as ContentOutput,
    kantoor: kantoorData ?? { name: 'VestaAI', logo_url: null, huisstijl_json: null },
  }) as React.ReactElement<ReactPDF.DocumentProps>)

  const bestandsnaam = `${object.address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-vestaai.pdf`

  const resend = new Resend(resendKey)
  const { error: sendError } = await resend.emails.send({
    from: 'VestaAI <noreply@vestaai.nl>',
    to: ontvangerEmail,
    subject: `Content-suite: ${object.address}`,
    html: `<p>Beste${makelaar.name ? ` ${makelaar.name}` : ''},</p>
<p>In de bijlage vindt u de gegenereerde content-suite voor <strong>${object.address}</strong>.</p>
<p>U kunt de content ook altijd online bekijken en bewerken via uw VestaAI-dashboard.</p>
<p>Met vriendelijke groet,<br/>Het VestaAI-team</p>`,
    attachments: [
      {
        filename: bestandsnaam,
        content: Buffer.from(pdfBuffer).toString('base64'),
      },
    ],
  })

  if (sendError) {
    return NextResponse.json({ error: 'E-mail verzenden mislukt' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: ontvangerEmail })
}
