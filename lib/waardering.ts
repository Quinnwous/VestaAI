import type { TransactieRow } from './supabase'

/**
 * Waarderingsmodule (F7, zie CLAUDE.md § Hoofdstructuur en docs/goals.md §
 * Risico's). Bewuste keuzes:
 *
 * - Vergelijkbare-verkopen-methode (comparables), geen regressie: bij een
 *   kleine, één-kantoor-dataset geeft een regressie een schijnzekere
 *   puntschatting. Een transparante lijst referenties met een bandbreedte is
 *   eerlijker over wat de data wel en niet onderbouwt.
 * - Kenmerk-effecten via vergelijkbare-paren (groep mét vs. zonder kenmerk),
 *   nooit getoond bij een te kleine steekproef (MIN_GROEPSGROOTTE) — liever
 *   niets tonen dan een percentage suggereren dat op 2 datapunten steunt.
 * - De bandbreedte verbreedt automatisch bij weinig referenties of veel
 *   spreiding — nooit een schijnzekere puntschatting (besluit 16 sep 2026).
 * - Dit is een onderbouwde indicatie voor het verkoopadvies, geen NWWI-
 *   taxatie (besluit 16 sep 2026 — "puur de verkooppitch").
 */

const MIN_GROEPSGROOTTE = 3

export type Subject = {
  woningtype: string
  oppervlak_m2: number
  bouwjaar: number
  lat?: number | null
  lng?: number | null
}

export type Referentie = TransactieRow & { gelijkenis: number; m2Prijs: number }

/**
 * Selecteert de meest vergelijkbare verkochte woningen, gesorteerd op
 * gelijkenis (0-1, hoger = beter passend). Alleen transacties met bekende
 * verkoopprijs én woonoppervlak komen in aanmerking (anders is er geen
 * €/m² om op te vergelijken).
 */
export function selecteerReferenties(subject: Subject, dataset: TransactieRow[], limiet = 8): Referentie[] {
  const kandidaten = dataset.filter(r => r.verkoopprijs && r.woonoppervlak_m2 && r.woonoppervlak_m2 > 0)

  const metGelijkenis: Referentie[] = kandidaten.map(r => {
    let score = 0
    // Woningtype weegt zwaar — een villa is geen goede referentie voor een appartement.
    if (r.woningtype && r.woningtype === subject.woningtype) score += 0.4
    // Oppervlak: hoe dichter bij het subject, hoe hoger de score (lineair uitdovend tot 50% afwijking).
    if (r.woonoppervlak_m2) {
      const afwijking = Math.abs(r.woonoppervlak_m2 - subject.oppervlak_m2) / subject.oppervlak_m2
      score += 0.35 * Math.max(0, 1 - afwijking / 0.5)
    }
    // Bouwperiode: binnen 20 jaar volledige score, daarna uitdovend.
    if (r.bouwjaar) {
      const afwijking = Math.abs(r.bouwjaar - subject.bouwjaar)
      score += 0.25 * Math.max(0, 1 - afwijking / 40)
    }
    return { ...r, gelijkenis: Math.round(score * 100) / 100, m2Prijs: r.verkoopprijs! / r.woonoppervlak_m2! }
  })

  return metGelijkenis
    .filter(r => r.gelijkenis > 0)
    .sort((a, b) => b.gelijkenis - a.gelijkenis)
    .slice(0, limiet)
}

export type Waardebepaling = {
  aantalReferenties: number
  m2PrijsMediaan: number | null
  laag: number | null
  midden: number | null
  hoog: number | null
  /** true zodra er te weinig referenties zijn om vertrouwen op te bouwen — UI moet dit expliciet tonen. */
  weinigData: boolean
}

function mediaan(waarden: number[]): number | null {
  if (waarden.length === 0) return null
  const gesorteerd = [...waarden].sort((a, b) => a - b)
  const mid = Math.floor(gesorteerd.length / 2)
  return gesorteerd.length % 2 === 0 ? (gesorteerd[mid - 1] + gesorteerd[mid]) / 2 : gesorteerd[mid]
}

/**
 * Bandbreedte rond de mediane €/m² van de referenties × het oppervlak van het
 * subject. De marge verbreedt bij weinig referenties (< 5 → 20%, < 8 → 15%,
 * anders 10%) — een expliciete, uitlegbare regel in plaats van een
 * statistisch model dat op deze schaal een schijnzekerheid zou suggereren.
 */
