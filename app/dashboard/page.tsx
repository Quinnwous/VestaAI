import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { DashboardClient } from './DashboardClient'
import type { ObjectRow } from '@/lib/supabase'

export const metadata = { title: 'Overzicht — VestaAI' }

interface SearchParams {
  search?: string
  page?: string
}

const PER_PAGE = 20

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
    .select('kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) redirect('/login')

  const search = searchParams.search ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
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

  const { data: objecten, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-gray-900">Objecten</h1>
        <Link
          href="/object/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + Nieuw object
        </Link>
      </div>

      <DashboardClient
        objecten={(objecten ?? []) as Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status'>[]}
        totalPages={totalPages}
        currentPage={page}
        search={search}
        totalCount={count ?? 0}
      />
    </main>
  )
}
