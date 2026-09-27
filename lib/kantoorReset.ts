/**
 * Hulpfuncties voor de kantoor-reset (`app/api/auth/kantoor-reset/route.ts`,
 * item 9.2). Staan hier omdat een Next-routebestand alleen route-exports mag hebben.
 */

/**
 * Minimale duur van elk antwoord: anders verraadt de responstijd of er een
 * account bestaat (generateLink + mail versturen kost merkbaar meer tijd).
 */
export const MINIMALE_DUUR_MS = 1500

/** Alleen voor tests: de minimale duur uitzetten. */
let minimaleDuur = MINIMALE_DUUR_MS
export function _zetMinimaleDuurVoorTest(ms: number) {
  minimaleDuur = ms
}

/** `%` en `_` zijn jokertekens in `ilike`; een e-mailadres mag `_` bevatten. */
export function escapeIlike(waarde: string): string {
  return waarde.replace(/[\\%_]/g, (t) => `\\${t}`)
}

export async function wachtTot(start: number, minimaal = minimaleDuur) {
  const rest = minimaal - (Date.now() - start)
  if (rest > 0) await new Promise((r) => setTimeout(r, rest))
}
