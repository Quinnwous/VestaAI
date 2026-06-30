import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { DashboardClient } from './DashboardClient'
import { WelkomBanner } from '@/components/WelkomBanner'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'
import type { ObjectRow } from '@/lib/supabase'

export const metadata = { title: 'Overzicht — VestaAI' }

type StatusFilter = '' | 'draft' | 'published' | 'onder_bod' | 'verkocht'

interface SearchParams {
  search?: string
  page?: string
  status?: string
}

const PER_PAGE = 20
const STARTER_LIMIET = 40

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
    .select('kantoor_id, first_generated_at, kantoren(plan, huisstijl_json)')
    .eq('id', user.id)
    .single()

  if (!makelaar) redirect('/login')

  const kantoor = makelaar.kantoren as unknown as { plan: string | null; huisstijl_json: Record<string, unknown> | null } | null
  const isStarter = kantoor?.plan === 'starter'
  const heeftObjecten = !!makelaar.first_generated_at
  const heeftHuisstijl = !!(kantoor?.huisstijl_json && Object.keys(kantoor.huisstijl_json).length > 0)

  const search = searchParams.search ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const rawStatus = searchParams.status ?? ''
  const gelijkeStatussen: StatusFilter[] = ['draft', 'published', 'onder_bod', 'verkocht']
  const statusFilter: StatusFilter = gelijkeStatussen.includes(rawStatus as StatusFilter) ? rawStatus as StatusFilter : ''
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
    isStarter
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
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 28px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0E1A13', marginBottom: 2 }}>Objecten</h1>
          {isStarter && (
            <p style={{ fontSize: 13, color: maandCount >= STARTER_LIMIET ? '#DC2626' : maandCount >= STARTER_LIMIET * 0.8 ? '#D97706' : '#9AA6A0', fontWeight: maandCount >= STARTER_LIMIET ? 600 : 400 }}>
              {maandCount}/{STARTER_LIMIET} objecten deze maand
              {maandCount >= STARTER_LIMIET && ' — limiet bereikt'}
            </p>
          )}
        </div>
        <Link
          href="/object/new"
          style={{ borderRadius: 11, background: '#1A6B45', padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}
        >
          + Nieuw object
        </Link>
      </div>

      <OnboardingChecklist heeftObjecten={heeftObjecten} heeftHuisstijl={heeftHuisstijl} />

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
