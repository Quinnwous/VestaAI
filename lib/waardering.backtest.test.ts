/**
 * Synthetische backtest van de waarderingskern v2 (vangrail voor de demo-lat
 * uit docs/roadmap.md § 3.3: mediaan absolute fout ≤ 7 %, ≥ 75 % van de
 * werkelijke prijzen binnen de band). De echte backtest op de demo-fixture en
 * op i4housing-data is item 4.8 (`scripts/backtest-waardering.mjs`), die
 * dezelfde meetlogica gebruikt — zie `lib/backtest.ts`.
 *
 * Elke woning wordt gewaardeerd met uitsluitend transacties van vóór haar
 * eigen verkoopdatum (peildatum-discipline). Dataset: waardering.synthetisch.ts.
 */
import { describe, expect, it } from 'vitest'
import { type BacktestSubject, type Meting, type ZonderUitkomst, meetEen, perTypegroep, vatSamen } from './backtest'
import { kwartaalNummer } from './prijsindex'
import { genereerSynthetisch, mulberry32 } from './waardering.synthetisch'

describe('backtest waarderingskern v2 (synthetisch)', () => {
  const alles = genereerSynthetisch()
  const rnd = mulberry32(7)
  const recent = alles.filter(t => t.kwartaalNr >= kwartaalNummer('2024-Q4'))
  const subjecten = [...recent].sort(() => rnd() - 0.5).slice(0, 400)

  const metingen: Meting[] = []
  const zonderWaarde: ZonderUitkomst[] = []
  const lekken: string[] = []

  for (const s of subjecten) {
    const peildatum = s.verkoopdatum
    const verleden = alles.filter(t => t.id !== s.id && t.verkoopdatum < peildatum)
    const subject: BacktestSubject = {
      id: s.id,
      woningtype_groep: s.woningtype_groep!,
      oppervlak_m2: s.woonoppervlak_m2,
      bouwjaar: s.bouwjaar,
      lat: s.lat,
      lng: s.lng,
      plaats: s.plaats,
      garage: s.garage,
      tuin: s.tuin,
      energielabel: s.energielabel,
      verkoopprijs: s.verkoopprijs,
      verkoopdatum: s.verkoopdatum,
    }
    const { meting, lekken: subjectLekken } = meetEen(subject, verleden, { peildatum, regionaal: verleden })
    lekken.push(...subjectLekken)
    if (meting === null) {
      zonderWaarde.push({ id: s.id, groep: s.woningtype_groep! })
      continue
    }
    metingen.push(meting)
  }

  const totaal = vatSamen('totaal', metingen, zonderWaarde)
  const perGroep = perTypegroep(metingen, zonderWaarde)
  // eslint-disable-next-line no-console
  console.log('backtest v2 (synthetisch):', JSON.stringify({ totaal, perGroep }))

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
    for (const g of perGroep.filter(x => x.metUitkomst >= 20)) {
      expect(g.mediaanFoutPct, g.label).toBeLessThanOrEqual(9)
      expect(g.binnenBandPct, g.label).toBeGreaterThanOrEqual(70)
    }
  })
})
