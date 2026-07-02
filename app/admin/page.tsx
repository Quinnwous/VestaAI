import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { AdminBeheer, type KantoorRow } from './AdminBeheer'

export const metadata = { title: 'Admin — VestaAI' }

function Kaart({ label, waarde, sub }: { label: string; waarde: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-2xl font-bold text-gray-900">{waarde}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isPlatformAdmin(user.email)) redirect('/dashboard')

  const serviceClient = createServiceSupabaseClient()
  const nu = new Date()
  const zevenDagenGeleden = new Date(nu.getTime() - 7 * 24 * 60 * 60 * 1000)
  const eersteDagMaand = new Date(nu.getFullYear(), nu.getMonth(), 1)

  const [
    kantorResult,
    starterResult,
    proResult,
    kantoorResult,
    trialActiefResult,
    trialVerlopenResult,
    objectenVandaagResult,
    objectenWeekResult,
    objectenMaandResult,
    makelaarResult,
  ] = await Promise.all([
    serviceClient.from('kantoren').select('id', { count: 'exact', head: true }),
    serviceClient.from('kantoren').select('id', { count: 'exact', head: true }).eq('plan', 'starter'),
    serviceClient.from('kantoren').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
    serviceClient.from('kantoren').select('id', { count: 'exact', head: true }).eq('plan', 'kantoor'),
    serviceClient.from('kantoren').select('id', { count: 'exact', head: true })
      .is('plan', null)
      .gt('trial_ends_at', nu.toISOString()),
    serviceClient.from('kantoren').select('id', { count: 'exact', head: true })
      .is('plan', null)
      .lt('trial_ends_at', nu.toISOString()),
    serviceClient.from('objecten').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()).toISOString()),
    serviceClient.from('objecten').select('id', { count: 'exact', head: true })
      .gte('created_at', zevenDagenGeleden.toISOString()),
    serviceClient.from('objecten').select('id', { count: 'exact', head: true })
      .gte('created_at', eersteDagMaand.toISOString()),
    serviceClient.from('makelaars')
      .select('id, name, email, role, created_at, kantoren(name, plan, trial_ends_at)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const totalKantoren = kantorResult.count ?? 0
  const betalendePlannen = (starterResult.count ?? 0) + (proResult.count ?? 0) + (kantoorResult.count ?? 0)
  const trialActief = trialActiefResult.count ?? 0
  const trialVerlopen = trialVerlopenResult.count ?? 0

  type MakelaarRow = {
    id: string
    name: string
    email: string
    role: string
    created_at: string
    kantoren: { name: string; plan: string | null; trial_ends_at: string | null } | null
  }

  const makelaars = (makelaarResult.data ?? []) as unknown as MakelaarRow[]

  // ---- Data voor klantenbeheer (alle kantoren) ----
  const [alleKantorenRes, alleMakelaarsRes, alleObjectenRes, usersRes] = await Promise.all([
    serviceClient.from('kantoren').select('id, name, plan, trial_ends_at, created_at').order('created_at', { ascending: false }),
    serviceClient.from('makelaars').select('id, email, role, kantoor_id'),
    serviceClient.from('objecten').select('id, kantoor_id'),
    serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const bannedMap = new Map<string, boolean>()
  for (const u of usersRes.data?.users ?? []) {
    const banUntil = (u as { banned_until?: string | null }).banned_until
    bannedMap.set(u.id, !!banUntil && new Date(banUntil) > new Date())
  }

  const ledenPerKantoor = new Map<string, { ids: string[]; adminEmail: string | null }>()
  for (const m of (alleMakelaarsRes.data ?? []) as { id: string; email: string; role: string; kantoor_id: string }[]) {
    const entry = ledenPerKantoor.get(m.kantoor_id) ?? { ids: [], adminEmail: null }
    entry.ids.push(m.id)
    if (!entry.adminEmail || m.role === 'admin') entry.adminEmail = m.email
    ledenPerKantoor.set(m.kantoor_id, entry)
  }

  const objectenPerKantoor = new Map<string, number>()
  for (const o of (alleObjectenRes.data ?? []) as { id: string; kantoor_id: string }[]) {
    objectenPerKantoor.set(o.kantoor_id, (objectenPerKantoor.get(o.kantoor_id) ?? 0) + 1)
  }

  const beheerRows: KantoorRow[] = ((alleKantorenRes.data ?? []) as {
    id: string; name: string; plan: string | null; trial_ends_at: string | null; created_at: string
  }[]).map(k => {
    const leden = ledenPerKantoor.get(k.id)
    const ids = leden?.ids ?? []
    return {
      id: k.id,
      name: k.name,
      plan: (k.plan ?? null) as KantoorRow['plan'],
      trialEndsAt: k.trial_ends_at,
      createdAt: k.created_at,
      aantalMakelaars: ids.length,
      aantalObjecten: objectenPerKantoor.get(k.id) ?? 0,
      adminEmail: leden?.adminEmail ?? null,
      actief: ids.length === 0 || ids.some(id => !bannedMap.get(id)),
    }
  })

  const planBadge = (plan: string | null, trialEndsAt: string | null) => {
    if (plan === 'starter') return <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">Starter</span>
    if (plan === 'pro') return <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Pro</span>
    if (plan === 'kantoor') return <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Kantoor</span>
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
      return <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Trial</span>
    }
    return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Verlopen</span>
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Platform admin</h1>
        <p className="text-xs text-gray-400 mt-0.5">Platform-eigenaar · beheer alle klanten</p>
      </div>

      {/* MRR indicatie */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 mb-8">
        <p className="text-xs font-semibold text-green-800 mb-1">Indicatieve MRR</p>
        <p className="text-3xl font-extrabold text-green-900">
          €{(
            (starterResult.count ?? 0) * 60 +
            (proResult.count ?? 0) * 150 +
            (kantoorResult.count ?? 0) * 500
          ).toLocaleString('nl-NL')}
        </p>
        <p className="text-xs text-green-700 mt-1">
          {starterResult.count ?? 0} × €60 + {proResult.count ?? 0} × €150 + {kantoorResult.count ?? 0} × €500
        </p>
      </div>

      {/* Klanten */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Klanten</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        <Kaart label="Totaal kantoren" waarde={totalKantoren} />
        <Kaart label="Betalend" waarde={betalendePlannen} sub={`${Math.round((betalendePlannen / Math.max(totalKantoren, 1)) * 100)}% conversie`} />
        <Kaart label="Starter" waarde={starterResult.count ?? 0} />
        <Kaart label="Pro" waarde={proResult.count ?? 0} />
        <Kaart label="Kantoor" waarde={kantoorResult.count ?? 0} />
        <Kaart label="Trial actief" waarde={trialActief} sub={`${trialVerlopen} verlopen`} />
      </div>

      {/* Objecten */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Objecten</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Kaart label="Vandaag" waarde={objectenVandaagResult.count ?? 0} />
        <Kaart label="Deze week" waarde={objectenWeekResult.count ?? 0} />
        <Kaart label="Deze maand" waarde={objectenMaandResult.count ?? 0} />
      </div>

      {/* Klanten beheren */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Klanten beheren</h2>
      <p className="text-xs text-gray-400 mb-3">Wijzig plan, geef gratis toegang of (de)activeer een kantoor.</p>
      <div className="mb-8">
        <AdminBeheer rows={beheerRows} />
      </div>

      {/* Recente gebruikers */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Recente registraties</h2>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Gebruiker</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Kantoor</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Plan</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Geregistreerd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {makelaars.map(m => {
              const kantoor = m.kantoren
              return (
                <tr key={m.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900 text-xs">{m.name || '—'}</p>
                    <p className="text-gray-400 text-xs">{m.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{kantoor?.name ?? '—'}</td>
                  <td className="px-4 py-2.5">{planBadge(kantoor?.plan ?? null, kantoor?.trial_ends_at ?? null)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {new Date(m.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              )
            })}
            {makelaars.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">Nog geen gebruikers</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
