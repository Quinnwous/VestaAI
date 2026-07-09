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

  // 2. Key public pages return 200
  for (const path of ['/login', '/prijzen', '/vertrouwen', '/privacy']) {
    const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    ok(r?.status() === 200, `${path} 200 (${r?.status()})`)
  }

  // 3. Login form: email + password inputs present, and the register tab switches the CTA
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  ok(await page.locator('input[type="email"]').count() > 0, 'login has email field')
  ok(await page.locator('input[type="password"]').count() > 0, 'login has password field')
  const aanmeld = page.getByText('Aanmelden', { exact: true }).first()
  if (await aanmeld.count()) {
    await aanmeld.click().catch(() => {})
    await page.waitForTimeout(400)
    const cta = (await page.locator('button[type="submit"]').first().textContent().catch(() => '')) || ''
    ok(/aanmaken|account/i.test(cta), `register tab shows account-create CTA ("${cta.trim()}")`)
  }

  // 4. A public object-chat page for a non-existent id degrades gracefully (no 500)
  const chat = await page.goto(`${BASE}/chat/00000000-0000-0000-0000-000000000000`, { waitUntil: 'domcontentloaded' })
  ok(chat && chat.status() < 500, `public chat page non-500 (${chat?.status()})`)
} catch (e) {
  console.log('✗ smoke run threw:', e.message)
  failures++
} finally {
  await browser.close()
}

console.log(failures === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
