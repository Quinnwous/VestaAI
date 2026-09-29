import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { CONTENT_VERGRENDELD, contentVergrendeldAntwoord } from '@/lib/features'
import { genereerExtraContent } from '@/lib/claude'
import { isExtraType } from '@/lib/contentExtra'
import type { PropertyInput, ContentOutput, HuisstijlConfig } from '@/lib/schemas'
import { meldFout } from '@/lib/fouten'

export const maxDuration = 60

/**
 * Genereert één "extra" contentveld op knopdruk (item 8.3, docs/roadmap.md §
 * 3.4 "Outputset v2"): open_huis, followup_positief/negatief, video_script,
 * kopersvragen_faq, energie_advies. Deze velden zitten niet meer in de
 * kern-call (die altijd draait bij "Genereer content") — de makelaar vraagt
 * ze apart op via het "Meer…"-menu in `ResultTabs`. `?type=` bepaalt welk
 * veld; het resultaat wordt direct in `outputs_json` opgeslagen zodat het
 * na een refresh blijft staan, net als de kernvelden.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Contentsuite is vergrendeld (koerswijziging sept 2026) — zie lib/features.ts.
  if (CONTENT_VERGRENDELD) return contentVergrendeldAntwoord()

  const type = req.nextUrl.searchParams.get('type') ?? ''
  if (!isExtraType(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('input_json, outputs_json, content_status')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return NextResponse.json({ error: 'Woning niet gevonden' }, { status: 404 })
  // Loopt de kern-generatie nog, dan zou die bij afronden deze extra overschrijven.
  if (object.content_status === 'bezig') {
    return NextResponse.json({ error: 'Wacht tot de teksten klaar zijn en probeer het dan opnieuw.' }, { status: 409 })
  }

  const { data: kantoor } = await serviceClient
    .from('kantoren')
    .select('huisstijl_json')
    .eq('id', makelaar.kantoor_id)
    .single()
  const huisstijl = (kantoor?.huisstijl_json as HuisstijlConfig | null) ?? undefined

  // Bijgevoegde documenten (meetrapport, keuring, taxatie) ook aan de extra's
  // meegeven — zelfde patroon als de kern-call en /api/object/[id]/hergenereer.
  const { data: docs } = await serviceClient
    .from('object_documenten')
    .select('anthropic_file_id')
    .eq('object_id', params.id)
    .not('anthropic_file_id', 'is', null)
    .limit(3)
  const docIds = (docs ?? [])
    .map(d => d.anthropic_file_id)
    .filter((id): id is string => !!id)

  const input = object.input_json as PropertyInput
  try {
    const tekst = await genereerExtraContent(type, input, huisstijl, undefined, docIds)
    // Vlak voor het schrijven opnieuw lezen: tijdens de generatie kan een ander
    // veld (bewerking, andere extra) zijn opgeslagen.
    const { data: vers } = await serviceClient.from('objecten').select('outputs_json').eq('id', params.id).single()
    const outputs = (vers?.outputs_json ?? object.outputs_json) as ContentOutput
    const nieuweOutputs = { ...outputs, [type]: tekst }
    await serviceClient
      .from('objecten')
      .update({ outputs_json: nieuweOutputs })
      .eq('id', params.id)

    revalidatePath(`/object/${params.id}`)
    return NextResponse.json({ type, tekst })
  } catch (error) {
    const ref = meldFout('object/[id]/extra', error, { objectId: params.id, type })
    return NextResponse.json({ error: 'Genereren mislukt. Probeer het opnieuw.', ref }, { status: 500 })
  }
}
