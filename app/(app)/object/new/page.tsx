import { redirect } from 'next/navigation'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { InAanbouw } from '@/components/InAanbouw'
import { Eyebrow, SerifTitle } from '@/components/ui'
import { CONTENT_VERGRENDELD, CONTENT_SLOT_TEKST } from '@/lib/features'
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

  // Dit formulier genereert content (8 velden → Claude) en valt daarmee onder de
  // vergrendelde contentsuite. De waarderingsflow krijgt een eigen, kortere
  // invoer (adres → data → waarde) — zie docs/roadmap.md.
  if (CONTENT_VERGRENDELD) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '44px 40px 80px' }}>
        <Eyebrow>Woning toevoegen</Eyebrow>
        <SerifTitle size={32} accent="nog even" style={{ marginBottom: 22 }}>Dit duurt</SerifTitle>
        <InAanbouw
          slot
          eyebrow="Tijdelijk gesloten"
          titel={CONTENT_SLOT_TEKST.titel}
          uitleg={`${CONTENT_SLOT_TEKST.uitleg} Het huidige invoerformulier hoort bij de contentgeneratie. Woningen toevoegen komt terug met de waarderingsflow: adres invoeren, data ophalen, waarderen.`}
          actie={{ href: '/woningen', label: 'Terug naar de portefeuille' }}
        />
      </main>
    )
  }

  // Toegang is puur admin-beheerd (geen plan-/proefcheck meer) — elk account met
  // een makelaar-record mag hier komen zodra het slot eraf gaat.
  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 40px 80px' }}>
        <NewObjectForm toonDemoKnop={toonDemoKnop} />
      </div>
    </main>
  )
}
