import type { TransactieRow } from './supabase'
import { gemiddelde } from './utils'

/**
 * Aggregatielogica voor de interactieve marktanalyse-explorer (F6, besluit 16
 * sep 2026: geen statisch dashboard, wel filters die live hertekenen — zie
 * CLAUDE.md § Hoofdstructuur). Puur functies, geen React — makkelijk te
 * testen en herbruikbaar tussen de grafiek en een eventuele CSV-export.
 */

export type MarktFilter = {
  woningtype?: string
  wijk?: string
  vanaf?: string // ISO-datum
  tot?: string // ISO-datum
}

export function filterTransacties(rijen: TransactieRow[], filter: MarktFilter): TransactieRow[] {
  return rijen.filter(r => {
    if (filter.woningtype && r.woningtype !== filter.woningtype) return false
    if (filter.wijk && r.wijk !== filter.wijk) return false
    if (filter.vanaf && (!r.verkoopdatum || r.verkoopdatum < filter.vanaf)) return false
    if (filter.tot && (!r.verkoopdatum || r.verkoopdatum > filter.tot)) return false
    return true
  })
}

export type KwartaalPunt = {
  kwartaal: string // "2026-K1"
  aantal: number
  gemiddeldeVerkoopprijs: number | null
  gemiddeldeM2Prijs: number | null
  gemiddeldeLooptijd: number | null
  gemiddeldPrijsverschilPct: number | null // (verkoop - vraag) / vraag * 100
}

function kwartaalLabel(iso: string): string {
  const d = new Date(iso)
  const q = Math.floor(d.getMonth() / 3) + 1
  return `${d.getFullYear()}-K${q}`
}

/** Groepeert transacties per kwartaal en berekent de kerncijfers voor de grafieken. */
export function naarKwartaalReeks(rijen: TransactieRow[]): KwartaalPunt[] {
  const groepen = new Map<string, TransactieRow[]>()
  for (const r of rijen) {
    if (!r.verkoopdatum) continue
    const key = kwartaalLabel(r.verkoopdatum)
    const groep = groepen.get(key) ?? []
    groep.push(r)
    groepen.set(key, groep)
  }

  return Array.from(groepen.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kwartaal, groep]) => {
      const prijzen = groep.map(r => r.verkoopprijs).filter((v): v is number => v !== null)
      const m2prijzen = groep
        .filter(r => r.verkoopprijs && r.woonoppervlak_m2)
        .map(r => r.verkoopprijs! / r.woonoppervlak_m2!)
      const looptijden = groep.map(r => r.looptijd_dagen).filter((v): v is number => v !== null)
      const verschillen = groep
        .filter(r => r.verkoopprijs && r.vraagprijs)
        .map(r => ((r.verkoopprijs! - r.vraagprijs!) / r.vraagprijs!) * 100)

      return {
        kwartaal,
        aantal: groep.length,
        gemiddeldeVerkoopprijs: gemiddelde(prijzen),
        gemiddeldeM2Prijs: gemiddelde(m2prijzen),
        gemiddeldeLooptijd: gemiddelde(looptijden),
        gemiddeldPrijsverschilPct: gemiddelde(verschillen),
      }
    })
}

export type MarktSamenvatting = {
  aantal: number
  gemiddeldeVerkoopprijs: number | null
  gemiddeldeM2Prijs: number | null
  gemiddeldeLooptijd: number | null
}

/** Combineert twee kwartaalreeksen (segmentvergelijking) tot één rij-per-kwartaal dataset voor de grafiek. */
export function combineerReeksen(
  a: KwartaalPunt[],
  b: KwartaalPunt[],
  veld: keyof Pick<KwartaalPunt, 'gemiddeldeVerkoopprijs' | 'gemiddeldeM2Prijs' | 'gemiddeldeLooptijd'>,
): { kwartaal: string; a: number | null; b: number | null }[] {
  const kwartalen = Array.from(new Set([...a.map(p => p.kwartaal), ...b.map(p => p.kwartaal)])).sort()
  const aMap = new Map(a.map(p => [p.kwartaal, p[veld]]))
  const bMap = new Map(b.map(p => [p.kwartaal, p[veld]]))
  return kwartalen.map(k => ({ kwartaal: k, a: aMap.get(k) ?? null, b: bMap.get(k) ?? null }))
}

export function samenvatting(rijen: TransactieRow[]): MarktSamenvatting {
  const alleM2 = rijen.filter(r => r.verkoopprijs && r.woonoppervlak_m2).map(r => r.verkoopprijs! / r.woonoppervlak_m2!)
  const allePrijzen = rijen.map(r => r.verkoopprijs).filter((v): v is number => v !== null)
  const alleLooptijden = rijen.map(r => r.looptijd_dagen).filter((v): v is number => v !== null)
  return {
    aantal: rijen.length,
    gemiddeldeVerkoopprijs: gemiddelde(allePrijzen),
    gemiddeldeM2Prijs: gemiddelde(alleM2),
    gemiddeldeLooptijd: gemiddelde(alleLooptijden),
  }
}
