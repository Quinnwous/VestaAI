/**
 * E2e — item 12.2 spec 6: `/admin/transacties` toont de importhistorie
 * (tabel met kantoor + totaal + eigen-verkoop-aantallen) voor de platform-
 * admin. Alleen lezen — vult/verstuurt het importformulier niet.
 *
 * ⚠️ Ingelogd als `quinn.berkouwer@gmail.com` (het vaste e-mailadres uit
 * `lib/admin.ts`), niet `quinn.berkouwer@icloud.com` zoals de opdracht/
 * CLAUDE.md noemt — zie e2e/admin.setup.ts en het eindrapport voor de
 * toedracht (`PLATFORM_ADMIN_EMAILS` staat niet in `.env.local`).
 */
import { test, expect } from '@playwright/test'
import { heeftAdminAuth, ADMIN_AUTH_FILE } from './lib/auth'

test.use({ storageState: ADMIN_AUTH_FILE })

test('platform-admin ziet de transactie-importhistorie', async ({ page }) => {
  test.skip(!heeftAdminAuth(), 'Geen admin-sessie — Supabase service-role ontbreekt')

  const paginaFouten: string[] = []
  page.on('pageerror', e => paginaFouten.push(e.message))

  await page.goto('/admin/transacties')
  expect(page.url()).not.toContain('/dashboard')
  expect(page.url()).not.toContain('/login')

  await expect(page.getByRole('heading', { name: /transacties importeren/i })).toBeVisible()

  // De importhistorie-tabel: minimaal de twee bekende kantoren met een telling.
  const tabel = page.locator('table').first()
  await expect(tabel).toBeVisible()
  await expect(tabel.getByText('Demo Makelaardij')).toBeVisible()
  await expect(tabel.getByText('i4 Housing')).toBeVisible()

  await page.waitForLoadState('networkidle')
  expect(paginaFouten, `pageerror op /admin/transacties: ${paginaFouten.join(' | ')}`).toHaveLength(0)
})
