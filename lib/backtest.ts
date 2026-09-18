/**
 * Gedeelde meetlogica voor de backtest van de waarderingskern v2 (item 4.8,
 * docs/roadmap.md § 3.3 — demo-lat: mediaan absolute fout ≤ 7 %, ≥ 75 %
 * binnen de band). Pure functies, geen I/O: zowel `lib/waardering.backtest.test.ts`
 * (synthetische vitest-vangrail) als `scripts/backtest-waardering.mjs`
 * (fixture/echte data) roepen dezelfde `meetEen()`/`vatSamen()` aan, zodat er
 * precies één definitie van "wat is een goede backtest" bestaat.
 *
 * Peildatum-discipline: elk subject wordt gewaardeerd met uitsluitend
 * transacties van vóór de peildatum die de aanroeper meegeeft (test: de eigen
 * verkoopdatum; script: de dag ervóór, zie roadmap). `meetEen()` detecteert
 * zelf een eventueel lek (een referentie op of na de peildatum) zodat dat
 * nooit stilzwijgend voorbij kan glippen.
 */
import { berekenWaarderingV2, type Kandidaat, type SubjectV2, type Typegroep, type WaarderingOptiesV2, type WaarderingUitkomst } from './waardering'
import { mediaan } from './prijsindex'

export { mediaan }

/** Canonieke typegroep-volgorde voor rapportages (§ 3.3). */
export const TYPEGROEPEN: readonly Typegroep[] = ['appartement', 'rijwoning', 'halfvrijstaand', 'vrijstaand']

/**
 * Unweighted percentiel (lineaire interpolatie tussen rangorden), voor de
 * verdeling van de foutmaat zelf (P80/P90 van de absolute procentuele fout).
 * Niet te verwarren met `gewogenPercentiel()` in lib/waardering.ts, dat de
 * bandbreedte ván één waardering bepaalt uit de geïmpliceerde waarden.
 */
export function percentiel(waarden: number[], p: number): number | null {
  if (waarden.length === 0) return null
  const s = [...waarden].sort((a, b) => a - b)
  if (s.length === 1) return s[0]
  const idx = p * (s.length - 1)
  const laag = Math.floor(idx)
  const hoog = Math.ceil(idx)
  if (laag === hoog) return s[laag]
  return s[laag] + (s[hoog] - s[laag]) * (idx - laag)
}

/** Eén subject voor de backtest: een echte (historische) verkoop met bekende uitkomst. */
export type BacktestSubject = SubjectV2 & {
  id: string
  verkoopprijs: number
  /** Eigen verkoopdatum van het subject (ISO 'YYYY-MM-DD') — voor logging/lek-detectie, niet per se de peildatum. */
  verkoopdatum: string
}

/** Eén meting: het resultaat van één subject door de waarderingskern, tegen de werkelijke verkoopprijs afgezet. */
export type Meting = {
  id: string
  groep: Typegroep
  fout: number
  bandbreedtePct: number
  binnen: boolean
  n: number
  straal_m: number | null
  maanden: number
  weinigData: boolean
  heeftWaarschuwing: boolean
}

export type MeetUitkomst = {
  meting: Meting | null
  uitkomst: WaarderingUitkomst
  /** `${subjectId}:${referentieId}` voor elke referentie op of ná de peildatum — hoort altijd leeg te zijn. */
  lekken: string[]
}

/**
 * Waardeert één subject en zet die uitkomst af tegen de werkelijke
 * verkoopprijs. `opties.peildatum` is verplicht (de aanroeper bepaalt de
 * peildatum-conventie); alle overige `WaarderingOptiesV2` (regionaal, index,
 * correcties, …) worden 1-op-1 doorgegeven aan `berekenWaarderingV2`.
 */
