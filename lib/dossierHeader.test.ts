import { describe, expect, it } from 'vitest'
import { bepaalWeergaveWaarde } from './dossierHeader'

describe('bepaalWeergaveWaarde', () => {
  it('geeft de makelaarscorrectie als die er is, ook als de systeemwaarde anders is', () => {
    expect(bepaalWeergaveWaarde({ waarde: 500_000 }, { waarde: 520_000 })).toBe(520_000)
  })

  it('valt terug op de systeemwaardering zonder correctie', () => {
    expect(bepaalWeergaveWaarde({ waarde: 500_000 }, null)).toBe(500_000)
  })

  it('geeft null zonder waardering en zonder correctie', () => {
    expect(bepaalWeergaveWaarde(null, null)).toBeNull()
  })

  it('geeft null als de uitkomst er is maar nog geen waarde heeft (bv. weinigData zonder resultaat)', () => {
    expect(bepaalWeergaveWaarde({ waarde: null }, null)).toBeNull()
  })
})
