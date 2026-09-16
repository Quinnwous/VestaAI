/**
 * Maakt screenshots van de ingelogde routes op meerdere breedtes, voor de
 * Definition of Done (docs/roadmap.md § 4): "scripts/screenshots.mjs
 * (Playwright) op 1280 en 1920 px, beoordeeld tegen docs/ontwerpprincipes.md".
 *
 * Logt in via een Supabase magic link (zelfde patroon als e2e/auth.setup.ts),
 * bezoekt elke route in ROUTES op elke breedte in BREEDTES, en schrijft
 * screenshots/<route-slug>-<breedte>.png. Faalt een route (bv. 404 omdat hij
 * nog niet gebouwd is), dan wordt dat gemeld en gaat het script door met de
 * rest — dit script beoordeelt niet zelf, het levert alleen het materiaal.
 *
 * Vereiste env vars (.env.local): NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_EMAIL (zie e2e/auth.setup.ts).
 *
 *   node --env-file=.env.local scripts/screenshots.mjs
 *   node --env-file=.env.local scripts/screenshots.mjs --base=http://localhost:3000
 */
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'screenshots')

const baseArg = process.argv.find(a => a.startsWith('--base='))
const BASE_URL = baseArg ? baseArg.split('=')[1] : 'http://localhost:3000'

const BREEDTES = [
  { naam: 'mobiel', width: 390, height: 844 },
  { naam: 'laptop', width: 1280, height: 900 },
  { naam: 'desktop', width: 1920, height: 1080 },
]

// Bijgewerkt zodra een route in fase 1 verhuist/toegevoegd wordt (bv. /woningen).
// Routes die nog niet bestaan geven een nette 404-melding, geen crash.
const ROUTES = [
  { slug: 'overzicht', pad: '/dashboard' },
  { slug: 'woningen', pad: '/woningen' },
  { slug: 'marktanalyse', pad: '/marktanalyse' },
  { slug: 'transacties', pad: '/marktanalyse/transacties' },
  { slug: 'concurrentie', pad: '/marktanalyse/concurrentie' },
  { slug: 'kaart', pad: '/marktanalyse/kaart' },
  { slug: 'kantoor', pad: '/kantoor' },
  { slug: 'account', pad: '/account' },
]

async function loginViaMagicLink(page) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const email = process.env.E2E_TEST_EMAIL

  if (!supabaseUrl || !serviceKey || !email) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en/of E2E_TEST_EMAIL ontbreken — ' +
        'draai met: node --env-file=.env.local scripts/screenshots.mjs',
    )
  }

  const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  if (!linkRes.ok) throw new Error(`Magic link genereren mislukt: ${await linkRes.text()}`)

  const { action_link } = await linkRes.json()
  await page.goto(action_link)
  await page.waitForURL(/\/(dashboard|object|admin)/, { timeout: 15000 })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()

  console.log(`🔑 Inloggen als ${process.env.E2E_TEST_EMAIL} …`)
  await loginViaMagicLink(page)

  const resultaten = []
  for (const breedte of BREEDTES) {
    await page.setViewportSize({ width: breedte.width, height: breedte.height })
    for (const route of ROUTES) {
      const bestand = path.join(OUT_DIR, `${route.slug}-${breedte.naam}.png`)
      try {
        const response = await page.goto(route.pad, { waitUntil: 'networkidle', timeout: 15000 })
        const status = response?.status() ?? 0
        await page.screenshot({ path: bestand, fullPage: true })
        const symbool = status >= 200 && status < 400 ? '✅' : '⚠️ '
        console.log(`${symbool} ${route.pad} (${breedte.naam}, ${status}) → ${path.basename(bestand)}`)
        resultaten.push({ ...route, breedte: breedte.naam, status, ok: status < 400 })
      } catch (err) {
        console.log(`❌ ${route.pad} (${breedte.naam}): ${err.message}`)
        resultaten.push({ ...route, breedte: breedte.naam, status: null, ok: false, fout: err.message })
      }
    }
  }

  await browser.close()

  const mislukt = resultaten.filter(r => !r.ok)
  console.log(`\n📸 ${resultaten.length - mislukt.length}/${resultaten.length} screenshots gelukt → ${path.relative(process.cwd(), OUT_DIR)}/`)
  if (mislukt.length > 0) {
    console.log(`⚠️  Niet gelukt: ${mislukt.map(r => `${r.pad} (${r.breedte})`).join(', ')}`)
  }
}

main().catch(err => {
  console.error('❌ Screenshots mislukt:', err.message)
  process.exit(1)
})
