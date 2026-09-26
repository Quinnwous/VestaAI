/**
 * E2e — item 12.2 spec 4: de verkoopkaart (`/marktanalyse/kaart`,
 * `VerkoopkaartExplorerV2` op MapLibre, item 7.2) laadt zonder CSP-fout en
 * zonder `pageerror`. CSP is projectbreed eerder een probleem geweest (les
 * 24 sep: Plausible werd geblokkeerd) — MapLibre host zijn eigen worker
 * (`public/maplibre-gl/`, guard-test) juist om `worker-src`-problemen te
 * vermijden, dus dit is de plek waar dat zou terugkomen.
 *
 * CSP-violaties zijn geen `console.error` met een vaste tekst maar een eigen
 * DOM-event (`securitypolicyviolation`) — we loggen dat event zelf naar de
 * console vóór de navigatie (`addInitScript`, dus het draait al bij de eerste
 * paint) en luisteren daarna op reguliere `console`-events, zoals de opdracht
 * vraagt ("page.on('console') op 'Content Security Policy'").
 */
import { test, expect } from '@playwright/test'
import { heeftDemoAuth, DEMO_AUTH_FILE } from './lib/auth'

test.use({ storageState: DEMO_AUTH_FILE })

test('verkoopkaart laadt zonder CSP-fout of pageerror', async ({ page }) => {
  test.skip(!heeftDemoAuth(), 'Geen demo-sessie — DEMO_PASSWORD ontbreekt')

  const cspMeldingen: string[] = []
  const paginaFouten: string[] = []

  await page.addInitScript(() => {
    window.addEventListener('securitypolicyviolation', (e) => {
      // eslint-disable-next-line no-console
      console.error(
        `[csp] ${e.violatedDirective} blocked-uri=${e.blockedURI} source=${e.sourceFile}:${e.lineNumber}`,
      )
    })
  })

  page.on('console', (msg) => {
    const tekst = msg.text()
    if (/content security policy/i.test(tekst) || tekst.startsWith('[csp]')) {
      cspMeldingen.push(tekst)
    }
  })
  page.on('pageerror', (e) => paginaFouten.push(e.message))

  await page.goto('/marktanalyse/kaart')

  // MapLibre rendert op een <canvas> zodra tiles + data geladen zijn — een
  // ruime timeout, want PDOK-tiles en de eigen-verkopen-query kunnen even
  // duren op de eerste load (zie CLAUDE.md "Prestatie").
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 })
  await page.waitForLoadState('networkidle')

  expect(cspMeldingen, `CSP-meldingen: ${cspMeldingen.join(' | ')}`).toHaveLength(0)
  expect(paginaFouten, `pageerror: ${paginaFouten.join(' | ')}`).toHaveLength(0)
})
