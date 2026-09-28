import { describe, it, expect } from 'vitest'
import { isVoorVerkoper, waardebepalingBestandsnaam } from './pdfVariant'

describe('isVoorVerkoper', () => {
  it('herkent voor=verkoper', () => {
    expect(isVoorVerkoper('verkoper')).toBe(true)
  })

  it('valt terug op de interne versie zonder parameter', () => {
    expect(isVoorVerkoper(null)).toBe(false)
  })

  it('valt terug op de interne versie bij een lege of onbekende waarde', () => {
    expect(isVoorVerkoper('')).toBe(false)
    expect(isVoorVerkoper('makelaar')).toBe(false)
    expect(isVoorVerkoper('Verkoper')).toBe(false)
  })
})

describe('waardebepalingBestandsnaam', () => {
  it('bouwt de interne bestandsnaam zonder achtervoegsel', () => {
    expect(waardebepalingBestandsnaam('Kerkstraat 1, Wassenaar', false)).toBe('waardebepaling-kerkstraat-1--wassenaar.pdf')
  })

  it('voegt -verkoper toe voor de verkopersversie', () => {
    expect(waardebepalingBestandsnaam('Kerkstraat 1, Wassenaar', true)).toBe('waardebepaling-kerkstraat-1--wassenaar-verkoper.pdf')
  })
})
