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
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ─── Publieke pagina's ────────────────────────────────────────────────────────

test('landingspagina laadt en toont CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/VestaAI/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI-assistent')
  await expect(page.getByRole('link', { name: /gratis starten/i }).first()).toBeVisible()
})

test('prijzenpagina laadt', async ({ page }) => {
  await page.goto('/prijzen')
  await expect(page.getByText('Starter')).toBeVisible()
  await expect(page.getByText('Pro')).toBeVisible()
  await expect(page.getByText('Kantoor')).toBeVisible()
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

test('authenticated: dashboard laadt objectenlijst', async ({ browser }) => {
  if (!hasAuth()) {
    test.skip(true, 'Geen auth state — stel E2E_TEST_EMAIL + Supabase-keys in om te activeren')
  }
  const ctx = await browser.newContext({ storageState: AUTH_FILE })
  const page = await ctx.newPage()

  await page.goto('/dashboard')
  await expect(page.url()).not.toContain('/login')
  await expect(page.getByText(/object|woning|geen/i).first()).toBeVisible()
  await ctx.close()
})

test('authenticated: volledig generatie-flow', async ({ browser }) => {
  if (!hasAuth()) {
    test.skip(true, 'Geen auth state — stel E2E_TEST_EMAIL + Supabase-keys in om te activeren')
  }
  const ctx = await browser.newContext({ storageState: AUTH_FILE })
  const page = await ctx.newPage()

  // Open nieuw object formulier
  await page.goto('/object/new')
  await expect(page.url()).not.toContain('/login')

  // Vul het formulier in — wacht op de BAG-autocomplete
  await page.fill('input[name="adres"]', 'Herengracht 1, Amsterdam')
  await page.waitForTimeout(1200)
  // Klik eerste autocomplete-suggestie als die verschijnt
  const firstSuggestion = page.locator('[data-bag-suggestion]').first()
  if (await firstSuggestion.isVisible()) await firstSuggestion.click()

  await page.selectOption('select[name="woningtype"]', 'Appartement')
  await page.fill('input[name="kamers"]', '3')
  await page.fill('input[name="oppervlak_m2"]', '85')
  await page.fill('input[name="bouwjaar"]', '1920')
  await page.selectOption('select[name="energielabel"]', 'C')
  await page.fill('input[name="vraagprijs"]', '450000')
  await page.fill('textarea[name="usps"]', 'Hoge plafonds, renovatie 2022, rustige straat')
  await page.fill('input[name="doelgroep"]', 'Jonge stellen en expats')

  // Genereer
  await page.getByRole('button', { name: /genereer/i }).click()

  // Wacht op resultaten — max 120 seconden (generatie duurt ~60s)
  await page.waitForURL(/\/object\/[a-z0-9-]+$/, { timeout: 120000 })

  // Controleer tabbladen
  await expect(page.getByRole('tab', { name: /funda/i })).toBeVisible()
  await expect(page.getByText(/bezichtiging|contact/i).first()).toBeVisible()

  // PDF downloaden
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: /pdf/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)

  await ctx.close()
})
