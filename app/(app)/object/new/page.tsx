import { redirect } from 'next/navigation'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { Betaalmuur } from '@/components/Betaalmuur'
import { NewObjectForm } from './NewObjectForm'

export const metadata = { title: 'Nieuw object — VestaAI' }

export default async function NewObjectPage() {
  // Platform-admins gebruiken de app niet als klant.
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && isPlatformAdmin(user.email)) redirect('/admin')
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '44px 40px 80px' }}>
        <Betaalmuur>
          <NewObjectForm />
        </Betaalmuur>
      </div>
    </main>
  )
}
