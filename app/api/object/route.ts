import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PropertyInputSchema, LEEG_CONTENT_OUTPUT } from '@/lib/schemas'
import { createServerSupabaseClient, createServiceSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { lookupCoordinaten } from '@/lib/verrijking'
import { meldFout } from '@/lib/fouten'

/**
 * Dossier aanmaken zonder Claude (item 3.1, docs/roadmap.md § 3.2 "Dossier
 * los van content"). Alleen de intake opslaan — geen Claude-call, dus geen
 * 1-2 minuten wachten en geen tokens voor een dossier dat nooit in verkoop
 * gaat. Content komt later via `POST /api/generate` (`{ objectId }`), op
 * knopdruk of automatisch bij de fase-overgang naar In verkoop. Antwoord
 * `{ id }` in < 5 s.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PropertyInputSchema.parse(body)

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database niet geconfigureerd' }, { status: 503 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { data: makelaar } = await supabase
      .from('makelaars')
      .select('id, kantoor_id')
      .eq('id', user.id)
      .single()
    if (!makelaar) return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

    // lat/lng: NewObjectForm stuurt ze mee als de intake ze al had uit de
    // verrijking bij adreskeuze (extra velden naast PropertyInput — Zod
    // parseert alleen de bekende sleutels, de rest lezen we uit de ruwe
    // body). Ontbreken ze, dan doet de route zelf een enkele, snelle PDOK-
    // opzoeking (geen volle fetchVerrijking — dat zou de <5s-belofte breken).
    const ruweBody = body as { lat?: unknown; lng?: unknown }
    let lat = typeof ruweBody.lat === 'number' ? ruweBody.lat : null
    let lng = typeof ruweBody.lng === 'number' ? ruweBody.lng : null
    if (lat === null || lng === null) {
      const coord = await lookupCoordinaten(input.adres).catch(err => {
        meldFout('object:pdok-lookup', err, { adres: input.adres })
        return null
      })
      lat = coord?.lat ?? null
      lng = coord?.lng ?? null
    }

    const serviceClient = createServiceSupabaseClient()
    const { data: savedObject, error } = await serviceClient
      .from('objecten')
      .insert({
        kantoor_id: makelaar.kantoor_id,
        makelaar_id: makelaar.id,
        address: input.adres,
        input_json: input,
        // outputs_json blijft NOT NULL — een lege, geldige structuur i.p.v.
        // null (zie migratie 20260917_object_content_status.sql).
        outputs_json: LEEG_CONTENT_OUTPUT,
        outputs_json_en: null,
        // Elk nieuw dossier start in de Verkoopadvies-fase (besluit 16 sep
        // 2026, zie CLAUDE.md § Hoofdstructuur).
        fase: 'verkoopadvies',
        content_status: 'geen',
        lat,
        lng,
      })
      .select('id')
      .single()

    if (error || !savedObject) {
      const ref = meldFout('object:insert', error ?? new Error('Geen id teruggekregen na insert'), { adres: input.adres })
      return NextResponse.json({ error: 'Aanmaken mislukt', ref }, { status: 500 })
    }

    return NextResponse.json({ id: savedObject.id })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.issues }, { status: 400 })
    }
    const ref = meldFout('object', error)
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message, ref }, { status: 500 })
  }
}