export function meetEen(subject: BacktestSubject, kandidaten: Kandidaat[], opties: WaarderingOptiesV2 & { peildatum: NonNullable<WaarderingOptiesV2['peildatum']> }): MeetUitkomst {
  const uitkomst = berekenWaarderingV2(subject, kandidaten, opties)
  const lekken = uitkomst.referenties.filter(r => r.verkoopdatum >= uitkomst.peildatum).map(r => `${subject.id}:${r.id}`)

  if (uitkomst.waarde === null || uitkomst.laag === null || uitkomst.hoog === null) {
    return { meting: null, uitkomst, lekken }
  }
  const meting: Meting = {
    id: subject.id,
    groep: subject.woningtype_groep,
    fout: Math.abs(uitkomst.waarde - subject.verkoopprijs) / subject.verkoopprijs,
    bandbreedtePct: (uitkomst.hoog - uitkomst.laag) / uitkomst.waarde,
    binnen: uitkomst.laag <= subject.verkoopprijs && subject.verkoopprijs <= uitkomst.hoog,
    n: uitkomst.n,
    straal_m: uitkomst.straal_m,
    maanden: uitkomst.maanden,
    weinigData: uitkomst.weinigData,
    heeftWaarschuwing: uitkomst.waarschuwingen.length > 0,
  }
  return { meting, uitkomst, lekken }
}

/** Subjecten die geen waarde kregen (n = 0) — apart bijgehouden, telt wél mee in "% zonder uitkomst". */
export type ZonderUitkomst = { id: string; groep: Typegroep }

export type Groepsstatistiek = {
  label: string
  subjecten: number
  metUitkomst: number
  mediaanFoutPct: number | null
  p80FoutPct: number | null
  p90FoutPct: number | null
  binnenBandPct: number | null
  gemBandbreedtePct: number | null
  gemN: number | null
  zonderUitkomstPct: number
  metWaarschuwingPct: number | null
}

function rond(x: number, decimalen: number): number {
  const f = 10 ** decimalen
  return Math.round(x * f) / f
}

/**
 * Vat een groep metingen samen (totaal, per typegroep of per verbredingstrede
 * — de aanroeper bepaalt de partitionering en geeft de bijbehorende
 * `zonderWaarde`-subset mee). `zonderWaarde` telt mee in `subjecten` en
 * `zonderUitkomstPct`, maar niet in de foutmaten (die kennen geen fout).
 */
export function vatSamen(label: string, metingen: Meting[], zonderWaarde: ZonderUitkomst[] = []): Groepsstatistiek {
  const subjecten = metingen.length + zonderWaarde.length
  const fouten = metingen.map(m => m.fout)
  return {
    label,
    subjecten,
    metUitkomst: metingen.length,
    mediaanFoutPct: metingen.length ? rond((mediaan(fouten) ?? 0) * 100, 1) : null,
    p80FoutPct: metingen.length ? rond((percentiel(fouten, 0.8) ?? 0) * 100, 1) : null,
    p90FoutPct: metingen.length ? rond((percentiel(fouten, 0.9) ?? 0) * 100, 1) : null,
    binnenBandPct: metingen.length ? rond((metingen.filter(m => m.binnen).length / metingen.length) * 100, 0) : null,
    gemBandbreedtePct: metingen.length ? rond((metingen.reduce((a, m) => a + m.bandbreedtePct, 0) / metingen.length) * 100, 1) : null,
    gemN: metingen.length ? rond(metingen.reduce((a, m) => a + m.n, 0) / metingen.length, 1) : null,
    zonderUitkomstPct: subjecten ? rond((zonderWaarde.length / subjecten) * 100, 0) : 0,
    metWaarschuwingPct: metingen.length ? rond((metingen.filter(m => m.heeftWaarschuwing).length / metingen.length) * 100, 0) : null,
  }
}

/** Groepeert metingen per typegroep, in de canonieke volgorde `TYPEGROEPEN`. */
export function perTypegroep(metingen: Meting[], zonderWaarde: ZonderUitkomst[] = []): Groepsstatistiek[] {
  return TYPEGROEPEN.map(g => vatSamen(g, metingen.filter(m => m.groep === g), zonderWaarde.filter(z => z.groep === g)))
}

/** Groepeert metingen per gebruikte straal (verbredingstrede, § 3.3 `LADDER`). Subjecten zonder uitkomst hebben geen trede. */
export function perTrede(metingen: Meting[]): Groepsstatistiek[] {
  const tredes = Array.from(new Set(metingen.map(m => m.straal_m))).sort((a, b) => (a ?? 0) - (b ?? 0))
  return tredes.map(t => vatSamen(t === null ? 'onbekend' : `${t} m`, metingen.filter(m => m.straal_m === t)))
}
