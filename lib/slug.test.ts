import { describe, it, expect } from 'vitest'
import { normaliseerSlug, isGeldigeSlug } from './slug'

describe('normaliseerSlug', () => {
  it('maakt lowercase en vervangt spaties door een koppelteken', () => {
    expect(normaliseerSlug('i4 Housing')).toBe('i4-housing')
  })

  it('verwijdert diakrieten', () => {
    expect(normaliseerSlug('Makelaardij Vörde')).toBe('makelaardij-vorde')
  })

  it('vervangt leestekens door een koppelteken en dedupliceert ze', () => {
    expect(normaliseerSlug('De  Sleutel & Co.')).toBe('de-sleutel-co')
  })

  it('trimt rand-koppeltekens', () => {
    expect(normaliseerSlug('  -Demo Makelaardij- ')).toBe('demo-makelaardij')
  })

  it('is idempotent op een al geldige slug', () => {
    expect(normaliseerSlug('i4housing')).toBe('i4housing')
  })

  it('geeft een lege string voor puur leestekens', () => {
    expect(normaliseerSlug('!!!')).toBe('')
  })
})

describe('isGeldigeSlug', () => {
  it('accepteert een normale slug', () => {
    expect(isGeldigeSlug('i4housing')).toBe(true)
    expect(isGeldigeSlug('demo-makelaardij')).toBe(true)
  })

  it('weigert hoofdletters', () => {
    expect(isGeldigeSlug('i4Housing')).toBe(false)
  })

  it('weigert rand-koppeltekens', () => {
    expect(isGeldigeSlug('-i4housing')).toBe(false)
    expect(isGeldigeSlug('i4housing-')).toBe(false)
  })

  it('weigert dubbele koppeltekens', () => {
    expect(isGeldigeSlug('i4--housing')).toBe(false)
  })

  it('weigert een lege string', () => {
    expect(isGeldigeSlug('')).toBe(false)
  })

  it('weigert te kort (1 teken)', () => {
    expect(isGeldigeSlug('a')).toBe(false)
  })

  it('weigert te lang (>60 tekens)', () => {
    expect(isGeldigeSlug('a'.repeat(61))).toBe(false)
  })

  it('weigert spaties en underscores', () => {
    expect(isGeldigeSlug('i4 housing')).toBe(false)
    expect(isGeldigeSlug('i4_housing')).toBe(false)
  })
})
