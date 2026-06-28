import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { SettingsTabs } from './SettingsTabs'
import type { Kantoor, Makelaar } from '@/lib/supabase'

export const metadata = { title: 'Instellingen — VestaAI' }

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('id, name, email, role, kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) redirect('/login')

  const { data: kantoor } = await supabase
    .from('kantoren')
    .select('id, name, plan, logo_url, huisstijl_json, trial_ends_at')
    .eq('id', (makelaar as Makelaar).kantoor_id)
    .single()

  const { data: teamleden } = await supabase
    .from('makelaars')
    .select('id, name, email, role')
    .eq('kantoor_id', (makelaar as Makelaar).kantoor_id)
    .order('role', { ascending: false })

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-8">Instellingen</h1>
      <SettingsTabs
        makelaar={makelaar as Makelaar}
        kantoor={kantoor as Kantoor}
        teamleden={(teamleden ?? []) as Makelaar[]}
        isAdmin={(makelaar as Makelaar).role === 'admin'}
      />
    </main>
  )
}
