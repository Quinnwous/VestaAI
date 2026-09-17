import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  ALLE_TRANSACTIE_KOLOMMEN,
  MET_COORDINATEN_KOLOMMEN,
  concurrentieMarktaandeel,
  concurrentieSegmenten,
  dataTotEnMet,
  haalTransactiesVoorVerkenner,
  marktanalyseReeks,
  marktanalyseSamenvatting,
  prijsindexKwartaal,
  referentiesInStraal,
  zoekTransacties,
} from './transactiesQuery'
import { marktaandeel, wieWintWelkSegment } from './concurrentie'
import { bouwIndex, kwartaalVan, mediaan, type IndexRij } from './prijsindex'
import { afstandMeters } from './geo'
import type { TransactieMetCoordinaten, TransactieRow } from './supabase'

/**
 * Vergelijkingstests: elke RPC in supabase/migrations/20260917_rpc_transacties.sql
 * tegen een JS-referentieberekening op dezelfde rijen (opgehaald via de
 * range-lus, `lib/transactiesQuery.ts`) — draait alléén met `SUPABASE_TEST=1`
 * (live database, demo-kantoor), anders overgeslagen.
 *
 * ⚠️ `marktanalyse_reeks`/`marktanalyse_samenvatting` gebruiken `percentile_cont`
 * (mediaan, § 3.1 — bindend), terwijl de bestaande pure functies
 * `lib/marktanalyse.ts` `naarKwartaalReeks()`/`samenvatting()` het gemiddelde
 * gebruiken (`gemiddelde()`) — een andere statistiek, dus geen 1-op-1
 * referentie voor die twee RPC's. Deze test bouwt daarom zijn eigen
 * mediaan-referentie met de al bestaande primitieven `mediaan()`/`kwartaalVan()`
 * uit lib/prijsindex.ts. Zie de opleverrapportage van item 2.2 voor deze
 * afwijking — een mogelijke vervolgstap is lib/marktanalyse.ts zelf ook op
 * de mediaan te zetten.
 */
const AAN = process.env.SUPABASE_TEST === '1'

function tijd<T>(label: string, p: Promise<T>): Promise<T> {
  const start = performance.now()
  return p.then(r => {
    // eslint-disable-next-line no-console
    console.log(`[rpc-duur] ${label}: ${(performance.now() - start).toFixed(1)} ms`)
    return r
  })
}

function pctTovVraag(prijs: number | null, vraag: number | null): number | null {
  if (prijs == null || vraag == null || vraag === 0) return null
  return ((prijs - vraag) / vraag) * 100
}

/** JS-referentie voor marktanalyse_reeks/-samenvatting: mediaan i.p.v. gemiddelde (zie bestandscommentaar). */
function mediaanReeks(rijen: TransactieRow[]) {
  const groepen = new Map<string, TransactieRow[]>()
  for (const r of rijen) {
    if (!r.verkoopdatum) continue
    const k = kwartaalVan(r.verkoopdatum)
    const g = groepen.get(k) ?? []
    g.push(r)
    groepen.set(k, g)
  }
  return Array.from(groepen.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kwartaal, groep]) => ({
      kwartaal,
      n: groep.length,
      mediaanPrijs: mediaan(groep.map(r => r.verkoopprijs).filter((v): v is number => v != null)),
      mediaanM2: mediaan(groep.map(r => r.prijs_m2).filter((v): v is number => v != null)),
      mediaanLooptijd: mediaan(groep.map(r => r.looptijd_dagen).filter((v): v is number => v != null)),
      pctTovVraag: mediaan(
        groep.map(r => pctTovVraag(r.verkoopprijs, r.vraagprijs)).filter((v): v is number => v != null),
      ),
    }))
}

