import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/claude', () => ({
  PropertyInputSchema: {
    parse: vi.fn(),
  },
  generateContent: vi.fn(),
}))

import { POST } from './route'
import * as claudeModule from '@/lib/claude'
import { ZodError } from 'zod'
import type { PropertyInput } from '@/lib/claude'

const validInput: PropertyInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype: 'Appartement',
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1920,
  energielabel: 'C',
  vraagprijs: 450000,
  usps: 'Prachtig uitzicht',
  doelgroep: 'Jonge gezinnen',
}

const validOutput = {
  funda_tekst: 'tekst', brochure_kort: 'kort', brochure_lang: 'lang',
  instagram_emotioneel: 'em', instagram_informatief: 'inf', instagram_actie: 'act',
  linkedin_kantoor: 'knt', linkedin_makelaar: 'mak', koper_email: 'mail',
  buurtomschrijving: 'buurt',
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with content on valid input', async () => {
    vi.mocked(claudeModule.PropertyInputSchema.parse).mockReturnValue(validInput)
    vi.mocked(claudeModule.generateContent).mockResolvedValue(validOutput)

    const req = makeRequest(validInput)
    const res = await POST(req as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.funda_tekst).toBe('tekst')
  })

  it('returns 400 on Zod validation error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zodError = new ZodError([{ code: 'invalid_type', path: ['adres'], message: 'Required' } as any])
    vi.mocked(claudeModule.PropertyInputSchema.parse).mockImplementation(() => { throw zodError })

    const req = makeRequest({ invalid: true })
    const res = await POST(req as never)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Ongeldige invoer')
    expect(data.details).toBeDefined()
  })

  it('returns 500 when Claude fails', async () => {
    vi.mocked(claudeModule.PropertyInputSchema.parse).mockReturnValue(validInput)
    vi.mocked(claudeModule.generateContent).mockRejectedValue(new Error('API timeout'))

    const req = makeRequest(validInput)
    const res = await POST(req as never)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('API timeout')
  })
})
