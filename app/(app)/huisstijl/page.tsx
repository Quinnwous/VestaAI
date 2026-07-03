import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { HuisstijlTab } from '../settings/tabs/HuisstijlTab'
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
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 28px 80px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0E1A13', marginBottom: 6 }}>Huisstijl</h1>
      <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 32, lineHeight: 1.6, maxWidth: 560 }}>
        Leg de schrijftoon, slogan en voorbeeldteksten van je kantoor vast. VestaAI leert die stijl en past hem
        automatisch toe bij elke generatie — zo klinkt alle content als jullie kantoor.
      </p>
      <HuisstijlTab kantoor={kantoor as Kantoor} isAdmin={(makelaar as Makelaar).role === 'admin'} />
    </main>
  )
}
