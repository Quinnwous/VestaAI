/**
 * Synthetische backtest van de waarderingskern v2 (vangrail voor de demo-lat
 * uit docs/roadmap.md § 3.3: mediaan absolute fout ≤ 7 %, ≥ 75 % van de
 * werkelijke prijzen binnen de band). De echte backtest op de demo-fixture en
 * op i4housing-data is item 4.8 (`scripts/backtest-waardering.mjs`).
 *
 * Elke woning wordt gewaardeerd met uitsluitend transacties van vóór haar
 * eigen verkoopdatum (peildatum-discipline). Dataset: waardering.synthetisch.ts.
 */
import { describe, expect, it } from 'vitest'
import { berekenWaarderingV2, type Typegroep } from './waardering'
import { kwartaalNummer } from './prijsindex'
import { genereerSynthetisch, mulberry32, TYPEN } from './waardering.synthetisch'

function mediaan(x: number[]): number {
  const s = [...x].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

describe('backtest waarderingskern v2 (synthetisch)', () => {
  const alles = genereerSynthetisch()
  const rnd = mulberry32(7)
  const recent = alles.filter(t => t.kwartaalNr >= kwartaalNummer('2024-Q4'))
  const subjecten = [...recent].sort(() => rnd() - 0.5).slice(0, 400)

  type Meting = { groep: Typegroep; fout: number; binnen: boolean; n: number; straal: number | null; weinig: boolean }
  const metingen: Meting[] = []
  const zonderWaarde: string[] = []
  const lekken: string[] = []

  for (const s of subjecten) {
    const peildatum = s.verkoopdatum
    const verleden = alles.filter(t => t.id !== s.id && t.verkoopdatum < peildatum)
    const uit = berekenWaarderingV2(
      { woningtype_groep: s.woningtype_groep!, oppervlak_m2: s.woonoppervlak_m2, bouwjaar: s.bouwjaar, lat: s.lat, lng: s.lng, plaats: s.plaats, garage: s.garage, tuin: s.tuin, energielabel: s.energielabel },
      verleden,
      { peildatum, regionaal: verleden },
    )
    for (const r of uit.referenties) if (r.verkoopdatum >= peildatum) lekken.push(`${s.id}:${r.id}`)
    if (uit.waarde === null) { zonderWaarde.push(s.id); continue }
    metingen.push({
      groep: s.woningtype_groep!,
      fout: Math.abs(uit.waarde - s.verkoopprijs) / s.verkoopprijs,
      binnen: uit.laag! <= s.verkoopprijs && s.verkoopprijs <= uit.hoog!,
      n: uit.n,
      straal: uit.straal_m,
      weinig: uit.weinigData,
    })
  }

  const perGroep = TYPEN.map(t => {
    const m = metingen.filter(x => x.groep === t.groep)
    return {
      groep: t.groep,
      subjecten: m.length,
      mediaanFoutPct: m.length ? Math.round(mediaan(m.map(x => x.fout)) * 1000) / 10 : null,
      binnenBandPct: m.length ? Math.round((m.filter(x => x.binnen).length / m.length) * 100) : null,
      gemN: m.length ? Math.round(m.reduce((a, x) => a + x.n, 0) / m.length) : null,
    }
  })
  const totaal = {
    subjecten: metingen.length,
    mediaanFoutPct: Math.round(mediaan(metingen.map(x => x.fout)) * 1000) / 10,
    binnenBandPct: Math.round((metingen.filter(x => x.binnen).length / metingen.length) * 100),
    weinigDataPct: Math.round((metingen.filter(x => x.weinig).length / metingen.length) * 100),
    straal750Pct: Math.round((metingen.filter(x => x.straal === 750).length / metingen.length) * 100),
  }
  // eslint-disable-next-line no-console
  console.log('backtest v2 (synthetisch):', JSON.stringify({ totaal, perGroep, zonderWaarde: zonderWaarde.length }))

  it('gebruikt nooit een referentie van op of na de peildatum', () => {
    expect(lekken).toEqual([])
  })
  it('waardeert vrijwel elk subject', () => {
    expect(metingen.length).toBeGreaterThanOrEqual(380)
  })
  it('haalt de demo-lat: mediaan absolute fout ≤ 7 %', () => {
    expect(totaal.mediaanFoutPct).toBeLessThanOrEqual(7)
  })
  it('haalt de demo-lat: ≥ 75 % van de werkelijke prijzen binnen de band', () => {
    expect(totaal.binnenBandPct).toBeGreaterThanOrEqual(75)
  })
  it('haalt de lat ook per typegroep met genoeg subjecten (≥ 20)', () => {
    for (const g of perGroep.filter(x => x.subjecten >= 20)) {
      expect(g.mediaanFoutPct, g.groep).toBeLessThanOrEqual(9)
      expect(g.binnenBandPct, g.groep).toBeGreaterThanOrEqual(70)
    }
  })
})
