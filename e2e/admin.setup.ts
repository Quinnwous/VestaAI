/**
 * Setup-project: sessie voor de platform-admin, voor het admin-import-
 * historie-scherm (item 12.2, spec 6). Geen bekend testwachtwoord voor dit
 * account → sessiecookie-aanpak (zelfde patroon als e2e/auth.setup.ts en
 * scripts/lib/dodSessie.mjs).
 *
 * ⚠️ `lib/admin.ts` erkent lokaal alleen het vaste e-mailadres
 * `quinn.berkouwer@gmail.com` (env `PLATFORM_ADMIN_EMAILS` staat niet in
 * `.env.local` — dat is kennelijk alleen op Vercel gezet). De CLAUDE.md-tekst
 * "Quinn logt in als quinn.berkouwer@icloud.com (platform-admin)" klopt dus
 * niet met de lokale/`.env.local`-realiteit; zie het eindrapport van dit item.
 */
import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { heeftE2eOmgeving, sessieVoorEmail, authCookieNaam, authCookieWaarde } from './lib/session'
import { ADMIN_AUTH_FILE } from './lib/auth'

export const PLATFORM_ADMIN_EMAIL = 'quinn.berkouwer@gmail.com'

setup('admin-login', async ({ page }) => {
  if (!heeftE2eOmgeving()) {
    console.warn('[e2e] Supabase-env ontbreekt — admin-test wordt overgeslagen.')
    fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true })
    fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const sessie = await sessieVoorEmail(PLATFORM_ADMIN_EMAIL)
  const basis = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000')
  await page.context().addCookies([
    { name: authCookieNaam(), value: authCookieWaarde(sessie), domain: basis.hostname, path: '/' },
  ])

  fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: ADMIN_AUTH_FILE })
})
