import { describe, expect, it } from 'vitest'
import {
  bouwFeitenblad,
  bouwContextLabel,
  controleerGuardrail,
  vindGetallenInTekst,
  type FeitenbladInput,
} from './kwartaalbericht'
import type { MarktanalyseSamenvatting } from './transactiesQuery'

function samenvatting(overrides: Partial<MarktanalyseSamenvatting> = {}): MarktanalyseSamenvatting {
  return {
    huidig: {
      van: '2024-10-01',
      tot: '2026-09-20',
      n: 47,
      mediaanPrijs: 852_000,
      mediaanM2: 5_430,
      mediaanLooptijd: 34,
      pctTovVraag: 2.1,
      ...overrides.huidig,
    },
    vorig: {
      van: '2022-10-01',
      tot: '2024-09-30',
      n: 40,
      mediaanPrijs: 810_000,
      mediaanM2: 5_100,
      mediaanLooptijd: 38,
      pctTovVraag: 1.5,
      ...overrides.vorig,
    },
  }
}

function basisInput(overrides: Partial<FeitenbladInput> = {}): FeitenbladInput {
  return {
    samenvatting: samenvatting(),
    dataTotEnMet: '2026-09-20',
    contextLabel: 'Wassenaar · Vrijstaand · laatste 24 maanden',
    periodeMaanden: 24,
    eigenAandeel: { nEigenHuidig: 9, nEigenVorig: 7 },
    ...overrides,
  }
}

describe('bouwContextLabel', () => {
  it('valt terug op "hele werkgebied"/"alle woningtypen" zonder filters', () => {
    expect(bouwContextLabel({ plaatsen: [], typen: [], periode: 24 })).toBe('hele werkgebied · alle woningtypen · laatste 24 maanden')
  })

  it('toont plaatsen en typen als die actief zijn', () => {
    expect(bouwContextLabel({ plaatsen: ['Wassenaar'], typen: ['Villa'], periode: 12 })).toBe('Wassenaar · Villa · laatste 12 maanden')
  })
})

describe('bouwFeitenblad', () => {
  it('bevat de kerncijfers van de huidige periode', () => {
    const blad = bouwFeitenblad(basisInput())
    const sleutels = blad.feiten.map(f => f.sleutel)
    expect(sleutels).toContain('huidig_mediaan_prijs')
    expect(sleutels).toContain('huidig_mediaan_m2')
    expect(sleutels).toContain('huidig_mediaan_looptijd')
    expect(sleutels).toContain('huidig_pct_tov_vraag')
    expect(sleutels).toContain('huidig_aantal')
    expect(blad.tekst).toContain('852.000')
    expect(blad.tekst).toContain('Wassenaar')
  })

  it('berekent delta\'s t.o.v. de vorige periode', () => {
    const blad = bouwFeitenblad(basisInput())
    const deltaPrijs = blad.feiten.find(f => f.sleutel === 'delta_mediaan_prijs')
    expect(deltaPrijs?.waarde).toBeCloseTo(((852_000 / 810_000) - 1) * 100, 5)
  })

  it('laat delta\'s weg als de vorige periode te weinig data heeft', () => {
    const blad = bouwFeitenblad(basisInput({ samenvatting: samenvatting({ vorig: { van: '2022-10-01', tot: '2024-09-30', n: 3, mediaanPrijs: 700_000, mediaanM2: 4_000, mediaanLooptijd: 50, pctTovVraag: 0 } }) }))
    expect(blad.feiten.some(f => f.sleutel.startsWith('delta_'))).toBe(false)
    expect(blad.feiten.some(f => f.sleutel.startsWith('vorig_'))).toBe(false)
    expect(blad.tekst).toContain('Geen betrouwbare vorige periode')
  })

  it('neemt het eigen aandeel op als facet', () => {
    const blad = bouwFeitenblad(basisInput())
    const aandeel = blad.feiten.find(f => f.sleutel === 'eigen_aandeel_pct')
    expect(aandeel).toBeDefined()
    expect(aandeel!.waarde).toBeCloseTo((9 / 47) * 100, 5)
  })

  it('slaat het eigen aandeel over zonder eigenAandeel-invoer', () => {
    const blad = bouwFeitenblad(basisInput({ eigenAandeel: null }))
    expect(blad.feiten.some(f => f.sleutel.startsWith('eigen_'))).toBe(false)
  })

  it('waarschuwt bij weinig data in de huidige periode', () => {
    const blad = bouwFeitenblad(basisInput({ samenvatting: samenvatting({ huidig: { van: '2024-10-01', tot: '2026-09-20', n: 4, mediaanPrijs: 852_000, mediaanM2: 5_430, mediaanLooptijd: 34, pctTovVraag: 2.1 } }) }))
    expect(blad.tekst).toContain('Let op: dit is weinig data')
  })
})

