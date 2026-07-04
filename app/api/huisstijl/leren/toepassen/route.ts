import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { HuisstijlConfig } from '@/lib/schemas'

async function adminKantoor() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role, kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar || makelaar.role !== 'admin') return null
  return makelaar.kantoor_id as string
}

// Voorstel accepteren (regels toevoegen aan het stijlprofiel) of negeren. In beide gevallen
// worden de betrokken bewerkingen als verwerkt gemarkeerd zodat ze niet opnieuw meetellen.
export async function POST(req: NextRequest) {
  const kantoorId = await adminKantoor()
  if (!kantoorId) return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

  let body: { ids?: string[]; regels?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(id => typeof id === 'string') : []
  if (ids.length === 0) return NextResponse.json({ error: 'Geen bewerkingen opgegeven' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const regels = body.regels?.trim()

  // Accepteren: het gedestilleerde voorstel is de nieuwe, geconsolideerde set → vervangt de oude.
  if (regels) {
    const { data: kantoor } = await serviceClient
      .from('kantoren')
      .select('huisstijl_json')
      .eq('id', kantoorId)
      .single()
    const huidig = (kantoor?.huisstijl_json as HuisstijlConfig | null) ?? null
    const { error: updErr } = await serviceClient
      .from('kantoren')
      .update({ huisstijl_json: { ...(huidig ?? {}), geleerde_regels: regels.slice(0, 4000) } })
      .eq('id', kantoorId)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  const { error } = await serviceClient
    .from('stijl_bewerkingen')
    .update({ verwerkt: true })
    .eq('kantoor_id', kantoorId)
    .in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
