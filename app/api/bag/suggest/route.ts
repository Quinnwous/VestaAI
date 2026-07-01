import { NextRequest, NextResponse } from 'next/server'

const BAG_BASE = 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2'

export interface BagSuggestie {
  label: string
  adresseerbaarobject_id: string | null
  nummeraanduiding_id: string | null
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 3) {
    return NextResponse.json([] as BagSuggestie[])
  }

  const apiKey = process.env.KADASTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Kadaster API-sleutel niet geconfigureerd' }, { status: 503 })
  }

  const res = await fetch(
    `${BAG_BASE}/adressen?zoekresultaat=${encodeURIComponent(q)}&page=1&pageSize=6`,
    { headers: { 'X-Api-Key': apiKey, Accept: 'application/hal+json' } },
  ).catch(() => null)

  if (!res?.ok) return NextResponse.json([] as BagSuggestie[])

  const data = await res.json()
  const adressen: Record<string, unknown>[] = data?._embedded?.adressen ?? []

  const suggesties: BagSuggestie[] = adressen.map(a => {
    const straat = a.openbareRuimteNaam as string ?? ''
    const nr = a.huisnummer as number ?? ''
    const letter = a.huisletter as string ?? ''
    const toevoeging = a.huisnummertoevoeging as string ?? ''
    const postcode = a.postcode as string ?? ''
    const woonplaats = a.woonplaatsNaam as string ?? ''
    const label = [
      `${straat} ${nr}${letter}${toevoeging ? `-${toevoeging}` : ''}`.trim(),
      postcode,
      woonplaats,
    ]
      .filter(Boolean)
      .join(', ')

    return {
      label,
      adresseerbaarobject_id: (a.adresseerbaarObjectIdentificatie as string) ?? null,
      nummeraanduiding_id: (a.nummeraanduidingIdentificatie as string) ?? null,
    }
  })

  return NextResponse.json(suggesties)
}
