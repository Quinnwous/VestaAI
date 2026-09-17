import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { generateContentBeideTalen } from '@/lib/claude'
import { PropertyInputSchema, type HuisstijlConfig } from '@/lib/schemas'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { fetchVerrijking, verrijkingNaarPrompt } from '@/lib/verrijking'
import { CONTENT_VERGRENDELD, contentVergrendeldAntwoord } from '@/lib/features'
import { meldFout } from '@/lib/fouten'

export const maxDuration = 300

// Hergenereert de content van een bestaand object, nu mét de geüploade documenten
// (meetrapport, keuring, taxatie) als extra feitelijke context. Overschrijft outputs_json.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  // Contentsuite is vergrendeld (koerswijziging sept 2026) — zie lib/features.ts.
  if (CONTENT_VERGRENDELD) return contentVergrendeldAntwoord()

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

  // Object binnen het eigen kantoor + huisstijl ophalen.
  const { data: object } = await serviceClient
    .from('objecten')
    .select('id, address, input_json, kantoor_id, kantoren(huisstijl_json)')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const kantoorData = object.kantoren as unknown as {
    huisstijl_json: HuisstijlConfig | null
  } | null

  // Toegang is puur admin-beheerd (geen plan-/proefcheck meer, zie CLAUDE.md).

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
    const verrijking = await fetchVerrijking(input.adres, input.oppervlak_m2).catch(err => {
      meldFout('object/[id]/hergenereer:verrijking', err, { objectId: params.id, adres: input.adres })
      return null
    })
    const verrijkingTekst = verrijking ? verrijkingNaarPrompt(verrijking) : undefined

    const { nl: output, en: outputEn } = await generateContentBeideTalen(input, huisstijl, verrijkingTekst, docIds)

    const { error } = await serviceClient
      .from('objecten')
      .update({ outputs_json: output, outputs_json_en: outputEn })
      .eq('id', params.id)
      .eq('kantoor_id', makelaar.kantoor_id)
    if (error) {
      const ref = meldFout('object/[id]/hergenereer:opslaan', error, { objectId: params.id })
      return NextResponse.json({ error: error.message, ref }, { status: 500 })
    }

    revalidatePath(`/object/${params.id}`)
    return NextResponse.json({ output, output_en: outputEn })
  } catch (error) {
    const ref = meldFout('object/[id]/hergenereer', error, { objectId: params.id })
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message, ref }, { status: 500 })
  }
}
