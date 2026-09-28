import type { KantoorInstellingen } from './schemas'

/**
 * De velden van `kantoren.instellingen_json` die het admin-formulier
 * (`app/admin/kantoor/InstellingenForm.tsx`) beheert. Alles daarbuiten —
 * bv. `demo` (lib/demoFixtureGuard.ts) — zet een script, en mag bij het
 * opslaan van het formulier nooit verdwijnen.
 */
const FORMULIERVELDEN = ['courtage', 'profiel', 'werkgebied', 'kantoor_aliassen'] as const

/**
 * Voegt de formulierwaarden samen met wat er al opgeslagen staat: velden
 * die het formulier beheert worden overschreven (of verwijderd als het
 * formulier ze leeg laat), alle andere velden blijven ongemoeid. Zonder deze
 * samenvoeging wiste elke opslag `instellingen_json.demo`.
 */
export function voegInstellingenSamen(
  bestaand: Record<string, unknown> | null | undefined,
  formulier: KantoorInstellingen,
): Record<string, unknown> {
  const samen: Record<string, unknown> = { ...(bestaand ?? {}) }
  for (const veld of FORMULIERVELDEN) {
    const waarde = formulier[veld]
    if (waarde === undefined) delete samen[veld]
    else samen[veld] = waarde
  }
  return samen
}