export function berekenWaardebepaling(subject: Subject, referenties: Referentie[]): Waardebepaling {
  const m2Prijzen = referenties.map(r => r.m2Prijs)
  const mediaanM2 = mediaan(m2Prijzen)
  const aantal = referenties.length

  if (mediaanM2 === null) {
    return { aantalReferenties: 0, m2PrijsMediaan: null, laag: null, midden: null, hoog: null, weinigData: true }
  }

  const marge = aantal < 5 ? 0.2 : aantal < 8 ? 0.15 : 0.1
  const midden = Math.round(mediaanM2 * subject.oppervlak_m2)

  return {
    aantalReferenties: aantal,
    m2PrijsMediaan: Math.round(mediaanM2),
    laag: Math.round(midden * (1 - marge)),
    midden,
    hoog: Math.round(midden * (1 + marge)),
    weinigData: aantal < MIN_GROEPSGROOTTE * 2,
  }
}

export type KenmerkEffect = { verschilPct: number; aantalMet: number; aantalZonder: number }

/**
 * Vergelijkbare-paren-methode: het prijsverschil (€/m²) tussen woningen mét
 * en zonder een kenmerk, binnen dezelfde referentieset. Geeft `null` als een
 * van beide groepen te klein is (MIN_GROEPSGROOTTE) — expres geen percentage
 * tonen dat op een handjevol datapunten steunt.
 */
export function kenmerkEffect(referenties: Referentie[], kenmerk: 'garage' | 'tuin'): KenmerkEffect | null {
  const met = referenties.filter(r => r[kenmerk] === true)
  const zonder = referenties.filter(r => r[kenmerk] === false)
  if (met.length < MIN_GROEPSGROOTTE || zonder.length < MIN_GROEPSGROOTTE) return null

  const gemMet = met.reduce((s, r) => s + r.m2Prijs, 0) / met.length
  const gemZonder = zonder.reduce((s, r) => s + r.m2Prijs, 0) / zonder.length
  if (gemZonder === 0) return null

  return {
    verschilPct: Math.round(((gemMet - gemZonder) / gemZonder) * 1000) / 10,
    aantalMet: met.length,
    aantalZonder: zonder.length,
  }
}

export type WatAlsKenmerken = { garage: boolean; tuin: boolean }

export type WaarderingResultaat = Waardebepaling & {
  referenties: Referentie[]
  kenmerkEffecten: Partial<Record<'garage' | 'tuin', KenmerkEffect>>
}

/**
 * Orkestreert referentieselectie + bandbreedte + de modulaire aan/uit-blokken
 * (F7, besluit 16 sep 2026): garage/tuin tellen alleen mee in de waarde als
 * het blok aan staat én het subject de eigenschap zelf heeft — en alleen als
 * er genoeg data is om het effect te onderbouwen (zie kenmerkEffect).
 */
export function berekenWaardering(
  subject: Subject,
  subjectKenmerken: { heeftGarage: boolean; heeftTuin: boolean },
  dataset: TransactieRow[],
  aanUit: WatAlsKenmerken,
): WaarderingResultaat {
  const referenties = selecteerReferenties(subject, dataset)
  const basis = berekenWaardebepaling(subject, referenties)

  const effectGarage = kenmerkEffect(referenties, 'garage')
  const effectTuin = kenmerkEffect(referenties, 'tuin')
  const kenmerkEffecten: WaarderingResultaat['kenmerkEffecten'] = {}
  if (effectGarage) kenmerkEffecten.garage = effectGarage
  if (effectTuin) kenmerkEffecten.tuin = effectTuin

  if (basis.midden === null) {
    return { ...basis, referenties, kenmerkEffecten }
  }

  let factor = 1
  if (aanUit.garage && subjectKenmerken.heeftGarage && effectGarage) factor += effectGarage.verschilPct / 100
  if (aanUit.tuin && subjectKenmerken.heeftTuin && effectTuin) factor += effectTuin.verschilPct / 100

  return {
    ...basis,
    laag: Math.round(basis.laag! * factor),
    midden: Math.round(basis.midden * factor),
    hoog: Math.round(basis.hoog! * factor),
    referenties,
    kenmerkEffecten,
  }
}
