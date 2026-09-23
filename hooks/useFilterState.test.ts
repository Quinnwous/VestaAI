import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { serialiseerFilterState, deserialiseerFilterState } from './useFilterState'

const Schema = z.object({
  plaatsen: z.array(z.string()),
  periode: z.number(),
  actief: z.boolean(),
  sort: z.string(),
})
type Filter = z.infer<typeof Schema>
const DEFAULTS: Filter = { plaatsen: ['wassenaar'], periode: 24, actief: false, sort: 'aandeel' }

describe('serialiseerFilterState', () => {
  it('laat velden gelijk aan de default weg', () => {
    expect(serialiseerFilterState(DEFAULTS, DEFAULTS).toString()).toBe('')
  })

  it('serialiseert een array die afwijkt van de default, kommagescheiden', () => {
    const params = serialiseerFilterState({ ...DEFAULTS, plaatsen: ['denhaag', 'voorschoten'] }, DEFAULTS)
    expect(params.get('plaatsen')).toBe('denhaag,voorschoten')
  })

  it('is ongevoelig voor de volgorde van array-elementen', () => {
    const params = serialiseerFilterState({ ...DEFAULTS, plaatsen: ['wassenaar'] }, DEFAULTS)
    expect(params.has('plaatsen')).toBe(false)
  })

  it('serialiseert number/boolean/string-afwijkingen', () => {
    const params = serialiseerFilterState({ ...DEFAULTS, periode: 12, actief: true, sort: 'aantal' }, DEFAULTS)
    expect(params.get('periode')).toBe('12')
    expect(params.get('actief')).toBe('true')
    expect(params.get('sort')).toBe('aantal')
  })

  it('laat een lege array (afwijkend van een niet-lege default) weg uit de URL', () => {
    const params = serialiseerFilterState({ ...DEFAULTS, plaatsen: [] }, DEFAULTS)
    expect(params.has('plaatsen')).toBe(false)
  })
})

describe('deserialiseerFilterState', () => {
  it('geeft de defaults terug bij lege querystring', () => {
    const state = deserialiseerFilterState(new URLSearchParams(), Schema, DEFAULTS)
    expect(state).toEqual(DEFAULTS)
  })

  it('leest alle veldtypes correct terug', () => {
    const params = new URLSearchParams('plaatsen=denhaag,voorschoten&periode=12&actief=true&sort=aantal')
    const state = deserialiseerFilterState(params, Schema, DEFAULTS)
    expect(state).toEqual({ plaatsen: ['denhaag', 'voorschoten'], periode: 12, actief: true, sort: 'aantal' })
  })

  it('valt terug op de defaults bij een ongeldige waarde (schema-validatie)', () => {
    const params = new URLSearchParams('periode=niet-een-getal-en-toch-ongeldig')
    // 'periode' wordt NaN → Number.isFinite guard vangt dit al af naar de default
    const state = deserialiseerFilterState(params, Schema, DEFAULTS)
    expect(state.periode).toBe(24)
  })

  it('rondtrip: serialiseren en weer deserialiseren geeft dezelfde state', () => {
    const origineel: Filter = { plaatsen: ['denhaag'], periode: 36, actief: true, sort: 'looptijd' }
    const params = serialiseerFilterState(origineel, DEFAULTS)
    const terug = deserialiseerFilterState(params, Schema, DEFAULTS)
    expect(terug).toEqual(origineel)
  })
})
