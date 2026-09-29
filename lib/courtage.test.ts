import { describe, it, expect } from 'vitest'
import { effectieveCourtage, courtageLabel, courtagePercentageLabel, parseOptioneelGetal } from './courtage'
import type { KantoorInstellingen } from './schemas'

describe('effectieveCourtage', () => {
  it('gebruikt het dossiervoorstel als dat er is, ook als het kantoor een standaard heeft', () => {
    const kantoor: KantoorInstellingen = { courtage: { percentage: 1, btw: 'exclusief' } }
    expect(effectieveCourtage(1.5, kantoor)).toEqual({ percentage: 1.5, btw: 'exclusief', bron: 'dossier' })
  })

  it('valt terug op de kantoorstandaard als er geen dossiervoorstel is', () => {
    const kantoor: KantoorInstellingen = { courtage: { percentage: 1, btw: 'exclusief' } }
    expect(effectieveCourtage(undefined, kantoor)).toEqual({ percentage: 1, btw: 'exclusief', bron: 'kantoor' })
    expect(effectieveCourtage(null, kantoor)).toEqual({ percentage: 1, btw: 'exclusief', bron: 'kantoor' })
  })

  it('geeft percentage null als noch het dossier, noch het kantoor iets heeft', () => {
    expect(effectieveCourtage(undefined, null)).toEqual({ percentage: null, btw: 'exclusief', bron: null })
    expect(effectieveCourtage(undefined, { courtage: undefined })).toEqual({ percentage: null, btw: 'exclusief', bron: null })
  })

  it('btw ontbreekt in de kantoorinstelling → exclusief (NL-gewoonte)', () => {
    const kantoor: KantoorInstellingen = { courtage: { percentage: 1 } }
    expect(effectieveCourtage(undefined, kantoor).btw).toBe('exclusief')
  })

  it('neemt de btw-instelling van het kantoor over, ook als het dossier het percentage bepaalt', () => {
    const kantoor: KantoorInstellingen = { courtage: { percentage: 1, btw: 'inclusief' } }
    expect(effectieveCourtage(1.25, kantoor)).toEqual({ percentage: 1.25, btw: 'inclusief', bron: 'dossier' })
  })

  it('werkt zonder kantoorinstellingen (nog niets ingesteld)', () => {
    expect(effectieveCourtage(1, undefined)).toEqual({ percentage: 1, btw: 'exclusief', bron: 'dossier' })
  })
})

describe('courtagePercentageLabel', () => {
  it('toont altijd twee decimalen, nl-NL-komma', () => {
    expect(courtagePercentageLabel(1)).toBe('1,00 %')
    expect(courtagePercentageLabel(1.5)).toBe('1,50 %')
    expect(courtagePercentageLabel(1.256)).toBe('1,26 %')
  })
})

describe('courtageLabel', () => {
  it('zet percentage en btw samen: "1,00 % excl. btw"', () => {
    expect(courtageLabel({ percentage: 1, btw: 'exclusief', bron: 'kantoor' })).toBe('1,00 % excl. btw')
  })

  it('toont incl. btw als de instelling dat zegt', () => {
    expect(courtageLabel({ percentage: 1.25, btw: 'inclusief', bron: 'dossier' })).toBe('1,25 % incl. btw')
  })

  it('geeft een streepje als er geen percentage is', () => {
    expect(courtageLabel({ percentage: null, btw: 'exclusief', bron: null })).toBe('—')
  })
})

describe('parseOptioneelGetal', () => {
  it('een leeg veld levert undefined, nooit NaN', () => {
    expect(parseOptioneelGetal('')).toBeUndefined()
    expect(parseOptioneelGetal(null)).toBeUndefined()
    expect(parseOptioneelGetal(undefined)).toBeUndefined()
  })

  it('parseert een ingevuld veld naar een getal', () => {
    expect(parseOptioneelGetal('1.25')).toBe(1.25)
    expect(parseOptioneelGetal('0')).toBe(0)
    expect(parseOptioneelGetal(2)).toBe(2)
  })
})
