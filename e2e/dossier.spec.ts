/**
 * E2e — item 12.2 spec 2: dossier aanmaken in het demo-kantoor, < 5 s van
 * `POST /api/object` tot een geladen dossierpagina. Gaat via de route direct
 * (niet de zesstappen-wizard) — sneller en deterministischer, en dekt exact
 * de belofte uit `app/api/object/route.ts` ("Antwoord { id } in < 5 s").
 *
 * Ruimt zichzelf op: alleen het ene dossier dat deze test zelf aanmaakt, pas
 * ná een expliciete `assertKantoorIsDemo()`-check (CLAUDE.md § Vangrails
 * productiedatabase — nooit iets buiten het demo-kantoor raken).
 */
import { test, expect } from '@playwright/test'
import { heeftDemoAuth, DEMO_AUTH_FILE } from './lib/auth'
import { assertKantoorIsDemo, kantoorIdVoorSlug, serviceClient } from './lib/session'
import { minimalePropertyInput } from './lib/fixtures'

test.use({ storageState: DEMO_AUTH_FILE })

test('dossier aanmaken en laden binnen 5 s (demo-kantoor)', async ({ page, request }) => {
  test.skip(!heeftDemoAuth(), 'Geen demo-sessie — DEMO_PASSWORD ontbreekt')

  const demoKantoorId = await kantoorIdVoorSlug('demo')
  let objectId: string | null = null
  let opwarmId: string | null = null

  // Eenmalige, ongemeten opwarming van de `/object/[id]`-route mét een écht
  // bestaand dossier: in `next dev` compileert een dynamische route pas bij
  // de eerste hit (kan een paar seconden kosten, en een dossierpagina laadt
  // zelf ook nog client components — kaart, waarderingspaneel — die pas
  // module-compileren zodra er écht data is, dus een 404-hit warmt die niet
  // voor). Dit is een dev-servereigenaardigheid, geen onderdeel van de
  // "< 5s"-belofte uit app/api/object/route.ts (die gaat over de
  // productie-runtime, waar niets meer hoeft te compileren).
  try {
    const opwarmInvoer = minimalePropertyInput()
    const opwarmRes = await request.post('/api/object', { data: opwarmInvoer })
    if (opwarmRes.ok()) {
      opwarmId = ((await opwarmRes.json()) as { id: string }).id
      await page.goto(`/object/${opwarmId}`)
      await expect(page.getByText(/verkoopadvies/i).first()).toBeVisible()
    }
  } finally {
    if (opwarmId) {
      await assertKantoorIsDemo(demoKantoorId)
      await serviceClient().from('objecten').delete().eq('id', opwarmId).eq('kantoor_id', demoKantoorId)
    }
  }

  const start = Date.now()

  try {
    const invoer = minimalePropertyInput()
    const res = await request.post('/api/object', { data: invoer })
    expect(res.ok(), `POST /api/object gaf ${res.status()}: ${await res.text()}`).toBeTruthy()
    const json = (await res.json()) as { id: string }
    objectId = json.id
    expect(objectId).toBeTruthy()

    const paginaFouten: string[] = []
    page.on('pageerror', e => paginaFouten.push(e.message))

    await page.goto(`/object/${objectId}`)
    // Geen waitForLoadState('networkidle') hier: het dossier haalt op de
    // achtergrond o.a. buurtverrijking op (lib/verrijking.ts) via externe
    // bronnen die zelf al bekend onbetrouwbaar/traag zijn (CLAUDE.md § les
    // 24 sep) — dat mag de "< 5s"-meting van dít item niet laten timeouten.
    // De zichtbare fase-badge is het eigenlijke "geladen"-signaal.
    await expect(page.getByText(/verkoopadvies/i).first()).toBeVisible()

    const elapsed = Date.now() - start
    expect(elapsed, `dossier aanmaken + laden duurde ${elapsed}ms (limiet 5000ms)`).toBeLessThan(5000)
    expect(paginaFouten, `pageerror op het nieuwe dossier: ${paginaFouten.join(' | ')}`).toHaveLength(0)
  } finally {
    if (objectId) {
      // Vangrail: nooit verwijderen zonder eerst te bevestigen dat dit
      // écht het demo-kantoor is (CLAUDE.md § Vangrails productiedatabase).
      await assertKantoorIsDemo(demoKantoorId)
      const db = serviceClient()
      const { error } = await db
        .from('objecten')
        .delete()
        .eq('id', objectId)
        .eq('kantoor_id', demoKantoorId)
      if (error) console.error(`[e2e] opruimen dossier ${objectId} mislukt:`, error.message)
    }
  }
})
