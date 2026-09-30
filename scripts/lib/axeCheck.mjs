/**
 * Axe-scan voor de Definition of Done (item 14.4, toegankelijkheid).
 *
 * Draait `@axe-core/playwright` op elke ingelogde route, op elk van de drie
 * DoD-breedtes (390/1280/1920 px). `serious`/`critical`-overtredingen laten
 * `npm run dod:screens` falen (exit 1); `moderate`/`minor` worden alleen
 * gerapporteerd — die vragen vaak een ontwerpkeuze (bv. contrast, item 14.4
 * zelf) in plaats van een simpele fix.
 *
 * Uitzetten voor een snelle lokale ronde: `DOD_AXE=0 npm run dod:screens`.
 *
 * Los, niet via `npm run dod:screens`:
 *   node --env-file=.env.local scripts/lib/axeCheck.mjs [poort] [--width=1280]
 */
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { sessieCookie, serviceClient, DOD_EMAIL } from './dodSessie.mjs'

/** WCAG-niveaus die de DoD bewaakt — 2.0 en 2.1, A en AA (roadmap 14.4: "WCAG 2.1 AA"). */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Impact-niveaus die de DoD laten falen; de rest wordt alleen gerapporteerd. */
export const FALENDE_IMPACT = new Set(['serious', 'critical'])

/**
 * Dezelfde kernroutes als `screenshots.mjs`/`controleer-huisstijl.mjs` (bewust
 * niet geïmporteerd — dit item raakt uitsluitend `dod-screens.mjs` en
 * `scripts/lib/`, dus geen gedeelde export uit die bestanden).
 */
export const AXE_ROUTES = [
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

/** Eén dossier van het DoD-kantoor erbij, zoals `screenshots.mjs` al doet. */
export async function metDossierRoute(routes = AXE_ROUTES) {
  const { data: object } = await serviceClient().from('objecten').select('id').limit(1).maybeSingle()
  return object ? [...routes, { slug: 'dossier', pad: `/object/${object.id}` }] : routes
}

/**
 * Zet elke axe-violation om naar een platte regel: route, viewport,
 * regel-id, aantal nodes en de eerste selector — precies wat de spec voor
 * een `serious`/`critical`-melding vraagt.
 */
function naarRegels(violations, route, breedte) {
  return violations.map((v) => ({
    route,
    breedte,
    regel: v.id,
    impact: v.impact ?? 'onbekend',
    help: v.help,
    nodes: v.nodes.length,
    selector: v.nodes[0]?.target?.join(' ') ?? '(geen selector)',
  }))
}

/**
 * Scant `routes` op elke breedte in `breedtes`. `basis` is de lokale
 * dev-server-URL (`http://localhost:<poort>`), `cookie` de sessiecookie uit
 * `sessieCookie()`. Geeft alle bevindingen plat terug (`naarRegels()`), de
 * caller filtert op impact.
 */
export async function voerAxeScan({ basis, cookie, routes, breedtes = [390, 1280, 1920] }) {
  const browser = await chromium.launch()
  const bevindingen = []
  try {
    for (const breedte of breedtes) {
      const context = await browser.newContext({
        baseURL: basis,
        viewport: { width: breedte, height: breedte <= 480 ? 844 : 1080 },
      })
      await context.addCookies([cookie])
      const page = await context.newPage()
      for (const route of routes) {
        await page.goto(route.pad, { waitUntil: 'load', timeout: 60_000 })
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
        await page.waitForTimeout(400)
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        bevindingen.push(...naarRegels(violations, route.pad, breedte))
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
  return bevindingen
}

/** Groepeert op impact — basis voor zowel de exit-beslissing als het rapport. */
export function groepeerOpImpact(bevindingen) {
  const groepen = { critical: [], serious: [], moderate: [], minor: [], onbekend: [] }
  for (const b of bevindingen) (groepen[b.impact] ?? groepen.onbekend).push(b)
  return groepen
}

/** `true` zodra er minstens één `serious`/`critical`-bevinding is. */
export function moetFalen(bevindingen) {
  return bevindingen.some((b) => FALENDE_IMPACT.has(b.impact))
}

/** Eén op de console leesbare samenvatting; ruwe data blijft in `axe-rapport.json`. */
export function logSamenvatting(bevindingen) {
  const groepen = groepeerOpImpact(bevindingen)
  for (const impact of ['critical', 'serious']) {
    for (const b of groepen[impact]) {
      console.error(`   ❌ [${impact}] ${b.regel} — ${b.route} @ ${b.breedte}px — ${b.nodes} node(n) — ${b.selector}`)
    }
  }
  for (const impact of ['moderate', 'minor']) {
    for (const b of groepen[impact]) {
      console.log(`   ⚠️ [${impact}] ${b.regel} — ${b.route} @ ${b.breedte}px — ${b.nodes} node(n) — ${b.selector}`)
    }
  }
  if (!bevindingen.length) console.log('   ✅ geen axe-overtredingen')
  return groepen
}

// Los draaien voor snel debuggen van één breedte, zonder de rest van dod:screens.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { poortUitArgs } = await import('./dodSessie.mjs')
  const poort = poortUitArgs('3000')
  const breedteArg = process.argv.find((a) => a.startsWith('--width='))
  const breedtes = breedteArg ? [Number(breedteArg.split('=')[1])] : [390, 1280, 1920]
  const basis = `http://localhost:${poort}`
  const cookie = await sessieCookie()
  const routes = await metDossierRoute()
  console.log(`Axe-scan (${DOD_EMAIL}) op ${basis}, breedtes ${breedtes.join(', ')} …`)
  const bevindingen = await voerAxeScan({ basis, cookie, routes, breedtes })
  logSamenvatting(bevindingen)
  process.exit(moetFalen(bevindingen) ? 1 : 0)
}
