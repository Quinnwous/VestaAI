import type { TransactieRow } from './supabase'

/**
 * Waarderingsmodule. Twee generaties naast elkaar:
 *
 * - **v1** (selecteerReferenties / berekenWaardebepaling / kenmerkEffect /
 *   berekenWaardering): de huidige aansluiting in het paneel. `@deprecated`
 *   sinds 17 sep 2026; verdwijnt zodra item 4.3 het paneel op v2 zet.
 * - **v2** (onderaan dit bestand): de rekenkern uit docs/roadmap.md § 3.3 —
 *   referentieselectie op locatie met verbredingsladder, prijsindex per
 *   kwartaal, gewichten, gewogen mediaan/percentielen, bandbreedte-regels,
 *   kenmerk-effecten via vergelijkbare paren, wat-als, migratie van de
 *   opgeslagen json. Puur en getest (waardering.test.ts +
 *   waardering.backtest.test.ts); methode in makelaarstaal in
 *   docs/waardering-methode.md.
 *
 * Bewuste keuzes v1 (F7, zie docs/goals.md § Risico's):
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
 *   taxatie (besluit 16 sep 2026 — "puur het verkoopadvies").
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
 * @deprecated v1 — gebruik de v2-functies onderaan dit bestand (item 4.3).
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
 * @deprecated v1 — gebruik de v2-functies onderaan dit bestand (item 4.3).
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
 * @deprecated v1 — gebruik de v2-functies onderaan dit bestand (item 4.3).
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
 * @deprecated v1 — gebruik de v2-functies onderaan dit bestand (item 4.3).
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

// ===========================================================================
// v2 — rekenkern volgens docs/roadmap.md § 3.3 (Fable, 17 sep 2026)
// ===========================================================================

import { afstandMeters } from './geo'
import {
  bouwIndex,
  factor as indexFactor,
  kwartaalVan,
  maandenTussen,
  mediaan as mediaanVan,
  type Kwartaal,
  type PrijsindexReeks,
} from './prijsindex'
import { factorCbs, type CbsIndexReeks } from './cbsPrijsindex'
import type {
  CorrectieNaam,
  GrootteEffect,
  KenmerkEffectV2,
  KenmerkNaam,
  Typegroep,
  WaarderingOpslag,
  WaarderingReferentie,
  WaarderingUitkomst,
} from './schemas'

export type { Typegroep, WaarderingUitkomst, WaarderingReferentie, WaarderingOpslag, KenmerkEffectV2, KenmerkNaam, CorrectieNaam, GrootteEffect }

export type SubjectV2 = {
  woningtype_groep: Typegroep
  woningtype_sub?: string | null
  oppervlak_m2: number
  bouwjaar: number
  lat?: number | null
  lng?: number | null
  plaats?: string | null
  garage?: boolean | null
  tuin?: boolean | null
  energielabel?: string | null
}

/**
 * Kandidaat-referentie zoals de RPC `referenties_in_straal` (§ 3.1) of een
 * client-side filter hem aanlevert. `afstand_m` komt uit ST_DWithin; ontbreekt
 * hij maar zijn lat/lng bekend, dan rekent `metAfstand()` hem uit.
 */
export type Kandidaat = {
  id: string
  adres: string
  plaats?: string | null
  woningtype_groep: Typegroep | null
  woningtype_sub?: string | null
  verkoopprijs: number | null
  woonoppervlak_m2: number | null
  bouwjaar: number | null
  verkoopdatum: string | null
  afstand_m?: number | null
  lat?: number | null
  lng?: number | null
  garage?: boolean | null
  tuin?: boolean | null
  energielabel?: string | null
  verkopend_kantoor?: string | null
}

