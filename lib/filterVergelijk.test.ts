import { describe, expect, it } from 'vitest'
import { bereikGelijk, verzamelingGelijk } from './filterVergelijk'

describe('bereikGelijk', () => {
  it('is gelijk bij identieke bereiken', () => {
    expect(bereikGelijk([0, 100], [0, 100])).toBe(true)
  })

  it('is ongelijk als min of max afwijkt', () => {
    expect(bereikGelijk([0, 100], [10, 100])).toBe(false)
    expect(bereikGelijk([0, 100], [0, 90])).toBe(false)
  })
})

describe('verzamelingGelijk', () => {
  it('is gelijk bij dezelfde elementen in dezelfde volgorde', () => {
    expect(verzamelingGelijk(['Wassenaar', 'Voorschoten'], ['Wassenaar', 'Voorschoten'])).toBe(true)
  })

  it('is gelijk bij dezelfde elementen in een andere volgorde (ordervrij)', () => {
    expect(verzamelingGelijk(['Voorschoten', 'Wassenaar'], ['Wassenaar', 'Voorschoten'])).toBe(true)
  })

  it('is ongelijk bij een andere lengte', () => {
    expect(verzamelingGelijk(['Wassenaar'], ['Wassenaar', 'Voorschoten'])).toBe(false)
  })

  it('is ongelijk bij verschillende elementen', () => {
    expect(verzamelingGelijk(['Wassenaar'], ['Voorschoten'])).toBe(false)
  })

  it('werkt op lege lijsten', () => {
    expect(verzamelingGelijk([], [])).toBe(true)
  })

  it('werkt generiek, niet alleen op strings', () => {
    expect(verzamelingGelijk([1, 2, 3], [3, 2, 1])).toBe(true)
    expect(verzamelingGelijk([1, 2], [1, 3])).toBe(false)
  })
})
