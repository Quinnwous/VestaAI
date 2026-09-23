import { describe, it, expect } from 'vitest'
import { bewerkingenLabel } from './stijlLeren'

describe('bewerkingenLabel', () => {
  it('gebruikt het meervoud correct bij nul', () => {
    expect(bewerkingenLabel(0)).toBe('0 bewerkingen wachten op je oordeel')
  })

  it('gebruikt het enkelvoud bij precies één bewerking', () => {
    expect(bewerkingenLabel(1)).toBe('1 bewerking wacht op je oordeel')
  })

  it('gebruikt het meervoud bij meerdere bewerkingen', () => {
    expect(bewerkingenLabel(3)).toBe('3 bewerkingen wachten op je oordeel')
  })

  it('gebruikt het meervoud bij grote aantallen', () => {
    expect(bewerkingenLabel(42)).toBe('42 bewerkingen wachten op je oordeel')
  })
})
