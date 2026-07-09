import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { SettingsTabs } from './SettingsTabs'
import { Eyebrow, SerifTitle } from '@/components/ui'
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
    .select('id, name, email, role, created_at, first_generated_at')
    .eq('kantoor_id', (makelaar as Makelaar).kantoor_id)
    .order('role', { ascending: false })

  const isAdmin = (makelaar as Makelaar).role === 'admin'

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '44px 40px 80px' }}>
      <Eyebrow>Beheer</Eyebrow>
      <SerifTitle style={{ marginBottom: 22 }}><span style={{ fontStyle: 'italic', color: '#1A6B45' }}>Instellingen</span></SerifTitle>
      <SettingsTabs
        makelaar={makelaar as Makelaar}
        kantoor={kantoor as Kantoor}
        teamleden={(teamleden ?? []) as Makelaar[]}
        isAdmin={isAdmin}
      />
    </main>
  )
}
