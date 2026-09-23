/**
 * Gedeelde getalopmaak voor de interactieve verkenners (docs/roadmap.md §
 * 3.7: "élk getal" via deze module). 1-op-1 overgenomen van
 * `docs/ontwerp/kit.js` (`K.euro`/`K.procent`/`K.dagen`/`K.datum`/`K.m2`/
 * `K.nl`) zodat de geport­eerde schermen exact dezelfde notatie tonen als het
 * prototype. Puur functies, geen React — zie lib/opmaak.test.ts.
 *
 * ⚠️ `datum()` formatteert een gegeven `Date`, roept zelf nooit `new Date()`
 * voor "nu" aan (zie CLAUDE.md § new Date()-les) — de aanroeper geeft een
 * server-berekende of expliciete datum door.
 */

const MAAND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

/** Gedeelde `Intl.NumberFormat('nl-NL')` — gebruik deze i.p.v. zelf een formatter aan te maken. */
export const nlNL = new Intl.NumberFormat('nl-NL')

/** `€ 1.234.567` — `—` bij `null`. Geen decimalen (zoals kit.js `K.euro`). */
export function euro(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  return '€ ' + nlNL.format(Math.round(v))
}

/**
 * `+1,3%` / `-1,3%` / `1,3%` — `teken = false` onderdrukt het `+` bij een
 * positieve waarde (het minteken staat er via `toLocaleString` altijd bij).
 * `—` bij `null`.
 */
export function procent(v: number | null | undefined, teken = true): string {
  if (v == null || Number.isNaN(v)) return '—'
  const teken_prefix = teken && v > 0 ? '+' : ''
  return teken_prefix + v.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

/** `124 dgn` — `—` bij `null`. Afgerond op hele dagen. */
export function dagen(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  return Math.round(v) + ' dgn'
}

/** `12 sep 2026` — Nederlandse maandafkorting, zoals kit.js `K.datum`. */
export function datum(d: Date): string {
  return `${d.getDate()} ${MAAND_KORT[d.getMonth()]} ${d.getFullYear()}`
}

/** `140 m²` — `—` bij `null`. Afgerond op hele m². */
export function m2(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  return nlNL.format(Math.round(v)) + ' m²'
}
