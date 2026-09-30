import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

// Outputset v2 (item 8.3, architectuur § 4) — alleen de veldnamen die
// `ResultTabs` nog daadwerkelijk toont/bewerkt. Oude sleutels van vóór 8.3
// blijven leesbaar in `outputs_json` (backcompat-schema) maar zijn hier niet
// meer opgenomen: ze zijn niet meer bewerkbaar via deze route.
const TOEGESTANE_SLEUTELS = new Set([
  'funda_tekst', 'brochure_tekst', 'instagram', 'linkedin_kantoor', 'sneak_preview',
  'koper_email', 'buurtomschrijving',
  'open_huis', 'followup_positief', 'followup_negatief',
  'video_script', 'energie_advies', 'kopersvragen_faq',
])

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const { sleutel, tekst } = await req.json() as { sleutel: string; tekst: string }

  if (!sleutel || !TOEGESTANE_SLEUTELS.has(sleutel)) {
    return NextResponse.json({ error: 'Ongeldig veld' }, { status: 400 })
  }
  if (typeof tekst !== 'string') {
    return NextResponse.json({ error: 'tekst moet een string zijn' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('outputs_json')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (!object) return NextResponse.json({ error: 'Object niet gevonden' }, { status: 404 })

  const origineel = (object.outputs_json as Record<string, string>)?.[sleutel] ?? ''

  const nieuweOutputs = { ...(object.outputs_json as Record<string, string>), [sleutel]: tekst }
  await serviceClient
    .from('objecten')
    .update({ outputs_json: nieuweOutputs })
    .eq('id', params.id)

  // Bewerking vastleggen als trainingsdata voor huisstijl-leren (best-effort, niet-blokkerend).
  // Alleen betekenisvolle wijzigingen op tekst van enige lengte — geen ruis van mini-edits.
  const origSchoon = origineel.trim()
  const nieuwSchoon = tekst.trim()
  if (origSchoon.length >= 40 && origSchoon !== nieuwSchoon) {
    void serviceClient.from('stijl_bewerkingen').insert({
      kantoor_id: makelaar.kantoor_id,
      object_id: params.id,
      sleutel,
      origineel: origSchoon.slice(0, 8000),
      bewerkt: nieuwSchoon.slice(0, 8000),
    })
  }

  revalidatePath(`/object/${params.id}`)
  return NextResponse.json({ ok: true })
}
