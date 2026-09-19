/**
 * E2e smoke test — kritieke user flow op productie of localhost
 *
 * Uitvoeren (lokaal):
 *   npx playwright install chromium
 *   npm run e2e
 *
 * Uitvoeren op productie:
 *   PLAYWRIGHT_BASE_URL=https://vestaai.nl npm run e2e
 *   PLAYWRIGHT_BASE_URL=https://vestaai.vercel.app npm run e2e  (preview)
 *
 * Ingelogde tests (dashboard + generatie) vereisen een testaccount:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_EMAIL   (zie e2e/auth.setup.ts)
 * De echte generatie-flow kost Claude-API-credits (~€0,08/run) en draait alleen met:
 *   E2E_GENERATE=1 npm run e2e
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ─── Publieke pagina's ────────────────────────────────────────────────────────

test('landingspagina laadt en toont CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/VestaAI/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI-assistent')
  // Gesloten platform sinds 15 sep 2026 (geen zelf-aanmelden): CTA's zijn
  // "Inloggen" en "Contact opnemen", geen "gratis starten"/prijzenpagina meer.
  await expect(page.getByRole('link', { name: /inloggen/i }).first()).toBeVisible()
})

test('loginpagina toont magic-link formulier', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
})

test('beschermd route /dashboard redirect naar login zonder sessie', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForURL(/\/login/, { timeout: 8000 })
  await expect(page.url()).toContain('/login')
})

test('beschermd route /object/new redirect naar login zonder sessie', async ({ page }) => {
  await page.goto('/object/new')
  await page.waitForURL(/\/login/, { timeout: 8000 })
  await expect(page.url()).toContain('/login')
})

// ─── Authenticated flow ───────────────────────────────────────────────────────

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

function hasAuth(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

test('authenticated: dashboard laadt de startpagina (masterplan fase 1.6)', async ({ browser }) => {
  test.skip(!hasAuth(), 'Geen auth state — stel E2E_TEST_EMAIL + Supabase-keys in om te activeren')
  const ctx = await browser.newContext({ storageState: AUTH_FILE })
  const page = await ctx.newPage()

  await page.goto('/dashboard')
  await expect(page.url()).not.toContain('/login')
  // Startpagina = StartBanner (begroeting) + kerncijfers. De snelkoppelingen
  // zijn er bij item 1.9c uit gehaald (besluit Quinn 17 sep 2026), dus daar
  // niet meer op toetsen — deze test verwachtte ze nog.
  await expect(page.getByText(/goede(morgen|middag|avond|nacht)/i).first()).toBeVisible()
  await expect(page.getByText(/lopende verkoopadviezen/i).first()).toBeVisible()
  await ctx.close()
})

test('authenticated: /woningen laadt de woningdossier-lijst', async ({ browser }) => {
  test.skip(!hasAuth(), 'Geen auth state — stel E2E_TEST_EMAIL + Supabase-keys in om te activeren')
  const ctx = await browser.newContext({ storageState: AUTH_FILE })
  const page = await ctx.newPage()

  await page.goto('/woningen')
  await expect(page.url()).not.toContain('/login')
  await expect(page.getByText(/object|woning|geen/i).first()).toBeVisible()
  await ctx.close()
})

// Echte generatie kost Claude-API-credits (~€0,08/run, sinds 16 sep 2026 x2 voor NL+EN)
// → alleen draaien met E2E_GENERATE=1.
const RUN_GENERATE = !!process.env.E2E_GENERATE
// Statuscodes waarop de client de "duurde te lang"-fout toont (Vercel 504 e.d.).
const TIMEOUT_CODES = [408, 502, 503, 504, 524]

// "Woning toevoegen" is sinds 16 sep 2026 een zesstappenwizard (adres, woning, staat &
// afwerking, ligging & buitenruimte, verhaal, commercieel) die het dossier direct in de
// Verkoopadvies-fase aanmaakt (interne waarde 'verkoopadvies' sinds item 2.1) en na succes
// doorstuurt naar /object/[id] — zie components/PropertyForm.tsx en
// app/(app)/object/new/NewObjectForm.tsx.
test('authenticated: volledige generatie-flow (verifieert time-out-fix)', async ({ browser }) => {
  test.skip(!hasAuth(), 'Geen auth state — stel E2E_TEST_EMAIL + Supabase-keys in om te activeren')
  test.skip(!RUN_GENERATE, 'Kostenbewaking: zet E2E_GENERATE=1 om de echte generatie te draaien')

  test.setTimeout(240_000)
  const ctx = await browser.newContext({ storageState: AUTH_FILE })
  const page = await ctx.newPage()

  await page.goto('/object/new')
  await expect(page.url()).not.toContain('/login')

  // Vul via de ingebouwde demo-knop: robuuster dan losse velden + de externe
  // BAG-autocomplete, en dekt de verplichte velden van stap 1-2 en 5 met geldige data.
  await page.getByRole('button', { name: /vul een voorbeeld in/i }).click()
  await expect(page.locator('input[aria-autocomplete="list"]')).toHaveValue(/.+/)

  // Stap 1 (adres) t/m 5 (verhaal) hebben alleen de demo-data nodig; stap 6
  // (commercieel) vraagt de prijsverwachting expliciet, die zit niet in elk
  // demo-scenario — vul 'm zekerheidshalve in zodra die stap in beeld komt.
  for (let stap = 1; stap <= 5; stap++) {
    await page.getByRole('button', { name: /^volgende/i }).click()
  }
  const prijsveld = page.getByLabel(/prijsverwachting verkoper/i)
  if (await prijsveld.count()) {
    const huidig = await prijsveld.inputValue()
    if (!huidig) await prijsveld.fill('595000')
  }

  // Vang de /api/generate-respons af om expliciet op een time-out (504) te asserten.
  const generateResponse = page.waitForResponse(
    r => r.url().includes('/api/generate') && r.request().method() === 'POST',
    { timeout: 220_000 },
  )
  const startedAt = Date.now()
  await page.getByRole('button', { name: /woning aanmaken/i }).click()

  const res = await generateResponse
  const seconds = Math.round((Date.now() - startedAt) / 1000)
  console.log(`[e2e] /api/generate → HTTP ${res.status()} in ${seconds}s`)

  // Kern van de verificatie: geen 504/afkap-status, en een echte 200.
  expect(TIMEOUT_CODES, `/api/generate gaf time-out-status ${res.status()} na ${seconds}s`).not.toContain(res.status())
  expect(res.status(), 'verwacht HTTP 200 van /api/generate').toBe(200)

  // Succesvolle aanmaak stuurt door naar het nieuwe dossier — fase Verkoopadvies.
  await page.waitForURL(/\/object\/[a-f0-9-]+$/, { timeout: 20_000 })
  await expect(page.getByText(/verkoopadvies/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/duurde te lang|mislukt/i)).toHaveCount(0)

  await ctx.close()
})
