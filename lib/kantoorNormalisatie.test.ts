import { describe, it, expect } from 'vitest'
import { normaliseerKantoornaam, isEigenKantoor } from './kantoorNormalisatie'

describe('normaliseerKantoornaam', () => {
  it('normaliseert "i4 Housing B.V." en "I4housing Makelaars" naar dezelfde norm', () => {
    expect(normaliseerKantoornaam('i4 Housing B.V.')).toBe(normaliseerKantoornaam('I4housing Makelaars'))
  })

  it('normaliseert een derde variant met Makelaardij o.g. ook gelijk', () => {
    const norm = normaliseerKantoornaam('i4 Housing B.V.')
    expect(normaliseerKantoornaam('I4 Housing Makelaardij o.g.')).toBe(norm)
    expect(norm).toBe('i4housing')
  })

  it('verwijdert "& Partners"', () => {
    expect(normaliseerKantoornaam('Wassenaar Makelaars & Partners')).toBe('wassenaar')
    expect(normaliseerKantoornaam('Wassenaar')).toBe('wassenaar')
  })

  it('verwijdert diakrieten', () => {
    expect(normaliseerKantoornaam('Vastgoed Wérkhoven B.V.')).toBe('vastgoedwerkhoven')
  })

  it('verschillende kantoren blijven verschillend', () => {
    expect(normaliseerKantoornaam('Jansen Makelaardij')).not.toBe(normaliseerKantoornaam('Pietersen Makelaardij'))
  })

  it('geeft null voor een lege of alleen-ruis naam', () => {
    expect(normaliseerKantoornaam('')).toBeNull()
    expect(normaliseerKantoornaam(null)).toBeNull()
    expect(normaliseerKantoornaam(undefined)).toBeNull()
    expect(normaliseerKantoornaam('B.V.')).toBeNull()
    expect(normaliseerKantoornaam('NVM Makelaars')).toBeNull()
  })

  it('is stabiel bij herhaald normaliseren (idempotent)', () => {
    const eerste = normaliseerKantoornaam('i4 Housing B.V.')
    expect(normaliseerKantoornaam(eerste)).toBe(eerste)
  })
})

describe('isEigenKantoor', () => {
  const aliassen = ['i4 Housing', 'I4housing B.V.']

  it('herkent een naam die via de norm overeenkomt met een alias', () => {
    expect(isEigenKantoor('I4 Housing Makelaardij o.g.', aliassen)).toBe(true)
  })

  it('herkent een ander kantoor niet als eigen kantoor', () => {
    expect(isEigenKantoor('Wassenaar Makelaars & Partners', aliassen)).toBe(false)
  })

  it('geeft false zonder aliassen of zonder naam', () => {
    expect(isEigenKantoor('i4 Housing', [])).toBe(false)
    expect(isEigenKantoor(null, aliassen)).toBe(false)
    expect(isEigenKantoor('', aliassen)).toBe(false)
  })
})
