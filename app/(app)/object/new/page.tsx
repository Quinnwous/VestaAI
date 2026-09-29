import { redirect } from 'next/navigation'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import type { KantoorInstellingen } from '@/lib/schemas'
import { AppPagina } from '@/components/ui'
import { NewObjectForm } from './NewObjectForm'

export const metadata = { title: 'Woning toevoegen' }

export default async function NewObjectPage() {
  // Platform-admins gebruiken de app niet als klant. Ook: is het kantoor van
  // de ingelogde makelaar het demo-kantoor (instellingen_json.demo === true,
  // item 2.3), dan mag de demo-knop in NewObjectForm ook buiten NODE_ENV
  // !== 'production' getoond worden.
  let toonDemoKnop = process.env.NODE_ENV !== 'production'
  // Kantoorstandaard courtage (item J2, docs/specs/j2-courtage-per-dossier.md):
  // dezelfde kantoor-lookup als hierboven levert ook instellingen_json.courtage,
  // dus voortaan altijd ophalen (niet alleen als toonDemoKnop nog false is) —
  // NewObjectForm/PropertyForm gebruiken het om het courtageveld voor te vullen.
  let kantoorInstellingen: KantoorInstellingen | null = null
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && isPlatformAdmin(user.email)) redirect('/admin')

    if (user) {
      const { data: makelaar } = await supabase
        .from('makelaars')
        .select('kantoren(instellingen_json)')
        .eq('id', user.id)
        .maybeSingle()
      const kantoor = makelaar?.kantoren as unknown as { instellingen_json: KantoorInstellingen | null } | null
      kantoorInstellingen = kantoor?.instellingen_json ?? null
      if (!toonDemoKnop && kantoorInstellingen?.demo === true) toonDemoKnop = true
    }
  }

  // Item 3.3 (docs/roadmap.md § 5 fase 3): dossier aanmaken is nooit meer
  // vergrendeld — CONTENT_VERGRENDELD gate alleen nog op de content-tabs
  // (ObjectWorkspace) en /api/generate, sinds item 3.1 het aanmaken los
  // trok van de contentgeneratie (POST /api/object doet geen Claude-call).
  // Toegang is puur admin-beheerd (geen plan-/proefcheck meer) — elk
  // account met een makelaar-record mag hier komen.
  //
  // Item 10.5: `AppPagina` i.p.v. de losse `maxWidth: 900`-wrapper die hier
  // eerder stond — dat was de laatste pagina met zijn eigen afwijkende
  // waarde (zie AppPagina.tsx). Volle breedte laat de intake vanaf 1280px
  // ruimte over voor het sticky "Deze woning"-paneel naast de wizard
  // (components/PropertyForm.tsx, .intake-layout in app/globals.css).
  return (
    <AppPagina>
      <NewObjectForm toonDemoKnop={toonDemoKnop} kantoorInstellingen={kantoorInstellingen} />
    </AppPagina>
  )
}