describe('vindGetallenInTekst', () => {
  it('herkent een euro-bedrag in volledige NL-notatie', () => {
    const gevonden = vindGetallenInTekst('De mediaan verkoopprijs kwam uit op € 425.000 dit kwartaal.')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 425_000, groep: 'geld' }))
  })

  it('herkent een verkort miljoenenbedrag', () => {
    const gevonden = vindGetallenInTekst('Woningen gingen voor gemiddeld € 1,2 mln van de hand.')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 1_200_000, groep: 'geld' }))
  })

  it('herkent percentages in cijfer- en woordvorm', () => {
    const gevonden = vindGetallenInTekst('De prijzen stegen met 3,2% en de verkoop lag 12 procent hoger.')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 3.2, groep: 'procent' }))
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 12, groep: 'procent' }))
  })

  it('herkent looptijd in dagen', () => {
    const gevonden = vindGetallenInTekst('De gemiddelde looptijd was 34 dagen.')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 34, groep: 'dagen' }))
  })

  it('herkent aantallen bij transacties/verkopen', () => {
    const gevonden = vindGetallenInTekst('Er werden 47 transacties geregistreerd, waarvan 9 verkopen door ons.')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 47, groep: 'aantal' }))
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 9, groep: 'aantal' }))
  })

  it('reageert niet op een kaal jaartal', () => {
    const gevonden = vindGetallenInTekst('Sinds 2024 zien we een stabiele markt.')
    expect(gevonden).toHaveLength(0)
  })
})

describe('controleerGuardrail', () => {
  it('keurt een tekst goed die alleen feitenblad-cijfers gebruikt (in verschillende afrondingen)', () => {
    const blad = bouwFeitenblad(basisInput())
    const tekst = `In deze selectie (${blad.contextLabel}) kwam de mediaan verkoopprijs uit op € 852.000, een stijging van 5,2% t.o.v. de vorige periode. De mediaan prijs per m² bedroeg € 5.430. Woningen stonden mediaan 34 dagen te koop. Er werden 47 transacties geregistreerd, waarvan 9 door ons kantoor.`
    const resultaat = controleerGuardrail(tekst, blad)
    expect(resultaat.ok).toBe(true)
    expect(resultaat.onbekend).toHaveLength(0)
  })

  it('accepteert een afgeronde miljoenennotatie van een feitenbladcijfer', () => {
    const blad = bouwFeitenblad(basisInput({ samenvatting: samenvatting({ huidig: { van: '2024-10-01', tot: '2026-09-20', n: 47, mediaanPrijs: 1_235_000, mediaanM2: 5_430, mediaanLooptijd: 34, pctTovVraag: 2.1 } }) }))
    const tekst = 'De mediaan verkoopprijs kwam uit op ruim € 1,2 mln.'
    expect(controleerGuardrail(tekst, blad).ok).toBe(true)
  })

  it('keurt een verzonnen getal af', () => {
    const blad = bouwFeitenblad(basisInput())
    const tekst = 'De mediaan verkoopprijs kwam uit op € 999.999, een fors bedrag.'
    const resultaat = controleerGuardrail(tekst, blad)
    expect(resultaat.ok).toBe(false)
    expect(resultaat.onbekend[0]?.waarde).toBe(999_999)
  })

  it('keurt een verzonnen percentage af', () => {
    const blad = bouwFeitenblad(basisInput())
    const tekst = 'De prijzen stegen dit kwartaal met maar liefst 47,8%.'
    expect(controleerGuardrail(tekst, blad).ok).toBe(false)
  })

  it('NL-gedrag blijft ongewijzigd als taal expliciet "nl" wordt meegegeven', () => {
    const blad = bouwFeitenblad(basisInput())
    const tekst = `De mediaan verkoopprijs kwam uit op € 852.000, een stijging van 5,2%. De mediaan looptijd was 34 dagen. Er werden 47 transacties geregistreerd.`
    expect(controleerGuardrail(tekst, blad, 'nl').ok).toBe(true)
  })
})

