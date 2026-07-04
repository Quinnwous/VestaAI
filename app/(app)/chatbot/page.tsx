import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ChatbotTab } from '../settings/tabs/ChatbotTab'
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
    supabase.from('chatbot_leads').select('id, naam, email, bericht, created_at').eq('kantoor_id', kantoorId).order('created_at', { ascending: false }).limit(50),
  ])

  const k = kantoor as Pick<Kantoor, 'id' | 'name'>

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 28px 80px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0E1A13', marginBottom: 6 }}>Chatbot</h1>
      <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 32, lineHeight: 1.6, maxWidth: 560 }}>
        Een AI-assistent die veelgestelde vragen van geïnteresseerden beantwoordt op basis van jouw FAQ&apos;s.
        Beheer hieronder de vragen, plaats de widget op je site en bekijk binnengekomen leads.
      </p>
      <ChatbotTab
        kantoorId={k.id}
        kantoorNaam={k.name}
        isAdmin={(makelaar as Makelaar).role === 'admin'}
        faqItems={(faq ?? []) as { id: string; vraag: string; antwoord: string; volgorde: number }[]}
        leads={(leads ?? []) as { id: string; naam: string | null; email: string; bericht: string | null; created_at: string }[]}
      />
    </main>
  )
}
