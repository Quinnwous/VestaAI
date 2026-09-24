/**
 * Gedeelde getal-/datumopmaak voor élke interactieve verkenner (item 6.1,
 * docs/roadmap.md § 3.7 — bindend: "lib/opmaak.ts (euro, procent, dagen,
 * datum, m2, nlNL) voor élk getal"). Poort van `docs/ontwerp/kit.js` §
 * Opmaak. Puur, geen React — te gebruiken in server- én clientcomponenten,
 * StatTiles, tooltips en het kwartaalbericht-feitenblad (6.4).
 */

/** Gedeelde `Intl.NumberFormat('nl-NL')` — hergebruiken i.p.v. steeds een nieuwe aanmaken. */
export const nlNL = new Intl.NumberFormat('nl-NL')

/** `€ 1.234.567` — hele euro's, nooit centen (transactieprijzen zijn hele bedragen). */
export function euro(waarde: number | null | undefined): string {
  if (waarde == null || Number.isNaN(waarde)) return '—'
  return '€ ' + nlNL.format(Math.round(waarde))
}

/**
 * Compacte euro-notatie voor y-assen en tegels: `€ 850 k` / `€ 1,2 mln` /
 * `€ 8,7 k`. Hooguit één decimaal (fix review item 6.1, 24 sep 2026: `€
 * 1,33 mln` was net te lang voor de y-as en brak af over twee regels) —
 * ronde bedragen tonen geen overbodige `,0`.
 */
export function euroKort(waarde: number | null | undefined): string {
  if (waarde == null || Number.isNaN(waarde)) return '—'
  if (Math.abs(waarde) >= 1_000_000) {
    return '€ ' + (waarde / 1_000_000).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' mln'
  }
  return '€ ' + (waarde / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' k'
}

/** `+3,2%` / `-1,0%` — `teken = false` laat het `+` bij een positieve waarde weg. */
export function procent(waarde: number | null | undefined, teken = true): string {
  if (waarde == null || Number.isNaN(waarde)) return '—'
  const voorteken = teken && waarde > 0 ? '+' : ''
  return voorteken + waarde.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

/** `42 dgn`. */
export function dagen(waarde: number | null | undefined): string {
  if (waarde == null || Number.isNaN(waarde)) return '—'
  return Math.round(waarde) + ' dgn'
}

const MAAND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

/** `12 sep 2026` — voor "data t/m" en het kwartaalbericht. Aanvaardt een ISO-string of Date. */
export function datum(waarde: string | Date | null | undefined): string {
  if (waarde == null) return '—'
  const d = typeof waarde === 'string' ? new Date(waarde) : waarde
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getUTCDate()} ${MAAND_KORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** `120 m²`. */
export function m2(waarde: number | null | undefined): string {
  if (waarde == null || Number.isNaN(waarde)) return '—'
  return nlNL.format(Math.round(waarde)) + ' m²'
}

/** `450 m` onder de kilometer, anders `1,2 km` (item 10.3: voorzieningen op afstand in het dossier). */
export function afstand(waarde: number | null | undefined): string {
  if (waarde == null || Number.isNaN(waarde)) return '—'
  if (Math.abs(waarde) >= 1000) {
    return (waarde / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + ' km'
  }
  return nlNL.format(Math.round(waarde)) + ' m'
}

/**
 * `23 sep 2026 om 14:32` — datum + tijd (bv. "opgehaald op"-tijdstempels).
 * Leest de UTC-componenten uit net als `datum()` hierboven — zelfde
 * hydratie-afweging (server en client komen altijd op dezelfde weergave uit,
 * ongeacht hun eigen tijdzone), consistent gehouden binnen deze module.
 */
export function datumTijd(waarde: string | Date | null | undefined): string {
  if (waarde == null) return '—'
  const d = typeof waarde === 'string' ? new Date(waarde) : waarde
  if (Number.isNaN(d.getTime())) return '—'
  const uur = String(d.getUTCHours()).padStart(2, '0')
  const minuut = String(d.getUTCMinutes()).padStart(2, '0')
  return `${datum(d)} om ${uur}:${minuut}`
}

/** `"2026-Q1"` → `"Q1 2026"` — leesbare kwartaallabel voor de x-as en tooltips. */
export function kwartaalLabel(kwartaal: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(kwartaal)
  if (!m) return kwartaal
  return `Q${m[2]} ${m[1]}`
}

/**
 * "Mooie" as-stap voor grafieken (recharts `ticks`): rondt een ruwe stap af
 * naar 1/2/5 × 10^n, zodat de y-as nette getallen toont i.p.v. 733,4. Poort
 * van `kit.js` `mooieStap()`.
 */
export function mooieStap(ruw: number): number {
  if (!Number.isFinite(ruw) || ruw <= 0) return 1
  const macht = Math.pow(10, Math.floor(Math.log10(ruw)))
  const r = ruw / macht
  const stap = r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10
  return stap * macht
}
