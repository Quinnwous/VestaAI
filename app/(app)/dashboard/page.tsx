import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ensureMakelaar } from '@/lib/ensureMakelaar'
import { verwerkNieuweKlant } from '@/lib/nieuweKlant'
import { isPlatformAdmin } from '@/lib/admin'
import { DashboardClient } from './DashboardClient'
import { PitchScorebord } from './PitchScorebord'
import { FeatureKaarten } from '@/components/FeatureKaarten'
import { Eyebrow, SerifTitle } from '@/components/ui'
import type { ObjectRow, ObjectFase } from '@/lib/supabase'

export const metadata = { title: 'Overzicht' }

type FaseFilter = '' | ObjectFase

interface SearchParams {
  search?: string
  page?: string
  fase?: string
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
      .select('kantoor_id, first_generated_at, kantoren(huisstijl_json, admin_notified_at)')
      .eq('id', user.id)
      .single()

  let { data: makelaar } = await selectMakelaar()

  // Self-heal: geen makelaar-record? Maak het alsnog aan (vangnet voor het geval
  // de signup-trigger faalde) en lees opnieuw. Zo ontstaat er nooit een
  // dashboard↔login redirect-loop.
  if (!makelaar) {
    await ensureMakelaar(user)
    ;({ data: makelaar } = await selectMakelaar())
  }

  // Nog steeds niets leesbaar (bv. RLS niet toegepast, of account nog niet aan
  // een kantoor gekoppeld door de platform-admin): toon een nette melding i.p.v.
  // door te sturen naar /login (dat zou een oneindige loop geven).
  if (!makelaar) {
    return (
      <main style={{ maxWidth: 520, margin: '80px auto', padding: '0 28px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#14181B', marginBottom: 10 }}>Account wordt klaargezet…</h1>
        <p style={{ fontSize: 14, color: '#5C6470', lineHeight: 1.6 }}>
          Je account is aangemaakt maar nog niet aan een kantoor gekoppeld. Herlaad de pagina.
          Blijft dit? Log uit en opnieuw in, of neem contact op via quinn.berkouwer@gmail.com.
        </p>
      </main>
    )
  }

  const kantoor = makelaar.kantoren as unknown as { huisstijl_json: Record<string, unknown> | null; admin_notified_at: string | null } | null

  // Eénmalige verwerking van een nieuwe klant (welkomstmail + melding aan de
  // platform-admin); atomisch geclaimd, dus nooit dubbel.
  if (kantoor && kantoor.admin_notified_at === null) {
    await verwerkNieuweKlant(makelaar.kantoor_id)
  }

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
    .eq('kantoor_id', makelaar.kantoor_id)
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
      .eq('kantoor_id', makelaar.kantoor_id)
      .eq('fase', 'acquisitie'),
  ])

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  return (
    <main style={{ maxWidth: 'var(--app-breedte)', margin: '0 auto', padding: '44px 40px 80px' }}>
      <div style={{ marginBottom: 30 }}>
        <Eyebrow>Portefeuille</Eyebrow>
        <SerifTitle accent="woningen" style={{ marginBottom: 6 }}>Jouw</SerifTitle>
      </div>

      <PitchScorebord rows={(acquisitieRows ?? []) as { pitch_uitslag: string | null }[]} />

      {/* Geen welkomstblok of onboarding-checklist: het kantoor komt hier om te werken
          en ziet direct zijn woningen. */}
      <DashboardClient
        objecten={(objecten ?? []) as Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status' | 'fase' | 'pitch_uitslag'>[]}
        totalPages={totalPages}
        currentPage={page}
        search={search}
        faseFilter={faseFilter}
        totalCount={count ?? 0}
      />

      <FeatureKaarten />
    </main>
  )
}
