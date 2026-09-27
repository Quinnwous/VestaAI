import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

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
  createServiceSupabaseClient: vi.fn(() => ({
    from: (tabel: string) => serviceFromImpl(tabel),
  })),
}))

/** Per test overschrijfbaar: objecten-select, kantoren-select en de update-chain. */
const objectSingle = vi.fn()
const kantoorSingle = vi.fn()
let updateMock = vi.fn().mockReturnThis()

function serviceFromImpl(tabel: string) {
  if (tabel === 'objecten') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: objectSingle,
      update: updateMock,
    }
  }
  if (tabel === 'kantoren') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: kantoorSingle,
    }
  }
  throw new Error(`onverwachte tabel in test: ${tabel}`)
}

const genereerExtraContent = vi.fn()
vi.mock('@/lib/claude', () => ({
  genereerExtraContent: (...args: unknown[]) => genereerExtraContent(...args),
}))

vi.mock('@/lib/fouten', () => ({ meldFout: vi.fn(() => 'ref123') }))

import { POST } from './route'

function makeRequest(type?: string) {
  const url = type
    ? `http://localhost/api/object/object-1/extra?type=${type}`
    : 'http://localhost/api/object/object-1/extra'
  return new NextRequest(url, { method: 'POST' })
}

describe('POST /api/object/[id]/extra — item 8.3 (outputset v2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    makelaarSingle.mockResolvedValue({ data: { kantoor_id: 'kantoor-1' } })
    objectSingle.mockResolvedValue({
      data: {
        input_json: { adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3, oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C', usps: 'Test', doelgroep: 'Starters' },
        outputs_json: { funda_tekst: 'bestaande tekst', koper_email: '', buurtomschrijving: '', linkedin_kantoor: '' },
      },
    })
    kantoorSingle.mockResolvedValue({ data: { huisstijl_json: null } })
    updateMock = vi.fn().mockReturnThis()
    genereerExtraContent.mockResolvedValue('Gegenereerde tekst.')
  })

  it('geeft 400 zonder ?type=', async () => {
    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(400)
  })

  it('geeft 400 bij een onbekend type (bv. een kern-veldnaam of een oude, vervallen sleutel)', async () => {
    for (const ongeldig of ['funda_tekst', 'marktanalyse', 'bezichtiging_followup_positief', 'onzin']) {
      const res = await POST(makeRequest(ongeldig) as never, { params: { id: 'object-1' } })
      expect(res.status).toBe(400)
    }
  })

  it('accepteert elk geldig extra-type', async () => {
    for (const geldig of ['open_huis', 'followup_positief', 'followup_negatief', 'video_script', 'kopersvragen_faq', 'energie_advies']) {
      const res = await POST(makeRequest(geldig) as never, { params: { id: 'object-1' } })
      expect(res.status).toBe(200)
    }
  })

  it('geeft 401 als er niet is ingelogd', async () => {
    authGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest('open_huis') as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(401)
  })

  it('geeft 404 zonder makelaarsrecord', async () => {
    makelaarSingle.mockResolvedValue({ data: null })
    const res = await POST(makeRequest('open_huis') as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(404)
  })

  it('geeft 404 als de woning niet bij dit kantoor hoort', async () => {
    objectSingle.mockResolvedValue({ data: null })
    const res = await POST(makeRequest('open_huis') as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(404)
  })

  it('roept genereerExtraContent aan met het type, de input en de huisstijl, en slaat het resultaat op', async () => {
    kantoorSingle.mockResolvedValue({ data: { huisstijl_json: { schrijftoon: 'informeel', slogan: '', primaire_kleur: '#0080C8', voorbeelden: [] } } })

    const res = await POST(makeRequest('video_script') as never, { params: { id: 'object-1' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.type).toBe('video_script')
    expect(data.tekst).toBe('Gegenereerde tekst.')
    expect(genereerExtraContent).toHaveBeenCalledWith(
      'video_script',
      expect.objectContaining({ adres: 'Herengracht 1, Amsterdam' }),
      expect.objectContaining({ schrijftoon: 'informeel' }),
    )
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ outputs_json: expect.objectContaining({ video_script: 'Gegenereerde tekst.', funda_tekst: 'bestaande tekst' }) }),
    )
  })

  it('geeft 500 met een referentie als de generatie faalt', async () => {
    genereerExtraContent.mockRejectedValue(new Error('Claude-fout'))
    const res = await POST(makeRequest('open_huis') as never, { params: { id: 'object-1' } })
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.ref).toBe('ref123')
  })

  it('geeft 409 zolang de kern-generatie loopt (anders overschrijft die de extra)', async () => {
    objectSingle.mockResolvedValue({ data: { input_json: {}, outputs_json: {}, content_status: 'bezig' } })
    const res = await POST(makeRequest('open_huis') as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(409)
    expect(genereerExtraContent).not.toHaveBeenCalled()
  })
})