/** Verbredingsladder (§ 3.3): straal en terugkijkperiode per trede. */
export const LADDER: ReadonlyArray<{ straal_m: number; maanden: number }> = [
  { straal_m: 750, maanden: 36 },
  { straal_m: 1000, maanden: 36 },
  { straal_m: 2000, maanden: 36 },
  { straal_m: 5000, maanden: 36 },
  { straal_m: 5000, maanden: 60 },
]
export const MIN_REFERENTIES = 8
/** Meer dan dit aantal helpt de mediaan niet en maakt de tabel onleesbaar; de best passende blijven over. */
export const MAX_REFERENTIES = 25
export const OPP_TOLERANTIE = 0.35
export const BOUWJAAR_TOLERANTIE: Record<'standaard' | 'vrijstaand', number> = { standaard: 25, vrijstaand: 40 }
/**
 * Bandbreedte = gewogen percentielen van de geïmpliceerde waarden. P25-P75
 * dekt per definitie maar de helft van de uitkomsten; om 3 op de 4 werkelijke
 * verkoopprijzen binnen de band te hebben (demo-lat § 3.3) nemen we
 * P12,5-P87,5. Kalibratieknop voor de backtest (item 4.8): haalt de band de
 * 75 % niet op echte data, verbreed dan hier — nooit de lat verlagen.
 */
export const BAND_PERCENTIELEN: readonly [number, number] = [0.1, 0.9]
/** Minimale halve bandbreedte (fractie van de waarde) naar aantal referenties. */
export const BAND_MINIMUM = { standaard: 0.05, onder6: 0.1, onder4: 0.15 } as const
export const WEINIG_DATA_ONDER = 6
const MIN_GROEP_V2 = 3
/** Vanaf dit aantal per klasse wordt een kenmerk-correctie automatisch toegepast. */
export const MIN_GROEP_CORRECTIE = 30

export type Peildatum = string | Date

function alsDatum(d: Peildatum): Date {
  return typeof d === 'string' ? new Date(d) : d
}

