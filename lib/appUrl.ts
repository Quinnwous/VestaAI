/**
 * Canonieke URL van de app, voor e-mails, sitemap en metadata.
 *
 * Een Vercel-deploy-URL is nooit canoniek: die verandert per deploy en hoort niet in een
 * mail of in een sitemap te staan. Staat `NEXT_PUBLIC_APP_URL` per ongeluk op zo'n adres,
 * dan negeren we hem. (Redirects na uitloggen gaan bewust via het host-adres van het
 * verzoek zelf — zie app/api/auth/logout/route.ts.)
 */
const INGESTELD = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')

export const APP_URL =
  INGESTELD && !/vercel\.app$/i.test(new URL(INGESTELD).hostname)
    ? INGESTELD
    : 'https://www.vestaai.nl'