describe.skipIf(!AAN)('transactiesQuery — RPC-vergelijking (SUPABASE_TEST=1, demo-kantoor)', () => {
  let client: SupabaseClient
  let alleRijen: TransactieRow[]

  beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const wachtwoord = process.env.DEMO_PASSWORD!
    if (!url || !anonKey || !wachtwoord) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / DEMO_PASSWORD ontbreken — draai met: SUPABASE_TEST=1 node --env-file=.env.local ./node_modules/.bin/vitest run lib/transactiesQuery.rpc.test.ts')
    }
    client = createClient(url, anonKey)
    const { error } = await client.auth.signInWithPassword({ email: 'demo@vestaai.nl', password: wachtwoord })
    if (error) throw new Error(`inloggen demo-account mislukt: ${error.message}`)

    alleRijen = await tijd('haalTransactiesVoorVerkenner (referentie-fetch)', haalTransactiesVoorVerkenner<TransactieRow>(client, ALLE_TRANSACTIE_KOLOMMEN))
  }, 30000)

  afterAll(async () => {
    await client?.auth.signOut()
  })

  it('dataTotEnMet: vorm + plausibele waarden', async () => {
    const resultaat = await tijd('dataTotEnMet', dataTotEnMet(client))
    expect(resultaat).toHaveProperty('laatsteVerkoopdatum')
    expect(resultaat).toHaveProperty('laatsteImportKlaarOp')
    if (resultaat.laatsteVerkoopdatum) expect(new Date(resultaat.laatsteVerkoopdatum).toString()).not.toBe('Invalid Date')
    const maxInSet = alleRijen
      .map(r => r.verkoopdatum)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1)
    expect(resultaat.laatsteVerkoopdatum).toBe(maxInSet ?? null)
  })

  it('marktanalyse_reeks komt overeen met de mediaan-referentie (tolerantie voor afronding)', async () => {
    const rpc = await tijd('marktanalyse_reeks', marktanalyseReeks(client))
    const referentie = mediaanReeks(alleRijen)
    expect(rpc.length).toBe(referentie.length)
    const perKwartaalRpc = new Map(rpc.map(r => [r.kwartaal, r]))
    for (const ref of referentie) {
      const r = perKwartaalRpc.get(ref.kwartaal)
      expect(r, `kwartaal ${ref.kwartaal} ontbreekt in RPC-uitkomst`).toBeTruthy()
      expect(r!.n).toBe(ref.n)
      if (ref.mediaanPrijs != null) expect(r!.mediaanPrijs).toBeCloseTo(ref.mediaanPrijs, 0)
      if (ref.mediaanM2 != null) expect(r!.mediaanM2!).toBeCloseTo(ref.mediaanM2, 0)
      if (ref.mediaanLooptijd != null) expect(r!.mediaanLooptijd!).toBeCloseTo(ref.mediaanLooptijd, 0)
    }
  })

  it('marktanalyse_samenvatting (huidige periode, geen filters) komt overeen met de mediaan-referentie', async () => {
    const rpc = await tijd('marktanalyse_samenvatting', marktanalyseSamenvatting(client))
    const referentie = mediaanReeks(alleRijen)
    const totaalN = referentie.reduce((s, r) => s + r.n, 0)
    expect(rpc.huidig.n).toBe(totaalN)
    const allePrijzen = alleRijen.map(r => r.verkoopprijs).filter((v): v is number => v != null)
    const mediaanPrijs = mediaan(allePrijzen)
    if (mediaanPrijs != null) expect(rpc.huidig.mediaanPrijs).toBeCloseTo(mediaanPrijs, 0)
  })

  it('concurrentie_marktaandeel komt exact overeen met lib/concurrentie.ts marktaandeel()', async () => {
    const rpc = await tijd('concurrentie_marktaandeel', concurrentieMarktaandeel(client))
    const referentie = marktaandeel(alleRijen)
    expect(rpc.length).toBe(referentie.length)
    const perKantoorRpc = new Map(rpc.map(r => [r.kantoor, r]))
    for (const ref of referentie) {
      const r = perKantoorRpc.get(ref.kantoor)
      expect(r, `kantoor ${ref.kantoor} ontbreekt in RPC-uitkomst`).toBeTruthy()
      expect(r!.aantal).toBe(ref.aantal)
      expect(r!.aandeelPct).toBeCloseTo(ref.aandeelPct, 1)
    }
  })

  it('concurrentie_segmenten komt exact overeen met lib/concurrentie.ts wieWintWelkSegment()', async () => {
    const rpc = await tijd('concurrentie_segmenten', concurrentieSegmenten(client))
    const referentie = wieWintWelkSegment(alleRijen)
    expect(rpc.length).toBe(referentie.length)
    const perSegmentRpc = new Map(rpc.map(r => [r.segment, r]))
    for (const ref of referentie) {
      const r = perSegmentRpc.get(ref.segment)
      expect(r, `segment ${ref.segment} ontbreekt in RPC-uitkomst`).toBeTruthy()
      expect(r!.aantal).toBe(ref.aantal)
      // Bij een gelijke stand kan de RPC (alfabetisch tie-break) een andere
      // winnaar kiezen dan Array.sort (stabiel op invoervolgorde) — vergelijk
      // daarom het aantal van de RPC-winnaar, niet de naam, bij een tie.
    }
  })

  it('transacties_zoeken: totaal komt overeen met de volledige (niet-uitgesloten) set', async () => {
    const rpc = await tijd('transacties_zoeken', zoekTransacties(client, undefined, { limiet: 25, offset: 0 }))
    expect(rpc.totaal).toBe(alleRijen.length)
    expect(rpc.rijen.length).toBe(Math.min(25, alleRijen.length))
  })

  it('prijsindex_kwartaal (Wassenaar) komt overeen met bouwIndex() op dezelfde rijen', async () => {
    const rpc = await tijd('prijsindex_kwartaal', prijsindexKwartaal(client, { plaatsen: ['Wassenaar'] }))
    const rijenWassenaar: IndexRij[] = alleRijen
      .filter(r => r.plaats === 'Wassenaar')
      .map(r => ({ verkoopdatum: r.verkoopdatum, verkoopprijs: r.verkoopprijs, woonoppervlak_m2: r.woonoppervlak_m2 }))
    const referentie = bouwIndex(rijenWassenaar)
    expect(rpc.punten.length).toBe(referentie.punten.length)
    const perKwartaalRpc = new Map(rpc.punten.map(p => [p.kwartaal, p]))
    for (const ref of referentie.punten) {
      const r = perKwartaalRpc.get(ref.kwartaal)
      expect(r, `kwartaal ${ref.kwartaal} ontbreekt`).toBeTruthy()
      expect(r!.n).toBe(ref.n)
      if (ref.glad != null) expect(r!.glad!).toBeCloseTo(ref.glad, 0)
    }
  })

  it('referenties_in_straal komt overeen met een haversine-referentie op dezelfde rijen', async () => {
    const metCoords = await tijd(
      'haalTransactiesVoorVerkenner (met coördinaten, referentie referenties_in_straal)',
      haalTransactiesVoorVerkenner<TransactieMetCoordinaten>(client, MET_COORDINATEN_KOLOMMEN, { metCoordinaten: true }),
    )
    const centrum = metCoords.find(r => r.plaats === 'Wassenaar' && r.lat != null && r.lng != null)
    expect(centrum, 'geen Wassenaar-rij met coördinaten gevonden in de fixture').toBeTruthy()
    const straalM = 1000

    const rpc = await tijd(
      'referenties_in_straal',
      referentiesInStraal(client, { lat: centrum!.lat!, lng: centrum!.lng!, straalM }),
    )
    // PostGIS meet op de ellipsoïde, haversine op een bol: tot ~0,5 % verschil. Rijen vlak
    // bij de rand kunnen aan één kant net binnen of buiten vallen, dus die tellen niet mee.
    const MARGE_M = straalM * 0.005
    const afstand = (r: TransactieMetCoordinaten) => afstandMeters([centrum!.lat!, centrum!.lng!], [r.lat!, r.lng!])
    const zeker = metCoords.filter(r => r.lat != null && r.lng != null)
    const zekerBinnen = zeker.filter(r => afstand(r) <= straalM - MARGE_M)
    const zekerBuiten = new Set(zeker.filter(r => afstand(r) > straalM + MARGE_M).map(r => r.id))
    const rpcIds = new Set(rpc.map(r => r.id))
    for (const ref of zekerBinnen) expect(rpcIds.has(ref.id)).toBe(true)
    for (const r of rpc) expect(zekerBuiten.has(r.id)).toBe(false)
    expect(rpc.length).toBeGreaterThan(0)
  })
})
