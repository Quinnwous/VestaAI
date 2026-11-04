import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { PdfTemplate } from '@/components/PdfTemplate'
import type { ContentOutput } from '@/lib/schemas'
import type { Kantoor } from '@/lib/supabase'
import { bruikbaarLogo, bouwBranding } from '@/lib/branding'
import { contentSuiteMail } from '@/lib/email'
import { APP_URL } from '@/lib/appUrl'
import { meldFout } from '@/lib/fouten'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'E-mail niet geconfigureerd (RESEND_API_KEY ontbreekt)' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
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

  // Alleen intern versturen (jezelf of een collega) — nooit naar een koper of
  // klant, zie CLAUDE.md § Hoofdstructuur (besluit 16 sep 2026).
  const { data: collega } = await serviceClient
    .from('makelaars')
    .select('id')
    .eq('kantoor_id', makelaar.kantoor_id)
    .ilike('email', ontvangerEmail)
    .maybeSingle()
  if (!collega) {
    return NextResponse.json({ error: 'Alleen versturen naar een collega binnen je eigen kantoor' }, { status: 400 })
  }
  const { data: object } = await serviceClient
    .from('objecten')
    .select('address, outputs_json, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (!object) return NextResponse.json({ error: 'Object niet gevonden' }, { status: 404 })

  const kantoorData = object.kantoren as unknown as Pick<Kantoor, 'name' | 'logo_url' | 'huisstijl_json'> | null

  const { data: fotoRows } = await serviceClient
    .from('object_fotos')
    .select('url')
    .eq('object_id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .order('created_at', { ascending: true })
    .limit(6)
  const fotos = (fotoRows ?? []).map(f => f.url as string)

  try {
    const pdfBuffer = await renderToBuffer(React.createElement(PdfTemplate, {
      address: object.address,
      output: object.outputs_json as ContentOutput,
      kantoor: kantoorData
        ? { ...kantoorData, logo_url: await bruikbaarLogo(kantoorData.logo_url) }
        : { name: 'VestaAI', logo_url: null, huisstijl_json: null },
      fotos,
    }) as React.ReactElement<ReactPDF.DocumentProps>)

    const bestandsnaam = `${object.address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-contentsuite.pdf`
    // Mail in de huisstijl van het kantoor, zonder productnaam (lib/email.ts).
    const branding = bouwBranding(kantoorData)
    const { data: ontvanger } = await serviceClient.from('makelaars').select('name').eq('id', collega.id).maybeSingle()
    const mail = contentSuiteMail({
      kantoorNaam: branding.naam,
      kleur: branding.merkTekst,
      ontvangerNaam: (ontvanger?.name as string | null | undefined) ?? null,
      adres: object.address,
      dossierUrl: `${APP_URL}/object/${params.id}`,
    })

    const resend = new Resend(resendKey)
    const { error: sendError } = await resend.emails.send({
      // Weergavenaam van het kantoor; het adres blijft noreply@vestaai.nl tot een
      // kantoordomein in Resend geverifieerd is (zie lib/email.ts).
      from: `"${branding.naam.replace(/["<>]/g, '')}" <noreply@vestaai.nl>`,
      to: ontvangerEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [
        {
          filename: bestandsnaam,
          content: Buffer.from(pdfBuffer).toString('base64'),
        },
      ],
    })

    if (sendError) {
      meldFout('object/[id]/email-pdf:resend', sendError, { objectId: params.id })
      return NextResponse.json({ error: 'E-mail verzenden mislukt' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, email: ontvangerEmail })
  } catch (error) {
    const ref = meldFout('object/[id]/email-pdf', error, { objectId: params.id })
    return NextResponse.json({ error: 'E-mail verzenden mislukt', ref }, { status: 500 })
  }
}
