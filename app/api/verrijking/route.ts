import { NextRequest, NextResponse } from 'next/server'
import { fetchVerrijking } from '@/lib/verrijking'
import { createServerSupabaseClient } from '@/lib/supabase'
import { meldFout } from '@/lib/fouten'

export async function GET(req: NextRequest) {
  // Zie app/api/bag/route.ts — zelfde reden voor deze check (masterplan fase 0.5).
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const adres = req.nextUrl.searchParams.get('adres')
  if (!adres) {
    return NextResponse.json({ error: 'Adres verplicht' }, { status: 400 })
  }

  const oppervlakParam = req.nextUrl.searchParams.get('oppervlak')
  const oppervlak = oppervlakParam ? Number(oppervlakParam) : undefined

  try {
    const data = await fetchVerrijking(adres, oppervlak && !isNaN(oppervlak) ? oppervlak : undefined)
    return NextResponse.json(data)
  } catch (error) {
    const ref = meldFout('verrijking', error, { adres })
    return NextResponse.json({ error: 'Verrijking mislukt. Probeer het opnieuw.', ref }, { status: 500 })
  }
}
