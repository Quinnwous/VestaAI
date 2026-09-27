/**
 * E2e — item 12.2 spec 3: de waardebepaling toont het aantal referenties
 * (`n = …`, zie components/WaardebepalingPaneel.tsx) en een pdf-knop; de
 * pdf-route (`GET /api/pdf/waardebepaling`) geeft een echte 200 met
 * `application/pdf` terug — leest de al opgeslagen `waardering_json`, rekent
 * niets opnieuw uit (roadmap item 4.7).
 *
 * Puur lezend: geen dossier aangemaakt of gewijzigd, dus geen opruiming nodig.
 */
import { test, expect } from '@playwright/test'
import { heeftDemoAuth, DEMO_AUTH_FILE } from './lib/auth'
import { kantoorIdVoorSlug } from './lib/session'
import { dossierMetWaardering } from './lib/fixtures'

test.use({ storageState: DEMO_AUTH_FILE })

test('waardebepaling toont n en een werkende pdf-knop', async ({ page, request }) => {
  test.skip(!heeftDemoAuth(), 'Geen demo-sessie — DEMO_PASSWORD ontbreekt')
  // react-pdf (WaardebepalingPdfTemplate) + de eerste (ongecompileerde) hit op
  // de route-bundel in `next dev` kan een paar seconden extra kosten boven op
  // de standaard 30s-testtimeout — vooral ná andere zware tests in dezelfde run.
  test.setTimeout(60_000)

  const demoKantoorId = await kantoorIdVoorSlug('demo')
  const dossier = await dossierMetWaardering(demoKantoorId)
  test.skip(!dossier, 'Geen dossier in het demo-kantoor met een berekende waardering')

  const paginaFouten: string[] = []
  page.on('pageerror', e => paginaFouten.push(e.message))

  await page.goto(`/object/${dossier!.id}`)

  await expect(page.getByText(new RegExp(`n\\s*=\\s*${dossier!.n}\\b`)).first()).toBeVisible()

  // De knop staat bewust twee keer op de pagina (DossierHeader.tsx én
  // WaardebepalingPaneel.tsx) — .first() volstaat, spec vraagt alleen om
  // zichtbaarheid, niet om uniciteit.
  const pdfKnop = page.getByRole('button', { name: /waardebepaling-pdf/i }).first()
  await expect(pdfKnop).toBeVisible()

  const res = await request.get(`/api/pdf/waardebepaling?object_id=${dossier!.id}`)
  expect(res.ok(), `GET /api/pdf/waardebepaling gaf ${res.status()}`).toBeTruthy()
  expect(res.headers()['content-type']).toContain('application/pdf')
  const body = await res.body()
  expect(body.length).toBeGreaterThan(0)

  expect(paginaFouten, `pageerror op het dossier: ${paginaFouten.join(' | ')}`).toHaveLength(0)
})
