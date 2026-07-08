import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { HuisstijlTab } from '../settings/tabs/HuisstijlTab'
import { Eyebrow, SerifTitle } from '@/components/ui'
import type { Kantoor, Makelaar } from '@/lib/supabase'

export const metadata = { title: 'Huisstijl — VestaAI' }

export default async function HuisstijlPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('id, role, kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) redirect('/login')

  const { data: kantoor } = await supabase
    .from('kantoren')
    .select('id, name, plan, logo_url, huisstijl_json, trial_ends_at')
    .eq('id', (makelaar as Makelaar).kantoor_id)
    .single()

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 40px 80px' }}>
      <Eyebrow>Merk</Eyebrow>
      <SerifTitle accent="huisstijl" style={{ marginBottom: 8 }}>Uw</SerifTitle>
      <p style={{ fontSize: 14.5, color: '#5A6B61', margin: '0 0 30px', lineHeight: 1.55, maxWidth: 560 }}>
        Leg vast hoe uw kantoor klinkt — elke gegenereerde tekst neemt deze toon over.
      </p>
      <HuisstijlTab kantoor={kantoor as Kantoor} isAdmin={(makelaar as Makelaar).role === 'admin'} />
    </main>
  )
}
