/**
 * Tests voor de pure vangrail-functies achter scripts/seed-demo-kantoor.mjs
 * (item 2.3, zie docs/roadmap.md § 4 "Vangrails productiedatabase"). Draait
 * los van Supabase — geen database-verbinding nodig.
 */
import { describe, expect, it } from 'vitest'
import { beoordeelDemoKantoor, bouwResetFilter, type DemoKantoorRij } from '../lib/demoFixtureGuard'

describe('beoordeelDemoKantoor', () => {
  it('staat aanmaken toe als er nog geen kantoor met die naam bestaat', () => {
    const uit = beoordeelDemoKantoor(null, 'Demo Makelaardij')
    expect(uit).toEqual({ ok: true, actie: 'aanmaken', kantoorId: null })
  })

  it('staat hergebruiken toe bij een bestaand kantoor met instellingen_json.demo === true', () => {
    const kantoor: DemoKantoorRij = { id: 'kantoor-1', name: 'Demo Makelaardij', instellingen_json: { demo: true } }
    const uit = beoordeelDemoKantoor(kantoor, 'Demo Makelaardij')
    expect(uit).toEqual({ ok: true, actie: 'hergebruiken', kantoorId: 'kantoor-1' })
  })

  it('weigert een bestaand kantoor zonder demo-vlag', () => {
    const kantoor: DemoKantoorRij = { id: 'i4housing-id', name: 'Demo Makelaardij', instellingen_json: null }
    const uit = beoordeelDemoKantoor(kantoor, 'Demo Makelaardij')
    expect(uit.ok).toBe(false)
    if (!uit.ok) expect(uit.reden).toMatch(/zonder instellingen_json\.demo/)
  })

  it('weigert een bestaand kantoor met instellingen_json.demo === false', () => {
    const kantoor: DemoKantoorRij = { id: 'i4housing-id', name: 'Demo Makelaardij', instellingen_json: { demo: false } }
    const uit = beoordeelDemoKantoor(kantoor, 'Demo Makelaardij')
    expect(uit.ok).toBe(false)
  })

  it('weigert een bestaand kantoor met een lege instellingen_json (geen demo-sleutel)', () => {
    const kantoor: DemoKantoorRij = { id: 'ander-kantoor', name: 'Demo Makelaardij', instellingen_json: {} }
    const uit = beoordeelDemoKantoor(kantoor, 'Demo Makelaardij')
    expect(uit.ok).toBe(false)
  })
})

describe('bouwResetFilter', () => {
  it('geeft precies het meegegeven kantoor-id terug, nooit iets anders', () => {
    expect(bouwResetFilter('kantoor-abc')).toEqual({ kantoor_id: 'kantoor-abc' })
  })

  it('twee verschillende kantoor-id\'s leveren nooit hetzelfde of een gemengd filter op', () => {
    const filterA = bouwResetFilter('kantoor-a')
    const filterB = bouwResetFilter('kantoor-b')
    expect(filterA).toEqual({ kantoor_id: 'kantoor-a' })
    expect(filterB).toEqual({ kantoor_id: 'kantoor-b' })
    expect(filterA).not.toEqual(filterB)
    // Er zit geen gedeelde/module-level state tussen twee aanroepen in.
    expect(bouwResetFilter('kantoor-a')).toEqual(filterA)
  })

  it('weigert een leeg of ontbrekend kantoor-id — nooit een filter zonder scoping schrijven', () => {
    expect(() => bouwResetFilter('')).toThrow()
    // @ts-expect-error opzettelijk ongeldige invoer testen
    expect(() => bouwResetFilter(undefined)).toThrow()
    // @ts-expect-error opzettelijk ongeldige invoer testen
    expect(() => bouwResetFilter(null)).toThrow()
  })

  it('heeft precies één sleutel (kantoor_id) — geen ruimte voor een tweede, ongefilterd veld', () => {
    const filter = bouwResetFilter('kantoor-x')
    expect(Object.keys(filter)).toEqual(['kantoor_id'])
  })
})