function isoDag(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Vult `afstand_m` uit lat/lng waar hij ontbreekt; laat bestaande waarden staan. */
export function metAfstand<T extends Kandidaat>(kandidaten: T[], subject: Pick<SubjectV2, 'lat' | 'lng'>): T[] {
  if (subject.lat == null || subject.lng == null) return kandidaten
  return kandidaten.map(k => {
    if (k.afstand_m != null || k.lat == null || k.lng == null) return k
    return { ...k, afstand_m: afstandMeters([subject.lat!, subject.lng!], [k.lat, k.lng]) }
  })
}

/** Gelijkenis 0-1 op type (sub 0,4 / groep 0,3), oppervlak (0,35) en bouwjaar (0,25). */
export function gelijkenisV2(subject: SubjectV2, k: Kandidaat): number {
  let score = k.woningtype_sub && subject.woningtype_sub && k.woningtype_sub === subject.woningtype_sub ? 0.4 : 0.3
  if (k.woonoppervlak_m2) {
    const afwijking = Math.abs(k.woonoppervlak_m2 - subject.oppervlak_m2) / subject.oppervlak_m2
    score += 0.35 * Math.max(0, 1 - afwijking / 0.5)
  }
  if (k.bouwjaar) {
    score += 0.25 * Math.max(0, 1 - Math.abs(k.bouwjaar - subject.bouwjaar) / 40)
  }
  return Math.round(score * 1000) / 1000
}

/**
 * Een verkoop in een andere plaats dan het subject telt voor de helft mee:
 * prijsniveaus verschillen per gemeente meer dan de afstand alleen verklaart
 * (Wassenaar vs. Leidschendam op 3 km). Uit de synthetische backtest:
 * zonder deze factor 6,4 % mediane fout, appartementen 7,5 %.
 */
export const ANDERE_PLAATS_FACTOR = 0.5

/** Gewicht (§ 3.3): gelijkenis × 1/(1 + afstand/500 m) × 1/(1 + maanden/12) × plaatsfactor. Zonder afstand telt alleen tijd. */
export function gewichtV2(gelijkenis: number, afstand_m: number | null | undefined, maanden: number, plaatsFactor = 1): number {
  const fAfstand = afstand_m == null ? 1 : 1 / (1 + afstand_m / 500)
  const fTijd = 1 / (1 + Math.max(0, maanden) / 12)
  return Math.round(gelijkenis * fAfstand * fTijd * plaatsFactor * 10000) / 10000
}

function plaatsFactorVoor(subject: SubjectV2, k: Kandidaat): number {
  const a = subject.plaats?.trim().toLowerCase()
  const b = k.plaats?.trim().toLowerCase()
  if (!a || !b) return 1
  return a === b ? 1 : ANDERE_PLAATS_FACTOR
}

function pastBij(subject: SubjectV2, k: Kandidaat, maanden: number, peildatum: Date): boolean {
  if (k.woningtype_groep !== subject.woningtype_groep) return false
  if (!k.verkoopprijs || !k.woonoppervlak_m2 || k.woonoppervlak_m2 <= 0 || !k.verkoopdatum) return false
  const d = new Date(k.verkoopdatum)
  if (Number.isNaN(d.getTime()) || d >= peildatum) return false
  if (maandenTussen(d, peildatum) > maanden) return false
  if (Math.abs(k.woonoppervlak_m2 - subject.oppervlak_m2) / subject.oppervlak_m2 > OPP_TOLERANTIE) return false
  if (k.bouwjaar) {
    const tol = subject.woningtype_groep === 'vrijstaand' ? BOUWJAAR_TOLERANTIE.vrijstaand : BOUWJAAR_TOLERANTIE.standaard
    if (Math.abs(k.bouwjaar - subject.bouwjaar) > tol) return false
  }
  return true
}

export type KandidaatMetScore = Kandidaat & { gelijkenis: number; maanden: number; gewicht: number; handmatig: boolean }

export type SelectieUitkomst = {
  referenties: KandidaatMetScore[]
  straal_m: number | null
  maanden: number
  methode: 'straal' | 'plaats'
  waarschuwingen: string[]
}

function scoor(subject: SubjectV2, k: Kandidaat, peildatum: Date, handmatig = false): KandidaatMetScore {
  const maanden = Math.max(0, maandenTussen(new Date(k.verkoopdatum!), peildatum))
  const gelijkenis = gelijkenisV2(subject, k)
  return { ...k, gelijkenis, maanden, gewicht: gewichtV2(gelijkenis, k.afstand_m, maanden, plaatsFactorVoor(subject, k)), handmatig }
}

/**
 * Referentieselectie met verbredingsladder (§ 3.3, item 4.1). Alleen
 * transacties van vóór de peildatum tellen mee (backtest-eis). Zonder locatie
 * (subject of kandidaten zonder afstand) valt de selectie terug op plaats +
 * typegroep met een waarschuwing.
 */
export function kiesReferenties(
  subject: SubjectV2,
  kandidaten: Kandidaat[],
  opties: { peildatum?: Peildatum; uitgesloten?: string[]; maxReferenties?: number } = {},
): SelectieUitkomst {
  const peildatum = alsDatum(opties.peildatum ?? new Date())
  const max = opties.maxReferenties ?? MAX_REFERENTIES
  const uitgesloten = new Set(opties.uitgesloten ?? [])
  const pool = metAfstand(kandidaten, subject).filter(k => !uitgesloten.has(k.id))
  const waarschuwingen: string[] = []

  const heeftLocatie = subject.lat != null && subject.lng != null && pool.some(k => k.afstand_m != null)

  let gekozen: Kandidaat[] = []
  let straal_m: number | null = null
  let maanden = LADDER[0].maanden
  let methode: SelectieUitkomst['methode'] = 'straal'

  if (heeftLocatie) {
    for (const trede of LADDER) {
      gekozen = pool.filter(k => k.afstand_m != null && k.afstand_m <= trede.straal_m && pastBij(subject, k, trede.maanden, peildatum))
      straal_m = trede.straal_m
      maanden = trede.maanden
      if (gekozen.length >= MIN_REFERENTIES) break
    }
    if (gekozen.length < MIN_REFERENTIES) {
      waarschuwingen.push(`Ook binnen ${straal_m} m en ${maanden} maanden minder dan ${MIN_REFERENTIES} vergelijkbare verkopen gevonden`)
    }
  } else {
    methode = 'plaats'
    waarschuwingen.push('Zonder locatie: referenties gekozen op plaats en woningtype, niet op afstand')
    const plaats = subject.plaats?.trim().toLowerCase() ?? null
    const opPlaats = (k: Kandidaat) => !plaats || (k.plaats?.trim().toLowerCase() ?? null) === plaats
    for (const m of [36, 60]) {
      gekozen = pool.filter(k => opPlaats(k) && pastBij(subject, k, m, peildatum))
      maanden = m
      if (gekozen.length >= MIN_REFERENTIES) break
    }
    if (gekozen.length < MIN_REFERENTIES) {
      waarschuwingen.push(`Minder dan ${MIN_REFERENTIES} vergelijkbare verkopen in ${subject.plaats ?? 'de dataset'} in ${maanden} maanden`)
    }
  }

  const referenties = gekozen
    .map(k => scoor(subject, k, peildatum))
    .sort((a, b) => b.gewicht - a.gewicht || a.maanden - b.maanden)
    .slice(0, max)

  return { referenties, straal_m, maanden, methode, waarschuwingen }
}

/**
 * Gewogen percentiel met lineaire interpolatie op de cumulatieve
 * gewichtsposities (bij gelijke gewichten = het gewone type-5-percentiel).
 */
export function gewogenPercentiel(waarden: number[], gewichten: number[], p: number): number | null {
  if (waarden.length === 0 || waarden.length !== gewichten.length) return null
  const paren = waarden.map((w, i) => ({ w, g: Math.max(0, gewichten[i]) })).sort((a, b) => a.w - b.w)
  const totaal = paren.reduce((s, x) => s + x.g, 0)
  if (totaal <= 0) return mediaanVan(waarden)
  let cum = 0
  const posities = paren.map(x => {
    const pos = (cum + x.g / 2) / totaal
    cum += x.g
    return pos
  })
  if (p <= posities[0]) return paren[0].w
  if (p >= posities[posities.length - 1]) return paren[paren.length - 1].w
  for (let i = 0; i < posities.length - 1; i++) {
    if (p >= posities[i] && p <= posities[i + 1]) {
      const span = posities[i + 1] - posities[i]
      const t = span === 0 ? 0 : (p - posities[i]) / span
      return paren[i].w + t * (paren[i + 1].w - paren[i].w)
    }
  }
  return paren[paren.length - 1].w
}

export function gewogenMediaan(waarden: number[], gewichten: number[]): number | null {
  return gewogenPercentiel(waarden, gewichten, 0.5)
}

/** Minimale halve bandbreedte naar aantal referenties (§ 3.3, verduidelijkt: de ruimste regel geldt). */
export function minimaleBand(n: number): number {
  if (n < 4) return BAND_MINIMUM.onder4
  if (n < WEINIG_DATA_ONDER) return BAND_MINIMUM.onder6
  return BAND_MINIMUM.standaard
}

export function afronden1000(x: number): number {
  return Math.round(x / 1000) * 1000
}

export function energielabelKlasse(label: string | null | undefined): 'A-B' | 'C-D' | 'E-G' | null {
  const l = (label ?? '').trim().toUpperCase().charAt(0)
  if (l === 'A' || l === 'B') return 'A-B'
  if (l === 'C' || l === 'D') return 'C-D'
  if (l === 'E' || l === 'F' || l === 'G') return 'E-G'
  return null
}

export function bouwperiode(bouwjaar: number | null | undefined): '<1945' | '1945-1975' | '1975-2000' | '2000+' | null {
  if (!bouwjaar) return null
  if (bouwjaar < 1945) return '<1945'
  if (bouwjaar < 1975) return '1945-1975'
  if (bouwjaar < 2000) return '1975-2000'
  return '2000+'
}

export type Klasse = string

type Niveau = { mediaanM2: number; n: number }

/** Mediaan € per m² per klasse op de regionale set (bruikbare rijen; klasse null overslaan). */
function niveausPerKlasse(rijen: Kandidaat[], klasseVan: (k: Kandidaat) => Klasse | null): Record<Klasse, Niveau> {
  const groepen = new Map<Klasse, number[]>()
  for (const r of rijen) {
    if (!r.verkoopprijs || !r.woonoppervlak_m2 || r.woonoppervlak_m2 <= 0) continue
    const kl = klasseVan(r)
    if (kl === null) continue
    const lijst = groepen.get(kl) ?? []
    lijst.push(r.verkoopprijs / r.woonoppervlak_m2)
    groepen.set(kl, lijst)
  }
  const uit: Record<Klasse, Niveau> = {}
  for (const [kl, lijst] of Array.from(groepen.entries())) {
    if (lijst.length < MIN_GROEP_V2) continue
    uit[kl] = { mediaanM2: Math.round(mediaanVan(lijst)!), n: lijst.length }
  }
  return uit
}

const KLASSE_VAN: Record<KenmerkNaam, (k: Pick<Kandidaat, 'garage' | 'tuin' | 'energielabel' | 'bouwjaar'>) => Klasse | null> = {
  garage: k => (k.garage == null ? null : k.garage ? 'met' : 'zonder'),
  tuin: k => (k.tuin == null ? null : k.tuin ? 'met' : 'zonder'),
  energielabel: k => energielabelKlasse(k.energielabel),
  bouwperiode: k => bouwperiode(k.bouwjaar),
}
/** Klasse waartegen `verschilPct` wordt uitgedrukt. */
const REFERENTIEKLASSE: Record<KenmerkNaam, Klasse> = { garage: 'zonder', tuin: 'zonder', energielabel: 'C-D', bouwperiode: '1975-2000' }

/**
 * Kenmerk-effecten v2 (item 4.5) als prijsniveaus per klasse op de regionale
 * set binnen werkgebied + typegroep (de aanroeper bakent `regionaal` zo af).
 * Mediaan i.p.v. gemiddelde; een klasse telt pas mee vanaf n ≥ 3 en is pas
 * automatisch toepasbaar als de klasse van het subject én die van de
 * referentie n ≥ MIN_GROEP_CORRECTIE hebben.
 */
export function kenmerkEffectenV2(regionaal: Kandidaat[], subject: SubjectV2): Record<KenmerkNaam, KenmerkEffectV2 | null> {
  const uit = {} as Record<KenmerkNaam, KenmerkEffectV2 | null>
  for (const naam of Object.keys(KLASSE_VAN) as KenmerkNaam[]) {
    const niveaus = niveausPerKlasse(regionaal, KLASSE_VAN[naam])
    const subjectKlasse = KLASSE_VAN[naam]({ garage: subject.garage, tuin: subject.tuin, energielabel: subject.energielabel, bouwjaar: subject.bouwjaar })
    if (Object.keys(niveaus).length < 2) {
      uit[naam] = null
      continue
    }
    const basis = niveaus[REFERENTIEKLASSE[naam]]
    const eigen = subjectKlasse ? niveaus[subjectKlasse] : undefined
    const verschilPct = basis && eigen && basis.mediaanM2 > 0 ? Math.round(((eigen.mediaanM2 - basis.mediaanM2) / basis.mediaanM2) * 1000) / 10 : null
    const betrouwbaar = !!eigen && eigen.n >= MIN_GROEP_CORRECTIE
    uit[naam] = { subjectKlasse, niveaus, verschilPct, betrouwbaar }
  }
  return uit
}

/**
 * Grootte-effect: hoe verandert de € per m² per extra m² woonoppervlak binnen
 * de typegroep? Theil-Sen-helling (mediaan van paarsgewijze hellingen) op
 * ln(€ per m²) — robuust, één dimensie, uitlegbaar ("−0,1 % per m² extra").
 * Geen multivariate regressie (§ 3.3).
 */
export function grootteEffect(regionaal: Kandidaat[]): GrootteEffect | null {
  const punten = regionaal
    .filter(r => r.verkoopprijs && r.woonoppervlak_m2 && r.woonoppervlak_m2 > 0)
    .map(r => ({ x: r.woonoppervlak_m2!, y: Math.log(r.verkoopprijs! / r.woonoppervlak_m2!) }))
  if (punten.length < MIN_GROEP_V2 * 2) return null
  const hellingen: number[] = []
  const n = punten.length
  const stap = Math.max(1, Math.floor((n * (n - 1)) / 2 / 20000)) // max ± 20.000 paren
  let teller = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (teller++ % stap !== 0) continue
      const dx = punten[j].x - punten[i].x
      if (Math.abs(dx) < 5) continue
      hellingen.push((punten[j].y - punten[i].y) / dx)
    }
  }
  const helling = mediaanVan(hellingen)
  if (helling === null) return null
  return { perM2Pct: Math.round(helling * 100 * 1000) / 1000, n, betrouwbaar: n >= MIN_GROEP_CORRECTIE }
}

