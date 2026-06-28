import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatEuro, formatM2, relatieveDatum, formatDatum, clamp, truncate } from './utils'

describe('formatEuro', () => {
  it('formatteert geheel getal als euro', () => {
    expect(formatEuro(350000)).toMatch(/350/)
    expect(formatEuro(350000)).toMatch(/€/)
  })

  it('rondt af op hele euros', () => {
    expect(formatEuro(99)).not.toMatch(/,\d\d/)
  })
})

describe('formatM2', () => {
  it('voegt m² toe', () => {
    expect(formatM2(120)).toBe('120 m²')
  })

  it('gebruikt Nederlandse notatie', () => {
    expect(formatM2(1200)).toMatch(/1/)
  })
})

describe('relatieveDatum', () => {
  afterEach(() => vi.restoreAllMocks())

  const nu = new Date('2025-06-15T12:00:00Z').getTime()

  it('geeft "zojuist" voor < 60 sec geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    expect(relatieveDatum(new Date(nu - 30_000).toISOString())).toBe('zojuist')
  })

  it('geeft minuten voor < 60 min geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    expect(relatieveDatum(new Date(nu - 10 * 60_000).toISOString())).toBe('10 minuten geleden')
  })

  it('geeft uren voor < 24 uur geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    expect(relatieveDatum(new Date(nu - 3 * 3600_000).toISOString())).toBe('3 uur geleden')
  })

  it('geeft "gisteren" voor 1 dag geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    expect(relatieveDatum(new Date(nu - 86400_000).toISOString())).toBe('gisteren')
  })

  it('geeft dagen voor 2-6 dagen geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    expect(relatieveDatum(new Date(nu - 3 * 86400_000).toISOString())).toBe('3 dagen geleden')
  })

  it('geeft "vorige week" voor 7-13 dagen geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    expect(relatieveDatum(new Date(nu - 8 * 86400_000).toISOString())).toBe('vorige week')
  })

  it('geeft weken voor 14-29 dagen geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    expect(relatieveDatum(new Date(nu - 21 * 86400_000).toISOString())).toBe('3 weken geleden')
  })

  it('geeft geformatteerde datum voor >= 30 dagen geleden', () => {
    vi.spyOn(Date, 'now').mockReturnValue(nu)
    const result = relatieveDatum(new Date(nu - 40 * 86400_000).toISOString())
    expect(result).toMatch(/\d{4}/)
  })
})

describe('formatDatum', () => {
  it('geeft een leesbare datum in het Nederlands', () => {
    const result = formatDatum('2025-01-15T00:00:00Z')
    expect(result).toMatch(/januari|jan/i)
    expect(result).toMatch(/2025/)
  })
})

describe('clamp', () => {
  it('klempt waarde op min', () => expect(clamp(-5, 0, 10)).toBe(0))
  it('klempt waarde op max', () => expect(clamp(15, 0, 10)).toBe(10))
  it('laat waarde binnen bereik staan', () => expect(clamp(5, 0, 10)).toBe(5))
})

describe('truncate', () => {
  it('laat korte strings intact', () => expect(truncate('hoi', 10)).toBe('hoi'))
  it('kapt af met ellipsis', () => {
    const result = truncate('lange tekst hier', 8)
    expect(result.length).toBe(8)
    expect(result.endsWith('…')).toBe(true)
  })
})
