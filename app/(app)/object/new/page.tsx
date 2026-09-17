import { redirect } from 'next/navigation'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import type { KantoorInstellingen } from '@/lib/schemas'
import { NewObjectForm } from './NewObjectForm'

export const metadata = { title: 'Woning toevoegen' }

export default async function NewObjectPage() {
  // Platform-admins gebruiken de app niet als klant. Ook: is het kantoor van
  // de ingelogde makelaar het demo-kantoor (instellingen_json.demo === true,
  // item 2.3), dan mag de demo-knop in NewObjectForm ook buiten NODE_ENV
  // !== 'production' getoond worden.
  let toonDemoKnop = process.env.NODE_ENV !== 'production'
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && isPlatformAdmin(user.email)) redirect('/admin')

    if (user && !toonDemoKnop) {
      const { data: makelaar } = await supabase
        .from('makelaars')
        .select('kantoren(instellingen_json)')
        .eq('id', user.id)
        .maybeSingle()
      const kantoor = makelaar?.kantoren as unknown as { instellingen_json: KantoorInstellingen | null } | null
      if (kantoor?.instellingen_json?.demo === true) toonDemoKnop = true
    }
  }

  // Item 3.3 (docs/roadmap.md § 5 fase 3): dossier aanmaken is nooit meer
  // vergrendeld — CONTENT_VERGRENDELD gate alleen nog op de content-tabs
  // (ObjectWorkspace) en /api/generate, sinds item 3.1 het aanmaken los
  // trok van de contentgeneratie (POST /api/object doet geen Claude-call).
  // Toegang is puur admin-beheerd (geen plan-/proefcheck meer) — elk
  // account met een makelaar-record mag hier komen.
  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 40px 80px' }}>
        <NewObjectForm toonDemoKnop={toonDemoKnop} />
      </div>
    </main>
  )
}
