import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { valideerWozInvoer } from '@/lib/woz'

/**
 * WOZ-waarde van de woning zelf invullen of wissen (besluit 24 sep 2026, zie
 * lib/woz.ts). Schrijft alleen `woz_waarde`/`woz_peiljaar` in `input_json` —
 * geen regeneratie van content, anders dan "Bewerk & regenereer".
 */
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

  const body = await req.json().catch(() => null) as { waarde?: unknown; peiljaar?: unknown } | null
  const invoer = valideerWozInvoer(body?.waarde, body?.peiljaar)
  if (!invoer.ok) return NextResponse.json({ error: invoer.fout }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('input_json')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return NextResponse.json({ error: 'Woning niet gevonden' }, { status: 404 })

  const nieuweInvoer: Record<string, unknown> = { ...(object.input_json as Record<string, unknown> | null) }
  delete nieuweInvoer.woz_waarde
  delete nieuweInvoer.woz_peiljaar
  if (invoer.woz_waarde) Object.assign(nieuweInvoer, { woz_waarde: invoer.woz_waarde, woz_peiljaar: invoer.woz_peiljaar })

  const { error } = await serviceClient
    .from('objecten')
    .update({ input_json: nieuweInvoer })
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
  if (error) return NextResponse.json({ error: 'Opslaan mislukt. Probeer het opnieuw.' }, { status: 500 })

  revalidatePath(`/object/${params.id}`)
  return NextResponse.json({ ok: true, woz: invoer.woz_waarde ? { waarde: invoer.woz_waarde, peiljaar: invoer.woz_peiljaar } : null })
}
