/**
 * E2e — de Radix-primitives uit item 6.0 doen wat handwerk niet deed.
 *
 * Waarom dit een e2e-test is en geen unit-test: focus-trap, scroll-lock,
 * Escape en focus-herstel bestaan alleen in een echte browser met een echte
 * focusvolgorde. Juist dát is de reden dat de drawer van 4.4 is overgezet op
 * `Sheet` — de handgemaakte versie had wél `aria-modal`, maar geen focus-trap
 * en liet de achtergrond zichtbaar voor schermlezers.
 *
 * Fase 6.1-6.3 leunen op deze primitives; breekt dit, dan breken die mee.
 *
 * Uitvoeren: npm run e2e  (vereist E2E_TEST_EMAIL + Supabase-keys, zie auth.setup.ts)
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

function hasAuth(): boolean {
  try {
    return fs.existsSync(AUTH_FILE) && fs.statSync(AUTH_FILE).size > 0
  } catch {
    return false
  }
}

/**
 * Een dossier in fase Verkoopadvies: daar staat het waarderingspaneel direct in
 * beeld. In "In verkoop" zit het achter een tab en ziet de test de knop niet.
 */
async function dossierMetWaardering(): Promise<string | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const email = process.env.E2E_TEST_EMAIL ?? 'demo@vestaai.nl'
  if (!url || !key) return null

  const db = createClient(url, key)
  const { data: makelaar } = await db.from('makelaars').select('kantoor_id').eq('email', email).single()
  if (!makelaar) return null

  const { data: objecten } = await db
    .from('objecten')
    .select('id, fase, waardering_json')
    .eq('kantoor_id', makelaar.kantoor_id)
    .limit(50)

  const treffer = (objecten ?? []).find(
    (o: { fase: string; waardering_json: { uitkomst?: unknown } | null }) =>
      o.waardering_json?.uitkomst && o.fase === 'verkoopadvies',
  )
  return treffer?.id ?? null
}

test('Sheet: focus-trap, scroll-lock, Escape en focus-herstel (item 6.0)', async ({ browser }) => {
  test.skip(!hasAuth(), 'Geen auth state — stel E2E_TEST_EMAIL + Supabase-keys in om te activeren')

  const objectId = await dossierMetWaardering()
  test.skip(!objectId, 'Geen dossier in Verkoopadvies met een berekende waardering')

  const ctx = await browser.newContext({ storageState: AUTH_FILE, viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(`/object/${objectId}`)

  const knop = page.getByRole('button', { name: 'Referentie toevoegen' }).first()
  await knop.waitFor({ state: 'visible', timeout: 60000 })
  await knop.click()

  const dialoog = page.getByRole('dialog')
  await expect(dialoog).toBeVisible()

  // Radix koppelt de titel/omschrijving i.p.v. `aria-modal` te zetten, en verbergt
  // de rest van de pagina met aria-hidden — beter ondersteund door schermlezers.
  await expect(dialoog).toHaveAttribute('aria-labelledby', /.+/)
  const verborgenBuiten = await page.evaluate(
    () => [...document.body.children].filter((el) => el.getAttribute('aria-hidden') === 'true').length,
  )
  expect(verborgenBuiten).toBeGreaterThan(0)

  // Focus-trap: de focus moet ín de dialoog liggen zodra hij opent.
  expect(
    await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]')
      return !!d && d.contains(document.activeElement)
    }),
  ).toBe(true)

  // Achtergrond mag niet meescrollen.
  expect(
    await page.evaluate(
      () => getComputedStyle(document.body).overflow === 'hidden' || document.body.hasAttribute('data-scroll-locked'),
    ),
  ).toBe(true)

  // De functionaliteit van 4.4 moet intact zijn.
  await page.getByLabel('Zoek op adres').fill('a')

  await page.keyboard.press('Escape')
  await expect(dialoog).toBeHidden()

  // Focus-herstel naar de knop die de Sheet opende.
  expect(
    await page.evaluate(() => document.activeElement?.textContent?.includes('Referentie toevoegen') ?? false),
  ).toBe(true)

  await ctx.close()
})
