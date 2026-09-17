import { describe, it, expect, vi, afterEach } from 'vitest'
import { meldFout } from './fouten'

describe('meldFout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logt precies één JSON-regel via console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    meldFout('test-context', new Error('iets ging mis'))
    expect(spy).toHaveBeenCalledOnce()
    expect(() => JSON.parse(spy.mock.calls[0][0] as string)).not.toThrow()
  })

  it('verwerkt een echte Error met naam, bericht en ingekorte stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('database timeout')
    meldFout('object/[id]/hergenereer', error)
    const regel = JSON.parse(spy.mock.calls[0][0] as string)
    expect(regel.niveau).toBe('fout')
    expect(regel.context).toBe('object/[id]/hergenereer')
    expect(regel.bericht).toBe('database timeout')
    expect(regel.naam).toBe('Error')
    expect(typeof regel.stack).toBe('string')
    expect(typeof regel.tijd).toBe('string')
    expect(new Date(regel.tijd).toString()).not.toBe('Invalid Date')
  })

  it('verwerkt een string als fout', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    meldFout('ctx', 'iets kapot')
    const regel = JSON.parse(spy.mock.calls[0][0] as string)
    expect(regel.bericht).toBe('iets kapot')
  })

  it('verwerkt een object zonder message zonder te crashen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => meldFout('ctx', { code: 'PGRST116', details: 'geen rij' })).not.toThrow()
    const regel = JSON.parse(spy.mock.calls[0][0] as string)
    expect(regel.bericht).toContain('PGRST116')
  })

  it('verwerkt null en undefined zonder te crashen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => meldFout('ctx', null)).not.toThrow()
    expect(() => meldFout('ctx', undefined)).not.toThrow()
  })

  it('overleeft cyclische objecten in extra', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cyclisch: Record<string, unknown> = { naam: 'test' }
    cyclisch.zichzelf = cyclisch
    expect(() => meldFout('ctx', new Error('fout'), { cyclisch })).not.toThrow()
    const regel = JSON.parse(spy.mock.calls[0][0] as string)
    expect(regel.extra.cyclisch.zichzelf).toBe('[cyclisch]')
  })

  it('filtert gevoelige sleutels uit extra weg', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    meldFout('ctx', new Error('fout'), {
      password: 'geheim123',
      wachtwoord: 'geheim456',
      token: 'abc',
      apiKey: 'xyz',
      Authorization: 'Bearer xyz',
      cookie: 'sessie=abc',
      email: 'test@voorbeeld.nl',
      objectId: 'veilig-id-123',
    })
    const regel = JSON.parse(spy.mock.calls[0][0] as string)
    expect(regel.extra.password).toBe('[weggelaten]')
    expect(regel.extra.wachtwoord).toBe('[weggelaten]')
    expect(regel.extra.token).toBe('[weggelaten]')
    expect(regel.extra.apiKey).toBe('[weggelaten]')
    expect(regel.extra.Authorization).toBe('[weggelaten]')
    expect(regel.extra.cookie).toBe('[weggelaten]')
    expect(regel.extra.email).toBe('[weggelaten]')
    expect(regel.extra.objectId).toBe('veilig-id-123')
  })

  it('filtert gevoelige sleutels ook genest weg', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    meldFout('ctx', new Error('fout'), {
      gebruiker: {
        naam: 'Quinn',
        credentials: { password: 'geheim', token: 'abc' },
      },
      lijst: [{ email: 'a@b.nl' }, { veilig: 'ok' }],
    })
    const regel = JSON.parse(spy.mock.calls[0][0] as string)
    expect(regel.extra.gebruiker.naam).toBe('Quinn')
    expect(regel.extra.gebruiker.credentials.password).toBe('[weggelaten]')
    expect(regel.extra.gebruiker.credentials.token).toBe('[weggelaten]')
    expect(regel.extra.lijst[0].email).toBe('[weggelaten]')
    expect(regel.extra.lijst[1].veilig).toBe('ok')
  })

  it('gebruikt error.digest als referentie wanneer aanwezig (Next.js error boundary)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const errorMetDigest = Object.assign(new Error('server fout'), { digest: 'DIGEST123' })
    const ref = meldFout('ctx', errorMetDigest)
    expect(ref).toBe('DIGEST123')
  })

  it('geeft een korte random referentie terug zonder digest', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ref = meldFout('ctx', new Error('fout zonder digest'))
    expect(typeof ref).toBe('string')
    expect(ref.length).toBeGreaterThan(0)
  })
})
