import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ChatbotTab } from '../settings/tabs/ChatbotTab'
import { Eyebrow, SerifTitle } from '@/components/ui'
import type { Kantoor, Makelaar } from '@/lib/supabase'

export const metadata = { title: 'Chatbot — VestaAI' }

export default async function ChatbotPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('id, role, kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) redirect('/login')

  const kantoorId = (makelaar as Makelaar).kantoor_id

  const [{ data: kantoor }, { data: faq }, { data: leads }] = await Promise.all([
    supabase.from('kantoren').select('id, name').eq('id', kantoorId).single(),
    supabase.from('chatbot_faq').select('id, vraag, antwoord, volgorde').eq('kantoor_id', kantoorId).order('volgorde'),
    supabase.from('chatbot_leads').select('id, naam, email, telefoon, bericht, created_at').eq('kantoor_id', kantoorId).order('created_at', { ascending: false }).limit(50),
  ])

  const k = kantoor as Pick<Kantoor, 'id' | 'name'>

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '44px 40px 80px' }}>
      <Eyebrow>Website</Eyebrow>
      <SerifTitle style={{ marginBottom: 8 }}>Kantoor-<span style={{ fontStyle: 'italic', color: '#1A6B45' }}>chatbot</span></SerifTitle>
      <p style={{ fontSize: 14.5, color: '#5A6B61', margin: '0 0 30px', lineHeight: 1.55, maxWidth: 560 }}>
        Plaats de chatbot op uw website — hij beantwoordt vragen over uw kantoor en aanbod, en verzamelt leads.
      </p>
      <ChatbotTab
        kantoorId={k.id}
        kantoorNaam={k.name}
        isAdmin={(makelaar as Makelaar).role === 'admin'}
        faqItems={(faq ?? []) as { id: string; vraag: string; antwoord: string; volgorde: number }[]}
        leads={(leads ?? []) as { id: string; naam: string | null; email: string; telefoon: string | null; bericht: string | null; created_at: string }[]}
      />
    </main>
  )
}
