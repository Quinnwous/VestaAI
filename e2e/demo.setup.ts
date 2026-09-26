/**
 * Setup-project: logt in als het demo-kantoor (demo@vestaai.nl) via een échte
 * formulier-login (niet de sessiecookie-omweg) — dat wachtwoord staat als
 * env `DEMO_PASSWORD` (zie scripts/seed-demo-kantoor.mjs en
 * lib/transactiesQuery.rpc.test.ts, dezelfde variabele). Dit dekt meteen een
 * stuk van item 12.2-spec 1 ("inloggen via het formulier") en levert de
 * storageState die dossier-, waarderings- en kaart-tests hergebruiken.
 *
 * Ontbreekt DEMO_PASSWORD, dan slaat dit setup-project een lege auth state op
 * — downstream tests herkennen dat via `heeftDemoAuth()` (e2e/lib/auth.ts) en
 * slaan zichzelf dan over (zelfde patroon als e2e/auth.setup.ts + hasAuth()
 * in e2e/smoke.spec.ts).
 */
import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { DEMO_AUTH_FILE } from './lib/auth'

const DEMO_EMAIL = 'demo@vestaai.nl'

setup('demo-login', async ({ page }) => {
  const password = process.env.DEMO_PASSWORD

  if (!password) {
    console.warn('[e2e] DEMO_PASSWORD ontbreekt — demo-afhankelijke tests worden overgeslagen.')
    fs.mkdirSync(path.dirname(DEMO_AUTH_FILE), { recursive: true })
    fs.writeFileSync(DEMO_AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(DEMO_EMAIL)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /^inloggen/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })

  fs.mkdirSync(path.dirname(DEMO_AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: DEMO_AUTH_FILE })
})
