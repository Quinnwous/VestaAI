/**
 * E2e — item 12.2 spec 1: kantoorlogin (`/login/[slug]`, item 9.1).
 *
 * Twee dingen per kantoor: de pagina toont de kantoorbranding (ongeauthenticeerd
 * — middleware.ts stuurt een ingelogde gebruiker meteen door naar /dashboard,
 * dus branding is alleen zo te controleren), en inloggen komt op /dashboard uit.
 *
 * - demo: we kennen het wachtwoord (env DEMO_PASSWORD) → echte formulier-login.
 * - i4housing: geen testwachtwoord bekend → sessiecookie-aanpak (zelfde patroon
 *   als e2e/auth.setup.ts/scripts/lib/dodSessie.mjs): een sessie zetten en
 *   bevestigen dat die op /dashboard landt, zonder het formulier zelf in te
 *   vullen. De brandingcontrole hierboven dekt "/login/i4housing toont
 *   kantoorbranding" apart.
 */
import { test, expect } from '@playwright/test'
import { heeftE2eOmgeving, sessieVoorEmail, authCookieNaam, authCookieWaarde } from './lib/session'

test.describe('kantoorbranding op /login/[slug]', () => {
  test('/login/demo toont de branding van Demo Makelaardij', async ({ page }) => {
    await page.goto('/login/demo')
    await expect(page).toHaveTitle(/inloggen.*demo makelaardij/i)
    // Kantoorlogin is informeel ("je"), de generieke /login formeel ("u") —
    // dit onderscheidt 'm meteen van een stille terugval op /login.
    await expect(page.getByText('Log in op je omgeving.')).toBeVisible()
  })

  test('/login/i4housing toont de branding van i4 Housing', async ({ page }) => {
    await page.goto('/login/i4housing')
    await expect(page).toHaveTitle(/inloggen.*i4 housing/i)
    await expect(page.getByText('Log in op je omgeving.')).toBeVisible()
  })

  test('onbekende slug valt terug op de generieke /login', async ({ page }) => {
    await page.goto('/login/does-not-exist-e2e')
    await page.waitForURL(/\/login$/)
    await expect(page.getByText('Woningwaardering voor makelaars.')).toBeVisible()
  })
})

test.describe('inloggen landt op /dashboard', () => {
  test('demo-kantoor: formulier-login met DEMO_PASSWORD', async ({ page }) => {
    test.skip(!process.env.DEMO_PASSWORD, 'DEMO_PASSWORD ontbreekt in de omgeving')

    await page.goto('/login/demo')
    await page.locator('input[type="email"]').fill('demo@vestaai.nl')
    await page.locator('input[type="password"]').fill(process.env.DEMO_PASSWORD!)
    await page.getByRole('button', { name: /^inloggen/i }).click()

    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    expect(page.url()).not.toContain('/login')

    const paginaFouten: string[] = []
    page.on('pageerror', e => paginaFouten.push(e.message))
    await page.waitForLoadState('networkidle')
    expect(paginaFouten, `pageerror op /dashboard: ${paginaFouten.join(' | ')}`).toHaveLength(0)
  })

  test('i4housing: sessiecookie-aanpak (geen testwachtwoord bekend)', async ({ browser }) => {
    test.skip(!heeftE2eOmgeving(), 'Supabase service-role/anon-key ontbreekt in de omgeving')

    const sessie = await sessieVoorEmail('quinn.berkouwer@icloud.com')
    const ctx = await browser.newContext()
    const basis = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000')
    await ctx.addCookies([
      { name: authCookieNaam(), value: authCookieWaarde(sessie), domain: basis.hostname, path: '/' },
    ])
    const page = await ctx.newPage()
    const paginaFouten: string[] = []
    page.on('pageerror', e => paginaFouten.push(e.message))

    await page.goto('/dashboard')
    expect(page.url()).not.toContain('/login')
    await page.waitForLoadState('networkidle')
    expect(paginaFouten, `pageerror op /dashboard: ${paginaFouten.join(' | ')}`).toHaveLength(0)

    await ctx.close()
  })
})
