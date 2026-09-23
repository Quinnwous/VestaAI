import { describe, it, expect } from 'vitest'
import { euro, procent, dagen, datum, m2, nlNL } from './opmaak'

describe('opmaak', () => {
  it('euro formatteert met duizendtalscheiding, geen decimalen, — bij null', () => {
    expect(euro(1234567)).toBe('€ 1.234.567')
    expect(euro(0)).toBe('€ 0')
    expect(euro(null)).toBe('—')
    expect(euro(undefined)).toBe('—')
    expect(euro(1234.6)).toBe('€ 1.235')
  })

  it('procent toont teken, 1 decimaal, — bij null', () => {
    expect(procent(1.25)).toBe('+1,3%')
    expect(procent(-1.25)).toBe('-1,3%')
    expect(procent(0)).toBe('0,0%')
    expect(procent(1.25, false)).toBe('1,3%')
    expect(procent(null)).toBe('—')
  })

  it('dagen rondt af en toont eenheid, — bij null', () => {
    expect(dagen(41.6)).toBe('42 dgn')
    expect(dagen(0)).toBe('0 dgn')
    expect(dagen(null)).toBe('—')
  })

  it('datum toont dag + korte NL-maand + jaar', () => {
    expect(datum(new Date(2026, 8, 12))).toBe('12 sep 2026')
    expect(datum(new Date(2026, 0, 1))).toBe('1 jan 2026')
  })

  it('m2 rondt af, toont eenheid, — bij null', () => {
    expect(m2(140.4)).toBe('140 m²')
    expect(m2(null)).toBe('—')
  })

  it('nlNL is een herbruikbare Intl.NumberFormat', () => {
    expect(nlNL.format(1234)).toBe('1.234')
  })
})
