import { describe, expect, it } from 'vitest'
import { moetActiveringsmailSturen } from './plans'

const straks = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const verlopen = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

describe('moetActiveringsmailSturen', () => {
  it('mailt bij wachtstand → plan', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: null },
      { plan: 'pro', trialEndsAt: null },
    )).toBe(true)
  })

  it('mailt bij verlopen trial → plan', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: verlopen() },
      { plan: 'starter', trialEndsAt: verlopen() },
    )).toBe(true)
  })

  it('mailt bij wachtstand → gratis toegang (trial in de toekomst)', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: null },
      { plan: null, trialEndsAt: straks() },
    )).toBe(true)
  })

  it('mailt niet bij planwissel (had al toegang)', () => {
    expect(moetActiveringsmailSturen(
      { plan: 'pro', trialEndsAt: null },
      { plan: 'kantoor', trialEndsAt: null },
    )).toBe(false)
  })

  it('mailt niet bij lopende trial → plan (had al toegang)', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: straks() },
      { plan: 'pro', trialEndsAt: straks() },
    )).toBe(false)
  })

  it('mailt niet bij intrekking (toegang → wachtstand)', () => {
    expect(moetActiveringsmailSturen(
      { plan: 'pro', trialEndsAt: null },
      { plan: null, trialEndsAt: null },
    )).toBe(false)
  })
})
