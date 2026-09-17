/**
 * Prijsindex per kwartaal uit de eigen regionale transactiedataset
 * (roadmap v2 § 3.3 en item 4.2). Pure functies; de RPC `prijsindex_kwartaal`
 * levert straks dezelfde vorm als `bouwIndex()` hier client-side maakt, zodat
 * `factor()` op beide werkt.
 *
 * Bewuste keuzes (Fable, 17 sep 2026):
 * - Index = mediaan € per m² per kwartaal, daarna gladgestreken over een
 *   venster van 3 kwartalen, gewogen naar het aantal verkopen per kwartaal.
 *   Een mediaan is ongevoelig voor één villa; het venster dempt kwartaalruis.
 * - Betrouwbaar is een gladgestreken punt pas als het venster samen ≥ `minN`
 *   verkopen bevat (standaard 30, § 3.3). Daaronder geeft `factor()` `null`
 *   en valt de aanroeper terug op de CBS-index (`lib/cbsPrijsindex.ts`) of
 *   op "geen tijdcorrectie" mét waarschuwing.
 * - Ontbreekt het gevraagde kwartaal (bv. het lopende kwartaal heeft nog
 *   geen 30 verkopen), dan pakt `factor()` het dichtstbijzijnde betrouwbare
 *   kwartaal binnen `maxAfstandKwartalen` (standaard 2) en meldt dat.
 */

export type Kwartaal = string // 'YYYY-Qn'

export type IndexRij = {
  verkoopdatum: string | null
  verkoopprijs: number | null
  woonoppervlak_m2: number | null
}

export type IndexPunt = {
  kwartaal: Kwartaal
  /** aantal verkopen in dit kwartaal zelf */
  n: number
  /** mediaan € per m² van dit kwartaal zelf (null zonder verkopen) */
  mediaanM2: number | null
  /** gladgestreken indexwaarde (€ per m²) over het venster; null zonder data */
  glad: number | null
  /** aantal verkopen in het venster waarop `glad` steunt */
  nVenster: number
  /** true als nVenster ≥ minN */
  betrouwbaar: boolean
}

export type PrijsindexReeks = {
  punten: IndexPunt[]
  minN: number
  venster: number
}

export type IndexFactor = {
  factor: number
  van: Kwartaal
  naar: Kwartaal
  /** kwartalen die daadwerkelijk gebruikt zijn (kunnen afwijken bij terugval) */
  gebruiktVan: Kwartaal
  gebruiktNaar: Kwartaal
  waarschuwing: string | null
}

const MIN_N_STANDAARD = 30
const VENSTER_STANDAARD = 3
const MAX_AFSTAND_KWARTALEN = 2

export function kwartaalVan(datum: string | Date): Kwartaal {
  const d = typeof datum === 'string' ? new Date(datum) : datum
  if (Number.isNaN(d.getTime())) throw new Error(`Ongeldige datum voor kwartaal: ${String(datum)}`)
  const q = Math.floor(d.getUTCMonth() / 3) + 1
  return `${d.getUTCFullYear()}-Q${q}`
}

/** Doorlopend kwartaalnummer (jaar × 4 + kwartaal − 1) voor rekenen en sorteren. */
export function kwartaalNummer(k: Kwartaal): number {
  const m = /^(\d{4})-Q([1-4])$/.exec(k)
  if (!m) throw new Error(`Ongeldig kwartaal: ${k}`)
  return Number(m[1]) * 4 + Number(m[2]) - 1
}

export function kwartaalUitNummer(n: number): Kwartaal {
  return `${Math.floor(n / 4)}-Q${(n % 4) + 1}`
}

/** Alle kwartalen van `van` t/m `tot` (inclusief), oplopend. */
export function kwartalenTussen(van: Kwartaal, tot: Kwartaal): Kwartaal[] {
  const a = kwartaalNummer(van)
  const b = kwartaalNummer(tot)
  if (b < a) return []
  const uit: Kwartaal[] = []
  for (let i = a; i <= b; i++) uit.push(kwartaalUitNummer(i))
  return uit
}

/** Aantal hele maanden tussen twee datums (b − a), afgerond naar beneden. */
export function maandenTussen(a: string | Date, b: string | Date): number {
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  let m = (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth())
  if (db.getUTCDate() < da.getUTCDate()) m -= 1
  return m
}

