import { describe, it, expect } from 'vitest'
import { LOGIN_SLUG_COOKIE, bouwLoginSlugCookie, wisLoginSlugCookie, loginPadUitCookieWaarde } from './loginSlugCookie'

describe('bouwLoginSlugCookie', () => {
  it('bevat de cookienaam, de slug en de verwachte attributen', () => {
    const cookie = bouwLoginSlugCookie('i4housing')
    expect(cookie).toContain(`${LOGIN_SLUG_COOKIE}=i4housing`)
    expect(cookie).toContain('path=/')
    expect(cookie).toContain('samesite=lax')
    expect(cookie).toMatch(/max-age=\d+/)
  })

  it('url-encodeert de slug (defensief, al is een geldige slug altijd url-veilig)', () => {
    const [naamIsWaarde] = bouwLoginSlugCookie('i4housing').split(';')
    expect(naamIsWaarde).toBe(`${LOGIN_SLUG_COOKIE}=i4housing`)
  })
})

describe('wisLoginSlugCookie', () => {
  it('zet max-age op 0', () => {
    expect(wisLoginSlugCookie()).toContain('max-age=0')
  })
})

describe('loginPadUitCookieWaarde', () => {
  it('bouwt /login/<slug> uit een geldige cookiewaarde', () => {
    expect(loginPadUitCookieWaarde('i4housing')).toBe('/login/i4housing')
  })

  it('normaliseert een licht vervuilde waarde (bv. hoofdletters uit een oudere cookie)', () => {
    expect(loginPadUitCookieWaarde('I4Housing')).toBe('/login/i4housing')
  })

  it('valt terug op de fallback bij een lege waarde', () => {
    expect(loginPadUitCookieWaarde(undefined)).toBe('/login')
    expect(loginPadUitCookieWaarde(null)).toBe('/login')
    expect(loginPadUitCookieWaarde('')).toBe('/login')
  })

  it('gebruikt een aangepaste fallback (bv. "/" voor de logout-route)', () => {
    expect(loginPadUitCookieWaarde(null, '/')).toBe('/')
    expect(loginPadUitCookieWaarde('!!!', '/')).toBe('/')
  })

  it('valt terug bij een ongeldig gedecodeerde waarde', () => {
    expect(loginPadUitCookieWaarde('%')).toBe('/login')
  })

  it('kan nooit buiten /login/<slug> uitkomen, ook niet met een pad- of url-achtige waarde (open-redirect-vangrail)', () => {
    // normaliseerSlug() slijpt alles tot [a-z0-9-]; het resultaat blijft dus altijd
    // een lokaal /login/*-pad, nooit een ander domein of een ../-traversal.
    for (const kwaad of ['..%2f..%2fevil', 'http://evil.example', '//evil.example', '<script>']) {
      const pad = loginPadUitCookieWaarde(kwaad)
      expect(pad === '/login' || /^\/login\/[a-z0-9]+(-[a-z0-9]+)*$/.test(pad)).toBe(true)
    }
  })
})
