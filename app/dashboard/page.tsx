import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ensureMakelaar } from '@/lib/ensureMakelaar'
import { isPlatformAdmin } from '@/lib/admin'
import { heeftToegang, maandLimietVoor } from '@/lib/plans'
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Platform-admins gebruiken de app niet als klant → direct naar het beheer.
  if (isPlatformAdmin(user.email)) redirect('/admin')

  const selectMakelaar = () =>
    supabase
      .from('makelaars')
      .select('kantoor_id, first_generated_at, kantoren(plan, huisstijl_json, trial_ends_at)')
      .eq('id', user.id)
      .single()

  let { data: makelaar } = await selectMakelaar()

  // Self-heal: geen makelaar-record? Maak het alsnog aan (vangnet voor self-signup)
  // en lees opnieuw. Zo ontstaat er nooit een dashboard↔login redirect-loop.
  if (!makelaar) {
    await ensureMakelaar(user)
    ;({ data: makelaar } = await selectMakelaar())
  }

  // Nog steeds niets leesbaar (bv. RLS niet toegepast): toon een nette melding
  // i.p.v. door te sturen naar /login (dat zou een oneindige loop geven).
  if (!makelaar) {
    return (
      <main style={{ maxWidth: 520, margin: '80px auto', padding: '0 28px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0E1A13', marginBottom: 10 }}>Account wordt klaargezet…</h1>
        <p style={{ fontSize: 14, color: '#5A6B61', lineHeight: 1.6 }}>
          Je account is aangemaakt maar kon nog niet worden geladen. Herlaad de pagina.
          Blijft dit? Log uit en opnieuw in, of neem contact op via quinn.berkouwer@gmail.com.
        </p>
      </main>
    )
  }

  const kantoor = makelaar.kantoren as unknown as { plan: string | null; huisstijl_json: Record<string, unknown> | null; trial_ends_at: string | null } | null

  // Geen actief plan én geen lopende gratis-periode → account wacht op activering.
  if (!heeftToegang(kantoor?.plan ?? null, kantoor?.trial_ends_at ?? null)) {
    return (
      <main style={{ maxWidth: 520, margin: '80px auto', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0E1A13', marginBottom: 10 }}>Je account is nog niet geactiveerd</h1>
        <p style={{ fontSize: 14, color: '#5A6B61', lineHeight: 1.6, marginBottom: 24 }}>
          Er wordt binnenkort een abonnement aan je account toegewezen. Zodra dat is gebeurd, kun je direct aan de slag.
          <br />Vragen? Neem contact op via <a href="mailto:quinn.berkouwer@gmail.com" style={{ color: '#1A6B45', fontWeight: 600 }}>VestaAI</a>.
        </p>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" style={{ fontSize: 14, fontWeight: 600, color: '#5A6B61', background: 'none', border: 'none', cursor: 'pointer' }}>Uitloggen</button>
        </form>
      </main>
    )
  }

  const maandLimiet = kantoor?.plan ? maandLimietVoor(kantoor.plan) : null

  const trialDagenResterend = !kantoor?.plan && kantoor?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(kantoor.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null
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
    maandLimiet !== null
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
          {maandLimiet !== null && (
            <p style={{ fontSize: 13, color: maandCount >= maandLimiet ? '#DC2626' : maandCount >= maandLimiet * 0.8 ? '#D97706' : '#9AA6A0', fontWeight: maandCount >= maandLimiet ? 600 : 400 }}>
              {maandCount}/{maandLimiet} objecten deze maand
              {maandCount >= maandLimiet && ' — limiet bereikt'}
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

      {trialDagenResterend !== null && (
        <div style={{
          borderRadius: 14,
          background: trialDagenResterend <= 3 ? '#FFFBEB' : '#F1F7F3',
          border: `1px solid ${trialDagenResterend <= 3 ? '#FDE68A' : '#D5E8DD'}`,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: 14, color: trialDagenResterend <= 3 ? '#92400E' : '#1A6B45', margin: 0, fontWeight: 500 }}>
            {trialDagenResterend === 0
              ? 'Uw proefperiode verloopt vandaag.'
              : `Nog ${trialDagenResterend} ${trialDagenResterend === 1 ? 'dag' : 'dagen'} proefperiode resterend.`}
          </p>
          <Link
            href="/prijzen"
            style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#1A6B45', borderRadius: 9, padding: '7px 14px', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Kies een abonnement →
          </Link>
        </div>
      )}

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
