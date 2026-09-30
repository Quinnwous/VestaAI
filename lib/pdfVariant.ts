/**
 * Item H4 — verkopersversie van de waardebepaling-pdf ("handout" van de
 * presentatiemodus, `docs/archief/specs/h4-verkopersversie-pdf.md`). Kleine, pure
 * hulpfuncties voor `app/api/pdf/waardebepaling/route.ts` (parameter-parsing
 * en bestandsnaam) — los van de route zodat ze met vitest te testen zijn.
 * Een routebestand mag zelf geen geëxporteerde hulpfuncties hebben (CLAUDE.md:
 * "Een Next-routebestand mag alleen route-exports hebben").
 */

/**
 * `?voor=verkoper` → verkopersversie (geen makelaar-interne waarschuwingen,
 * wel het kantoorcontact). Alles anders — ontbrekend, lege string, een typo —
 * blijft de bestaande interne versie, zodat een oude link zonder parameter
 * exact hetzelfde gedrag houdt als vóór dit item.
 */
export function isVoorVerkoper(voorParam: string | null): boolean {
  return voorParam === 'verkoper'
}

/**
 * Bestandsnaam voor de download — zelfde opschoning van het adres als de
 * bestaande naam, met `-verkoper` erachter voor die variant.
 */
export function waardebepalingBestandsnaam(adres: string, voorVerkoper: boolean): string {
  const basis = adres.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  return `waardebepaling-${basis}${voorVerkoper ? '-verkoper' : ''}.pdf`
}
