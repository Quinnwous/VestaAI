import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { meldFout } from '@/lib/fouten'
import { bagAdressen, bagHeaders, bagZoekUrl, naarSuggestie, type BagSuggestie } from '@/lib/bag'

export type { BagSuggestie }

export async function GET(req: NextRequest) {
  // Zie app/api/bag/route.ts — zelfde reden voor deze check (masterplan fase 0.5).
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 3) {
    return NextResponse.json([] as BagSuggestie[])
  }

  const apiKey = process.env.KADASTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Kadaster API-sleutel niet geconfigureerd' }, { status: 503 })
  }

  const res = await fetch(bagZoekUrl(q), { headers: bagHeaders(apiKey) }).catch(err => {
    meldFout('bag/suggest', err)
    return null
  })
  if (!res) return NextResponse.json([] as BagSuggestie[])
  if (!res.ok) {
    // Niet stil opvouwen tot "geen suggesties": een 4xx betekent dat de aanroep
    // zelf stuk is (zo bleef `zoekresultaat` maandenlang onopgemerkt, lib/bag.ts).
    meldFout('bag/suggest', new Error(`BAG antwoordde HTTP ${res.status}`))
    return NextResponse.json([] as BagSuggestie[])
  }

  const suggesties = bagAdressen(await res.json()).slice(0, 6).map(naarSuggestie)
  return NextResponse.json(suggesties)
}
