/**
 * Padconstanten + aanwezigheidschecks voor de opgeslagen auth-states.
 *
 * Bewust een los, niet-test bestand (geen `@playwright/test`-import): de
 * `*.setup.ts`-bestanden en de spec-bestanden die de resulterende storageState
 * hergebruiken, delen dezelfde paden. Zou een spec-bestand in plaats daarvan
 * rechtstreeks uit `demo.setup.ts`/`admin.setup.ts` importeren, dan voert
 * Playwright de `setup(...)`-registratie van dat setup-bestand *opnieuw* uit
 * in de suite van dat spec-bestand (elk bestand dat `test`/`setup` op
 * moduleniveau aanroept registreert in de suite die het op dat moment
 * importeert) — met een losse, niet-test module hier voorkomen we dat.
 */
import path from 'path'
import fs from 'fs'

export const DEMO_AUTH_FILE = path.join(__dirname, '../.auth/demo.json')
export const ADMIN_AUTH_FILE = path.join(__dirname, '../.auth/admin.json')

function heeftCookies(bestand: string): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(bestand, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

export function heeftDemoAuth(): boolean {
  return heeftCookies(DEMO_AUTH_FILE)
}

export function heeftAdminAuth(): boolean {
  return heeftCookies(ADMIN_AUTH_FILE)
}
