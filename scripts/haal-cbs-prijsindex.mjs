/**
 * Haalt de CBS-prijsindexreeks op (item 4.2, docs/roadmap.md § 3.3): tabel
 * 85792NED "Bestaande koopwoningen; verkoopprijzen, prijsindex 2020=100,
 * regio" via de CBS-OData-API, en schrijft haar weg als `CbsIndexReeks`
 * (kwartaal → indexcijfer) naar `lib/cbsPrijsindexData.json`, die
 * `lib/cbsPrijsindex.ts` als terugval inleest.
 *
 * De regiocode wordt uit de OData-metadata (`/RegioS`) gehaald, niet geraden:
 * dit script zoekt de rij waarvan de titel `REGIO_TITEL` bevat en gebruikt
 * diens `Key`. Werkgebied van het demo-/i4housing-kantoor (Wassenaar, Den
 * Haag, Voorschoten, Leidschendam, Rijswijk) — de tabel bevat geen fijnmaziger
 * regio dan de gemeente 's-Gravenhage zelf (naast de provincie Zuid-Holland
 * en landelijk), dus 's-Gravenhage is de beste beschikbare match: de
 * kernstad van dat hele werkgebied. Zie RESULTAAT hieronder voor het
 * volledige overzicht van beschikbare regio's in deze tabel, mocht een andere
 * keuze ooit beter passen.
 *
 * Alleen-lezend richting het CBS; schrijft alléén naar het lokale
 * data-bestand. Geen Supabase-toegang nodig.
 *
 *   node scripts/haal-cbs-prijsindex.mjs
 *   node scripts/haal-cbs-prijsindex.mjs --regio="Zuid-Holland"   # andere regio proberen
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

const TABEL_ID = '85792NED'
const BASIS = `https://opendata.cbs.nl/ODataApi/odata/${TABEL_ID}`
const UIT_PAD = path.join(PROJECT_ROOT, 'lib', 'cbsPrijsindexData.json')

const regioArg = process.argv.find(a => a.startsWith('--regio='))
const REGIO_TITEL = regioArg ? regioArg.slice('--regio='.length) : "'s-Gravenhage"

async function haalJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CBS-API gaf ${res.status} ${res.statusText} voor ${url}`)
  return res.json()
}

function naarKwartaal(perioden) {
  // "2026KW02" -> "2026-Q2"; annuale rijen ("2026JJ00") slaan we over.
  const m = /^(\d{4})KW0([1-4])$/.exec(perioden)
  return m ? `${m[1]}-Q${m[2]}` : null
}

async function main() {
  console.log(`[cbs] Metadata ophalen voor tabel ${TABEL_ID} (RegioS)…`)
  const regioMeta = await haalJson(`${BASIS}/RegioS`)
  const regios = regioMeta.value ?? []
  console.log(`[cbs] ${regios.length} regio's in de tabel:`)
  for (const r of regios) console.log(`  ${r.Key.trim().padEnd(8)} ${r.Title}`)

  const match = regios.find(r => r.Title.toLowerCase().includes(REGIO_TITEL.toLowerCase()))
  if (!match) {
    throw new Error(
      `Geen regio in 85792NED/RegioS met titel die "${REGIO_TITEL}" bevat — kies een van de titels hierboven via --regio="…"`,
    )
  }
  const regioCode = match.Key.trim()
  console.log(`[cbs] Regio gekozen: "${match.Title}" (${regioCode})`)

  console.log(`[cbs] Reeks ophalen voor ${regioCode}…`)
  const data = await haalJson(`${BASIS}/TypedDataSet?$filter=RegioS eq '${regioCode}'&$top=10000`)
  const rijen = data.value ?? []

  const reeks = {}
  let aantalKwartalen = 0
  for (const rij of rijen) {
    const kwartaal = naarKwartaal(rij.Perioden)
    if (!kwartaal) continue
    const waarde = rij.PrijsindexVerkoopprijzen_1
    if (typeof waarde !== 'number') continue
    reeks[kwartaal] = waarde
    aantalKwartalen++
  }

  if (aantalKwartalen === 0) {
    throw new Error(`Geen kwartaalrijen gevonden voor regio ${regioCode} — controleer of PrijsindexVerkoopprijzen_1 nog de juiste kolomnaam is.`)
  }

  const kwartalenGesorteerd = Object.keys(reeks).sort()
  const output = {
    _bron: {
      tabel: TABEL_ID,
      titel: 'Bestaande koopwoningen; verkoopprijzen, prijsindex 2020=100, regio',
      regio_code: regioCode,
      regio_titel: match.Title,
      opgehaald_op: new Date().toISOString(),
      url: `${BASIS}/TypedDataSet?$filter=RegioS eq '${regioCode}'`,
    },
    reeks,
  }

  await writeFile(UIT_PAD, JSON.stringify(output, null, 2) + '\n', 'utf-8')
  console.log(`[cbs] ${aantalKwartalen} kwartalen (${kwartalenGesorteerd[0]} t/m ${kwartalenGesorteerd[kwartalenGesorteerd.length - 1]}) weggeschreven naar ${path.relative(PROJECT_ROOT, UIT_PAD)}`)
}

main().catch(err => {
  console.error(`[cbs] Mislukt: ${err.message}`)
  console.error('[cbs] lib/cbsPrijsindex.ts blijft zonder terugvalreeks werken (factorCbs geeft dan overal null, met waarschuwing in de uitkomst) totdat dit script opnieuw succesvol draait.')
  process.exitCode = 1
})