export type CorrectiesAan = Partial<Record<CorrectieNaam, boolean>>
export const CORRECTIES_STANDAARD: Record<CorrectieNaam, boolean> = { garage: true, tuin: true, energielabel: true, bouwperiode: true, grootte: true }
/** Begrenzing per kenmerk en voor het totaal, zodat een gekke klasse nooit de waarde wegduwt. */
const CORRECTIE_MAX_PER_KENMERK = 0.15
const CORRECTIE_MAX_TOTAAL = 0.3

function begrens(f: number, max: number): number {
  return Math.min(1 + max, Math.max(1 - max, f))
}

/**
 * Correctiefactoren voor één referentie t.o.v. het subject (zoals de
 * correctiekolommen in een taxatierapport): per kenmerk niveau(subject) /
 * niveau(referentie) als beide klassen bekend, verschillend en betrouwbaar
 * zijn; grootte via de helling. Geeft alleen factoren ≠ 1 terug.
 */
export function correctiesVoorReferentie(
  subject: SubjectV2,
  ref: Kandidaat,
  effecten: Record<KenmerkNaam, KenmerkEffectV2 | null>,
  grootte: GrootteEffect | null,
  aan: Record<CorrectieNaam, boolean>,
): Partial<Record<CorrectieNaam, number>> {
  const uit: Partial<Record<CorrectieNaam, number>> = {}
  for (const naam of Object.keys(KLASSE_VAN) as KenmerkNaam[]) {
    if (!aan[naam]) continue
    const e = effecten[naam]
    if (!e || !e.subjectKlasse) continue
    const refKlasse = KLASSE_VAN[naam](ref)
    if (!refKlasse || refKlasse === e.subjectKlasse) continue
    const nS = e.niveaus[e.subjectKlasse]
    const nR = e.niveaus[refKlasse]
    if (!nS || !nR || nS.n < MIN_GROEP_CORRECTIE || nR.n < MIN_GROEP_CORRECTIE || nR.mediaanM2 <= 0) continue
    const f = begrens(nS.mediaanM2 / nR.mediaanM2, CORRECTIE_MAX_PER_KENMERK)
    if (Math.abs(f - 1) >= 0.0005) uit[naam] = Math.round(f * 1000) / 1000
  }
  if (aan.grootte && grootte && grootte.betrouwbaar && ref.woonoppervlak_m2) {
    const f = begrens(Math.exp((grootte.perM2Pct / 100) * (subject.oppervlak_m2 - ref.woonoppervlak_m2)), CORRECTIE_MAX_PER_KENMERK)
    if (Math.abs(f - 1) >= 0.0005) uit.grootte = Math.round(f * 1000) / 1000
  }
  return uit
}

