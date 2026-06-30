import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

const TOEGESTANE_SLEUTELS = new Set([
  'funda_tekst', 'brochure_kort', 'brochure_lang',
  'instagram_emotioneel', 'instagram_informatief', 'instagram_actie',
  'linkedin_kantoor', 'linkedin_makelaar', 'koper_email', 'buurtomschrijving',
  'open_huis', 'bezichtiging_followup_positief', 'bezichtiging_followup_negatief',
  'video_script', 'energie_advies', 'kopersvragen_faq', 'marktanalyse',
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabaseClient()
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

  const nieuweOutputs = { ...(object.outputs_json as Record<string, string>), [sleutel]: tekst }
  await serviceClient
    .from('objecten')
    .update({ outputs_json: nieuweOutputs })
    .eq('id', params.id)

  return NextResponse.json({ ok: true })
}
