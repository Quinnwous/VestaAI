import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import React from 'react'
import { BrochurePdfTemplate } from '@/components/BrochurePdfTemplate'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { bouwBranding, bruikbaarLogo } from '@/lib/branding'
import { CONTENT_VERGRENDELD, contentVergrendeldAntwoord } from '@/lib/features'
import { PropertyInputSchema, type PropertyInput, type ContentOutput } from '@/lib/schemas'
import { meldFout } from '@/lib/fouten'

export const runtime = 'nodejs'

/**
 * Brochure-pdf (roadmap item 8.4) — cover, intro, foto's, kenmerkentabel en
 * slotpagina in de huisstijl van het kantoor. Zelfde patroon als
 * `pdf/waardebepaling/route.ts`: sessie-client voor auth, service-client voor
 * de expliciet op `kantoor_id` gescoopte lookup. Genereert niets met AI —
 * leest alleen wat al in `objecten` en `object_fotos` staat.
 */
export async function GET(req: NextRequest) {
  // Contentsuite is vergrendeld (koerswijziging sept 2026) — zie lib/features.ts.
  if (CONTENT_VERGRENDELD) return contentVergrendeldAntwoord()

  const { searchParams } = new URL(req.url)
  const objectId = searchParams.get('object_id')

  if (!objectId) {
    return NextResponse.json({ error: 'object_id vereist' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
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
  // van een ander kantoor) — zelfde patroon als de waardebepaling-route.
  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('address, input_json, outputs_json, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (!object) {
    return NextResponse.json({ error: 'Woning niet gevonden' }, { status: 404 })
  }

  const parsedInvoer = PropertyInputSchema.safeParse(object.input_json)
  const invoer = parsedInvoer.success ? parsedInvoer.data : (object.input_json as PropertyInput)

  // Legacy-fallback (zelfde principe als metLegacyFallback in ResultTabs.tsx): een
  // dossier van vóór outputset v2 (item 8.3) mist brochure_tekst nog en had het
  // onder een oudere naam; die tonen we hier alsnog. Geen brochure_tekst/funda_tekst
  // → introTekst blijft leeg en de intro-pagina vervalt in het template.
  const output = (object.outputs_json ?? {}) as Partial<ContentOutput>
  const introTekst = output.brochure_tekst || output.brochure_lang || output.brochure_kort || output.funda_tekst || ''

  const kantoorData = object.kantoren as unknown as { name: string; logo_url: string | null; huisstijl_json: Record<string, unknown> | null } | null
  const branding = bouwBranding(kantoorData)
  const slotTekst = (() => {
    const stijl = kantoorData?.huisstijl_json?.brochure_stijl as { slot_tekst?: string } | undefined
    return typeof stijl?.slot_tekst === 'string' && stijl.slot_tekst.trim() ? stijl.slot_tekst.trim() : null
  })()

  const { data: fotoRows } = await service
    .from('object_fotos')
    .select('url')
    .eq('object_id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .order('created_at', { ascending: true })
    .limit(8)

  // Elke foto- én logo-URL vooraf controleren: react-pdf's <Image> kent geen onError
  // en een dode URL (verlopen Storage-link, HEAD-timeout) laat de hele generatie
  // klappen — bruikbaarLogo() is generiek genoeg (checkt alleen bereikbaarheid) om
  // ook voor woningfoto's te hergebruiken.
  const [logoUrl, ...fotos] = await Promise.all([
    bruikbaarLogo(branding.logoUrl),
    ...(fotoRows ?? []).map(f => bruikbaarLogo(f.url as string)),
  ])
  const bruikbareFotos = fotos.filter((url): url is string => !!url)

  try {
    const pdf = await renderToBuffer(React.createElement(BrochurePdfTemplate, {
      address: object.address,
      input: invoer,
      introTekst,
      fotos: bruikbareFotos,
      kantoor: { naam: branding.naam, logoUrl, kleur: branding.primair, telefoon: branding.telefoon, email: branding.email, website: branding.website?.label ?? null },
      vorm: branding.vorm,
      slotTekst,
      makelaarNaam: makelaar.name,
      opgesteldOp: new Date().toISOString(),
    }) as React.ReactElement<ReactPDF.DocumentProps>)

    const bestandsnaam = `brochure-${object.address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
      },
    })
  } catch (error) {
    const ref = meldFout('pdf/brochure', error, { objectId })
    return NextResponse.json({ error: 'PDF genereren mislukt. Probeer het opnieuw.', ref }, { status: 500 })
  }
}
