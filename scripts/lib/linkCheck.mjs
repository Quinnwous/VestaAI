/**
 * Linkcheck voor de Definition of Done (item 14.4, toegankelijkheid + dode
 * links): elke interne link op de publieke pagina's moet ergens uitkomen.
 *
 * De publieke pagina's komen uit de live `/sitemap.xml` van de draaiende
 * dev-server — dat is precies wat `app/sitemap.ts` genereert, zonder dat dit
 * script die TS-module zelf hoeft te importeren (dit item raakt alleen
 * `dod-screens.mjs` en `scripts/lib/`). Op elke pagina worden alle
 * `<a href>`'s verzameld; externe links (ander origin) worden overgeslagen,
 * interne links moeten op 200 uitkomen (na eventuele redirects) — een anker
 * (`#sectie`) moet bovendien echt op de doelpagina bestaan.
 *
 * Los draaien:
 *   node --env-file=.env.local scripts/lib/linkCheck.mjs [poort]
 */
import { chromium } from 'playwright'
import { poortUitArgs } from './dodSessie.mjs'

const OVERSLAAN_PROTOCOLLEN = ['mailto:', 'tel:', 'javascript:']

/** `<loc>`-waarden uit de live sitemap, als paden (`/contact`, niet de volledige URL). */
export async function sitemapPaden(basis) {
  const res = await fetch(`${basis}/sitemap.xml`)
  if (!res.ok) throw new Error(`/sitemap.xml gaf ${res.status}`)
  const xml = await res.text()
  const paden = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    try {
      return new URL(m[1]).pathname || '/'
    } catch {
      return null
    }
  })
  return [...new Set(paden.filter(Boolean))]
}

/** Verzamelt alle `<a href>`-waarden op `pad` (echte browser-render, ook client components). */
async function linksOpPagina(context, pad) {
  const page = await context.newPage()
  await page.goto(pad, { waitUntil: 'load', timeout: 30_000 })
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
  await page.close()
  return hrefs.filter(Boolean)
}

/** `true` als `id` (of `name`, oude ankerstijl) ergens op de al geladen `page` voorkomt. */
async function ankerBestaat(context, pad, id) {
  const page = await context.newPage()
  await page.goto(pad, { waitUntil: 'load', timeout: 30_000 })
  const bestaat = await page.evaluate((zoekId) => !!document.getElementById(zoekId) || !!document.getElementsByName(zoekId).length, id)
  await page.close()
  return bestaat
}

/**
 * Controleert alle interne links op `paden` (relatief t.o.v. `basis`).
 * Geeft een lijst dode links terug (leeg = alles oké); elke regel is
 * mens-leesbaar: bronpagina, link, en de reden.
 */
export async function controleerInterneLinks({ basis, paden }) {
  const origin = new URL(basis).origin
  const browser = await chromium.launch()
  const dodeLinks = []
  const statusCache = new Map()
  const ankerCache = new Map()
  try {
    const context = await browser.newContext({ baseURL: basis })
    for (const bronPad of paden) {
      const hrefs = await linksOpPagina(context, bronPad)
      for (const href of hrefs) {
        if (OVERSLAAN_PROTOCOLLEN.some((p) => href.startsWith(p))) continue
        let url
        try {
          url = new URL(href, basis + bronPad)
        } catch {
          dodeLinks.push(`${bronPad} → "${href}" (geen geldige URL)`)
          continue
        }
        if (url.origin !== origin) continue // extern — buiten scope van deze check

        const doelPad = url.pathname + url.search
        const cacheSleutel = doelPad
        if (!statusCache.has(cacheSleutel)) {
          const res = await context.request.get(doelPad).catch((e) => ({ status: () => 0, statusFout: e.message }))
          statusCache.set(cacheSleutel, res.status ? res.status() : 0)
        }
        const status = statusCache.get(cacheSleutel)
        if (status !== 200) {
          dodeLinks.push(`${bronPad} → "${href}" (status ${status || 'geen respons'})`)
          continue
        }

        if (url.hash && url.hash.length > 1) {
          const ankerId = decodeURIComponent(url.hash.slice(1))
          const ankerSleutel = `${doelPad}#${ankerId}`
          if (!ankerCache.has(ankerSleutel)) {
            ankerCache.set(ankerSleutel, await ankerBestaat(context, doelPad, ankerId))
          }
          if (!ankerCache.get(ankerSleutel)) {
            dodeLinks.push(`${bronPad} → "${href}" (anker "#${ankerId}" niet gevonden op ${doelPad})`)
          }
        }
      }
    }
  } finally {
    await browser.close()
  }
  return dodeLinks
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const poort = poortUitArgs('3000')
  const basis = `http://localhost:${poort}`
  const paden = await sitemapPaden(basis)
  console.log(`Linkcheck op ${paden.length} publieke pagina('s): ${paden.join(', ')}`)
  const dodeLinks = await controleerInterneLinks({ basis, paden })
  if (dodeLinks.length) {
    console.error('\n❌ DODE LINKS:\n   ' + dodeLinks.join('\n   '))
    process.exit(1)
  }
  console.log('✅ geen dode interne links')
}
