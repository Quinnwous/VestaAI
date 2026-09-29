import { describe, it, expect } from 'vitest'
import { plaatsSleutel, plaatsenGelijk, plaatsVarianten, canoniekePlaats } from './plaatsNormalisatie'

describe('plaatsSleutel', () => {
  it('negeert hoofdletters, apostrofs, koppeltekens en diakrieten', () => {
    expect(plaatsSleutel('Wassenaar')).toBe(plaatsSleutel('wassenaar'))
    expect(plaatsSleutel("'s-Gravenhage")).toBe(plaatsSleutel('s Gravenhage'))
  })
})

describe('plaatsenGelijk', () => {
  it("herkent 's-Gravenhage en Den Haag als dezelfde plaats", () => {
    expect(plaatsenGelijk("'s-Gravenhage", 'Den Haag')).toBe(true)
    expect(plaatsenGelijk('Wassenaar', 'Voorschoten')).toBe(false)
  })
})

describe('plaatsVarianten', () => {
  it('geeft de bekende aliassen mee voor een RPC-filter', () => {
    // "'s-Gravenhage" heeft dezelfde kale vorm als de andere twee 's-Gravenhage-
    // schrijfwijzen in de aliasgroep, dus die vallen weg — alleen "Den Haag" resteert.
    expect(plaatsVarianten("'s-Gravenhage")).toEqual(["'s-Gravenhage", 'Den Haag'])
    expect(plaatsVarianten('Den Haag')).toEqual(['Den Haag', "'s-Gravenhage", 's-Gravenhage', 'S GRAVENHAGE'])
  })

  it('geeft alleen de plaats zelf terug zonder bekende alias', () => {
    expect(plaatsVarianten('Wassenaar')).toEqual(['Wassenaar'])
  })
})

describe('canoniekePlaats', () => {
  it("herleidt alle 's-Gravenhage-varianten naar Den Haag", () => {
    expect(canoniekePlaats("'s-Gravenhage")).toBe('Den Haag')
    expect(canoniekePlaats('s-Gravenhage')).toBe('Den Haag')
    expect(canoniekePlaats('S GRAVENHAGE')).toBe('Den Haag')
    expect(canoniekePlaats('s gravenhage')).toBe('Den Haag')
    expect(canoniekePlaats('Den Haag')).toBe('Den Haag')
    expect(canoniekePlaats('DEN HAAG')).toBe('Den Haag')
    expect(canoniekePlaats('den haag')).toBe('Den Haag')
  })

  it('zet een plaats zonder aliasgroep in nette hoofdletters, ongeacht de invoer', () => {
    expect(canoniekePlaats('wassenaar')).toBe('Wassenaar')
    expect(canoniekePlaats('  Den  Haag ')).toBe('Den Haag')
  })

  it('trimt en collapset witruimte zonder de casing te wijzigen als die al klopt', () => {
    expect(canoniekePlaats('  Voorschoten  ')).toBe('Voorschoten')
  })

  it('sloopt tussenvoegsels in echte Nederlandse plaatsnamen niet', () => {
    expect(canoniekePlaats("'s-Hertogenbosch")).toBe("'s-Hertogenbosch")
    expect(canoniekePlaats("'s-hertogenbosch")).toBe("'s-Hertogenbosch")
    expect(canoniekePlaats('Bergen op Zoom')).toBe('Bergen op Zoom')
    expect(canoniekePlaats('bergen op zoom')).toBe('Bergen op Zoom')
  })

  it('geeft een lege string terug voor lege/kale invoer', () => {
    expect(canoniekePlaats('')).toBe('')
    expect(canoniekePlaats('   ')).toBe('')
  })
})

describe('canoniekePlaats — hoofdlettervormen uit exports', () => {
  it.each([
    ['WASSENAAR', 'Wassenaar'],
    ['wassenaar', 'Wassenaar'],
    ['ALPHEN AAN DEN RIJN', 'Alphen aan den Rijn'],
    ['DEN HELDER', 'Den Helder'],
    ['ijmuiden', 'IJmuiden'],
    ['IJMUIDEN', 'IJmuiden'],
    ['NIEUW-VENNEP', 'Nieuw-Vennep'],
    ["'S-HERTOGENBOSCH", "'s-Hertogenbosch"],
    ['Capelle aan den IJssel', 'Capelle aan den IJssel'],
    ['Leidschendam-Voorburg', 'Leidschendam-Voorburg'],
  ])('%s → %s', (invoer, verwacht) => {
    expect(canoniekePlaats(invoer)).toBe(verwacht)
  })
})
