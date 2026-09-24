import { describe, expect, it } from 'vitest'
import { valideerWozInvoer, wozUitInvoer } from './woz'

describe('wozUitInvoer', () => {
  it('maakt een ijkpunt met peildatum 1 januari van het peiljaar', () => {
    expect(wozUitInvoer({ woz_waarde: 845000, woz_peiljaar: 2025 })).toEqual({ waarde: 845000, peildatum: '2025-01-01' })
  })

  it('geeft null zonder waarde of zonder peiljaar', () => {
    expect(wozUitInvoer({ woz_waarde: 845000 })).toBeNull()
    expect(wozUitInvoer({ woz_peiljaar: 2025 })).toBeNull()
    expect(wozUitInvoer(null)).toBeNull()
  })
})

describe('valideerWozInvoer', () => {
  it('accepteert getallen en numerieke strings', () => {
    expect(valideerWozInvoer(845000, 2025)).toEqual({ ok: true, woz_waarde: 845000, woz_peiljaar: 2025 })
    expect(valideerWozInvoer('845000', '2025')).toEqual({ ok: true, woz_waarde: 845000, woz_peiljaar: 2025 })
  })

  it('wist bij twee lege velden', () => {
    expect(valideerWozInvoer('', null)).toEqual({ ok: true, woz_waarde: undefined, woz_peiljaar: undefined })
  })

  it('weigert een waarde zonder peiljaar, decimalen en onzin', () => {
    expect(valideerWozInvoer(845000, '').ok).toBe(false)
    expect(valideerWozInvoer(845000.5, 2025).ok).toBe(false)
    expect(valideerWozInvoer(12, 2025).ok).toBe(false)
    expect(valideerWozInvoer(845000, 1999).ok).toBe(false)
    expect(valideerWozInvoer('veel', 2025).ok).toBe(false)
  })
})
