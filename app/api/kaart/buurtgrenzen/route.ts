import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { meldFout } from '@/lib/fouten'
import {
  bboxTeGroot,
  buurtenItemsUrl,
  naarBuurtenGeoJSON,
  parseBboxParam,
  statusVoorHttpFout,
} from '@/lib/buurtgrenzen'

// Proxy naar PDOK (CBS Wijken en Buurten, OGC API Features) voor de
// schakelbare "Buurtgrenzen"-laag op de verkoopkaart (lib/buurtgrenzen.ts).
// Twee redenen om dit via een eigen route te doen i.p.v. rechtstreeks vanuit
// de browser: (1) de CBS-collectie levert 250+ statistiekkolommen per buurt
// die we hier weggooien — 5 buurten ongefilterd is al ~265 kB; (2) een eigen
// Cache-Control laat Vercel's CDN dezelfde bbox een dag cachen (de
// wijk/buurt-indeling verandert hoogstens jaarlijks).
const FETCH_TIMEOUT_MS = 4000

export async function GET(req: NextRequest) {
  // Zie app/api/bag/route.ts voor de reden van deze tweede laag: middleware
  // redirect een browser-navigatie al, maar geeft een fetch-aanroep vanuit de
  // client daarbij een HTML-redirect terug i.p.v. een nette 401.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const bbox = parseBboxParam(req.nextUrl.searchParams.get('bbox'))
  if (!bbox) {
    return NextResponse.json({ status: 'mislukt', error: 'bbox verplicht: west,south,east,north' }, { status: 400 })
  }

  if (bboxTeGroot(bbox)) {
    return NextResponse.json({ status: 'te_ver_uitgezoomd' })
  }

  try {
    const res = await fetch(buurtenItemsUrl(bbox), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) {
      const status = statusVoorHttpFout(res.status)
      if (status === 'mislukt') meldFout('buurtgrenzen', new Error(`PDOK antwoordde HTTP ${res.status}`), { bbox })
      console.error(`[buurtgrenzen] PDOK antwoordde HTTP ${res.status} → ${status}`)
      return NextResponse.json({ status })
    }

    const json = await res.json()
    const data = naarBuurtenGeoJSON(json)
    if (!data) {
      console.error('[buurtgrenzen] onherkenbare respons van PDOK, kan niet naar GeoJSON')
      meldFout('buurtgrenzen', new Error('Onherkenbare PDOK-respons'), { bbox })
      return NextResponse.json({ status: 'mislukt' })
    }

    const status = data.features.length === 0 ? 'leeg' : 'ok'
    return NextResponse.json(
      { status, data },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    )
  } catch (err) {
    const timeout = err instanceof Error && err.name === 'TimeoutError'
    console.error(`[buurtgrenzen] fetch mislukt (${timeout ? 'timeout' : 'fout'})`, err)
    meldFout('buurtgrenzen', err, { bbox })
    return NextResponse.json({ status: 'mislukt' })
  }
}
