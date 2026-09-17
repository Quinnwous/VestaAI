/**
 * Terugval-prijsindex: CBS "Bestaande koopwoningen; verkoopprijzen,
 * prijsindex 2020=100, regio" (roadmap v2 item 4.2). Alleen gebruikt als de
 * eigen regionale index voor een kwartaal niet betrouwbaar is (n < 30 in het
 * venster, zie `lib/prijsindex.ts`).
 *
 * Bron (opgezocht 17 sep 2026 via de CBS-catalogus):
 * - StatLine-tabel **85792NED** — landsdeel, provincie en de 4 grote gemeenten,
 *   per kwartaal, ± 22 dagen na afloop van het kwartaal bijgewerkt.
 *   https://opendata.cbs.nl/statline/portal.html?_la=nl&_catalog=CBS&tableId=85792NED
 * - OData: https://opendata.cbs.nl/ODataApi/odata/85792NED/TypedDataSet
 *   (perioden als `2026KW02`; regiocodes in …/85792NED/RegioS — voor
 *   Wassenaar/Den Haag e.o. de provincie Zuid-Holland; controleer de exacte
 *   code in die metadata, niet raden).
 * - Fijnmaziger (COROP "Agglomeratie 's-Gravenhage"): tabel "…prijsindex
 *   2020=100, regio (COROP)" op data.overheid.nl (dataset 46427); id in de
 *   catalogus opzoeken als de provincie te grof blijkt.
 *
 * TODO (item 4.2, Sonnet): ophaalscript `scripts/haal-cbs-prijsindex.mjs` dat
 * de reeks één keer per kwartaal ophaalt en als `CbsIndexReeks` opslaat
 * (kwartaal → indexcijfer). Deze module rekent er alleen mee.
 */

import type { Kwartaal } from './prijsindex'
import { kwartaalNummer } from './prijsindex'

export const CBS_TABEL_ID = '85792NED'
export const CBS_TABEL_TITEL = 'Bestaande koopwoningen; verkoopprijzen, prijsindex 2020=100, regio'

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
