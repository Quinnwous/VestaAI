import { NextRequest, NextResponse } from 'next/server'

// BAG Kadaster API (vereist KADASTER_API_KEY in .env.local)
// Registreer gratis op: https://www.kadaster.nl/zakelijk/producten/adressen-en-gebouwen/bag-api-individuele-bevragingen
const BAG_BASE = 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2'

export async function GET(req: NextRequest) {
  const adres = req.nextUrl.searchParams.get('adres')
  if (!adres) {
    return NextResponse.json({ error: 'Adres verplicht' }, { status: 400 })
  }

  const apiKey = process.env.KADASTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Kadaster API-sleutel niet geconfigureerd' }, { status: 503 })
  }

  // Stap 1: zoek nummeraanduiding op basis van adres
  const zoekRes = await fetch(
    `${BAG_BASE}/adressen?zoekresultaat=${encodeURIComponent(adres)}&page=1&pageSize=1`,
    {
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/hal+json',
      },
    },
  )

  if (!zoekRes.ok) {
    return NextResponse.json({ error: 'Adres niet gevonden in BAG' }, { status: 404 })
  }

  const zoekData = await zoekRes.json()
  const adressen = zoekData?._embedded?.adressen ?? []
  if (!adressen.length) {
    return NextResponse.json({ error: 'Adres niet gevonden' }, { status: 404 })
  }

  const adresObject = adressen[0]
  const nummeraanduidingId: string | undefined = adresObject?.nummeraanduidingIdentificatie

  if (!nummeraanduidingId) {
    return NextResponse.json({ error: 'Geen nummeraanduiding-ID gevonden' }, { status: 404 })
  }

  // Stap 2: verblijfsobject ophalen voor bouwjaar en oppervlakte
  const vboRes = await fetch(
    `${BAG_BASE}/verblijfsobjecten?nummeraanduidingIdentificatie=${nummeraanduidingId}&page=1&pageSize=1`,
    {
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/hal+json',
      },
    },
  )

  if (!vboRes.ok) {
    return NextResponse.json({ error: 'Verblijfsobject niet gevonden' }, { status: 404 })
  }

  const vboData = await vboRes.json()
  const vbos = vboData?._embedded?.verblijfsobjecten ?? []
  if (!vbos.length) {
    return NextResponse.json({ error: 'Geen verblijfsobject gevonden' }, { status: 404 })
  }

  const vbo = vbos[0]
  const oppervlakte: number | undefined = vbo?.oppervlakte
  const bouwjaar: number | undefined = vbo?.oorspronkelijkBouwjaar

  // Stap 3: energielabel ophalen via publieke EP-Online API (geen API-key nodig)
  let energielabel: string | null = null
  const postcode: string | undefined = adresObject?.postcode
  const huisnummer: string | number | undefined = adresObject?.huisnummer
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
    } catch {
      // EP-Online is optioneel — stille fallback naar null
    }
  }

  return NextResponse.json({
    bouwjaar: bouwjaar ?? null,
    oppervlak_m2: oppervlakte ?? null,
    energielabel: energielabel ?? null,
    adres_volledig: adresObject?.openbareRuimteNaam
      ? `${adresObject.openbareRuimteNaam} ${adresObject.huisnummer}${adresObject.huisletter ?? ''}, ${adresObject.woonplaatsNaam}`
      : null,
  })
}
