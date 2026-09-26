import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { WoningenOverzicht, type WoningRij, type WoningKaartRij } from './WoningenOverzicht'
import { AppPagina, Eyebrow, SerifTitle } from '@/components/ui'
import { sorteerOptieNaarOrderBy, telPerFase, type WoningenSortering } from '@/lib/woningenOverzicht'
import type { ObjectFase } from '@/lib/supabase'

export const metadata = { title: 'Woningen' }

type FaseFilter = '' | ObjectFase
type Weergave = 'tabel' | 'kaart'

interface SearchParams {
  search?: string
  page?: string
  fase?: string
  makelaar?: string
  weergave?: string
  sorteer?: string
}

const PER_PAGE = 20
const KAART_LIMIET = 500

/**
 * Woningdossier-lijst v2 (item 10.1, docs/roadmap.md § Fase 10): tabel- en
 * kaartweergave (`BasisKaart`), zoeken, filters op fase/makelaar, alles in de
 * URL. `PitchScorebord` is vervallen (item 1.9c) — er stond hier al niets
 * meer van, alleen de knop "Woning toevoegen" in de kop bleef staan.
 *
 * Filtering/sortering/paginering blijven server-side via Supabase (zoals v1)
 * — bij een portefeuille van deze schaal is dat de eenvoudigste, meest
 * betrouwbare route en werkt de tabel- én kaartweergave altijd op dezelfde,
 * server-gefilterde set (zie lib/woningenOverzicht.ts).
 */
export default async function WoningenPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createServerSupabaseClient()
  const makelaar = await haalIngelogdeMakelaarOp()
  if (!makelaar) return <AccountWordtKlaargezet />

  const search = searchParams.search ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const geldigeFases: FaseFilter[] = ['verkoopadvies', 'in_verkoop', 'verkocht']
  const faseFilter: FaseFilter = geldigeFases.includes(searchParams.fase as FaseFilter) ? (searchParams.fase as FaseFilter) : ''
  const makelaarFilter = searchParams.makelaar ?? ''
  const weergave: Weergave = searchParams.weergave === 'kaart' ? 'kaart' : 'tabel'
  const sorteer: WoningenSortering = ['nieuwste', 'oudste', 'adres'].includes(searchParams.sorteer ?? '')
    ? (searchParams.sorteer as WoningenSortering)
    : 'nieuwste'
  const { column, ascending } = sorteerOptieNaarOrderBy(sorteer)

  const makelaarsPromise = supabase
    .from('makelaars')
    .select('id, name')
    .eq('kantoor_id', makelaar.kantoorId)
    .order('name')

  let rijen: WoningRij[] = []
  let kaartRijen: WoningKaartRij[] = []
  let totalCount = 0
  let makelaarsLijst: { id: string; name: string }[] = []

  if (weergave === 'kaart') {
    let query = supabase
      .from('objecten')
      .select('id, address, created_at, status, fase, makelaar_id, lat, lng')
      .eq('kantoor_id', makelaar.kantoorId)
    if (search) query = query.ilike('address', `%${search}%`)
    if (faseFilter) query = query.eq('fase', faseFilter)
    if (makelaarFilter) query = query.eq('makelaar_id', makelaarFilter)
    query = query.order(column, { ascending }).limit(KAART_LIMIET)

    const [{ data: kaartData }, { data: makelaarsData }] = await Promise.all([query, makelaarsPromise])
    kaartRijen = (kaartData ?? []) as WoningKaartRij[]
    totalCount = kaartRijen.length
    makelaarsLijst = makelaarsData ?? []
  } else {
    const from = (page - 1) * PER_PAGE
    const to = from + PER_PAGE - 1
    let query = supabase
      .from('objecten')
      .select('id, address, created_at, status, fase, makelaar_id', { count: 'exact' })
      .eq('kantoor_id', makelaar.kantoorId)
    if (search) query = query.ilike('address', `%${search}%`)
    if (faseFilter) query = query.eq('fase', faseFilter)
    if (makelaarFilter) query = query.eq('makelaar_id', makelaarFilter)
    query = query.order(column, { ascending }).range(from, to)

    const [{ data, count }, { data: makelaarsData }] = await Promise.all([query, makelaarsPromise])
    rijen = (data ?? []) as WoningRij[]
    totalCount = count ?? 0
    makelaarsLijst = makelaarsData ?? []
  }

  // Aantal per fase voor de tellers op de fase-tabs (negeert de fase-filter
  // zelf, wél search/makelaar) — in kaartweergave zonder fase-filter is de
  // al opgehaalde, ongepagineerde set genoeg (lib/woningenOverzicht.ts
  // telPerFase); anders drie lichte head-count-queries.
  let faseTelling: Record<ObjectFase, number>
  if (weergave === 'kaart' && !faseFilter) {
    faseTelling = telPerFase(kaartRijen)
  } else {
    const telQuery = (f: ObjectFase) => {
      let q = supabase.from('objecten').select('id', { count: 'exact', head: true }).eq('kantoor_id', makelaar.kantoorId).eq('fase', f)
      if (search) q = q.ilike('address', `%${search}%`)
      if (makelaarFilter) q = q.eq('makelaar_id', makelaarFilter)
      return q
    }
    const [t1, t2, t3] = await Promise.all([
      telQuery('verkoopadvies'),
      telQuery('in_verkoop'),
      telQuery('verkocht'),
    ])
    faseTelling = {
      verkoopadvies: t1.count ?? 0,
      in_verkoop: t2.count ?? 0,
      verkocht: t3.count ?? 0,
    }
  }

  return (
    <AppPagina>
      <div style={{ marginBottom: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Eyebrow>Portefeuille</Eyebrow>
          <SerifTitle accent="woningen" style={{ marginBottom: 6 }}>Jouw</SerifTitle>
        </div>
        <Link
          href="/object/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 'var(--merk-radius-md, 11px)', background: 'var(--merk)', padding: '11px 20px', fontSize: 14, fontWeight: 700, color: 'var(--merk-op)', textDecoration: 'none', boxShadow: 'var(--merk-shadow-btn, 0 4px 12px rgba(20,24,27,.12))', flexShrink: 0 }}
        >
          Woning toevoegen
        </Link>
      </div>

      <WoningenOverzicht
        weergave={weergave}
        rijen={rijen}
        kaartRijen={kaartRijen}
        currentPage={page}
        search={search}
        faseFilter={faseFilter}
        makelaarFilter={makelaarFilter}
        sorteer={sorteer}
        totalCount={totalCount}
        faseTelling={faseTelling}
        makelaars={makelaarsLijst}
      />
    </AppPagina>
  )
}
