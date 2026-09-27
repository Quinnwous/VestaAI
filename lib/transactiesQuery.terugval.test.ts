import { describe, expect, it, vi, beforeEach } from 'vitest'
import { zoekTransacties } from './transactiesQuery'
import type { TransactieRow } from './supabase'

/**
 * Unit-tests (gemockt, geen live database) voor de `PGRST202`-terugval van
 * `zoekTransacties()` (item 12.3, performance): als de RPC ontbreekt (bv. op
 * een omgeving zonder de toegepaste migratie), valt de functie terug op de
 * volledige-tabel-fetch + client-side filter/sorteer/paginering, met exact
 * dezelfde uitkomst als de RPC zou geven. Dit dekt alléén de terugval — de
 * RPC zelf (het gelukkige pad) wordt al gedekt door
 * `lib/transactiesQuery.rpc.test.ts` (live database, `SUPABASE_TEST=1`).
 */

function maakRij(deel: Partial<TransactieRow> & { id: string; adres: string }): TransactieRow {
  return {
    kantoor_id: 'k1',
    postcode: null,
    plaats: 'Wassenaar',
    wijk: null,
    buurt: null,
    verkoopprijs: 500_000,
    vraagprijs: 500_000,
    verkoopdatum: '2026-01-01',
    looptijd_dagen: 30,
    woningtype: null,
    woonoppervlak_m2: 100,
    perceel_m2: null,
    inhoud_m3: null,
    bouwjaar: 2000,
    energielabel: 'A',
    kamers: 4,
    garage: false,
    tuin: false,
    buitenruimte: null,
    eigen_verkoop: true,
    verkopend_kantoor: null,
    created_at: '2026-01-01T00:00:00Z',
    bron: null,
    import_id: null,
    adres_sleutel: deel.adres,
    huisnummer: null,
    toevoeging: null,
    woningtype_groep: 'rijwoning',
    woningtype_sub: 'tussenwoning',
    geocode_status: null,
    uitgesloten_reden: null,
    aankopend_kantoor: null,
    verkopend_kantoor_norm: null,
    prijs_m2: 5_000,
    ...deel,
  }
}

/** Mock-client: `.rpc(...)` geeft altijd een PGRST202-fout, `.from(...)` levert `rijen` via één range-blok (< 1.000 rijen, dus de range-lus in `haalTransactiesVoorVerkenner` stopt na de eerste iteratie). */
function maakMockClient(rijen: TransactieRow[]) {
  const bouwChain = () => {
    const chain: Record<string, unknown> = {}
    chain.is = () => chain
    chain.order = () => chain
    chain.eq = () => chain
    chain.range = async (van: number, tot: number) => ({ data: rijen.slice(van, tot + 1), error: null })
    return chain
  }
  return {
    from: () => ({ select: () => bouwChain() }),
    rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function in the schema cache' } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const RIJEN: TransactieRow[] = [
  maakRij({ id: 'a', adres: 'Kerkstraat 1', plaats: 'Wassenaar', verkoopprijs: 400_000, looptijd_dagen: 60, verkoopdatum: '2026-01-01' }),
  maakRij({ id: 'b', adres: 'Kerkstraat 2', plaats: 'Wassenaar', verkoopprijs: 600_000, looptijd_dagen: 10, verkoopdatum: '2026-03-01' }),
  maakRij({ id: 'c', adres: 'Dorpsstraat 5', plaats: 'Voorschoten', verkoopprijs: 500_000, looptijd_dagen: 20, verkoopdatum: '2026-02-01' }),
]

describe('zoekTransacties — terugval bij PGRST202', () => {
  beforeEach(() => {
    // `vi.spyOn` hergebruikt de bestaande spy als `console.warn` dat al is
    // (geen `clearMocks` in vitest.config.ts) — expliciet `.mockClear()` zodat
    // elke test met een lege call-geschiedenis begint.
    vi.spyOn(console, 'warn').mockImplementation(() => {}).mockClear()
  })

  it('valt terug op de volledige set en filtert/sorteert/pagineert client-side zoals de RPC zou doen', async () => {
    const client = maakMockClient(RIJEN)
    const res = await zoekTransacties(client, { plaatsen: ['Wassenaar'] }, { sortering: 'prijs_asc', limiet: 50, offset: 0 })
    expect(res.totaal).toBe(2)
    expect(res.rijen.map(r => r.id)).toEqual(['a', 'b']) // 400k vóór 600k
  })

  it('past het zoekveld (adres, case-insensitive) en sortering (verkoopdatum_desc) toe, net als de RPC', async () => {
    const client = maakMockClient(RIJEN)
    const res = await zoekTransacties(client, { zoek: 'kerkstraat' }, { sortering: 'verkoopdatum_desc' })
    expect(res.rijen.map(r => r.id)).toEqual(['b', 'a']) // maart vóór januari, Dorpsstraat uitgefilterd
  })

  it('past looptijd_max toe (rijen zonder of met een te lange looptijd vallen weg)', async () => {
    const client = maakMockClient(RIJEN)
    const res = await zoekTransacties(client, { looptijd_max: 25 }, { sortering: 'adres_asc' })
    expect(res.rijen.map(r => r.id)).toEqual(['c', 'b']) // looptijd 20 en 10; 'a' (60 dgn) valt weg; Dorpsstraat < Kerkstraat
  })

  it('pagineert client-side (limiet/offset)', async () => {
    const client = maakMockClient(RIJEN)
    const pagina1 = await zoekTransacties(client, undefined, { sortering: 'adres_asc', limiet: 2, offset: 0 })
    const pagina2 = await zoekTransacties(client, undefined, { sortering: 'adres_asc', limiet: 2, offset: 2 })
    expect(pagina1.totaal).toBe(3)
    expect(pagina1.rijen).toHaveLength(2)
    expect(pagina2.rijen).toHaveLength(1)
    expect([...pagina1.rijen, ...pagina2.rijen].map(r => r.id)).toEqual(['c', 'a', 'b']) // Dorpsstraat < Kerkstraat 1 < Kerkstraat 2
  })

  it('logt de terugval maar één keer, ook bij herhaalde aanroepen', async () => {
    // Losse module-instantie nodig: de "één keer gelogd"-vlag is module-state
    // in lib/transactiesQuery.ts, en de tests hierboven riepen de terugval al
    // aan (zouden de vlag dus al op `true` hebben staan binnen dit testbestand).
    vi.resetModules()
    const { zoekTransacties: zoekTransactiesVers } = await import('./transactiesQuery')
    const client = maakMockClient(RIJEN)
    await zoekTransactiesVers(client, undefined, {})
    await zoekTransactiesVers(client, undefined, {})
    const meldingen = (console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('[transacties] RPC ontbreekt, terugval'),
    )
    expect(meldingen.length).toBe(1)
  })
})
