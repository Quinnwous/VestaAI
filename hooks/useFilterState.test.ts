import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { serialiseerFilterState, parseerFilterState } from './useFilterState'

const Schema = z.object({
  plaatsen: z.array(z.string()),
  periode: z.number(),
  prijs: z.tuple([z.number(), z.number()]),
  tuin: z.boolean(),
  tov: z.string(),
})
type Filter = z.infer<typeof Schema>
const DEFAULTS: Filter = { plaatsen: ['wassenaar'], periode: 24, prijs: [0, 5_000_000], tuin: false, tov: 'alle' }

describe('serialiseerFilterState (hooks/useFilterState.ts)', () => {
  it('laat velden die gelijk zijn aan de standaard weg', () => {
    const params = serialiseerFilterState(DEFAULTS, DEFAULTS)
    expect(params.toString()).toBe('')
  })

  it('serialiseert een afwijkende multi-select met komma\'s', () => {
    const params = serialiseerFilterState({ ...DEFAULTS, plaatsen: ['wassenaar', 'denhaag'] }, DEFAULTS)
    expect(params.get('plaatsen')).toBe('wassenaar,denhaag')
  })

  it('serialiseert een afwijkend getallenbereik met een streepje', () => {
    const params = serialiseerFilterState({ ...DEFAULTS, prijs: [200_000, 800_000] }, DEFAULTS)
    expect(params.get('prijs')).toBe('200000-800000')
  })

  it('serialiseert een booleaanse afwijking als "1", en laat "false" weg', () => {
    expect(serialiseerFilterState({ ...DEFAULTS, tuin: true }, DEFAULTS).get('tuin')).toBe('1')
    expect(serialiseerFilterState({ ...DEFAULTS, tuin: false }, DEFAULTS).has('tuin')).toBe(false)
  })

  it('serialiseert getal en string direct', () => {
    const params = serialiseerFilterState({ ...DEFAULTS, periode: 12, tov: 'boven' }, DEFAULTS)
    expect(params.get('periode')).toBe('12')
    expect(params.get('tov')).toBe('boven')
  })
})

describe('parseerFilterState', () => {
  it('valt terug op de standaard als er geen querystring is', () => {
    expect(parseerFilterState(Schema, DEFAULTS, new URLSearchParams())).toEqual(DEFAULTS)
  })

  it('parseert alle veldtypes correct terug (round-trip)', () => {
    const staat: Filter = { plaatsen: ['wassenaar', 'denhaag'], periode: 12, prijs: [200_000, 800_000], tuin: true, tov: 'boven' }
    const params = serialiseerFilterState(staat, DEFAULTS)
    expect(parseerFilterState(Schema, DEFAULTS, params)).toEqual(staat)
  })

  it('valt terug op de standaard bij een ongeldige/verouderde URL i.p.v. te crashen', () => {
    const params = new URLSearchParams('periode=niet-een-getal&prijs=kapot')
    const resultaat = parseerFilterState(Schema, DEFAULTS, params)
    expect(resultaat).toEqual(DEFAULTS)
  })

  it('een lege multi-select ("plaatsen=") geeft een lege lijst terug, gevalideerd door het schema', () => {
    const params = new URLSearchParams('plaatsen=')
    // leeg array is geldig voor z.array(z.string()); std blijft anders intact
    expect(parseerFilterState(Schema, DEFAULTS, params).plaatsen).toEqual([])
  })
})
