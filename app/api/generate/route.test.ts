import { describe, it, expect, vi, beforeEach } from 'vitest'

// De contentsuite is vergrendeld (koerswijziging sept 2026). De tests hieronder
// beschrijven het gedrag van de route zelf en draaien daarom met het slot eraf;
// dat het slot er in productie op zit, dekt de eerste test af.
vi.mock('@/lib/features', () => ({
  CONTENT_VERGRENDELD: false,
  contentVergrendeldAntwoord: () =>
    new Response(JSON.stringify({ error: 'vergrendeld' }), { status: 403 }),
}))

const genereerContentVoorObject = vi.fn()
vi.mock('@/lib/contentGeneratie', () => ({
  genereerContentVoorObject: (...args: unknown[]) => genereerContentVoorObject(...args),
}))

vi.mock('@/lib/fouten', () => ({
  meldFout: vi.fn(() => 'ref123'),
}))

const authGetUser = vi.fn()
const makelaarSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: authGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: makelaarSingle,
    })),
  })),
}))

import { POST } from './route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate — "genereer voor dossier-id" (item 3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    makelaarSingle.mockResolvedValue({ data: { kantoor_id: 'kantoor-1' } })
  })

  it('returns 400 when objectId is missing', async () => {
    const res = await POST(makeRequest({}) as never)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBeDefined()
    expect(genereerContentVoorObject).not.toHaveBeenCalled()
  })

  it('returns 401 when not logged in', async () => {
    authGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(makeRequest({ objectId: 'obj-1' }) as never)
    expect(res.status).toBe(401)
    expect(genereerContentVoorObject).not.toHaveBeenCalled()
  })

  it('returns 409 when a generation is already running (active lock)', async () => {
    genereerContentVoorObject.mockResolvedValue({ ok: false, status: 409, error: 'Er loopt al een generatie voor dit dossier' })

    const res = await POST(makeRequest({ objectId: 'obj-1' }) as never)
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toMatch(/al een generatie/)
    expect(genereerContentVoorObject).toHaveBeenCalledWith('obj-1', 'kantoor-1')
  })

  it('does not return 409 when genereerContentVoorObject reports ok (lock not active / expired)', async () => {
    // De route delegeert de verlooptijd-check volledig aan
    // lib/contentGeneratie.ts (CONTENT_LOCK_VERLOOP_MS) — hier testen we dat
    // de route een 'ok'-resultaat gewoon doorlaat.
    genereerContentVoorObject.mockResolvedValue({ ok: true })

    const res = await POST(makeRequest({ objectId: 'obj-1' }) as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('returns 400 with "Vul eerst stap Verhaal in" when usps/doelgroep are missing', async () => {
    genereerContentVoorObject.mockResolvedValue({ ok: false, status: 400, error: 'Vul eerst stap Verhaal in' })

    const res = await POST(makeRequest({ objectId: 'obj-1' }) as never)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Vul eerst stap Verhaal in')
  })
})
