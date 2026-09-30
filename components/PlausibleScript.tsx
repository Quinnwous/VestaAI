'use client'

import Script from 'next/script'

/**
 * Cookieloze, geanonimiseerde websitestatistieken (Plausible) — uitsluitend
 * op de publieke pagina's (item 14.1, docs/roadmap.md fase 14, punt 5).
 *
 * Stond eerder in app/layout.tsx en draaide daardoor ook achter de login,
 * waar hij ongemerkt dossier-URL's meestuurde naar Plausible — terwijl de
 * privacyverklaring altijd al "op onze publieke pagina's" zei. Dit component
 * gaat alleen in app/page.tsx, app/contact, app/login(/[slug]), app/voorwaarden,
 * app/privacy, app/over-ons en app/vertrouwen; nergens onder app/(app)/ of
 * app/admin/.
 *
 * lazyOnload (les 29 sep 2026): pas laden zodra de browser vrij is —
 * afterInteractive gaf eerder een lange taak van ~0,5 s midden in de
 * hydratie op mobiel.
 */
export function PlausibleScript() {
  return (
    <Script
      defer
      data-domain="vestaai.nl"
      src="https://plausible.io/js/script.js"
      strategy="lazyOnload"
    />
  )
}
