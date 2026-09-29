import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { meldFout } from '@/lib/fouten'
import { bagAdressen, bagHeaders, bagLabel, bagUitgebreidUrl, bagZoekUrl, parseUitgebreid } from '@/lib/bag'

// BAG Kadaster API (vereist KADASTER_API_KEY in .env.local)
// Registreer gratis op: https://www.kadaster.nl/zakelijk/producten/adressen-en-gebouwen/bag-api-individuele-bevragingen

export async function GET(req: NextRequest) {
  // Middleware stuurt niet-ingelogde bezoekers al door naar /login, maar geeft
  // een fetch-aanroep vanuit de client daarbij een HTML-redirect terug i.p.v.
  // een nette 401 — en biedt geen bescherming tegen een directe aanroep buiten
  // de browser om. Expliciete check hier is de tweede laag (masterplan fase 0.5,
  // docs/roadmap.md): zonder deze check kon iedereen deze route aanroepen en
  // ongemerkt het Kadaster-quotum verbruiken.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const adres = req.nextUrl.searchParams.get('adres')
  if (!adres) {
    return NextResponse.json({ error: 'Adres verplicht' }, { status: 400 })
  }

  const apiKey = process.env.KADASTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Kadaster API-sleutel niet geconfigureerd' }, { status: 503 })
  }

  // Stap 1: zoek het adres (vrije tekst via `q`, zie lib/bag.ts)
  const headers = bagHeaders(apiKey)
  const zoekRes = await fetch(bagZoekUrl(adres), { headers }).catch(err => {
    meldFout('bag', err)
    return null
  })
  if (!zoekRes?.ok) {
    if (zoekRes) meldFout('bag', new Error(`BAG-zoeken antwoordde HTTP ${zoekRes.status}`))
    return NextResponse.json({ error: 'BAG niet bereikbaar' }, { status: 502 })
  }

  const adresObject = bagAdressen(await zoekRes.json())[0]
  if (!adresObject) {
    return NextResponse.json({ error: 'Adres niet gevonden' }, { status: 404 })
  }
  const nummeraanduidingId = adresObject.nummeraanduidingIdentificatie
  if (!nummeraanduidingId) {
    return NextResponse.json({ error: 'Geen nummeraanduiding-ID gevonden' }, { status: 404 })
  }

  // Stap 2: bouwjaar (van het pand) en oppervlakte (van het verblijfsobject) in één call
  const uitgebreidRes = await fetch(bagUitgebreidUrl(nummeraanduidingId), { headers }).catch(err => {
    meldFout('bag', err)
    return null
  })
  if (!uitgebreidRes?.ok) {
    if (uitgebreidRes) meldFout('bag', new Error(`BAG-adressenuitgebreid antwoordde HTTP ${uitgebreidRes.status}`))
    return NextResponse.json({ error: 'Woninggegevens niet gevonden in BAG' }, { status: 502 })
  }
  const { bouwjaar, oppervlak_m2 } = parseUitgebreid(await uitgebreidRes.json())

  // Stap 3: energielabel ophalen via publieke EP-Online API (geen API-key nodig)
  let energielabel: string | null = null
  const postcode = adresObject.postcode ?? undefined
  const huisnummer = adresObject.huisnummer
  if (postcode && huisnummer) {
    try {
      const epRes = await fetch(
        `https://public.ep-online.nl/api/v4/PandEnergielabel/${encodeURIComponent(String(postcode).replace(/\s/g, ''))}/${huisnummer}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) },
      )
      if (epRes.ok) {
        const epData = await epRes.json()
        energielabel = epData?.labelLetter ?? epData?.[0]?.labelLetter ?? null
      }
    } catch (error) {
      // EP-Online is optioneel — stille fallback naar null
      meldFout('bag:ep-online', error)
    }
  }

  return NextResponse.json({
    bouwjaar,
    oppervlak_m2,
    energielabel: energielabel ?? null,
    adres_volledig: adresObject.openbareRuimteNaam ? bagLabel(adresObject) : null,
  })
}
