import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePrijswijzigingContent } from '@/lib/claude'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { HuisstijlConfig } from '@/lib/schemas'

const BodySchema = z.object({
  nieuweprijs: z.number().int().min(1).optional(),
  type: z.enum(['prijsreductie', 'verkocht']),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('id, kantoor_id, address, input_json, outputs_json')
    .eq('id', params.id)
    .single()

  if (!object) return NextResponse.json({ error: 'Object niet gevonden' }, { status: 404 })

  // Controleer dat user tot dit kantoor behoort
  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, kantoren(huisstijl_json)')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.kantoor_id !== object.kantoor_id) {
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })
  }

  const kantoorData = makelaar.kantoren as unknown as { huisstijl_json: HuisstijlConfig | null } | null
  const input = object.input_json as { vraagprijs?: number }

  const output = await generatePrijswijzigingContent({
    adres: object.address,
    huidigeprijs: input.vraagprijs ?? 0,
    nieuweprijs: parsed.data.nieuweprijs,
    type: parsed.data.type,
    huisstijl: kantoorData?.huisstijl_json ?? undefined,
  })

  // Sla op als apart output-type in outputs_json
  const huidigeOutputs = (object.outputs_json ?? {}) as Record<string, unknown>
  const prijswijzigingen = (huidigeOutputs.prijswijzigingen as unknown[] ?? []) as Array<{
    type: string
    nieuweprijs?: number
    gegenereerd_op: string
    output: typeof output
  }>
  prijswijzigingen.push({
    type: parsed.data.type,
    nieuweprijs: parsed.data.nieuweprijs,
    gegenereerd_op: new Date().toISOString(),
    output,
  })

  await serviceClient
    .from('objecten')
    .update({ outputs_json: { ...huidigeOutputs, prijswijzigingen } })
    .eq('id', params.id)

  return NextResponse.json({ output })
}
