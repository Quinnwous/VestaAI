/**
 * Screenshots van de ingelogde routes op 390/1280/1920 px, voor de Definition
 * of Done (docs/roadmap.md § 4). Schrijft screenshots/<route>-<breedte>.png.
 *
 * Voor de DoD via `npm run dod:screens` draaien (start zo nodig zelf een
 * dev-server). Los:
 *
 *   node --env-file=.env.local scripts/screenshots.mjs [poort]
 *
 * Vereiste env vars (.env.local): NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY. Optioneel: DOD_EMAIL. Inloggen via sessiecookie
 * (scripts/lib/dodSessie.mjs), niet via de magic-link-redirect naar productie.
 *
 * Exit 1 als een route geen 2xx/3xx geeft, niet laadt, de foutstaat toont of
 * horizontaal overloopt (pagina breder dan de viewport).
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sessieCookie, toontFoutstaat, poortUitArgs, serviceClient } from './lib/dodSessie.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'screenshots')
const BASE_URL = `http://localhost:${poortUitArgs('3000')}`

const BREEDTES = [
  { naam: 'mobiel', width: 390, height: 844 },
  { naam: 'laptop', width: 1280, height: 900 },
  { naam: 'desktop', width: 1920, height: 1080 },
]

const ROUTES = [
  { slug: 'overzicht', pad: '/dashboard' },
  { slug: 'woningen', pad: '/woningen' },
  { slug: 'object-nieuw', pad: '/object/new' },
  { slug: 'marktanalyse', pad: '/marktanalyse' },
  { slug: 'transacties', pad: '/marktanalyse/transacties' },
  { slug: 'concurrentie', pad: '/marktanalyse/concurrentie' },
  { slug: 'kaart', pad: '/marktanalyse/kaart' },
  { slug: 'kantoor', pad: '/kantoor' },
  { slug: 'account', pad: '/account' },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const cookie = await sessieCookie()

  const { data: object } = await serviceClient().from('objecten').select('id').limit(1).maybeSingle()
  const routes = object ? [...ROUTES, { slug: 'dossier', pad: `/object/${object.id}` }] : ROUTES

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: BASE_URL })
  await context.addCookies([cookie])
  const page = await context.newPage()
  const paginaFouten = []
  page.on('pageerror', (e) => paginaFouten.push(e.message))

  const resultaten = []
  for (const breedte of BREEDTES) {
    await page.setViewportSize({ width: breedte.width, height: breedte.height })
    for (const route of routes) {
      const bestand = path.join(OUT_DIR, `${route.slug}-${breedte.naam}.png`)
      paginaFouten.length = 0
      try {
        const response = await page.goto(route.pad, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(500)
        const status = response?.status() ?? 0
        if (new URL(page.url()).pathname.startsWith('/login')) throw new Error('doorgestuurd naar /login — sessiecookie niet geaccepteerd')
        await page.screenshot({ path: bestand, fullPage: true })
        const foutstaat = await toontFoutstaat(page)
        // Horizontale scroll = kapotte layout ("op 390 px breekt niets", DoD).
        const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        const ok = status >= 200 && status < 400 && !foutstaat && paginaFouten.length === 0 && overloop <= 1
        const reden = foutstaat
          ? 'foutstaat'
          : paginaFouten.length
            ? `pageerror: ${paginaFouten.join(' | ').slice(0, 200)}`
            : overloop > 1
              ? `horizontale scroll: ${overloop} px te breed`
              : `status ${status}`
        console.log(`${ok ? '✅' : '❌'} ${route.pad} (${breedte.naam}, ${reden}) → ${path.basename(bestand)}`)
        resultaten.push({ ...route, breedte: breedte.naam, ok, reden })
      } catch (err) {
        console.log(`❌ ${route.pad} (${breedte.naam}): ${err.message}`)
        resultaten.push({ ...route, breedte: breedte.naam, ok: false, reden: err.message })
      }
    }
  }

  await browser.close()

  const mislukt = resultaten.filter((r) => !r.ok)
  console.log(`\n📸 ${resultaten.length - mislukt.length}/${resultaten.length} screenshots in orde → ${path.relative(process.cwd(), OUT_DIR)}/`)
  if (mislukt.length > 0) {
    console.error(`❌ Niet in orde: ${mislukt.map((r) => `${r.pad} (${r.breedte}: ${r.reden})`).join(', ')}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Screenshots mislukt:', err.message)
  process.exit(1)
})
