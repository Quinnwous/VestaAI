import { describe, it, expect } from 'vitest'
import { locatieAanduiding } from './locatieAanduiding'

describe('locatieAanduiding', () => {
  it('geeft een aanduiding bij status "benaderd"', () => {
    expect(locatieAanduiding('benaderd')).toBe('Locatie benaderd — op straatniveau, niet het exacte adres')
  })

  it('geeft niets bij "exact"', () => {
    expect(locatieAanduiding('exact')).toBeNull()
  })

  it('geeft niets bij "mislukt"', () => {
    expect(locatieAanduiding('mislukt')).toBeNull()
  })

  it('geeft niets bij null', () => {
    expect(locatieAanduiding(null)).toBeNull()
  })

  it('geeft niets bij undefined', () => {
    expect(locatieAanduiding(undefined)).toBeNull()
  })

  it('geeft niets bij een onbekende waarde', () => {
    expect(locatieAanduiding('iets-anders')).toBeNull()
  })
})
