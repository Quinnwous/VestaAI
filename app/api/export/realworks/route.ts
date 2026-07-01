import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { PropertyInput, ContentOutput } from '@/lib/schemas'

export const maxDuration = 10

// ─── Adres parser ─────────────────────────────────────────────────────────────
// Probeert "Kerkstraat 10 A, 1234 AB Amsterdam" te splitsen
// Output: { straat, huisnummer, huisnummer_toevoeging, postcode, woonplaats }

interface AdresDelen {
  straat: string
  huisnummer: string
  huisnummer_toevoeging: string
  postcode: string
  woonplaats: string
}

function parseAdres(adres: string): AdresDelen {
  const postcodePlaatsMatch = adres.match(/,?\s*(\d{4}\s*[A-Z]{2})\s+([^,]+)$/)
  const plaatsAlleenMatch = adres.match(/,\s*([^,\d]+)$/)

  let straatnummerDeel = adres
  let postcode = ''
  let woonplaats = ''

  if (postcodePlaatsMatch) {
    straatnummerDeel = adres.slice(0, adres.indexOf(postcodePlaatsMatch[0])).trim().replace(/,$/, '').trim()
    postcode = postcodePlaatsMatch[1].replace(/\s+/, ' ').trim()
    woonplaats = postcodePlaatsMatch[2].trim()
  } else if (plaatsAlleenMatch) {
    straatnummerDeel = adres.slice(0, adres.lastIndexOf(',')).trim()
    woonplaats = plaatsAlleenMatch[1].trim()
  }

  const nummerMatch = straatnummerDeel.match(/^(.*?)\s+(\d+)\s*([A-Za-z0-9\-]*)$/)
  if (nummerMatch) {
    return {
      straat: nummerMatch[1].trim(),
      huisnummer: nummerMatch[2],
      huisnummer_toevoeging: nummerMatch[3].trim(),
      postcode,
      woonplaats,
    }
  }

  return { straat: straatnummerDeel, huisnummer: '', huisnummer_toevoeging: '', postcode, woonplaats }
}

// ─── Woningtype mapping ───────────────────────────────────────────────────────

function mapWoningtype(woningtype: string): { soortObject: string; soortWoonhuis: string } {
  const lower = woningtype.toLowerCase()

  if (lower.includes('appartement') || lower.includes('flat') || lower.includes('penthouse')) {
    return { soortObject: 'Appartement', soortWoonhuis: '' }
  }
  if (lower.includes('studio')) {
    return { soortObject: 'Appartement', soortWoonhuis: 'Studio' }
  }

  const woonhuisMap: Array<[string[], string]> = [
    [['vrijstaand', 'villa'], 'Vrijstaande woning'],
    [['twee-onder-een-kap', '2-onder-1-kap', 'half vrijstaand', 'halfvrijstaand'], 'Twee-onder-een-kapwoning'],
    [['hoek'], 'Hoekwoning'],
    [['tussenwoning', 'tussen'], 'Tussenwoning'],
    [['bungalow'], 'Bungalow'],
    [['boerderij', 'landhuis'], 'Woonboerderij'],
    [['geschakeld'], 'Geschakelde woning'],
  ]

  for (const [termen, type] of woonhuisMap) {
    if (termen.some(t => lower.includes(t))) {
      return { soortObject: 'Woonhuis', soortWoonhuis: type }
    }
  }

  return { soortObject: 'Woonhuis', soortWoonhuis: 'Tussenwoning' }
}

// ─── XML builder ─────────────────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildRealworksXml(objectId: string, input: PropertyInput, output: ContentOutput): string {
  const adres = parseAdres(input.adres)
  const { soortObject, soortWoonhuis } = mapWoningtype(input.woningtype)
  const exportdatum = new Date().toISOString().slice(0, 10)

  const woonhuisRegel = soortWoonhuis
    ? `      <Soort-Woonhuis>${esc(soortWoonhuis)}</Soort-Woonhuis>\n`
    : ''

  const openHuisRegel = input.open_huis_datum
    ? `      <OpenHuis>\n        <Datum>${esc(input.open_huis_datum)}</Datum>\n${input.open_huis_tijd ? `        <Tijd>${esc(input.open_huis_tijd)}</Tijd>\n` : ''}      </OpenHuis>\n`
    : ''

  const buurtRegel = output.buurtomschrijving
    ? `      <BuurtOmschrijving>${esc(output.buurtomschrijving)}</BuurtOmschrijving>\n`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<CasaXML versie="1.0" producent="VestaAI" exportdatum="${exportdatum}">
  <Aanbod type="Woning">
    <Object>
      <Referentienummer>${esc(objectId)}</Referentienummer>
      <ExternAanbodnummer>${esc(objectId)}</ExternAanbodnummer>

      <Overdracht>
        <Status>Beschikbaar</Status>
        <Koopprijs>${input.vraagprijs}</Koopprijs>
        <KoopAanvaardig>kosten koper</KoopAanvaardig>
      </Overdracht>

      <Adres>
        <Straat>${esc(adres.straat)}</Straat>
        <Huisnummer>${esc(adres.huisnummer)}</Huisnummer>
        <HuisnummerToevoeging>${esc(adres.huisnummer_toevoeging)}</HuisnummerToevoeging>
        <Postcode>${esc(adres.postcode)}</Postcode>
        <Woonplaats>${esc(adres.woonplaats)}</Woonplaats>
      </Adres>

      <ObjectType>
        <Soort-Object>${esc(soortObject)}</Soort-Object>
${woonhuisRegel}      </ObjectType>

      <Wonen>
        <WoonOppervlakte>${input.oppervlak_m2}</WoonOppervlakte>
        <AantalKamers>${input.kamers}</AantalKamers>
        <Bouwjaar>${input.bouwjaar}</Bouwjaar>
        <Energieklasse>${esc(input.energielabel)}</Energieklasse>
      </Wonen>

      <Teksten>
        <Aanbiedingstekst>${esc(output.funda_tekst)}</Aanbiedingstekst>
${buurtRegel}      </Teksten>

${openHuisRegel}    </Object>
  </Aanbod>
</CasaXML>`
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const objectId = req.nextUrl.searchParams.get('id')
  if (!objectId) {
    return NextResponse.json({ error: 'id ontbreekt' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) {
    return NextResponse.json({ error: 'Makelaar niet gevonden' }, { status: 404 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('id, kantoor_id, input_json, outputs_json')
    .eq('id', objectId)
    .single()

  if (!object || object.kantoor_id !== makelaar.kantoor_id) {
    return NextResponse.json({ error: 'Object niet gevonden' }, { status: 404 })
  }

  const xml = buildRealworksXml(
    object.id,
    object.input_json as PropertyInput,
    object.outputs_json as ContentOutput,
  )

  const bestandsnaam = `realworks_${objectId.slice(0, 8)}.xml`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
    },
  })
}
