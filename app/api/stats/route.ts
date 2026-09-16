import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export async function GET() {
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
  const zesMaandenGeleden = new Date()
  zesMaandenGeleden.setMonth(zesMaandenGeleden.getMonth() - 6)
  zesMaandenGeleden.setDate(1)
  zesMaandenGeleden.setHours(0, 0, 0, 0)

  const [objectenResult, makeLaarsResult] = await Promise.all([
    serviceClient
      .from('objecten')
      .select('id, makelaar_id, created_at, status')
      .eq('kantoor_id', makelaar.kantoor_id)
      .gte('created_at', zesMaandenGeleden.toISOString())
      .order('created_at', { ascending: true }),
    serviceClient
      .from('makelaars')
      .select('id, name, email')
      .eq('kantoor_id', makelaar.kantoor_id),
  ])

  const objecten = objectenResult.data ?? []
  const makelaars = makeLaarsResult.data ?? []

  // Per maand tellen
  const perMaand: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    perMaand[key] = 0
  }
  for (const obj of objecten) {
    const d = new Date(obj.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in perMaand) perMaand[key]++
  }

  // Per makelaar tellen
  const perMakelaar: Record<string, number> = {}
  for (const obj of objecten) {
    if (obj.makelaar_id) {
      perMakelaar[obj.makelaar_id] = (perMakelaar[obj.makelaar_id] ?? 0) + 1
    }
  }

  const makelaarStats = makelaars.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    objecten: perMakelaar[m.id] ?? 0,
  })).sort((a, b) => b.objecten - a.objecten)

  const eersteVanDeMaand = new Date()
  eersteVanDeMaand.setDate(1)
  eersteVanDeMaand.setHours(0, 0, 0, 0)

  const [totaalResult, gepubliceerdResult, dezeMaandResult] = await Promise.all([
    serviceClient
      .from('objecten')
      .select('id', { count: 'exact', head: true })
      .eq('kantoor_id', makelaar.kantoor_id),
    serviceClient
      .from('objecten')
      .select('id', { count: 'exact', head: true })
      .eq('kantoor_id', makelaar.kantoor_id)
      .eq('status', 'published'),
    serviceClient
      .from('objecten')
      .select('id', { count: 'exact', head: true })
      .eq('kantoor_id', makelaar.kantoor_id)
      .gte('created_at', eersteVanDeMaand.toISOString()),
  ])

  const dezeMaand = dezeMaandResult.count ?? 0

  // API-kosten schatting (€0,08 per content-set op Sonnet 4.6) — intern
  // referentiecijfer, geen abonnementsprijs of -budget meer aan gekoppeld.
  const KOSTEN_PER_OBJECT = 0.08
  const kostenschatting = {
    deze_maand: Math.round(dezeMaand * KOSTEN_PER_OBJECT * 100) / 100,
    per_maand: Object.fromEntries(
      Object.entries(perMaand).map(([k, v]) => [k, Math.round(v * KOSTEN_PER_OBJECT * 100) / 100])
    ),
    prijs_per_object: KOSTEN_PER_OBJECT,
  }

  return NextResponse.json({
    perMaand,
    makelaarStats,
    totaalAltijd: totaalResult.count ?? 0,
    gepubliceerd: gepubliceerdResult.count ?? 0,
    dezeMaand,
    kostenschatting,
    periode: 'laatste 6 maanden',
  })
}
