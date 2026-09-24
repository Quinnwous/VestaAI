import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const authGetUser = vi.fn()
const makelaarSingle = vi.fn()
const objectSingle = vi.fn()

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
    from: vi.fn(() => serviceFromImpl()),
  })),
}))

/** Wordt per test overschreven om óf de select-chain óf de update-chain te simuleren. */
let serviceFromImpl: () => Record<string, unknown> = () => selectChain()

function selectChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: objectSingle,
  }
}

/** Simuleert `.update({...}).eq(...).eq(...)`, dat awaitable is (thenable) i.p.v. `.single()`. */
function updateChain(result: { error: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

const fetchVerrijking = vi.fn()
vi.mock('@/lib/verrijking', () => ({
  fetchVerrijking: (...args: unknown[]) => fetchVerrijking(...args),
}))

const marktanalyseSamenvatting = vi.fn()
const dataTotEnMet = vi.fn()
vi.mock('@/lib/transactiesQuery', () => ({
  marktanalyseSamenvatting: (...args: unknown[]) => marktanalyseSamenvatting(...args),
  dataTotEnMet: (...args: unknown[]) => dataTotEnMet(...args),
}))

vi.mock('@/lib/fouten', () => ({ meldFout: vi.fn(() => 'ref123') }))

import { POST } from './route'

const VOLLEDIGE_VERRIJKING = {
  woz: null, cbs: null, voorzieningen: null, gemeente: null, coord: null,
  bronnen: { woz: 'leeg', cbs: 'leeg', voorzieningen: 'leeg' },
}

const LEGE_SAMENVATTING = { huidig: { van: null, tot: null, n: 0, mediaanPrijs: null, mediaanM2: null, mediaanLooptijd: null, pctTovVraag: null }, vorig: { van: null, tot: null, n: 0, mediaanPrijs: null, mediaanM2: null, mediaanLooptijd: null, pctTovVraag: null } }

function makeRequest() {
  return new Request('http://localhost/api/object/object-1/verrijking', { method: 'POST' })
}

describe('POST /api/object/[id]/verrijking — item 10.3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    makelaarSingle.mockResolvedValue({ data: { kantoor_id: 'kantoor-1' } })
    objectSingle.mockResolvedValue({
      data: { id: 'object-1', address: 'Herengracht 1, Amsterdam', input_json: { adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3, oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C' } },
    })
    fetchVerrijking.mockResolvedValue(VOLLEDIGE_VERRIJKING)
    marktanalyseSamenvatting.mockResolvedValue(LEGE_SAMENVATTING)
    dataTotEnMet.mockResolvedValue({ laatsteVerkoopdatum: '2026-09-17', laatsteImportKlaarOp: null })
    serviceFromImpl = () => selectChain()
  })

  it('geeft 401 als er niet is ingelogd', async () => {
    authGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(401)
  })

  it('geeft 403 zonder makelaarsrecord', async () => {
    makelaarSingle.mockResolvedValue({ data: null })
    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(403)
  })

  it('geeft 404 als de woning niet bij dit kantoor hoort', async () => {
    objectSingle.mockResolvedValue({ data: null })
    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(404)
  })

  it('haalt verrijking op en slaat die op bij succes', async () => {
    let callCount = 0
    serviceFromImpl = () => {
      callCount += 1
      return callCount === 1 ? selectChain() : updateChain({ error: null })
    }

    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(fetchVerrijking).toHaveBeenCalledWith('Herengracht 1, Amsterdam', 85)
    expect(data.verrijking.versie).toBe(1)
    expect(data.verrijking.opgehaald_op).toBeTypeOf('string')
  })

  it('haalt "Markt in [plaats]" op uit de eigen transactiedataset, gefilterd op de plaats van het adres', async () => {
    let callCount = 0
    serviceFromImpl = () => {
      callCount += 1
      return callCount === 1 ? selectChain() : updateChain({ error: null })
    }
    marktanalyseSamenvatting.mockResolvedValue({
      huidig: { van: '2025-09-24', tot: '2026-09-24', n: 12, mediaanPrijs: 850000, mediaanM2: 5200, mediaanLooptijd: 45, pctTovVraag: -1.0 },
      vorig: { van: '2024-09-24', tot: '2025-09-23', n: 10, mediaanPrijs: 800000, mediaanM2: 5000, mediaanLooptijd: 50, pctTovVraag: -1.5 },
    })

    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    // Periode verankerd aan de laatste verkoopdatum (niet aan vandaag), net als /marktanalyse.
    expect(marktanalyseSamenvatting).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ plaatsen: ['Amsterdam'], datum_van: '2025-09-17', datum_tot: '2026-09-17' }),
    )
    expect(data.verrijking.marktEigen).toEqual({
      plaats: 'Amsterdam', periodeVan: '2025-09-24', periodeTot: '2026-09-17',
      n: 12, mediaanPrijs: 850000, mediaanM2: 5200, mediaanLooptijd: 45, pctTovVraag: -1.0,
    })
  })

  it('slaat marktEigen op als null als de RPC faalt (bv. nog geen transacties/migratie)', async () => {
    let callCount = 0
    serviceFromImpl = () => {
      callCount += 1
      return callCount === 1 ? selectChain() : updateChain({ error: null })
    }
    marktanalyseSamenvatting.mockRejectedValue(new Error('relatie transacties bestaat niet'))

    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.verrijking.marktEigen).toBeNull()
  })

  it('meldt duidelijk dat de migratie nog niet is toegepast bij undefined_column (42703)', async () => {
    let callCount = 0
    serviceFromImpl = () => {
      callCount += 1
      return callCount === 1 ? selectChain() : updateChain({ error: { code: '42703', message: 'column objecten.verrijking_json does not exist' } })
    }

    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(data.migratieVereist).toBe(true)
  })

  it('meldt duidelijk dat de migratie nog niet is toegepast bij een PostgREST schema-cache-fout (PGRST204)', async () => {
    let callCount = 0
    serviceFromImpl = () => {
      callCount += 1
      return callCount === 1 ? selectChain() : updateChain({ error: { code: 'PGRST204', message: "Could not find the 'verrijking_json' column of 'objecten' in the schema cache" } })
    }

    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(data.migratieVereist).toBe(true)
  })

  it('geeft een generieke 500 bij een andere opslagfout', async () => {
    let callCount = 0
    serviceFromImpl = () => {
      callCount += 1
      return callCount === 1 ? selectChain() : updateChain({ error: { code: 'XXOOO', message: 'iets anders' } })
    }

    const res = await POST(makeRequest() as never, { params: { id: 'object-1' } })
    expect(res.status).toBe(500)
  })
})
