/**
 * Gedeelde filtervergelijkers (item: dubbele filtervergelijkers samenvoegen,
 * 28 sep 2026) — `bereikGelijk()` en de ordervrije lijstvergelijking stonden
 * als losse kopieën in `components/TransactiesZoeken.tsx`,
 * `components/MarktanalyseExplorer.tsx`, `components/ConcurrentieExplorer.tsx`
 * (generieke variant), `lib/marktanalyse.ts` en `lib/transactiesZoeken.ts`.
 * Hier samengevoegd tot één plek; gedrag ongewijzigd. `lib/verkoopkaart.ts`
 * en `components/VerkoopkaartExplorerV2.tsx` hadden ook nog hun eigen kopie
 * van `bereikGelijk` — die zijn sinds filter-poets (28 sep 2026) ook op deze
 * module overgeschakeld.
 *
 * ⚠️ Niet te verwarren met `plaatsenGelijk(a: string, b: string)` in
 * `lib/kerncijfers.ts` — dat vergelijkt twee plaatsnamen op schrijfwijze
 * (spelling-/hoofdletterongevoelig, met aliaslijst), geen lijsten. Deze
 * module heet daarom `verzamelingGelijk` in plaats van `plaatsenGelijk`, om
 * de twee niet door elkaar te laten lopen.
 */

/** Of twee getallenbereiken ([min, max]) gelijk zijn. */
export function bereikGelijk(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

/**
 * Ordervrije vergelijking van twee lijsten: gelijke lengte en dezelfde
 * elementen, ongeacht volgorde — checkbox-toggles (bv. de Plaats-filter)
 * kunnen de volgorde wijzigen zonder dat de selectie inhoudelijk afwijkt van
 * de standaard.
 */
export function verzamelingGelijk<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every(item => bSet.has(item))
}
