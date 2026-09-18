import { describe, expect, it } from 'vitest'
import { genereerDemoTransacties } from './waardering.synthetisch'

describe('genereerDemoTransacties', () => {
  it('maakt geen verkopen na de peildatum', () => {
    const rijen = genereerDemoTransacties({ totDatum: '2026-09-17' })
    expect(rijen.length).toBeGreaterThan(7000)
    expect(rijen.filter(r => r.verkoopdatum > '2026-09-17')).toEqual([])
  })

  it('is deterministisch', () => {
    const a = genereerDemoTransacties().slice(0, 25).map(r => `${r.adres_sleutel}|${r.verkoopdatum}|${r.verkoopprijs}`)
    const b = genereerDemoTransacties().slice(0, 25).map(r => `${r.adres_sleutel}|${r.verkoopdatum}|${r.verkoopprijs}`)
    expect(a).toEqual(b)
  })
})
