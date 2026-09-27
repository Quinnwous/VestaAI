/**
 * ⌘K-zoekpalet (roadmap § 9 backlog) — pure matchlogica, los van React, zodat
 * de rangschikking met vitest te testen is. `components/ZoekPalet.tsx` gebruikt
 * dit voor de statische pagina's en om de server-geleverde woningen te
 * herrangschikken; de invoer wordt altijd eerst genormaliseerd (kleine
 * letters, spaties opgeschoond, accenten weg — "café" moet ook matchen op
 * "cafe").
 */
import type { ObjectFase } from './schemas'

export type MatchType = 'exact' | 'prefix' | 'contains'

const MATCH_RANG: Record<MatchType, number> = { exact: 0, prefix: 1, contains: 2 }

/** Kleine letters, accenten weg, spaties opgeschoond — basis voor elke vergelijking hieronder. */
export function normaliseer(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * `null` als `zoekterm` niet in `tekst` voorkomt (of leeg is) — anders het
 * matchtype, gebruikt om exacte/prefix-matches vóór "bevat"-matches te
 * rangschikken (opdracht: "exacte prefix vóór bevat").
 */
export function matchType(zoekterm: string, tekst: string): MatchType | null {
  const q = normaliseer(zoekterm)
  if (!q) return null
  const t = normaliseer(tekst)
  if (t === q) return 'exact'
  if (t.startsWith(q)) return 'prefix'
  if (t.includes(q)) return 'contains'
  return null
}

/** Beste (laagste-rang) matchtype van `zoekterm` tegen een reeks teksten (label + aliassen). */
function besteMatch(zoekterm: string, teksten: string[]): MatchType | null {
  let beste: MatchType | null = null
  for (const tekst of teksten) {
    const m = matchType(zoekterm, tekst)
    if (m && (!beste || MATCH_RANG[m] < MATCH_RANG[beste])) beste = m
  }
  return beste
}

/**
 * Filtert + rangschikt `items` op één tekstveld: geen match → weg, anders
 * exact < prefix < contains, bij gelijke rang de kortste tekst eerst (dichter
 * bij de zoekterm), dan alfabetisch als laatste tiebreaker (stabiele volgorde).
 */
export function rangschikOpTekst<T>(items: T[], zoekterm: string, naarTekst: (item: T) => string): T[] {
  const q = normaliseer(zoekterm)
  if (!q) return []
  return items
    .map(item => ({ item, tekst: naarTekst(item), type: matchType(zoekterm, naarTekst(item)) }))
    .filter((r): r is { item: T; tekst: string; type: MatchType } => r.type !== null)
    .sort((a, b) => MATCH_RANG[a.type] - MATCH_RANG[b.type] || a.tekst.length - b.tekst.length || a.tekst.localeCompare(b.tekst))
    .map(r => r.item)
}

// ─────────────────────────────────────────────────────────────────────────
// Woningen (server-geleverd via app/api/zoeken/route.ts, RLS via sessieclient)
// ─────────────────────────────────────────────────────────────────────────

export type ZoekWoning = { id: string; adres: string; fase: ObjectFase }

export const FASE_LABEL: Record<ObjectFase, string> = {
  verkoopadvies: 'Verkoopadvies',
  in_verkoop: 'In verkoop',
  verkocht: 'Verkocht',
}

export function faseLabel(fase: ObjectFase): string {
  return FASE_LABEL[fase]
}

/** Herrangschikt de (al server-side gefilterde) woningenset op adres — de API geeft geen relevantievolgorde mee. */
export function rangschikWoningen(woningen: ZoekWoning[], zoekterm: string): ZoekWoning[] {
  return rangschikOpTekst(woningen, zoekterm, w => w.adres)
}

// ─────────────────────────────────────────────────────────────────────────
// Pagina's — statisch, client-side gefilterd, geen serverroundtrip nodig
// ─────────────────────────────────────────────────────────────────────────

export type ZoekPaginaItem = { id: string; label: string; href: string; aliassen?: string[] }

/** Zelfde bestemmingen als de topbar (components/AppTopbar.tsx `NAV_ITEMS`) plus het profielmenu en "Woning toevoegen". */
export const ZOEK_PAGINAS: ZoekPaginaItem[] = [
  { id: 'overzicht', label: 'Overzicht', href: '/dashboard', aliassen: ['dashboard', 'startpagina'] },
  { id: 'woningdossier', label: 'Woningdossier', href: '/woningen', aliassen: ['woningen', 'dossiers'] },
  { id: 'woning-toevoegen', label: 'Woning toevoegen', href: '/object/new', aliassen: ['nieuwe woning', 'nieuw dossier', 'intake'] },
  { id: 'marktanalyse', label: 'Marktanalyse', href: '/marktanalyse', aliassen: ['marktinzichten'] },
  { id: 'transacties', label: 'Transacties', href: '/marktanalyse/transacties', aliassen: ['transacties opzoeken'] },
  { id: 'concurrentie', label: 'Concurrentie', href: '/marktanalyse/concurrentie', aliassen: ['concurrentieanalyse'] },
  { id: 'kaart', label: 'Verkoopkaart', href: '/marktanalyse/kaart', aliassen: ['kaart'] },
  { id: 'account', label: 'Mijn account', href: '/account', aliassen: ['profiel', 'wachtwoord'] },
  { id: 'kantoor', label: 'Kantoor', href: '/kantoor', aliassen: ['team', 'huisstijl'] },
]

/** Filtert + rangschikt `ZOEK_PAGINAS` (of een meegegeven lijst, voor tests) op label + aliassen. Lege zoekterm → geen resultaten. */
export function zoekPaginas(zoekterm: string, paginas: ZoekPaginaItem[] = ZOEK_PAGINAS): ZoekPaginaItem[] {
  const q = normaliseer(zoekterm)
  if (!q) return []
  return paginas
    .map(p => ({ item: p, type: besteMatch(q, [p.label, ...(p.aliassen ?? [])]) }))
    .filter((r): r is { item: ZoekPaginaItem; type: MatchType } => r.type !== null)
    .sort((a, b) => MATCH_RANG[a.type] - MATCH_RANG[b.type] || a.item.label.length - b.item.label.length || a.item.label.localeCompare(b.item.label))
    .map(r => r.item)
}

// ─────────────────────────────────────────────────────────────────────────
// Transacties — geen eigen resultaatrij, alleen een link naar "Transacties
// opzoeken" met de zoekterm al ingevuld (lib/transactiesZoeken.ts `zoek`-veld,
// via hooks/useFilterState.ts al de bron van de URL — geen route-/schema-
// wijziging nodig, dus binnen de opdracht "kan het niet netjes: weglaten").
// ─────────────────────────────────────────────────────────────────────────

/** Minimale lengte vóór de woningen-fetch/transactie-snelkoppeling meetelt (zelfde als de server-gate in app/api/zoeken/route.ts). */
export const MIN_ZOEKLENGTE = 2

export function toonTransactieSnelkoppeling(zoekterm: string): boolean {
  return normaliseer(zoekterm).length >= MIN_ZOEKLENGTE
}

/** URL van "Transacties opzoeken" met `zoekterm` al in het `zoek`-filter (leest hooks/useFilterState.ts terug, geen page-aanpassing nodig). */
export function transactiesZoekHref(zoekterm: string): string {
  const params = new URLSearchParams({ zoek: zoekterm.trim() })
  return `/marktanalyse/transacties?${params.toString()}`
}
