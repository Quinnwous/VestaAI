/**
 * Terugval-prijsindex: CBS "Prijsindex bestaande koopwoningen; regio"
 * (roadmap v2 item 4.2). Alleen gebruikt als de eigen regionale index voor
 * een kwartaal niet betrouwbaar is (n < 30 in het venster, zie
 * `lib/prijsindex.ts`).
 *
 * TODO (item 4.2, Sonnet): zoek de actuele StatLine-tabel op via de
 * CBS-OData-catalogus (https://opendata.cbs.nl/ODataCatalog/Tables, filter op
 * Title "Bestaande koopwoningen" + "regio") en zet de tabel-id hieronder in
 * `CBS_TABEL_ID` met bronvermelding en de gebruikte regio-code
 * (COROP/provincie waarin het werkgebied valt). Niet uit het hoofd invullen.
 * De reeks wordt één keer per kwartaal opgehaald (script) en als
 * `CbsIndexReeks` opgeslagen; deze module rekent er alleen mee.
 */

import type { Kwartaal } from './prijsindex'
import { kwartaalNummer } from './prijsindex'

export const CBS_TABEL_ID: string | null = null // TODO item 4.2

/** Indexcijfer per kwartaal (basis is irrelevant; alleen de verhouding telt). */
export type CbsIndexReeks = Record<Kwartaal, number>

export function factorCbs(reeks: CbsIndexReeks, van: Kwartaal, naar: Kwartaal): number | null {
  const a = reeks[van]
  const b = reeks[naar] ?? laatsteVoor(reeks, naar)
  if (!a || !b || a <= 0) return null
  return b / a
}

function laatsteVoor(reeks: CbsIndexReeks, k: Kwartaal): number | null {
  const doel = kwartaalNummer(k)
  let beste: { nr: number; waarde: number } | null = null
  for (const [kw, waarde] of Object.entries(reeks)) {
    const nr = kwartaalNummer(kw)
    if (nr <= doel && (!beste || nr > beste.nr)) beste = { nr, waarde }
  }
  return beste?.waarde ?? null
}
