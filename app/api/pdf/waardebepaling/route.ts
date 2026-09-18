import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import React from 'react'
import { WaardebepalingPdfTemplate } from '@/components/WaardebepalingPdfTemplate'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { bouwBranding, bruikbaarLogo } from '@/lib/branding'
import { migreerWaarderingJson } from '@/lib/waardering'
import { PropertyInputSchema, type PropertyInput } from '@/lib/schemas'
import { meldFout } from '@/lib/fouten'

export const runtime = 'nodejs'

/**
 * Waardebepaling-pdf, één pagina (roadmap item 4.7). Rekent niets opnieuw uit —
 * leest de actuele, al opgeslagen uitkomst uit `objecten.waardering_json`
 * (migreert v1 → v2 via `migreerWaarderingJson`, zelfde patroon als
 * `waardering-actions.ts`). Hergebruikt het pdf/generate-patroon: sessie-
 * client voor auth, service-client voor de scoped lookup op `kantoor_id`.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const objectId = searchParams.get('object_id')

  if (!objectId) {
    return NextResponse.json({ error: 'object_id vereist' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, name')
    .eq('id', user.id)
    .single()
  if (!makelaar) {
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })
  }

  // Service-client, maar expliciet op het eigen kantoor gescoped (nooit een dossier
  // van een ander kantoor) — zelfde patroon als laadWaarderingContext() hierboven.
  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('address, input_json, waardering_json, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (!object) {
    return NextResponse.json({ error: 'Woning niet gevonden' }, { status: 404 })
  }

  const opslag = migreerWaarderingJson(object.waardering_json)
  if (!opslag.uitkomst) {
    return NextResponse.json({ error: 'Nog geen waardebepaling voor dit dossier — bereken eerst een waarde.' }, { status: 400 })
  }

  const parsedInvoer = PropertyInputSchema.safeParse(object.input_json)
  const invoer = parsedInvoer.success ? parsedInvoer.data : (object.input_json as PropertyInput)

  const kantoorData = object.kantoren as unknown as { name: string; logo_url: string | null; huisstijl_json: Record<string, unknown> | null } | null
  const branding = bouwBranding(kantoorData)
  const logoUrl = await bruikbaarLogo(branding.logoUrl)

  try {
    const pdf = await renderToBuffer(React.createElement(WaardebepalingPdfTemplate, {
      address: object.address,
      input: invoer,
      uitkomst: opslag.uitkomst,
      correctie: opslag.correctie,
      kantoor: { naam: branding.naam, logoUrl, kleur: branding.primair },
      makelaarNaam: makelaar.name,
      opgesteldOp: new Date().toISOString(),
    }) as React.ReactElement<ReactPDF.DocumentProps>)

    const bestandsnaam = `waardebepaling-${object.address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
      },
    })
  } catch (error) {
    const ref = meldFout('pdf/waardebepaling', error, { objectId })
    return NextResponse.json({ error: 'PDF genereren mislukt. Probeer het opnieuw.', ref }, { status: 500 })
  }
}
