import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'

// vi.mock is hoisted boven top-level const's — vi.hoisted zorgt dat deze
// waarde al bestaat op het moment dat de mock-factory hieronder draait.
const { LEGE_OUTPUT } = vi.hoisted(() => ({
  LEGE_OUTPUT: {
    funda_tekst: '', brochure_kort: '', brochure_lang: '', instagram_emotioneel: '', instagram_informatief: '',
    instagram_actie: '', linkedin_kantoor: '', linkedin_makelaar: '', koper_email: '', buurtomschrijving: '',
    open_huis: '', bezichtiging_followup_positief: '', bezichtiging_followup_negatief: '', video_script: '',
    energie_advies: '', kopersvragen_faq: '', marktanalyse: '',
  },
}))

vi.mock('@/lib/schemas', () => ({
  PropertyInputSchema: { parse: vi.fn() },
  LEEG_CONTENT_OUTPUT: LEGE_OUTPUT,
}))

// Mock Claude expliciet — deze route mag 'm nooit aanroepen (item 3.1: dossier
// aanmaken zonder Claude, zie docs/roadmap.md § 3.2).
vi.mock('@/lib/claude', () => ({
  generateContent: vi.fn(),
  generateContentBeideTalen: vi.fn(),
}))

const lookupCoordinaten = vi.fn()
vi.mock('@/lib/verrijking', () => ({
  lookupCoordinaten: (...args: unknown[]) => lookupCoordinaten(...args),
}))

vi.mock('@/lib/fouten', () => ({
  meldFout: vi.fn(() => 'ref123'),
}))

const authGetUser = vi.fn()
const makelaarSingle = vi.fn()
const insertSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: authGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: makelaarSingle,
    })),
  })),
  createServiceSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: insertSingle,
    })),
  })),
}))

import { POST } from './route'
import * as schemasModule from '@/lib/schemas'
import * as claudeModule from '@/lib/claude'
import type { PropertyInput } from '@/lib/schemas'

const validInput: PropertyInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype_groep: 'appartement',
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1920,
  energielabel: 'C',
  vraagprijs: 450000,
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/object', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/object — dossier aanmaken zonder Claude (item 3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    makelaarSingle.mockResolvedValue({ data: { id: 'user-1', kantoor_id: 'kantoor-1' } })
    insertSingle.mockResolvedValue({ data: { id: 'object-1' }, error: null })
    lookupCoordinaten.mockResolvedValue({ lat: 52.37, lng: 4.89 })
  })

  it('returns 400 on Zod validation error', async () => {
    const zodError = new ZodError([{ code: 'invalid_type', path: ['adres'], message: 'Required' } as never])
    vi.mocked(schemasModule.PropertyInputSchema.parse).mockImplementation(() => { throw zodError })

    const res = await POST(makeRequest({ invalid: true }) as never)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Ongeldige invoer')
    expect(data.details).toBeDefined()
  })

  it('returns 401 when not logged in', async () => {
    vi.mocked(schemasModule.PropertyInputSchema.parse).mockReturnValue(validInput)
    authGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(makeRequest(validInput) as never)
    expect(res.status).toBe(401)
  })

  it('creates a dossier without calling Claude, in fase verkoopadvies with content_status geen', async () => {
    vi.mocked(schemasModule.PropertyInputSchema.parse).mockReturnValue(validInput)

    const res = await POST(makeRequest(validInput) as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.id).toBe('object-1')
    expect(claudeModule.generateContent).not.toHaveBeenCalled()
    expect(claudeModule.generateContentBeideTalen).not.toHaveBeenCalled()
  })

  it('falls back to lookupCoordinaten when the request has no lat/lng', async () => {
    vi.mocked(schemasModule.PropertyInputSchema.parse).mockReturnValue(validInput)

    await POST(makeRequest(validInput) as never)

    expect(lookupCoordinaten).toHaveBeenCalledWith(validInput.adres)
  })

  it('skips lookupCoordinaten when the request already has lat/lng', async () => {
    vi.mocked(schemasModule.PropertyInputSchema.parse).mockReturnValue(validInput)

    await POST(makeRequest({ ...validInput, lat: 52.1, lng: 4.5 }) as never)

    expect(lookupCoordinaten).not.toHaveBeenCalled()
  })
})
