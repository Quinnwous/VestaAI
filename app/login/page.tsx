'use client'

// Gesloten platform (sinds 15 sep 2026): geen self-serve "Aanmelden" meer.
// Nieuwe accounts én teamleden zet de platform-admin direct klaar via /admin
// (addMakelaarAccount, met wachtwoord — geen self-serve uitnodigingslink meer
// sinds het één-rol-per-kantoor-besluit van 16 sep 2026).
//
// De eigenlijke inlog-/reset-logica staat in components/InlogFormulier.tsx
// (item 9.1) — gedeeld met de kantoorspecifieke /login/[slug]. Deze pagina
// blijft ongewijzigd: vaste VestaAI-groene stijl, `branding={null}`.
import { InlogFormulier } from '@/components/InlogFormulier'

export default function LoginPage() {
  return <InlogFormulier branding={null} />
}
