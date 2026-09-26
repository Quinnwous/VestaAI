/**
 * E2e — item 12.2 spec 5: contentgeneratie. Kost echte Claude-API-credits
 * (NL+EN parallel, ~€0,08-0,16/run, ~3 min — zie CLAUDE.md "NL+EN duurt ~3 min
 * tegen een Vercel-limiet van 300 s") → standaard overgeslagen, alleen aan met
 * `E2E_GENERATE=1`. NIET zelf met die vlag draaien (zie opdracht).
 *
 * Gaat via de ontkoppelde architectuur (item 3.1): `POST /api/object` maakt
 * het dossier zonder Claude, `POST /api/generate { objectId }` genereert de
 * content apart. `e2e/smoke.spec.ts` heeft al een costlier UI-gedreven variant
 * (volledige wizard) — deze test dekt hetzelfde contract rechtstreeks op de
 * routes, en ruimt zijn eigen dossier op ongeacht de uitkomst.
 */
import { test, expect } from '@playwright/test'
import { heeftDemoAuth, DEMO_AUTH_FILE } from './lib/auth'
import { assertKantoorIsDemo, kantoorIdVoorSlug, serviceClient } from './lib/session'
import { propertyInputMetVerhaal } from './lib/fixtures'

const RUN_GENERATE = !!process.env.E2E_GENERATE

test.use({ storageState: DEMO_AUTH_FILE })

test('content genereren voor een nieuw dossier (E2E_GENERATE=1)', async ({ request }) => {
  test.skip(!heeftDemoAuth(), 'Geen demo-sessie — DEMO_PASSWORD ontbreekt')
  test.skip(!RUN_GENERATE, 'Kostenbewaking: zet E2E_GENERATE=1 om de echte generatie te draaien')
  test.setTimeout(240_000)

  const demoKantoorId = await kantoorIdVoorSlug('demo')
  let objectId: string | null = null

  try {
    const aanmaken = await request.post('/api/object', { data: propertyInputMetVerhaal() })
    expect(aanmaken.ok(), `POST /api/object gaf ${aanmaken.status()}`).toBeTruthy()
    objectId = ((await aanmaken.json()) as { id: string }).id

    const genereren = await request.post('/api/generate', { data: { objectId } })
    expect(genereren.ok(), `POST /api/generate gaf ${genereren.status()}: ${await genereren.text()}`).toBeTruthy()

    await expect
      .poll(
        async () => {
          const status = await request.get(`/api/object/${objectId}/status`)
          if (!status.ok()) return 'fout'
          const json = (await status.json()) as { content_status: string }
          return json.content_status
        },
        { timeout: 220_000, intervals: [3000] },
      )
      .toBe('klaar')
  } finally {
    if (objectId) {
      await assertKantoorIsDemo(demoKantoorId)
      const db = serviceClient()
      const { error } = await db.from('objecten').delete().eq('id', objectId).eq('kantoor_id', demoKantoorId)
      if (error) console.error(`[e2e] opruimen content-testdossier ${objectId} mislukt:`, error.message)
    }
  }
})