export function totaleCorrectie(correcties: Partial<Record<CorrectieNaam, number>>): number {
  const product = Object.values(correcties).reduce((p, f) => p * (f ?? 1), 1)
  return Math.round(begrens(product, CORRECTIE_MAX_TOTAAL) * 1000) / 1000
}

export type WaarderingOptiesV2 = {
  peildatum?: Peildatum
  /** regionale prijsindex voor de typegroep; ontbreekt hij, dan wordt hij uit `regionaal` (of de kandidaten) gebouwd */
  index?: PrijsindexReeks | null
  cbs?: CbsIndexReeks | null
  /** regionale set (werkgebied + typegroep) voor index en kenmerk-effecten; standaard = kandidaten */
  regionaal?: Kandidaat[]
  handmatig?: { uitgesloten?: string[]; toegevoegd?: Kandidaat[] }
  /** correcties per kenmerk aan/uit (standaard allemaal aan; de makelaar kan er een uitzetten) */
  correcties?: CorrectiesAan
  woz?: { waarde: number; peildatum: string } | null
  maxReferenties?: number
}

/**
 * Rekenkern v2 (item 4.3). Volgorde: selectie → per referentie € per m² ×
 * indexfactor × correctiefactor (kenmerken en grootte t.o.v. het subject) ×
 * oppervlak subject = geïmpliceerde waarde → gewogen mediaan → band (gewogen
 * percentielen, minimaal ± 5/10/15 %) → afronding op € 1.000. Elke stap
 * staat in de uitkomst, zodat het paneel en de pdf de hele rekensom kunnen
 * tonen zoals de correctiekolommen in een taxatierapport.
 */
