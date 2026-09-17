/**
 * Terugval-prijsindex: CBS "Bestaande koopwoningen; verkoopprijzen,
 * prijsindex 2020=100, regio" (roadmap v2 item 4.2). Alleen gebruikt als de
 * eigen regionale index voor een kwartaal niet betrouwbaar is (n < 30 in het
 * venster, zie `lib/prijsindex.ts`).
 *
 * Bron (opgezocht 17 sep 2026 via de CBS-catalogus, regiocode via de
 * OData-metadata — niet geraden, zie `scripts/haal-cbs-prijsindex.mjs`):
 * - StatLine-tabel **85792NED** — landsdeel, provincie en 4 grote gemeenten
 *   (Amsterdam/Rotterdam/Utrecht/'s-Gravenhage), per kwartaal, ± 22 dagen na
 *   afloop van het kwartaal bijgewerkt.
 *   https://opendata.cbs.nl/statline/portal.html?_la=nl&_catalog=CBS&tableId=85792NED
 * - Regio: **GM0518 ('s-Gravenhage, gemeente)** — de tabel kent geen
 *   fijnmaziger regio dan de gemeente; 's-Gravenhage is de kernstad van het
 *   hele werkgebied (Wassenaar, Den Haag, Voorschoten, Leidschendam,
 *   Rijswijk) en dus de beste beschikbare match, preciezer dan de provincie
 *   Zuid-Holland (PV28, ook beschikbaar). `scripts/haal-cbs-prijsindex.mjs
 *   --regio="Zuid-Holland"` kiest die desgewenst.
 * - OData: https://opendata.cbs.nl/ODataApi/odata/85792NED/TypedDataSet
 *   (perioden als `2026KW02`, omgezet naar `2026-Q2`).
 *
 * `scripts/haal-cbs-prijsindex.mjs` haalt de reeks op en schrijft haar naar
 * `lib/cbsPrijsindexData.json` (niet gecommit; genereer opnieuw met dat
 * script — zie de bronvermelding in `_bron` van dat bestand). Deze module
 * leest dat bestand in en rekent er alleen mee; ontbreekt het bestand (script
 * nog niet gedraaid, of de CBS-API faalde), dan is `CBS_INDEX_REEKS` leeg en
 * geeft `factorCbs` overal `null` terug — de aanroeper (`berekenWaarderingV2`)
 * meldt dat al als waarschuwing ("geen tijdcorrectie toegepast").
 */

import type { Kwartaal } from './prijsindex'
import { kwartaalNummer } from './prijsindex'

export const CBS_TABEL_ID = '85792NED'
export const CBS_TABEL_TITEL = 'Bestaande koopwoningen; verkoopprijzen, prijsindex 2020=100, regio'
export const CBS_REGIO_CODE = 'GM0518'
export const CBS_REGIO_TITEL = "'s-Gravenhage (gemeente)"

/** Indexcijfer per kwartaal (basis is irrelevant; alleen de verhouding telt). */
export type CbsIndexReeks = Record<Kwartaal, number>

let cbsData: { _bron?: unknown; reeks?: Record<string, number> } | null = null
try {
  // Geen top-level await nodig (JSON-import is synchroon te bundelen); ontbreekt
  // het bestand (script nog niet gedraaid), dan valt dit terug op een lege reeks
  // i.p.v. de build te breken — zie bestandscommentaar hierboven.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- huidige regelnaam (was no-var-requires)
  cbsData = require('./cbsPrijsindexData.json')
} catch {
  cbsData = null
}

/**
 * De opgehaalde CBS-reeks (leeg object als `scripts/haal-cbs-prijsindex.mjs`
 * nog niet gedraaid heeft) — importeer deze constante i.p.v. zelf het
 * JSON-bestand te lezen.
 */
export const CBS_INDEX_REEKS: CbsIndexReeks = (cbsData?.reeks as CbsIndexReeks | undefined) ?? {}

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
