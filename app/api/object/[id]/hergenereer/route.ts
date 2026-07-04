import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { generateContent } from '@/lib/claude'
import { PropertyInputSchema, type HuisstijlConfig } from '@/lib/schemas'
import { heeftToegang } from '@/lib/plans'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { fetchVerrijking, verrijkingNaarPrompt } from '@/lib/verrijking'

export const maxDuration = 180

// Hergenereert de content van een bestaand object, nu mét de geüploade documenten
// (meetrapport, keuring, taxatie) als extra feitelijke context. Overschrijft outputs_json.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const serviceClient = createServiceSupabaseClient()

  // Object binnen het eigen kantoor + huisstijl + toegangsstatus ophalen.
  const { data: object } = await serviceClient
    .from('objecten')
    .select('id, address, input_json, kantoor_id, kantoren(huisstijl_json, plan, trial_ends_at)')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const kantoorData = object.kantoren as unknown as {
    huisstijl_json: HuisstijlConfig | null
    plan: string | null
    trial_ends_at: string | null
  } | null

  if (!heeftToegang(kantoorData?.plan ?? null, kantoorData?.trial_ends_at ?? null)) {
    return NextResponse.json({ error: 'Je proefperiode is afgelopen. Kies een abonnement om verder te gaan.' }, { status: 402 })
  }

  // Documenten van dit object met een Anthropic-file-id (heel het kantoor mag hier op sturen).
  const { data: docs } = await serviceClient
    .from('object_documenten')
    .select('anthropic_file_id')
    .eq('object_id', params.id)
    .not('anthropic_file_id', 'is', null)
    .limit(3)
  const docIds = (docs ?? [])
    .map(d => d.anthropic_file_id)
    .filter((id): id is string => !!id)

  if (docIds.length === 0) {
    return NextResponse.json({ error: 'Geen bruikbare documenten gevonden om te verwerken.' }, { status: 400 })
  }

  // Invoer valideren (input_json is eerder al gevalideerd opgeslagen).
  const parsed = PropertyInputSchema.safeParse(object.input_json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Objectgegevens onvolledig — hergenereren niet mogelijk.' }, { status: 400 })
  }
  const input = parsed.data
  const huisstijl = kantoorData?.huisstijl_json ?? undefined

  try {
    const verrijking = await fetchVerrijking(input.adres, input.oppervlak_m2).catch(() => null)
    const verrijkingTekst = verrijking ? verrijkingNaarPrompt(verrijking) : undefined

    const output = await generateContent(input, huisstijl, undefined, verrijkingTekst, docIds)

    const { error } = await serviceClient
      .from('objecten')
      .update({ outputs_json: output })
      .eq('id', params.id)
      .eq('kantoor_id', makelaar.kantoor_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePath(`/object/${params.id}`)
    return NextResponse.json({ output })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
