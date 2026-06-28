import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => false),
  createServiceSupabaseClient: vi.fn(),
}))

import { POST } from './route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/nps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/nps', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 for valid score 0', async () => {
    const res = await POST(makeRequest({ score: 0, feedback: '' }) as never)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('returns 200 for valid score 10', async () => {
    const res = await POST(makeRequest({ score: 10 }) as never)
    expect(res.status).toBe(200)
  })

  it('returns 400 for score out of range', async () => {
    const res = await POST(makeRequest({ score: 11 }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 for score -1', async () => {
    const res = await POST(makeRequest({ score: -1 }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-number score', async () => {
    const res = await POST(makeRequest({ score: 'goed' }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 200 with optional feedback', async () => {
    const res = await POST(makeRequest({ score: 8, feedback: 'Mist BAG-koppeling' }) as never)
    expect(res.status).toBe(200)
  })
})
