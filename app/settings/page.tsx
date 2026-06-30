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
    .select('id, name, email, role, created_at, first_generated_at')
    .eq('kantoor_id', (makelaar as Makelaar).kantoor_id)
    .order('role', { ascending: false })

  const isAdmin = (makelaar as Makelaar).role === 'admin'
  const kantoorId = (makelaar as Makelaar).kantoor_id

  // Chatbot-data alleen laden voor admins (niet-blokkerend via Promise.all)
  const [chatbotFaqRes, chatbotLeadsRes] = isAdmin
    ? await Promise.all([
        supabase.from('chatbot_faq').select('id, vraag, antwoord, volgorde').eq('kantoor_id', kantoorId).order('volgorde'),
        supabase.from('chatbot_leads').select('id, naam, email, bericht, created_at').eq('kantoor_id', kantoorId).order('created_at', { ascending: false }).limit(50),
      ])
    : [{ data: [] }, { data: [] }]

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 28px 80px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0E1A13', marginBottom: 32 }}>Instellingen</h1>
      <SettingsTabs
        makelaar={makelaar as Makelaar}
        kantoor={kantoor as Kantoor}
        teamleden={(teamleden ?? []) as Makelaar[]}
        isAdmin={isAdmin}
        chatbotFaq={(chatbotFaqRes.data ?? []) as { id: string; vraag: string; antwoord: string; volgorde: number }[]}
        chatbotLeads={(chatbotLeadsRes.data ?? []) as { id: string; naam: string | null; email: string; bericht: string | null; created_at: string }[]}
      />
    </main>
  )
}
