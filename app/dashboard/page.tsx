import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { DashboardClient } from './DashboardClient'
import { WelkomBanner } from '@/components/WelkomBanner'
import type { ObjectRow } from '@/lib/supabase'

export const metadata = { title: 'Overzicht — VestaAI' }

type StatusFilter = '' | 'draft' | 'published'

interface SearchParams {
  search?: string
  page?: string
  status?: string
}

const PER_PAGE = 20
const SOLO_LIMIET = 30

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, kantoren(plan)')
    .eq('id', user.id)
    .single()

  if (!makelaar) redirect('/login')

  const kantoor = makelaar.kantoren as unknown as { plan: string | null } | null
  const isSolo = kantoor?.plan === 'solo'

  const search = searchParams.search ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const rawStatus = searchParams.status ?? ''
  const statusFilter: StatusFilter = rawStatus === 'draft' || rawStatus === 'published' ? rawStatus : ''
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  let query = supabase
    .from('objecten')
    .select('id, address, created_at, status', { count: 'exact' })
    .eq('kantoor_id', makelaar.kantoor_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.ilike('address', `%${search}%`)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const [
    { data: objecten, count },
    maandTelling,
  ] = await Promise.all([
    query,
    isSolo
      ? supabase
          .from('objecten')
          .select('id', { count: 'exact', head: true })
          .eq('kantoor_id', makelaar.kantoor_id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      : Promise.resolve({ count: null }),
  ])

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)
  const maandCount = maandTelling.count ?? 0

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Objecten</h1>
          {isSolo && (
            <p className={`text-xs mt-0.5 ${maandCount >= SOLO_LIMIET ? 'text-red-600 font-medium' : maandCount >= SOLO_LIMIET * 0.8 ? 'text-orange-500' : 'text-gray-400'}`}>
              {maandCount}/{SOLO_LIMIET} objecten deze maand
              {maandCount >= SOLO_LIMIET && ' — limiet bereikt'}
            </p>
          )}
        </div>
        <Link
          href="/object/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + Nieuw object
        </Link>
      </div>

      {(count ?? 0) === 0 && !search && <WelkomBanner />}

      <DashboardClient
        objecten={(objecten ?? []) as Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status'>[]}
        totalPages={totalPages}
        currentPage={page}
        search={search}
        statusFilter={statusFilter}
        totalCount={count ?? 0}
      />
    </main>
  )
}