export function berekenWaarderingV2(subject: SubjectV2, kandidaten: Kandidaat[], opties: WaarderingOptiesV2 = {}): WaarderingUitkomst {
  const peildatum = alsDatum(opties.peildatum ?? new Date())
  const kNaar = kwartaalVan(peildatum)
  const regionaal = (opties.regionaal ?? kandidaten).filter(k => k.woningtype_groep === subject.woningtype_groep)
  const selectie = kiesReferenties(subject, kandidaten, {
    peildatum,
    uitgesloten: opties.handmatig?.uitgesloten,
    maxReferenties: opties.maxReferenties,
  })
  const waarschuwingen = [...selectie.waarschuwingen]

  const toegevoegd = metAfstand(opties.handmatig?.toegevoegd ?? [], subject)
    .filter(k => k.verkoopprijs && k.woonoppervlak_m2 && k.verkoopdatum && new Date(k.verkoopdatum) < peildatum)
    .filter(k => !selectie.referenties.some(r => r.id === k.id))
    .map(k => scoor(subject, k, peildatum, true))
  const gekozen = [...selectie.referenties, ...toegevoegd]

  const index =
    opties.index ??
    bouwIndex(
      regionaal.filter(k => k.verkoopdatum && new Date(k.verkoopdatum) < peildatum),
      { tot: kNaar },
    )

  const effecten = kenmerkEffectenV2(regionaal, subject)
  const grootte = grootteEffect(regionaal)
  const aan: Record<CorrectieNaam, boolean> = { ...CORRECTIES_STANDAARD, ...(opties.correcties ?? {}) }
  const toegepast = new Set<CorrectieNaam>()

  let geenCorrectieGemeld = false
  let indexTm: Kwartaal | null = null
  const basisGebruikt = new Set<WaarderingReferentie['index_basis']>()
  const referenties: WaarderingReferentie[] = gekozen.map(r => {
    const kVan = kwartaalVan(r.verkoopdatum!)
    let fac = 1
    let basis: WaarderingReferentie['index_basis'] = 'geen'
    const eigen = indexFactor(index, kVan, kNaar)
    if (eigen) {
      fac = eigen.factor
      basis = 'eigen'
      indexTm = indexTm ?? eigen.gebruiktNaar
      if (eigen.waarschuwing && !waarschuwingen.includes(eigen.waarschuwing)) waarschuwingen.push(eigen.waarschuwing)
    } else if (opties.cbs) {
      const c = factorCbs(opties.cbs, kVan, kNaar)
      if (c) {
        fac = c
        basis = 'cbs'
      }
    }
    if (basis === 'geen' && !geenCorrectieGemeld) {
      waarschuwingen.push('Geen betrouwbare prijsindex voor een of meer referenties: geen tijdcorrectie toegepast')
      geenCorrectieGemeld = true
    }
    basisGebruikt.add(basis)
    const prijs_m2 = r.verkoopprijs! / r.woonoppervlak_m2!
    const correcties = correctiesVoorReferentie(subject, r, effecten, grootte, aan)
    for (const naam of Object.keys(correcties) as CorrectieNaam[]) toegepast.add(naam)
    const correctie_factor = totaleCorrectie(correcties)
    return {
      id: r.id,
      adres: r.adres,
      afstand_m: r.afstand_m == null ? null : Math.round(r.afstand_m),
      verkoopdatum: r.verkoopdatum!,
      prijs: r.verkoopprijs!,
      m2: r.woonoppervlak_m2!,
      prijs_m2: Math.round(prijs_m2),
      index_factor: Math.round(fac * 1000) / 1000,
      index_basis: basis,
      correcties,
      correctie_factor,
      gewicht: r.gewicht,
      gelijkenis: r.gelijkenis,
      maanden: r.maanden,
      waarde_geimpliceerd: Math.round(prijs_m2 * fac * correctie_factor * subject.oppervlak_m2),
      handmatig: r.handmatig,
    }
  })

  const n = referenties.length
  const correctieStatus = {} as WaarderingUitkomst['correcties']
  for (const naam of Object.keys(CORRECTIES_STANDAARD) as CorrectieNaam[]) {
    const e = naam === 'grootte' ? null : effecten[naam]
    const toelichting =
      naam === 'grootte'
        ? grootte
          ? `${grootte.perM2Pct >= 0 ? '+' : ''}${grootte.perM2Pct.toFixed(2)} % per m² (n = ${grootte.n})${grootte.betrouwbaar ? '' : ', te weinig data om toe te passen'}`
          : 'geen data'
        : e
          ? `${e.subjectKlasse ?? 'onbekend'}${e.verschilPct === null ? '' : ` ${e.verschilPct >= 0 ? '+' : ''}${e.verschilPct} % t.o.v. ${REFERENTIEKLASSE[naam]}`}${e.betrouwbaar ? '' : ', te weinig data om toe te passen'}`
          : 'geen data'
    correctieStatus[naam] = { aan: aan[naam], toegepast: toegepast.has(naam), toelichting }
  }
  const indexBasis: WaarderingUitkomst['index_basis'] = basisGebruikt.has('geen') ? 'geen' : basisGebruikt.has('cbs') ? 'cbs' : 'eigen'

  const basisUitkomst: WaarderingUitkomst = {
    versie: 2,
    peildatum: isoDag(peildatum),
    waarde: null,
    laag: null,
    hoog: null,
    n,
    weinigData: n < WEINIG_DATA_ONDER,
    straal_m: selectie.straal_m,
    maanden: selectie.maanden,
    methode: selectie.methode,
    index_basis: n === 0 ? 'geen' : indexBasis,
    index_tm: n === 0 ? null : indexTm ?? kNaar,
    referenties,
    effecten,
    grootte,
    correcties: correctieStatus,
    woz: opties.woz ?? null,
    waarschuwingen,
  }

  if (n === 0) {
    waarschuwingen.push('Geen vergelijkbare verkopen gevonden; geen waarde bepaald')
    return basisUitkomst
  }
  if (n < WEINIG_DATA_ONDER) {
    waarschuwingen.push(`Weinig data: ${n} referentie${n === 1 ? '' : 's'}, bandbreedte verbreed`)
  }

  const waarden = referenties.map(r => r.waarde_geimpliceerd)
  const gewichten = referenties.map(r => r.gewicht)
  const midden = gewogenMediaan(waarden, gewichten)!
  const pLaag = gewogenPercentiel(waarden, gewichten, BAND_PERCENTIELEN[0])!
  const pHoog = gewogenPercentiel(waarden, gewichten, BAND_PERCENTIELEN[1])!
  const minBand = minimaleBand(n)
  const laag = Math.min(pLaag, midden * (1 - minBand))
  const hoog = Math.max(pHoog, midden * (1 + minBand))

  return {
    ...basisUitkomst,
    waarde: afronden1000(midden),
    laag: afronden1000(laag),
    hoog: afronden1000(hoog),
  }
}

