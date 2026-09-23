import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  dedupliceerRecentBekeken,
  relatieveTijdVoorGebruik,
  logGebruik,
  haalRecentBekekenOp,
  type RecentBekekenRij,
} from './gebruik'

function rij(objectId: string, bekekenOp: string, fase: RecentBekekenRij['fase'] = 'in_verkoop'): RecentBekekenRij {
  return { objectId, address: `Adres ${objectId}`, fase, bekekenOp }
}

describe('dedupliceerRecentBekeken', () => {
  it('houdt per dossier alleen het eerste (= meest recente) event', () => {
    const rijen = [rij('a', '2026-09-20T10:00:00Z'), rij('b', '2026-09-20T09:00:00Z'), rij('a', '2026-09-19T10:00:00Z')]
    const resultaat = dedupliceerRecentBekeken(rijen)
    expect(resultaat.map(r => r.objectId)).toEqual(['a', 'b'])
  })

  it('knipt af op de limiet', () => {
    const rijen = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => rij(id, '2026-09-20T10:00:00Z'))
    expect(dedupliceerRecentBekeken(rijen, 5)).toHaveLength(5)
  })

  it('geeft een lege lijst voor een lege invoer', () => {
    expect(dedupliceerRecentBekeken([])).toEqual([])
  })

  it('behoudt de volgorde van de invoer (nieuwste eerst, zoals de query levert)', () => {
    const rijen = [rij('a', '2026-09-20T10:00:00Z'), rij('c', '2026-09-19T10:00:00Z'), rij('b', '2026-09-18T10:00:00Z')]
    expect(dedupliceerRecentBekeken(rijen).map(r => r.objectId)).toEqual(['a', 'c', 'b'])
  })
})

describe('relatieveTijdVoorGebruik', () => {
  const nu = new Date('2026-09-20T12:00:00Z')

  it('geeft "zojuist" voor < 60 sec geleden', () => {
    expect(relatieveTijdVoorGebruik(new Date(nu.getTime() - 30_000).toISOString(), nu)).toBe('zojuist')
  })

  it('geeft minuten voor < 60 min geleden', () => {
    expect(relatieveTijdVoorGebruik(new Date(nu.getTime() - 10 * 60_000).toISOString(), nu)).toBe('10 minuten geleden')
  })

  it('geeft uren voor < 24 uur geleden', () => {
    expect(relatieveTijdVoorGebruik(new Date(nu.getTime() - 3 * 3600_000).toISOString(), nu)).toBe('3 uur geleden')
  })

  it('geeft "gisteren" voor 1 dag geleden', () => {
    expect(relatieveTijdVoorGebruik(new Date(nu.getTime() - 86_400_000).toISOString(), nu)).toBe('gisteren')
  })

  it('geeft dagen voor 2-6 dagen geleden', () => {
    expect(relatieveTijdVoorGebruik(new Date(nu.getTime() - 3 * 86_400_000).toISOString(), nu)).toBe('3 dagen geleden')
  })

  it('geeft "vorige week" voor 7-13 dagen geleden', () => {
    expect(relatieveTijdVoorGebruik(new Date(nu.getTime() - 8 * 86_400_000).toISOString(), nu)).toBe('vorige week')
  })

  it('geeft weken voor 14-29 dagen geleden', () => {
    expect(relatieveTijdVoorGebruik(new Date(nu.getTime() - 21 * 86_400_000).toISOString(), nu)).toBe('3 weken geleden')
  })

  it('geeft een geformatteerde datum voor >= 30 dagen geleden', () => {
    const result = relatieveTijdVoorGebruik(new Date(nu.getTime() - 40 * 86_400_000).toISOString(), nu)
    expect(result).toMatch(/2026/)
  })

  it('is deterministisch bij eenzelfde `nu` (geen intern Date.now())', () => {
    const iso = new Date(nu.getTime() - 5 * 60_000).toISOString()
    expect(relatieveTijdVoorGebruik(iso, nu)).toBe(relatieveTijdVoorGebruik(iso, new Date(nu)))
  })
})

/** Minimale fluent stub — alleen de methodes die lib/gebruik.ts aanroept. */
function maakSupabaseStub(opts: { insertError?: { message: string } | null; selectResult?: { data: unknown; error: { message: string } | null } | 'throw' }) {
  const builder: Record<string, unknown> = {}
  builder.insert = vi.fn(async () => ({ error: opts.insertError ?? null }))
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.not = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(async () => {
    if (opts.selectResult === 'throw') throw new Error('relation "gebruik_events" does not exist')
    return opts.selectResult ?? { data: [], error: null }
  })
  const client = { from: vi.fn(() => builder) }
  return client as unknown as SupabaseClient
}

describe('logGebruik', () => {
  it('logt zonder te gooien bij een geslaagde insert', async () => {
    const client = maakSupabaseStub({ insertError: null })
    await expect(logGebruik(client, { kantoorId: 'k1', makelaarId: 'm1', objectId: 'o1', type: 'dossier_bekeken' })).resolves.toBeUndefined()
  })

  it('faalt stil (geen throw) als de tabel nog niet bestaat', async () => {
    const client = maakSupabaseStub({ insertError: { message: 'relation "gebruik_events" does not exist' } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(logGebruik(client, { kantoorId: 'k1', makelaarId: 'm1', type: 'dossier_bekeken' })).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('haalRecentBekekenOp', () => {
  it('geeft een lege lijst terug als de query faalt', async () => {
    const client = maakSupabaseStub({ selectResult: { data: null, error: { message: 'relation "gebruik_events" does not exist' } } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(haalRecentBekekenOp(client, 'm1')).resolves.toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('geeft een lege lijst terug als de tabel nog niet bestaat (gooit)', async () => {
    const client = maakSupabaseStub({ selectResult: 'throw' })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(haalRecentBekekenOp(client, 'm1')).resolves.toEqual([])
    warn.mockRestore()
  })

  it('zet de embedded objecten-rij om naar een vlakke RecentBekekenRij', async () => {
    const client = maakSupabaseStub({
      selectResult: {
        data: [{ object_id: 'o1', created_at: '2026-09-20T10:00:00Z', objecten: { address: 'Dorpsstraat 12', fase: 'in_verkoop' } }],
        error: null,
      },
    })
    const resultaat = await haalRecentBekekenOp(client, 'm1')
    expect(resultaat).toEqual([{ objectId: 'o1', address: 'Dorpsstraat 12', fase: 'in_verkoop', bekekenOp: '2026-09-20T10:00:00Z' }])
  })
})
