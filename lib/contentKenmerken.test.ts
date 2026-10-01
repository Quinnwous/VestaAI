import { describe, expect, it } from 'vitest'
import { kenmerkRegels, feitenRegel } from './contentKenmerken'
import type { PropertyInput } from './schemas'

const basis = {
  adres: 'Generaal Winkelmanlaan 50, Voorschoten', woningtype_groep: 'halfvrijstaand', kamers: 5,
  oppervlak_m2: 132, bouwjaar: 1975, energielabel: 'B', vraagprijs: 675000,
} as PropertyInput

const volledig = {
  ...basis,
  slaapkamers: 4, badkamers: 1, woonlagen: 2, perceel_m2: 260,
  staat_afwerking: { keuken_jaar: 2018, isolatie: ['dak', 'glas'], zonnepanelen: true, recent_verbouwd: 'Living uitgebouwd in 2017' },
  ligging_buitenruimte: {
    ligging: 'twee_onder_een_kap', tuin_m2: 180, tuin_orientatie: 'zuid', balkon_dakterras: false,
    garage_parkeren: 'garage', uitzicht: 'Vrij uitzicht over weiland', vve_bijdrage_per_maand: 145,
    erfpacht: { van_toepassing: false },
  },
} as PropertyInput

describe('kenmerkRegels', () => {
  it('geeft alle ingevulde intakevelden mee, ook een expliciet "nee"', () => {
    const r = kenmerkRegels(volledig, 'nl')
    expect(r).toEqual(expect.arrayContaining([
      'Slaapkamers: 4', 'Badkamers: 1', 'Woonlagen: 2', 'Perceel: 260 m²', 'Keuken uit: 2018',
      'Isolatie: dak, isolatieglas', 'Zonnepanelen: ja', 'Recent verbouwd: Living uitgebouwd in 2017',
      'Ligging: twee-onder-een-kap', 'Tuin: 180 m² op het zuiden', 'Balkon of dakterras: nee',
      'Parkeren: eigen garage', 'Uitzicht: Vrij uitzicht over weiland', 'VvE-bijdrage: €145 per maand', 'Erfpacht: nee',
    ]))
  })

  it('vertaalt labels en waarden voor de Engelse generatie', () => {
    const r = kenmerkRegels(volledig, 'en')
    expect(r).toEqual(expect.arrayContaining([
      'Bedrooms: 4', 'Floors (living levels): 2', 'Solar panels: yes', 'Balcony or roof terrace: no',
      'Garden: 180 m², facing south', 'Position: semi-detached', 'HOA contribution: €145 per month',
    ]))
  })

  it('laat lege velden weg en lekt geen interne velden (courtage, prijsverwachting)', () => {
    const r = kenmerkRegels({ ...basis, courtagevoorstel_percentage: 1.7, prijsverwachting_verkoper: 695000 } as PropertyInput, 'nl')
    expect(r).toEqual([])
  })

  it('heeft een feitenregel in beide talen', () => {
    expect(feitenRegel('nl')).toContain('verzin er geen bij')
    expect(feitenRegel('en')).toContain('do not invent')
  })
})
