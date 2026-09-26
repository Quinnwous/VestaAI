/**
 * Gedeelde Supabase-sessiehelpers voor de e2e-suite (item 12.2, docs/roadmap.md
 * § Fase 12). Bewust los van `lib/supabase.ts` — dat bestand importeert
 * `next/headers` en is niet bruikbaar buiten een Next-requestcontext, terwijl
 * deze helpers in Playwright-testcode draaien (net als `primitives.spec.ts`
 * dat al deed met een losse `@supabase/supabase-js`-client).
 *
 * Twee inlogpaden, dezelfde als `scripts/lib/dodSessie.mjs` en
 * `e2e/auth.setup.ts`:
 * - `signInMetWachtwoord()` — voor accounts waar we een testwachtwoord van
 *   kennen (demo@vestaai.nl via env `DEMO_PASSWORD`).
 * - `sessieVoorEmail()` — voor accounts zonder bekend wachtwoord: een magic
 *   link genereren via de service role en direct omwisselen. De link zélf
 *   bezoeken werkt lokaal niet (Supabase redirect naar de productie-URL uit
 *   de projectinstellingen), dus we wisselen het token hier serverside om.
 */
import { createClient, type Session } from '@supabase/supabase-js'

export function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL of NEXT_PUBLIC_SUPABASE_URL ontbreekt in de omgeving')
  return url
}

function anonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt in de omgeving')
  return key
}

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt in de omgeving')
  return key
}

/** Aanwezigheid van alle env-vars die deze helpers nodig hebben, zonder te gooien. */
export function heeftE2eOmgeving(): boolean {
  return !!(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export function serviceClient() {
  return createClient(supabaseUrl(), serviceKey())
}

export function anonClient() {
  return createClient(supabaseUrl(), anonKey())
}

export type LichteSessie = Session

/** Echte wachtwoord-login (bv. demo@vestaai.nl + env DEMO_PASSWORD). */
export async function signInMetWachtwoord(email: string, password: string): Promise<LichteSessie> {
  const client = anonClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Inloggen mislukt voor ${email}: ${error?.message}`)
  return data.session
}

/**
 * Sessie zonder wachtwoord: magic link genereren (service role) en meteen
 * omwisselen met een losse anon-client (nooit de service-client zelf
 * gebruiken om te verifiëren, anders draaien vervolgqueries als de
 * service-rol i.p.v. als de ingelogde gebruiker — zelfde les als
 * `scripts/lib/dodSessie.mjs`).
 */
export async function sessieVoorEmail(email: string): Promise<LichteSessie> {
  const admin = serviceClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`generateLink mislukt voor ${email}: ${error.message}`)

  const inlogClient = anonClient()
  const { data: sessieData, error: vFout } = await inlogClient.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: 'email',
  })
  if (vFout || !sessieData.session) throw new Error(`verifyOtp mislukt voor ${email}: ${vFout?.message}`)
  return sessieData.session
}

/** Bouwt de sb-<ref>-auth-token cookie die de Supabase-ssr-client verwacht. */
export function authCookieNaam(): string {
  const projectRef = new URL(supabaseUrl()).hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

export function authCookieWaarde(sessie: LichteSessie): string {
  return 'base64-' + Buffer.from(JSON.stringify(sessie)).toString('base64')
}

export async function kantoorIdVoorSlug(slug: string): Promise<string> {
  const db = serviceClient()
  const { data, error } = await db.from('kantoren').select('id').eq('slug', slug).single()
  if (error || !data) throw new Error(`Kantoor met slug "${slug}" niet gevonden: ${error?.message}`)
  return data.id
}

/**
 * Vangrail vóór elke opruimactie in de e2e-suite (zelfde geest als
 * `lib/demoFixtureGuard.ts`, maar hier voor één los testdossier i.p.v. een
 * hele kantoor-reset): weigert te verwijderen als het kantoor niet expliciet
 * `instellingen_json.demo === true` heeft.
 */
export async function assertKantoorIsDemo(kantoorId: string): Promise<void> {
  const db = serviceClient()
  const { data, error } = await db
    .from('kantoren')
    .select('id, name, instellingen_json')
    .eq('id', kantoorId)
    .single()
  if (error || !data) throw new Error(`Kantoor ${kantoorId} niet gevonden: ${error?.message}`)
  const isDemo = (data.instellingen_json as { demo?: boolean } | null)?.demo === true
  if (!isDemo) {
    throw new Error(
      `Vangrail: kantoor "${data.name}" (${kantoorId}) heeft geen instellingen_json.demo === true — opruimactie geweigerd.`,
    )
  }
}
