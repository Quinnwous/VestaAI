import { describe, it, expect } from 'vitest'
import { CBS_INDEX_REEKS, CBS_REGIO_CODE, CBS_TABEL_ID, factorCbs, type CbsIndexReeks } from './cbsPrijsindex'

const REEKS: CbsIndexReeks = {
  '2025-Q1': 150,
  '2025-Q2': 153,
  '2025-Q3': 156,
  '2026-Q1': 165,
}

describe('factorCbs', () => {
  it('rekent de factor als het quotiënt van de indexcijfers', () => {
    expect(factorCbs(REEKS, '2025-Q1', '2025-Q2')).toBeCloseTo(153 / 150, 6)
  })

  it('geeft 1 (via gelijke kwartalen) als van en naar hetzelfde kwartaal zijn', () => {
    expect(factorCbs(REEKS, '2025-Q1', '2025-Q1')).toBe(1)
  })

  it('valt terug op het laatst bekende kwartaal vóór het gevraagde "naar"-kwartaal', () => {
    // 2025-Q4 zit niet in de reeks — de dichtstbijzijnde eerdere waarde (2025-Q3) wordt gebruikt.
    expect(factorCbs(REEKS, '2025-Q1', '2025-Q4')).toBeCloseTo(156 / 150, 6)
  })

  it('geeft null als het "van"-kwartaal ontbreekt', () => {
    expect(factorCbs(REEKS, '2024-Q1', '2025-Q1')).toBeNull()
  })

  it('geeft null als er geen enkel kwartaal vóór "naar" bekend is', () => {
    expect(factorCbs(REEKS, '2025-Q1', '2020-Q1')).toBeNull()
  })

  it('geeft null bij een lege reeks', () => {
    expect(factorCbs({}, '2025-Q1', '2025-Q2')).toBeNull()
  })

  it('geeft null als het "van"-kwartaal een indexcijfer ≤ 0 heeft', () => {
    expect(factorCbs({ '2025-Q1': 0, '2025-Q2': 150 }, '2025-Q1', '2025-Q2')).toBeNull()
  })
})

describe('CBS-brongegevens', () => {
  it('legt de tabel- en regiocode vast zoals gedocumenteerd (§ 3.3, item 4.2)', () => {
    expect(CBS_TABEL_ID).toBe('85792NED')
    expect(CBS_REGIO_CODE).toBe('GM0518')
  })

  it('CBS_INDEX_REEKS is altijd een object, ook zonder gegenereerd databestand', () => {
    expect(typeof CBS_INDEX_REEKS).toBe('object')
    expect(CBS_INDEX_REEKS).not.toBeNull()
  })
})