describe('vindGetallenInTekst — EN-notatie', () => {
  it('herkent een euro-bedrag in volledige EN-notatie', () => {
    const gevonden = vindGetallenInTekst('The median sale price came in at €949,500 last quarter.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 949_500, groep: 'geld' }))
  })

  it('herkent een euro-bedrag met spatie na het eurosymbool', () => {
    const gevonden = vindGetallenInTekst('that is € 949,500 in total.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 949_500, groep: 'geld' }))
  })

  it('herkent een verkort miljoenenbedrag (m en million)', () => {
    expect(vindGetallenInTekst('Homes sold for €1.2m on average.', 'en'))
      .toContainEqual(expect.objectContaining({ waarde: 1_200_000, groep: 'geld' }))
    expect(vindGetallenInTekst('Homes sold for €1.2 million on average.', 'en'))
      .toContainEqual(expect.objectContaining({ waarde: 1_200_000, groep: 'geld' }))
  })

  it('leest een woord dat met de schaalletter begint niet als schaal (monthly-val)', () => {
    const gevonden = vindGetallenInTekst('Rent is €949,500 monthly for the building.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 949_500, groep: 'geld' }))
  })

  it('herkent percentages in EN-notatie en woordvorm', () => {
    const gevonden = vindGetallenInTekst('Prices rose 11.3% and are up 12 percent year over year.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 11.3, groep: 'procent' }))
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 12, groep: 'procent' }))
  })

  it('herkent "percentage point(s)" als procent-groep', () => {
    const gevonden = vindGetallenInTekst('A marginal shift of -0.1 percentage point compared to last quarter.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: -0.1, groep: 'procent' }))
    const meervoud = vindGetallenInTekst('Days on market rose by 2.1 percentage points this year.', 'en')
    expect(meervoud).toContainEqual(expect.objectContaining({ waarde: 2.1, groep: 'procent' }))
  })

  it('herkent looptijd in dagen', () => {
    const gevonden = vindGetallenInTekst('The median time on market was 34 days.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 34, groep: 'dagen' }))
  })

  it('herkent aantallen bij homes/sales/transactions/properties/months', () => {
    const gevonden = vindGetallenInTekst('A total of 2,064 homes changed hands, including 9 sales by our office across 24 months.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 2_064, groep: 'aantal' }))
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 9, groep: 'aantal' }))
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 24, groep: 'aantal' }))
  })

  it('reageert niet op een kaal jaartal', () => {
    const gevonden = vindGetallenInTekst('Since 2024, the market has been stable.', 'en')
    expect(gevonden).toHaveLength(0)
  })

  it('valkuil: een jaartal gevolgd door een komma en een aantal wordt niet samengevoegd', () => {
    const gevonden = vindGetallenInTekst('In 2025, 412 homes sold across the region.', 'en')
    expect(gevonden).toContainEqual(expect.objectContaining({ waarde: 412, groep: 'aantal' }))
    expect(gevonden.some(g => g.waarde === 2_025_412 || g.waarde === 2025)).toBe(false)
  })

  it('valkuil: een percentage gevolgd door een punt en een nieuwe zin wordt niet samengevoegd', () => {
    const gevonden = vindGetallenInTekst('Prices rose 3.2%. Prices continued to climb into next quarter.', 'en')
    expect(gevonden).toEqual([expect.objectContaining({ waarde: 3.2, groep: 'procent' })])
  })
})

describe('controleerGuardrail — EN-notatie', () => {
  it('keurt een EN-tekst goed die precies de feitenbladgetallen in EN-notatie bevat', () => {
    const blad = bouwFeitenblad(basisInput())
    const tekst = `In this selection (${blad.contextLabel}) the median sale price came in at €852,000, up 5.2% from the previous period. The median price per m² was €5,430. Homes spent a median of 34 days on the market. A total of 47 transactions were recorded, including 9 by our office.`
    const resultaat = controleerGuardrail(tekst, blad, 'en')
    expect(resultaat.ok).toBe(true)
    expect(resultaat.onbekend).toHaveLength(0)
  })

  it('keurt een EN-tekst met een verzonnen getal af, met dat getal in onbekend', () => {
    const blad = bouwFeitenblad(basisInput())
    const tekst = 'The median sale price came in at €999,999, a striking figure.'
    const resultaat = controleerGuardrail(tekst, blad, 'en')
    expect(resultaat.ok).toBe(false)
    expect(resultaat.onbekend[0]?.waarde).toBe(999_999)
  })

  it('keurt een EN-tekst met een verzonnen percentage af', () => {
    const blad = bouwFeitenblad(basisInput())
    const tekst = 'Prices rose by a striking 47.8% this quarter.'
    expect(controleerGuardrail(tekst, blad, 'en').ok).toBe(false)
  })

  it('accepteert een afgeronde miljoenennotatie van een feitenbladcijfer in EN', () => {
    const blad = bouwFeitenblad(basisInput({ samenvatting: samenvatting({ huidig: { van: '2024-10-01', tot: '2026-09-20', n: 47, mediaanPrijs: 1_235_000, mediaanM2: 5_430, mediaanLooptijd: 34, pctTovVraag: 2.1 } }) }))
    const tekst = 'The median sale price came in at just over €1.2 million.'
    expect(controleerGuardrail(tekst, blad, 'en').ok).toBe(true)
  })
})