/**
 * Leest `objecten.waardering_json` in elke historische vorm en geeft altijd
 * een WaarderingOpslag v2 terug. v1 bevatte alleen `{ correctie }`.
 */
export function migreerWaarderingJson(raw: unknown): WaarderingOpslag {
  const leeg: WaarderingOpslag = { versie: 2, uitkomst: null, correctie: null, handmatig: { uitgesloten: [], toegevoegd: [] } }
  if (!raw || typeof raw !== 'object') return leeg
  const r = raw as Record<string, unknown>
  const correctieRaw = r.correctie as { waarde?: unknown; motivatie?: unknown; datum?: unknown } | null | undefined
  const correctie =
    correctieRaw && typeof correctieRaw.waarde === 'number'
      ? { waarde: correctieRaw.waarde, motivatie: String(correctieRaw.motivatie ?? ''), datum: String(correctieRaw.datum ?? '') }
      : null
  if (r.versie === 2) {
    const h = (r.handmatig as { uitgesloten?: unknown; toegevoegd?: unknown } | undefined) ?? {}
    const lijst = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    const uitkomst = r.uitkomst && typeof r.uitkomst === 'object' && (r.uitkomst as { versie?: unknown }).versie === 2 ? (r.uitkomst as WaarderingUitkomst) : null
    return { versie: 2, uitkomst, correctie, handmatig: { uitgesloten: lijst(h.uitgesloten), toegevoegd: lijst(h.toegevoegd) } }
  }
  return { ...leeg, correctie }
}
