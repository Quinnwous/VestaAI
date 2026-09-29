import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import React from 'react'
import { WaardebepalingPdfTemplate, type KaartVoorPdf } from '@/components/WaardebepalingPdfTemplate'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { bouwBranding, bruikbaarLogo } from '@/lib/branding'
import { migreerWaarderingJson, type WaarderingReferentie } from '@/lib/waardering'
import { PropertyInputSchema, type PropertyInput } from '@/lib/schemas'
import { meldFout } from '@/lib/fouten'
import { haalTransactieCoordinaten } from '@/lib/transactiesQuery'
import { bepaalKaartKader, pixelInKader, kaartReferenties, haalStatischeKaartAfbeelding, type Punt } from '@/lib/statischeKaart'
import { verkoperWaarschuwingen, kantoorContactregel } from '@/lib/presentatie'
import { isVoorVerkoper, waardebepalingBestandsnaam } from '@/lib/pdfVariant'

export const runtime = 'nodejs'

/** Zelfde top-6-op-gewicht als de referentietabel in WaardebepalingPdfTemplate.tsx — de
 * kaart nummert precies die rijen, dus deze selectie moet identiek blijven aan die daar. */
function top6VanUitkomst(referenties: WaarderingReferentie[]): WaarderingReferentie[] {
  return [...referenties].sort((a, b) => b.gewicht - a.gewicht).slice(0, 6)
}

/**
 * Bouwt de locatiekaart voor de pdf (roadmap § 9, vooruitgehaald voor scène 4
 * van de demo). Best-effort: elke onderbroken stap (geen coördinaat, tegels
 * niet op tijd, samenstelfout) geeft `null` terug — nooit de hele pdf laten
 * falen op de kaart (zelfde robuustheidsregel als CLAUDE.md § verrijking).
 */
async function bouwKaartVoorPdf(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  subject: { lat: number | null; lng: number | null },
  top6: WaarderingReferentie[],
): Promise<KaartVoorPdf | null> {
  if (subject.lat == null || subject.lng == null) {
    console.error('[pdf/waardebepaling] kaart: geen coördinaat op het dossier')
    return null
  }
  const subjectPunt: Punt = { lat: subject.lat, lng: subject.lng }

  const coordsById = await haalTransactieCoordinaten(supabase, top6.map(r => r.id))
  const referenties = kaartReferenties(top6, coordsById)

  const kader = bepaalKaartKader([subjectPunt, ...referenties.map(r => ({ lat: r.lat, lng: r.lng }))])
  if (!kader) {
    console.error('[pdf/waardebepaling] kaart: geen kader te bepalen')
    return null
  }

  const resultaat = await haalStatischeKaartAfbeelding(kader, { timeoutMs: 3000 })
  if (!resultaat.ok) {
    console.error('[pdf/waardebepaling] kaart:', resultaat.reden)
    return null
  }

  return {
    png: resultaat.kaart.png,
    breedtePx: resultaat.kaart.breedtePx,
    hoogtePx: resultaat.kaart.hoogtePx,
    subject: pixelInKader(subjectPunt, kader),
    referenties: referenties.map(r => ({ ...pixelInKader(r, kader), nummer: r.nummer })),
  }
}

/**
 * Waardebepaling-pdf, één pagina (roadmap item 4.7). Rekent niets opnieuw uit —
 * leest de actuele, al opgeslagen uitkomst uit `objecten.waardering_json`
 * (migreert v1 → v2 via `migreerWaarderingJson`, zelfde patroon als
 * `waardering-actions.ts`). Hergebruikt het pdf/generate-patroon: sessie-
 * client voor auth, service-client voor de scoped lookup op `kantoor_id`.
 *
 * `&voor=verkoper` (item H4, "handout" van de presentatiemodus): zelfde
 * toegangscontrole en dezelfde opgeslagen `waardering_json` — alleen de
 * makelaar-interne waarschuwingen vallen weg (`verkoperWaarschuwingen()`) en
 * het kantoorcontact komt in de voettekst (`kantoorContactregel()`). Zonder
 * de parameter is het gedrag exact zoals vóór dit item.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const objectId = searchParams.get('object_id')
  const voorVerkoper = isVoorVerkoper(searchParams.get('voor'))

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
  // van een ander kantoor) — zelfde patroon als laadWaarderingContext() hierboven.
  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('address, lat, lng, input_json, waardering_json, kantoren(name, logo_url, huisstijl_json)')
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
  const kaart = await bouwKaartVoorPdf(supabase, { lat: object.lat, lng: object.lng }, top6VanUitkomst(opslag.uitkomst.referenties))

  // Verkopersversie: geen makelaar-interne waarschuwingen (rekennotities over
  // de prijsindex blijven voor intern gebruik), wel het kantoorcontact.
  const uitkomstVoorPdf = voorVerkoper
    ? { ...opslag.uitkomst, waarschuwingen: verkoperWaarschuwingen(opslag.uitkomst.waarschuwingen) }
    : opslag.uitkomst
  const contactregel = voorVerkoper
    ? kantoorContactregel({ telefoon: branding.telefoon, email: branding.email, website: branding.website?.label ?? null })
    : null

  try {
    const pdf = await renderToBuffer(React.createElement(WaardebepalingPdfTemplate, {
      address: object.address,
      input: invoer,
      uitkomst: uitkomstVoorPdf,
      correctie: opslag.correctie,
      kantoor: { naam: branding.naam, logoUrl, kleur: branding.primair },
      makelaarNaam: makelaar.name,
      opgesteldOp: new Date().toISOString(),
      kaart,
      contactregel,
    }) as React.ReactElement<ReactPDF.DocumentProps>)

    const bestandsnaam = waardebepalingBestandsnaam(object.address, voorVerkoper)

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
