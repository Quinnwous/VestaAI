import { describe, expect, it } from 'vitest'
import { euro, euroKort, procent, dagen, datum, m2, mooieStap, nlNL, kwartaalLabel } from './opmaak'

describe('lib/opmaak', () => {
  it('euro formatteert hele bedragen met duizendtalpunten en geen centen', () => {
    expect(euro(1234567)).toBe('€ 1.234.567')
    expect(euro(850000.4)).toBe('€ 850.000')
    expect(euro(null)).toBe('—')
    expect(euro(undefined)).toBe('—')
  })

  it('euroKort toont k/mln-notatie', () => {
    expect(euroKort(850000)).toBe('€ 850 k')
    expect(euroKort(1_230_000)).toBe('€ 1,23 mln')
    expect(euroKort(1_500_000)).toBe('€ 1,5 mln')
    expect(euroKort(null)).toBe('—')
  })

  it('procent toont een teken tenzij uitgeschakeld', () => {
    expect(procent(3.24)).toBe('+3,2%')
    expect(procent(-1.0)).toBe('-1,0%')
    expect(procent(3.24, false)).toBe('3,2%')
    expect(procent(null)).toBe('—')
  })

  it('dagen rondt af', () => {
    expect(dagen(41.6)).toBe('42 dgn')
    expect(dagen(0)).toBe('0 dgn')
    expect(dagen(null)).toBe('—')
  })

  it('datum toont dag maand-kort jaar in UTC', () => {
    expect(datum('2026-09-12')).toBe('12 sep 2026')
    expect(datum(new Date(Date.UTC(2026, 0, 1)))).toBe('1 jan 2026')
    expect(datum(null)).toBe('—')
  })

  it('m2 rondt af en voegt eenheid toe', () => {
    expect(m2(120.4)).toBe('120 m²')
    expect(m2(null)).toBe('—')
  })

  it('mooieStap rondt naar 1/2/5×10^n', () => {
    expect(mooieStap(120)).toBe(100)
    expect(mooieStap(230)).toBe(200)
    expect(mooieStap(430)).toBe(500)
    expect(mooieStap(0)).toBe(1)
  })

  it('nlNL is een Intl.NumberFormat("nl-NL")', () => {
    expect(nlNL.format(1234)).toBe('1.234')
  })

  it('kwartaalLabel draait de volgorde om voor leesbaarheid', () => {
    expect(kwartaalLabel('2026-Q1')).toBe('Q1 2026')
    expect(kwartaalLabel('onzin')).toBe('onzin')
  })
})
