import { describe, it, expect } from 'vitest'
import { moetKaartMonteren } from './basisKaartLaadgrens'

describe('moetKaartMonteren (item 12.5 — laadgrens BasisKaart)', () => {
  it('direct mount meteen, ook zonder intersectie', () => {
    expect(moetKaartMonteren(true, false)).toBe(true)
  })

  it('direct blijft meteen mounten als de kaart toevallig ook al intersect', () => {
    expect(moetKaartMonteren(true, true)).toBe(true)
  })

  it('zonder direct: nog niet monteren vóór intersectie', () => {
    expect(moetKaartMonteren(false, false)).toBe(false)
  })

  it('zonder direct: monteren zodra de container intersect', () => {
    expect(moetKaartMonteren(false, true)).toBe(true)
  })
})
