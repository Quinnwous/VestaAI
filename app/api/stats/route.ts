import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, role')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  if (makelaar.role !== 'admin') {
    return NextResponse.json({ error: 'Alleen admins hebben toegang tot statistieken' }, { status: 403 })
  }

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

  const [totaalResult, gepubliceerdResult, npsResult, dezeMaandResult, kantoorResult] = await Promise.all([
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
      .from('nps_responses')
      .select('score, feedback, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    serviceClient
      .from('objecten')
      .select('id', { count: 'exact', head: true })
      .eq('kantoor_id', makelaar.kantoor_id)
      .gte('created_at', eersteVanDeMaand.toISOString()),
    serviceClient
      .from('kantoren')
      .select('plan, trial_ends_at')
      .eq('id', makelaar.kantoor_id)
      .single(),
  ])

  const npsScores = (npsResult.data ?? []).map(r => r.score)
  const npsGemiddeld = npsScores.length > 0
    ? Math.round((npsScores.reduce((s, v) => s + v, 0) / npsScores.length) * 10) / 10
    : null

  // NPS score: promotors (9-10) - detractors (0-6) / totaal * 100
  const promotors = npsScores.filter(s => s >= 9).length
  const detractors = npsScores.filter(s => s <= 6).length
  const npsScore = npsScores.length > 0
    ? Math.round(((promotors - detractors) / npsScores.length) * 100)
    : null

  const kantoor = kantoorResult.data
  const plan = kantoor?.plan ?? 'starter'
  const trialEndsAt = kantoor?.trial_ends_at ?? null
  const isTrialActief = trialEndsAt ? new Date(trialEndsAt) > new Date() : false
  const dezeMaand = dezeMaandResult.count ?? 0
  const maandLimiet = plan === 'starter' ? 40 : null

  return NextResponse.json({
    perMaand,
    makelaarStats,
    totaalAltijd: totaalResult.count ?? 0,
    gepubliceerd: gepubliceerdResult.count ?? 0,
    plan,
    trialEndsAt,
    isTrialActief,
    dezeMaand,
    maandLimiet,
    nps: {
      gemiddeld: npsGemiddeld,
      score: npsScore,
      totaal: npsScores.length,
      recenteFeedback: (npsResult.data ?? [])
        .filter(r => r.feedback)
        .slice(0, 5)
        .map(r => ({ score: r.score, feedback: r.feedback, datum: r.created_at })),
    },
    periode: 'laatste 6 maanden',
  })
}
