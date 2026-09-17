import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { haalIngelogdeMakelaarOp, AccountWordtKlaargezet } from '@/lib/haalIngelogdeMakelaar'
import { WoningenClient } from './WoningenClient'
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
 *
 * Geen pitch-concept meer (item 1.9c, besluit Quinn 17 sep 2026): het
 * scorebord is vervallen. "Woning toevoegen" staat sindsdien als primaire
 * knop in de kop hier, in plaats van als snelkoppeling op de startpagina.
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
  const geldigeFases: FaseFilter[] = ['verkoopadvies', 'in_verkoop', 'verkocht']
  const faseFilter: FaseFilter = geldigeFases.includes(searchParams.fase as FaseFilter) ? searchParams.fase as FaseFilter : ''
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  let query = supabase
    .from('objecten')
    .select('id, address, created_at, status, fase', { count: 'exact' })
    .eq('kantoor_id', makelaar.kantoorId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.ilike('address', `%${search}%`)
  }
  if (faseFilter) {
    query = query.eq('fase', faseFilter)
  }

  const { data: objecten, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

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

      <WoningenClient
        objecten={(objecten ?? []) as Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status' | 'fase'>[]}
        totalPages={totalPages}
        currentPage={page}
        search={search}
        faseFilter={faseFilter}
        totalCount={count ?? 0}
      />
    </AppPagina>
  )
}
