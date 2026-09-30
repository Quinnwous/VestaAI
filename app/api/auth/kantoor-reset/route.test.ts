import { describe, it, expect, vi, beforeEach } from 'vitest'

const kantoorMaybeSingle = vi.fn()
const makelaarMaybeSingle = vi.fn()
const generateLink = vi.fn()
const sendKantoorResetEmail = vi.fn()
const bruikbaarLogo = vi.fn()

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createServiceSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'kantoren') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: kantoorMaybeSingle,
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        maybeSingle: makelaarMaybeSingle,
      }
    }),
    auth: { admin: { generateLink } },
  })),
}))

vi.mock('@/lib/email', () => ({
  sendKantoorResetEmail: (...args: unknown[]) => sendKantoorResetEmail(...args),
}))

vi.mock('@/lib/branding', async () => {
  const actual = await vi.importActual<typeof import('@/lib/branding')>('@/lib/branding')
  return { ...actual, bruikbaarLogo: (...args: unknown[]) => bruikbaarLogo(...args) }
})

import { POST } from './route'
import { escapeIlike, _zetMinimaleDuurVoorTest, MINIMALE_DUUR_MS } from '@/lib/kantoorReset'
import { _resetAlleEmmersVoorTest } from '@/lib/resetRateLimit'
import { knopKleur } from '@/lib/branding'

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/auth/kantoor-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/kantoor-reset — reset-mail in kantoorstijl (item 9.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _zetMinimaleDuurVoorTest(0)
    _resetAlleEmmersVoorTest()
    kantoorMaybeSingle.mockResolvedValue({ data: null })
    makelaarMaybeSingle.mockResolvedValue({ data: null })
    bruikbaarLogo.mockResolvedValue(null)
    generateLink.mockResolvedValue({
      data: { properties: { action_link: 'https://www.vestaai.nl/auth/reset-password?token_hash=x&type=recovery' } },
      error: null,
    })
  })

  it('400 bij ongeldige invoer (geen geldig e-mailadres)', async () => {
    const res = await POST(makeRequest({ slug: 'i4housing', email: 'niet-een-email' }) as never)
    expect(res.status).toBe(400)
  })

  it('400 bij een ontbrekende slug', async () => {
    const res = await POST(makeRequest({ email: 'iemand@voorbeeld.nl' }) as never)
    expect(res.status).toBe(400)
  })

  it('geen enumeratie: { ok: true } als het kantoor niet bestaat', async () => {
    const res = await POST(makeRequest({ slug: 'onbekend-kantoor', email: 'iemand@voorbeeld.nl' }) as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(generateLink).not.toHaveBeenCalled()
    expect(sendKantoorResetEmail).not.toHaveBeenCalled()
  })

  it('geen enumeratie: { ok: true } als het kantoor bestaat maar de makelaar er niet bij hoort', async () => {
    kantoorMaybeSingle.mockResolvedValue({
      data: { id: 'kantoor-1', name: 'i4 Housing', logo_url: null, huisstijl_json: {} },
    })
    makelaarMaybeSingle.mockResolvedValue({ data: null })

    const res = await POST(makeRequest({ slug: 'i4housing', email: 'quinn.berkouwer@gmail.com' }) as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(generateLink).not.toHaveBeenCalled()
    expect(sendKantoorResetEmail).not.toHaveBeenCalled()
  })

  it('genereert een recovery-link en verstuurt de mail als de makelaar wél bij het kantoor hoort', async () => {
    kantoorMaybeSingle.mockResolvedValue({
      data: { id: 'kantoor-1', name: 'i4 Housing', logo_url: null, huisstijl_json: { primaire_kleur: '#0080C8' } },
    })
    makelaarMaybeSingle.mockResolvedValue({ data: { id: 'makelaar-1', email: 'makelaar@i4housing.nl' } })

    const res = await POST(makeRequest({ slug: 'i4housing', email: 'makelaar@i4housing.nl' }) as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(generateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recovery',
        email: 'makelaar@i4housing.nl',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password?next=i4housing'),
        }),
      }),
    )
    expect(sendKantoorResetEmail).toHaveBeenCalledWith(
      'makelaar@i4housing.nl',
      expect.objectContaining({ naam: 'i4 Housing', kleur: knopKleur('#0080C8') }),
    )
  })

  it('redirectTo wijst altijd naar de eigen, canonieke origin (APP_URL) — nooit client-invoer', async () => {
    kantoorMaybeSingle.mockResolvedValue({
      data: { id: 'kantoor-1', name: 'i4 Housing', logo_url: null, huisstijl_json: {} },
    })
    makelaarMaybeSingle.mockResolvedValue({ data: { id: 'makelaar-1', email: 'makelaar@i4housing.nl' } })

    await POST(makeRequest({ slug: 'i4housing', email: 'makelaar@i4housing.nl' }) as never)

    const call = generateLink.mock.calls[0][0]
    expect(call.options.redirectTo).toMatch(/^https:\/\/www\.vestaai\.nl\/auth\/reset-password\?next=i4housing$/)
  })

  it('rate-limit: blokkeert na te veel pogingen voor hetzelfde ip+e-mail, maar antwoordt nog steeds { ok: true }', async () => {
    kantoorMaybeSingle.mockResolvedValue({
      data: { id: 'kantoor-1', name: 'i4 Housing', logo_url: null, huisstijl_json: {} },
    })
    makelaarMaybeSingle.mockResolvedValue({ data: { id: 'makelaar-1', email: 'makelaar@i4housing.nl' } })

    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(
        { slug: 'i4housing', email: 'makelaar@i4housing.nl' },
        { 'x-forwarded-for': '9.9.9.9' },
      ) as never)
    }
    generateLink.mockClear()
    sendKantoorResetEmail.mockClear()

    const res = await POST(makeRequest(
      { slug: 'i4housing', email: 'makelaar@i4housing.nl' },
      { 'x-forwarded-for': '9.9.9.9' },
    ) as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(generateLink).not.toHaveBeenCalled()
  })

  it('blijft { ok: true } antwoorden als generateLink faalt', async () => {
    kantoorMaybeSingle.mockResolvedValue({
      data: { id: 'kantoor-1', name: 'i4 Housing', logo_url: null, huisstijl_json: {} },
    })
    makelaarMaybeSingle.mockResolvedValue({ data: { id: 'makelaar-1', email: 'makelaar@i4housing.nl' } })
    generateLink.mockResolvedValue({ data: null, error: { message: 'kapot' } })

    const res = await POST(makeRequest({ slug: 'i4housing', email: 'makelaar@i4housing.nl' }) as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(sendKantoorResetEmail).not.toHaveBeenCalled()
  })

  it('stuurt niets als ilike een ander adres vond (jokerteken _), en escapet % en _', async () => {
    expect(escapeIlike('q_inn%x@a.nl')).toBe('q\\_inn\\%x@a.nl')
    kantoorMaybeSingle.mockResolvedValue({ data: { id: 'kantoor-1', name: 'i4 Housing', logo_url: null, huisstijl_json: {} } })
    makelaarMaybeSingle.mockResolvedValue({ data: { id: 'makelaar-1', email: 'quinn@i4housing.nl' } })
    const res = await POST(makeRequest({ slug: 'i4housing', email: 'q_inn@i4housing.nl' }) as never)
    expect(await res.json()).toEqual({ ok: true })
    expect(generateLink).not.toHaveBeenCalled()
  })

  it('antwoordt nooit sneller dan de minimale duur (geen timing-signaal)', async () => {
    _zetMinimaleDuurVoorTest(120)
    const start = Date.now()
    await POST(makeRequest({ slug: 'bestaat-niet', email: 'x@y.nl' }) as never)
    expect(Date.now() - start).toBeGreaterThanOrEqual(115)
    expect(MINIMALE_DUUR_MS).toBeGreaterThanOrEqual(1000)
  })
})

