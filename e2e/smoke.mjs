/**
 * Credential-free smoke test — verifies the public surface renders and the auth
 * form works, without needing secrets (safe for CI). Drives a real browser.
 *
 * Usage: BASE_URL=https://vesta-ai-plum.vercel.app node e2e/smoke.mjs
 *        (defaults to http://localhost:3000)
 *
 * Requires the `playwright` dependency + a chromium build
 * (`npx playwright install chromium`).
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
let failures = 0
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++ }

const browser = await chromium.launch()
const page = await browser.newPage()

try {
  // 1. Landing page renders with the product name
  const landing = await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  ok(landing?.status() === 200, `landing 200 (${landing?.status()})`)
  ok((await page.content()).includes('VestaAI'), 'landing contains "VestaAI"')

  // 2. Key public pages return 200. /prijzen and self-signup were removed 15 sep 2026 —
  // toegang is puur admin-beheerd, geen zelf-aanmelden of geprijsde publieke pagina meer.
  for (const path of ['/login', '/vertrouwen', '/privacy']) {
    const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    ok(r?.status() === 200, `${path} 200 (${r?.status()})`)
  }

  // 3. Login form: alleen inloggen + wachtwoord-reset, geen "Aanmelden"-tab meer.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  ok(await page.locator('input[type="email"]').count() > 0, 'login has email field')
  ok(await page.locator('input[type="password"]').count() > 0, 'login has password field')
  ok((await page.locator('text=Aanmelden').count()) === 0, 'login has no self-signup tab')
} catch (e) {
  console.log('✗ smoke run threw:', e.message)
  failures++
} finally {
  await browser.close()
}

console.log(failures === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
