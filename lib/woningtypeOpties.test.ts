import { describe, it, expect } from 'vitest'
import {
  bouwWoningtypeOptieGroepen,
  woningtypeOptieWaarde,
  ontleedWoningtypeOptieWaarde,
} from './woningtypeOpties'

describe('bouwWoningtypeOptieGroepen', () => {
  const groepen = bouwWoningtypeOptieGroepen()

  it('geeft de vier groepen uit de taxonomie, in vaste volgorde', () => {
    expect(groepen.map(g => g.groep)).toEqual(['appartement', 'rijwoning', 'halfvrijstaand', 'vrijstaand'])
  })

  it('elke groep heeft een leesbaar label', () => {
    expect(groepen.find(g => g.groep === 'appartement')?.label).toBe('Appartement')
    expect(groepen.find(g => g.groep === 'rijwoning')?.label).toBe('Rijwoning')
    expect(groepen.find(g => g.groep === 'halfvrijstaand')?.label).toBe('Halfvrijstaand')
    expect(groepen.find(g => g.groep === 'vrijstaand')?.label).toBe('Vrijstaand')
  })

  it('elke groep eindigt met een "(overig)"-optie voor alleen de groep (sub: null)', () => {
    for (const groep of groepen) {
      const laatste = groep.opties[groep.opties.length - 1]
      expect(laatste.sub).toBeNull()
      expect(laatste.label).toBe(`${groep.label} (overig)`)
      expect(laatste.waarde).toBe(groep.groep)
    }
  })

  it('appartement bevat de subtypes uit docs/ontwerp/README.md § 5', () => {
    const appartement = groepen.find(g => g.groep === 'appartement')!
    const subs = appartement.opties.map(o => o.sub).filter((s): s is string => s !== null)
    expect(subs).toEqual(['Bovenwoning', 'Benedenwoning', 'Maisonnette', 'Portiekflat', 'Galerijflat', 'Penthouse', 'Studio'])
  })

  it('vrijstaand bevat geen "overig"-subtype uit de taxonomie zelf, alleen de gesynthetiseerde (overig)-optie', () => {
    const vrijstaand = groepen.find(g => g.groep === 'vrijstaand')!
    expect(vrijstaand.opties.map(o => o.label)).toEqual([
      'Vrijstaande woning', 'Villa', 'Landhuis', 'Bungalow', 'Woonboerderij', 'Vrijstaand (overig)',
    ])
  })

  it('elke optiewaarde is uniek binnen de hele structuur', () => {
    const alleWaarden = groepen.flatMap(g => g.opties.map(o => o.waarde))
    expect(new Set(alleWaarden).size).toBe(alleWaarden.length)
  })
})

describe('woningtypeOptieWaarde / ontleedWoningtypeOptieWaarde', () => {
  it('codeert en ontleedt groep+sub symmetrisch', () => {
    const waarde = woningtypeOptieWaarde('rijwoning', 'Hoekwoning')
    expect(waarde).toBe('rijwoning:Hoekwoning')
    expect(ontleedWoningtypeOptieWaarde(waarde)).toEqual({ groep: 'rijwoning', sub: 'Hoekwoning' })
  })

  it('codeert en ontleedt een groep zonder subtype symmetrisch', () => {
    const waarde = woningtypeOptieWaarde('appartement')
    expect(waarde).toBe('appartement')
    expect(ontleedWoningtypeOptieWaarde(waarde)).toEqual({ groep: 'appartement', sub: null })
  })

  it('behandelt undefined/null sub hetzelfde als geen sub', () => {
    expect(woningtypeOptieWaarde('vrijstaand', null)).toBe('vrijstaand')
    expect(woningtypeOptieWaarde('vrijstaand', undefined)).toBe('vrijstaand')
  })
})
