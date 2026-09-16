import type { TransactieRow } from './supabase'
import { gemiddelde } from './utils'

/**
 * Concurrentieanalyse (F6, besluit 16 sep 2026, zie CLAUDE.md §
 * Hoofdstructuur): marktaandeel, wie wint welk segment, presteren wij beter,
 * concurrent-profielen. Draait op `verkopend_kantoor` in de transactiedataset
 * zodra dat veld gevuld is (uit de Realworks-export of later Brainbay) — dit
 * bestand is databron-onafhankelijk, het datamodel hoeft er niet voor op de
 * schop (zie docs/roadmap.md § Blokkades).
 */

const EIGEN_KANTOOR_LABEL = 'Eigen kantoor'

function kantoorNaam(r: TransactieRow): string {
  if (r.eigen_verkoop) return EIGEN_KANTOOR_LABEL
  return r.verkopend_kantoor?.trim() || 'Onbekend'
}

/** Heeft de dataset genoeg informatie over wie welke transactie deed om concurrentie te tonen? */
export function heeftConcurrentiedata(rijen: TransactieRow[]): boolean {
  return rijen.some(r => !r.eigen_verkoop && !!r.verkopend_kantoor)
}

export type MarktaandeelPunt = { kantoor: string; aantal: number; aandeelPct: number }

export function marktaandeel(rijen: TransactieRow[]): MarktaandeelPunt[] {
  const totaal = rijen.length
  if (totaal === 0) return []
  const per = new Map<string, number>()
  for (const r of rijen) {
    const naam = kantoorNaam(r)
    per.set(naam, (per.get(naam) ?? 0) + 1)
  }
  return Array.from(per.entries())
    .map(([kantoor, aantal]) => ({ kantoor, aantal, aandeelPct: Math.round((aantal / totaal) * 1000) / 10 }))
    .sort((a, b) => b.aantal - a.aantal)
}

export type SegmentWinnaar = { segment: string; winnaar: string; aantal: number }

/** Per woningtype: welk kantoor verkocht daar het meest. */
export function wieWintWelkSegment(rijen: TransactieRow[]): SegmentWinnaar[] {
  const perSegment = new Map<string, Map<string, number>>()
  for (const r of rijen) {
    const segment = r.woningtype ?? 'Onbekend'
    const perKantoor = perSegment.get(segment) ?? new Map<string, number>()
    const naam = kantoorNaam(r)
    perKantoor.set(naam, (perKantoor.get(naam) ?? 0) + 1)
    perSegment.set(segment, perKantoor)
  }
  return Array.from(perSegment.entries()).map(([segment, perKantoor]) => {
    const [winnaar, aantal] = Array.from(perKantoor.entries()).sort((a, b) => b[1] - a[1])[0]
    return { segment, winnaar, aantal }
  })
}

export type PrestatieVergelijking = {
  eigenGemLooptijd: number | null
  regioGemLooptijd: number | null
  eigenGemPrijsverschilPct: number | null
  regioGemPrijsverschilPct: number | null
}

/** Eigen doorlooptijd en prijsverschil tegen het regiogemiddelde — het "wij verkopen sneller"-argument. */
export function presterenWijBeter(rijen: TransactieRow[]): PrestatieVergelijking {
  const eigen = rijen.filter(r => r.eigen_verkoop)
  const regio = rijen.filter(r => !r.eigen_verkoop)

  const looptijd = (set: TransactieRow[]) => gemiddelde(set.map(r => r.looptijd_dagen).filter((v): v is number => v !== null), 1)
  const verschil = (set: TransactieRow[]) =>
    gemiddelde(set.filter(r => r.verkoopprijs && r.vraagprijs).map(r => ((r.verkoopprijs! - r.vraagprijs!) / r.vraagprijs!) * 100), 1)

  return {
    eigenGemLooptijd: looptijd(eigen),
    regioGemLooptijd: looptijd(regio),
    eigenGemPrijsverschilPct: verschil(eigen),
    regioGemPrijsverschilPct: verschil(regio),
  }
}

export type ConcurrentProfiel = {
  kantoor: string
  aantal: number
  gemiddeldePrijs: number | null
  topSegment: string | null
}

export function concurrentProfielen(rijen: TransactieRow[]): ConcurrentProfiel[] {
  const perKantoor = new Map<string, TransactieRow[]>()
  for (const r of rijen) {
    const naam = kantoorNaam(r)
    const set = perKantoor.get(naam) ?? []
    set.push(r)
    perKantoor.set(naam, set)
  }

  return Array.from(perKantoor.entries())
    .map(([kantoor, set]) => {
      const prijzen = set.map(r => r.verkoopprijs).filter((v): v is number => v !== null)
      const perSegment = new Map<string, number>()
      for (const r of set) {
        const segment = r.woningtype ?? 'Onbekend'
        perSegment.set(segment, (perSegment.get(segment) ?? 0) + 1)
      }
      const topSegment = Array.from(perSegment.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      return {
        kantoor,
        aantal: set.length,
        gemiddeldePrijs: gemiddelde(prijzen, 1),
        topSegment,
      }
    })
    .sort((a, b) => b.aantal - a.aantal)
}
