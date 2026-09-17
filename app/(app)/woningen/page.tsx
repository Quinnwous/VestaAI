import { createServerSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { WoningenClient } from './WoningenClient'
import { PitchScorebord } from './PitchScorebord'
import { AppPagina, Eyebrow, SerifTitle } from '@/components/ui'
import type { ObjectRow, ObjectFase } from '@/lib/supabase'

export const metadata = { title: 'Woningen' }

type FaseFilter = '' | ObjectFase

interface SearchParams {
  search?: string
  page?: string
  fase?: string
}

const PER_PAGE = 20

/**
 * Woningdossier-lijst (masterplan fase 1.6, 16-17 sep 2026, zie
 * docs/roadmap.md): verhuisd van `/dashboard` naar `/woningen`. `/dashboard`
 * is nu de startpagina na inloggen (zie app/(app)/dashboard/page.tsx) —
 * geen automatische landing meer op de portefeuille zelf.
 */
export default async function WoningenPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createServerSupabaseClient()
  const makelaar = await haalIngelogdeMakelaarOp()
  if (!makelaar) return <AccountWordtKlaargezet />

  // Toegang is puur admin-beheerd (sinds 15 sep 2026, zie CLAUDE.md): een
  // account bestaat alleen als de platform-admin het bij een kantoor heeft
  // gezet. Geen plan- of proefperiode-check meer — intrekken gaat via
  // "kantoor deactiveren" in /admin (bant de auth-users direct).

  const search = searchParams.search ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const geldigeFases: FaseFilter[] = ['acquisitie', 'in_verkoop', 'verkocht']
  const faseFilter: FaseFilter = geldigeFases.includes(searchParams.fase as FaseFilter) ? searchParams.fase as FaseFilter : ''
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  let query = supabase
    .from('objecten')
    .select('id, address, created_at, status, fase, pitch_uitslag', { count: 'exact' })
    .eq('kantoor_id', makelaar.kantoorId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.ilike('address', `%${search}%`)
  }
  if (faseFilter) {
    query = query.eq('fase', faseFilter)
  }

  const [{ data: objecten, count }, { data: acquisitieRows }] = await Promise.all([
    query,
    // Los van paginering/zoekfilter — het scorebord telt over álle acquisitiedossiers.
    supabase
      .from('objecten')
      .select('pitch_uitslag')
      .eq('kantoor_id', makelaar.kantoorId)
      .eq('fase', 'acquisitie'),
  ])

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  return (
    <AppPagina>
      <div style={{ marginBottom: 30 }}>
        <Eyebrow>Portefeuille</Eyebrow>
        <SerifTitle accent="woningen" style={{ marginBottom: 6 }}>Jouw</SerifTitle>
      </div>

      <PitchScorebord rows={(acquisitieRows ?? []) as { pitch_uitslag: string | null }[]} />

      <WoningenClient
        objecten={(objecten ?? []) as Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status' | 'fase' | 'pitch_uitslag'>[]}
        totalPages={totalPages}
        currentPage={page}
        search={search}
        faseFilter={faseFilter}
        totalCount={count ?? 0}
      />
    </AppPagina>
  )
}
