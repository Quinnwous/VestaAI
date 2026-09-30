/**
 * Toetsenbordronde voor de Definition of Done (item 14.4, toegankelijkheid):
 * op de hero-routes tien keer Tab drukken en bij elke stap controleren dat
 * het gefocuste element een zichtbare focusindicator heeft (`outline` mét
 * breedte, of een `box-shadow`). Alleen een waarschuwing — geen exit 1: de
 * hoofdsessie beoordeelt de uitkomst eerst (zie de opdracht voor dit item).
 *
 * Los draaien:
 *   node --env-file=.env.local scripts/lib/toetsenbordCheck.mjs [poort]
 */
import { chromium } from 'playwright'
import { sessieCookie, poortUitArgs } from './dodSessie.mjs'

/** Hero-routes uit de opdracht (dashboard, marktanalyse, woningen, een dossier). */
export const TOETSENBORD_ROUTES = [
  { slug: 'dashboard', pad: '/dashboard' },
  { slug: 'marktanalyse', pad: '/marktanalyse' },
  { slug: 'woningen', pad: '/woningen' },
]

const STAPPEN = 10

/** Berekende stijl van het huidige `document.activeElement` — puur leesbaar, geen DOM-refs die de call overleven. */
async function focusIndicatorZichtbaar(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { zichtbaar: false, tag: '(geen focus — waarschijnlijk terug op body)' }
    const s = getComputedStyle(el)
    const outlineBreedte = parseFloat(s.outlineWidth) || 0
    const heeftOutline = s.outlineStyle !== 'none' && outlineBreedte > 0
    const heeftSchaduw = s.boxShadow && s.boxShadow !== 'none'
    const cls = el.getAttribute('class')
    const tag = `${el.tagName.toLowerCase()}${cls ? '.' + cls.split(' ')[0] : ''}`
    return { zichtbaar: !!(heeftOutline || heeftSchaduw), tag }
  })
}

/**
 * Tabt `STAPPEN` keer door `pad` en rapporteert per stap of er een zichtbare
 * focusindicator is. Geeft een lijst waarschuwingen terug (leeg = alles
 * zichtbaar) — dit faalt de DoD nooit, alleen `logWaarschuwingen()` beslist
 * wat de hoofdsessie te zien krijgt.
 */
export async function toetsenbordRonde({ basis, cookie, routes = TOETSENBORD_ROUTES, stappen = STAPPEN }) {
  const browser = await chromium.launch()
  const waarschuwingen = []
  try {
    const context = await browser.newContext({ baseURL: basis, viewport: { width: 1280, height: 900 } })
    await context.addCookies([cookie])
    const page = await context.newPage()
    for (const route of routes) {
      await page.goto(route.pad, { waitUntil: 'load', timeout: 30_000 })
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      // Startpunt: focus expliciet op body, zodat de eerste Tab de eerste focusbare
      // pagina-eigen elementen raakt (de skip-link bestaat al, roadmap 14.4-spec).
      await page.evaluate(() => document.body.focus())
      for (let stap = 1; stap <= stappen; stap++) {
        await page.keyboard.press('Tab')
        const { zichtbaar, tag } = await focusIndicatorZichtbaar(page)
        if (!zichtbaar) waarschuwingen.push(`${route.pad} — stap ${stap}/${stappen} — ${tag} — geen zichtbare focusindicator`)
      }
    }
  } finally {
    await browser.close()
  }
  return waarschuwingen
}

/** Logt de waarschuwingen (of een groen vinkje) — roept nooit `process.exit`. */
export function logWaarschuwingen(waarschuwingen) {
  if (!waarschuwingen.length) {
    console.log('   ✅ overal een zichtbare focusindicator (toetsenbordronde)')
    return
  }
  console.log(`   ⚠️ toetsenbordronde: ${waarschuwingen.length} stap(pen) zonder zichtbare focusindicator (geen blokkade — hoofdsessie beoordeelt):`)
  waarschuwingen.forEach((w) => console.log('     -', w))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { metDossierRoute } = await import('./axeCheck.mjs')
  const poort = poortUitArgs('3000')
  const basis = `http://localhost:${poort}`
  const cookie = await sessieCookie()
  const routes = await metDossierRoute(TOETSENBORD_ROUTES)
  const waarschuwingen = await toetsenbordRonde({ basis, cookie, routes })
  logWaarschuwingen(waarschuwingen)
}
