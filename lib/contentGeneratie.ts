import { revalidatePath } from 'next/cache'
import { generateContentBeideTalen } from '@/lib/claude'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { fetchVerrijking, verrijkingNaarPrompt } from '@/lib/verrijking'
import { meldFout } from '@/lib/fouten'
import type { HuisstijlConfig, PropertyInput } from '@/lib/schemas'

/** Lock-verlooptijd voor `content_status = 'bezig'` (item 3.1, docs/roadmap.md
 * § 3.2): een generatie die langer dan dit loopt (gecrashte functie, timeout)
 * telt niet meer als actief — een volgend verzoek mag opnieuw claimen. */
export const CONTENT_LOCK_VERLOOP_MS = 6 * 60 * 1000

export type GenereerResultaat =
  | { ok: true }
  | { ok: false; status: 400 | 404 | 409 | 500; error: string }

/**
 * Kernlogica van "genereer content voor dossier-id" (item 3.1, docs/roadmap.md
 * § 3.2) — los van de HTTP-laag, zodat zowel `POST /api/generate` als de
 * fire-and-forget-trigger bij de fase-overgang naar In verkoop hem kunnen
 * aanroepen. Lock per dossier (niet per gebruiker) via `content_status =
 * 'bezig'` + `content_bezig_sinds`, met een verlooptijd van 6 minuten — de
 * oude in-memory rate-limit-map per gebruiker (app/api/generate/route.ts)
 * verviel hiermee (die beschermde tegen dubbele generaties per gebruiker,
 * niet per dossier, en overleefde geen cold start).
 */
export async function genereerContentVoorObject(objectId: string, kantoorId: string): Promise<GenereerResultaat> {
  const service = createServiceSupabaseClient()

  const { data: object } = await service
    .from('objecten')
    .select('id, input_json, content_status, content_bezig_sinds')
    .eq('id', objectId)
    .eq('kantoor_id', kantoorId)
    .single()

  if (!object) return { ok: false, status: 404, error: 'Woning niet gevonden' }

  const input = object.input_json as PropertyInput
  if (!input.usps || !input.doelgroep) {
    return { ok: false, status: 400, error: 'Vul eerst stap Verhaal in' }
  }

  const nu = Date.now()
  const cutoffIso = new Date(nu - CONTENT_LOCK_VERLOOP_MS).toISOString()

  // Atomische lock-claim: de UPDATE zelf bepaalt of er een actieve, niet-
  // verlopen 'bezig'-lock ligt (WHERE-voorwaarde), niet een losse SELECT
  // ervoor — dat voorkomt dat twee gelijktijdige verzoeken allebei denken dat
  // ze de lock mogen claimen (TOCTOU).
  const { data: geclaimd } = await service
    .from('objecten')
    .update({ content_status: 'bezig', content_bezig_sinds: new Date(nu).toISOString() })
    .eq('id', objectId)
    .eq('kantoor_id', kantoorId)
    .or(`content_status.neq.bezig,content_bezig_sinds.lt.${cutoffIso},content_bezig_sinds.is.null`)
    .select('id')
    .maybeSingle()

  if (!geclaimd) {
    return { ok: false, status: 409, error: 'Er loopt al een generatie voor dit dossier' }
  }

  // Meteen na het claimen revalideren — bij de fire-and-forget-trigger vanuit
  // FaseToggle.tsx komt deze claim iets later dan de fase-overgang zelf
  // binnen; een navigatie naar de Teksten-tab kort daarna moet al 'bezig'
  // zien in plaats van de vorige, inmiddels achterhaalde staat.
  revalidatePath(`/object/${objectId}`)

  const { data: kantoor } = await service.from('kantoren').select('huisstijl_json').eq('id', kantoorId).single()
  const huisstijl = (kantoor?.huisstijl_json as HuisstijlConfig | null) ?? undefined

  try {
    const verrijking = await fetchVerrijking(input.adres, input.oppervlak_m2).catch(err => {
      meldFout('generate:verrijking', err, { adres: input.adres })
      return null
    })
    const verrijkingTekst = verrijking ? verrijkingNaarPrompt(verrijking) : undefined

    // NL + EN parallel (besluit 16 sep 2026, F8) — de wandkloktijd blijft
    // ~gelijk aan één generatie, begrensd door de traagste van de twee.
    const { nl, en } = await generateContentBeideTalen(input, huisstijl, verrijkingTekst)

    await service
      .from('objecten')
      .update({
        outputs_json: nl,
        outputs_json_en: en,
        content_status: 'klaar',
        content_gegenereerd_op: new Date().toISOString(),
      })
      .eq('id', objectId)

    // De dossierpagina cachet via unstable_cache (app/(app)/object/[id]/page.tsx,
    // revalidate: 86400) — revalidatePath zorgt dat een router.refresh() vanuit
    // ContentTekstenTab de verse outputs_json/content_status ophaalt in plaats
    // van tot 24u oude cache.
    revalidatePath(`/object/${objectId}`)

    return { ok: true }
  } catch (error) {
    // Lock vrijgeven via 'fout' i.p.v. hem 'bezig' te laten staan — anders
    // blijft het dossier tot de 6-minuten-verlooptijd op slot.
    try {
      await service.from('objecten').update({ content_status: 'fout' }).eq('id', objectId)
      revalidatePath(`/object/${objectId}`)
    } catch {
      // Best-effort — de oorspronkelijke fout hieronder is leidend.
    }
    const ref = meldFout('generate', error, { objectId })
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return { ok: false, status: 500, error: `${message} (ref: ${ref})` }
  }
}
