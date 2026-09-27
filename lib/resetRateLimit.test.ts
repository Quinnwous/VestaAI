import { describe, it, expect, beforeEach } from 'vitest'
import { magResetPoging, bouwRateLimitSleutel, _resetAlleEmmersVoorTest } from './resetRateLimit'

describe('bouwRateLimitSleutel', () => {
  it('combineert ip en e-mail, lowercased', () => {
    expect(bouwRateLimitSleutel('1.2.3.4', 'Test@Voorbeeld.nl')).toBe('1.2.3.4:test@voorbeeld.nl')
  })
})

describe('magResetPoging', () => {
  beforeEach(() => {
    _resetAlleEmmersVoorTest()
  })

  it('staat de eerste paar pogingen toe', () => {
    const sleutel = 'ip:a@b.nl'
    for (let i = 0; i < 5; i++) {
      expect(magResetPoging(sleutel, 1000)).toBe(true)
    }
  })

  it('blokkeert na het maximum binnen hetzelfde venster', () => {
    const sleutel = 'ip:a@b.nl'
    for (let i = 0; i < 5; i++) magResetPoging(sleutel, 1000)
    expect(magResetPoging(sleutel, 1500)).toBe(false)
  })

  it('laat het venster weer opnieuw beginnen ná de venstertijd', () => {
    const sleutel = 'ip:a@b.nl'
    for (let i = 0; i < 5; i++) magResetPoging(sleutel, 1000)
    expect(magResetPoging(sleutel, 1000 + 10 * 60 * 1000 + 1)).toBe(true)
  })

  it('houdt sleutels los van elkaar — een ander e-mailadres wordt niet meegeteld', () => {
    for (let i = 0; i < 5; i++) magResetPoging('ip:a@b.nl', 1000)
    expect(magResetPoging('ip:c@d.nl', 1000)).toBe(true)
  })
})
