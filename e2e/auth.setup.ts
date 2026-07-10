/**
 * Auth setup: maakt een Supabase-sessie aan via de admin API en slaat die op
 * als browser-state zodat authenticated tests die hergebruiken.
 *
 * Vereiste env vars (zet in .env.local of als omgevingsvariabele):
 *   SUPABASE_URL               — bijv. https://uvpcjpejocjmlxxyhqyz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key (geheim, nooit committen)
 *   E2E_TEST_EMAIL             — email van de testgebruiker (bijv. test@vestaai.nl)
 *
 * De testgebruiker moet al bestaan in Supabase Auth. Aanmaken:
 *   supabase auth user create --email test@vestaai.nl --project-ref uvpcjpejocjmlxxyhqyz
 */

import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

export const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const email = process.env.E2E_TEST_EMAIL

  if (!supabaseUrl || !serviceKey || !email) {
    console.warn(
      '[e2e] SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY of E2E_TEST_EMAIL ontbreekt — authenticated tests worden overgeslagen.',
    )
    // Sla een lege auth state op zodat andere tests niet crashen
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  // Genereer een magic link via de Supabase Admin API
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      email_confirm: true,
    }),
  })

  // Gebruiker bestaat al → genereer magic link direct
  const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  })

  if (!linkRes.ok) {
    throw new Error(`Magic link genereren mislukt: ${await linkRes.text()}`)
  }

  const { action_link } = (await linkRes.json()) as { action_link: string }

  // Bezoek de magic link — Supabase redirect naar de app + zet een cookie
  await page.goto(action_link)
  await page.waitForURL(/\/(dashboard|object)/, { timeout: 15000 })

  // Sla de auth state (cookies + localStorage) op
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