export function mediaan(waarden: number[]): number | null {
  if (waarden.length === 0) return null
  const s = [...waarden].sort((x, y) => x - y)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

/**
 * Bouwt de index uit ruwe rijen (alleen rijen met datum, prijs en oppervlak
 * tellen mee). Kwartalen zonder verkopen krijgen n = 0 en worden door het
 * venster overbrugd. `tot` begrenst de reeks (bv. het kwartaal van de
 * peildatum bij een backtest); standaard loopt hij t/m het laatste kwartaal
 * met data.
 */
export function bouwIndex(
  rijen: IndexRij[],
  opties: { minN?: number; venster?: number; van?: Kwartaal; tot?: Kwartaal } = {},
): PrijsindexReeks {
  const minN = opties.minN ?? MIN_N_STANDAARD
  const venster = opties.venster ?? VENSTER_STANDAARD
  const perKwartaal = new Map<Kwartaal, number[]>()
  for (const r of rijen) {
    if (!r.verkoopdatum || !r.verkoopprijs || !r.woonoppervlak_m2 || r.woonoppervlak_m2 <= 0) continue
    const k = kwartaalVan(r.verkoopdatum)
    const lijst = perKwartaal.get(k) ?? []
    lijst.push(r.verkoopprijs / r.woonoppervlak_m2)
    perKwartaal.set(k, lijst)
  }
  if (perKwartaal.size === 0) return { punten: [], minN, venster }

  const nummers = Array.from(perKwartaal.keys()).map(kwartaalNummer)
  const van = opties.van ?? kwartaalUitNummer(Math.min(...nummers))
  const tot = opties.tot ?? kwartaalUitNummer(Math.max(...nummers))
  const kwartalen = kwartalenTussen(van, tot)
  const ruw = kwartalen.map(k => {
    const lijst = perKwartaal.get(k) ?? []
    return { kwartaal: k, n: lijst.length, mediaanM2: mediaan(lijst) }
  })
  return { punten: glad(ruw, { minN, venster }), minN, venster }
}

/**
 * Gladstrijken: per kwartaal het naar n gewogen gemiddelde van de medianen in
 * een gecentreerd venster (standaard 3 kwartalen; aan de randen 2). Kwartalen
 * zonder verkopen dragen niets bij maar breken het venster niet.
 */
export function glad(
  ruw: { kwartaal: Kwartaal; n: number; mediaanM2: number | null }[],
  opties: { minN?: number; venster?: number } = {},
): IndexPunt[] {
  const minN = opties.minN ?? MIN_N_STANDAARD
  const venster = opties.venster ?? VENSTER_STANDAARD
  const halve = Math.floor(venster / 2)
  return ruw.map((p, i) => {
    let som = 0
    let nVenster = 0
    for (let j = Math.max(0, i - halve); j <= Math.min(ruw.length - 1, i + halve); j++) {
      const q = ruw[j]
      if (q.mediaanM2 === null || q.n === 0) continue
      som += q.mediaanM2 * q.n
      nVenster += q.n
    }
    const gladWaarde = nVenster > 0 ? som / nVenster : null
    return { ...p, glad: gladWaarde, nVenster, betrouwbaar: nVenster >= minN }
  })
}

function zoekBetrouwbaar(reeks: PrijsindexReeks, k: Kwartaal, maxAfstand: number): IndexPunt | null {
  const doel = kwartaalNummer(k)
  let beste: IndexPunt | null = null
  let besteAfstand = Infinity
  for (const p of reeks.punten) {
    if (!p.betrouwbaar || p.glad === null) continue
    const afstand = Math.abs(kwartaalNummer(p.kwartaal) - doel)
    if (afstand <= maxAfstand && afstand < besteAfstand) {
      beste = p
      besteAfstand = afstand
    }
  }
  return beste
}

/**
 * Indexfactor om een prijs uit kwartaal `van` naar kwartaal `naar` te brengen:
 * index(naar) / index(van). `null` als een van beide punten niet betrouwbaar
 * te bepalen is (ook niet binnen `maxAfstandKwartalen`); de aanroeper kiest
 * dan de terugval (CBS of geen correctie).
 */
export function factor(
  reeks: PrijsindexReeks,
  van: Kwartaal,
  naar: Kwartaal,
  opties: { maxAfstandKwartalen?: number } = {},
): IndexFactor | null {
  const maxAfstand = opties.maxAfstandKwartalen ?? MAX_AFSTAND_KWARTALEN
  const pVan = zoekBetrouwbaar(reeks, van, maxAfstand)
  const pNaar = zoekBetrouwbaar(reeks, naar, maxAfstand)
  if (!pVan || !pNaar || pVan.glad === null || pNaar.glad === null || pVan.glad <= 0) return null
  const meldingen: string[] = []
  if (pVan.kwartaal !== van) meldingen.push(`index ${van} niet betrouwbaar, ${pVan.kwartaal} gebruikt`)
  if (pNaar.kwartaal !== naar) meldingen.push(`index ${naar} niet betrouwbaar, ${pNaar.kwartaal} gebruikt`)
  return {
    factor: pNaar.glad / pVan.glad,
    van,
    naar,
    gebruiktVan: pVan.kwartaal,
    gebruiktNaar: pNaar.kwartaal,
    waarschuwing: meldingen.length ? meldingen.join('; ') : null,
  }
}
