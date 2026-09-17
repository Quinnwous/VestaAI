/**
 * Gedeelde helpers voor de DoD-scripts (screenshots.mjs, controleer-huisstijl.mjs).
 *
 * Inloggen gaat via een direct gezette Supabase-sessiecookie in plaats van de
 * magic-link-redirect: die redirect wijst naar de productie-URL, dus lokaal
 * kwam je nooit ingelogd op localhost terecht (proefrit 17 sep 2026).
 *
 * Vereiste env vars (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Optioneel: DOD_EMAIL (standaard het demo-account uit scripts/seed-demo-kantoor.mjs,
 * omdat dat kantoor data heeft; i4 Housing: DOD_EMAIL=quinn.berkouwer@icloud.com).
 */
import { createClient } from '@supabase/supabase-js'

export const DOD_EMAIL = process.env.DOD_EMAIL || 'demo@vestaai.nl'

export function vereisEnv() {
  const ontbreekt = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k])
  if (ontbreekt.length) {
    throw new Error(`${ontbreekt.join(', ')} ontbreekt — draai met: node --env-file=.env.local <script>`)
  }
}

export function serviceClient() {
  vereisEnv()
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function sessieCookie(email = DOD_EMAIL) {
  const supabase = serviceClient()
  const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`magic link mislukt: ${error.message}`)
  // Aparte client: verifyOtp zet de sessie óp de client, en daarna zouden
  // vervolgqueries als die gebruiker draaien (met RLS) in plaats van als service.
  const inlogClient = serviceClient()
  const { data: sessie, error: vFout } = await inlogClient.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: 'email',
  })
  if (vFout) throw new Error(`verifyOtp mislukt: ${vFout.message}`)
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  const waarde = 'base64-' + Buffer.from(JSON.stringify(sessie.session)).toString('base64')
  return { name: `sb-${projectRef}-auth-token`, value: waarde, domain: 'localhost', path: '/' }
}

/** Foutstaat (app/(app)/error.tsx), Next-foutoverlay of kale "Application error". */
export async function toontFoutstaat(page) {
  return page.evaluate(() => {
    const tekst = document.body?.innerText ?? ''
    return tekst.includes('Er is iets misgegaan') || !!document.querySelector('nextjs-portal') || tekst.includes('Application error')
  })
}

/** Poort uit argv: eerste positionele argument, of --port=, of fallback. */
export function poortUitArgs(fallback) {
  const vlag = process.argv.find((a) => a.startsWith('--port='))
  if (vlag) return vlag.split('=')[1]
  const positioneel = process.argv.slice(2).find((a) => !a.startsWith('--'))
  return positioneel || fallback
}
