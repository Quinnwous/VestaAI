import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { distilleerBewerkingsregels } from '@/lib/claude'
import type { HuisstijlConfig } from '@/lib/schemas'

export const maxDuration = 60

const MIN_BEWERKINGEN = 4

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

// Aantal onverwerkte bewerkingen (voor de "leren"-knop in de huisstijl-tab).
export async function GET() {
  const kantoorId = await adminKantoor()
  if (!kantoorId) return NextResponse.json({ aantal: 0 })

  const serviceClient = createServiceSupabaseClient()
  const { count } = await serviceClient
    .from('stijl_bewerkingen')
    .select('id', { count: 'exact', head: true })
    .eq('kantoor_id', kantoorId)
    .eq('verwerkt', false)

  return NextResponse.json({ aantal: count ?? 0, minimum: MIN_BEWERKINGEN })
}

// Destilleert een voorstel uit de onverwerkte bewerkingen. Past nog niets toe en markeert
// nog niets als verwerkt — dat gebeurt pas na akkoord via /api/huisstijl/leren/toepassen.
export async function POST() {
  const kantoorId = await adminKantoor()
  if (!kantoorId) return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

  const serviceClient = createServiceSupabaseClient()
  const { data: edits } = await serviceClient
    .from('stijl_bewerkingen')
    .select('id, sleutel, origineel, bewerkt')
    .eq('kantoor_id', kantoorId)
    .eq('verwerkt', false)
    .order('created_at', { ascending: true })
    .limit(40)

  if (!edits || edits.length < MIN_BEWERKINGEN) {
    return NextResponse.json(
      { error: `Nog te weinig bewerkingen om iets te leren (minimaal ${MIN_BEWERKINGEN}).`, aantal: edits?.length ?? 0 },
      { status: 422 },
    )
  }

  const { data: kantoor } = await serviceClient
    .from('kantoren')
    .select('huisstijl_json')
    .eq('id', kantoorId)
    .single()
  const bestaandeRegels = (kantoor?.huisstijl_json as HuisstijlConfig | null)?.geleerde_regels

  try {
    const regels = await distilleerBewerkingsregels(
      edits.map(e => ({ sleutel: e.sleutel, origineel: e.origineel, bewerkt: e.bewerkt })),
      bestaandeRegels,
    )
    if (!regels) return NextResponse.json({ error: 'Kon geen regels afleiden. Probeer het later opnieuw.' }, { status: 502 })
    return NextResponse.json({ regels, ids: edits.map(e => e.id), aantal: edits.length })
  } catch {
    return NextResponse.json({ error: 'Analyse mislukt. Probeer het later opnieuw.' }, { status: 500 })
  }
}
