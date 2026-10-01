/**
 * Soort fout van een Gemini-aanroep (virtual staging, `app/api/fotos/staging`),
 * zodat de makelaar een melding krijgt die klopt. Vóór 1 okt 2026 testte de
 * route de foutmelding op /429|quota|rate/ — en "rate" staat in elke Gemini-
 * URL (`:generateContent`), dus élke fout heette "even druk, probeer het over
 * een minuut opnieuw", ook een project dat Google helemaal weigert (403).
 *
 * - `limiet`: echt te veel aanvragen (429 / RESOURCE_EXHAUSTED) — later opnieuw kan helpen;
 * - `geweigerd`: sleutel of project geweigerd (401/403) — opnieuw proberen helpt nooit;
 * - `overig`: al het andere.
 */
export type GeminiFoutSoort = 'limiet' | 'geweigerd' | 'overig'

export function soortGeminiFout(err: unknown): GeminiFoutSoort {
  const status = typeof err === 'object' && err !== null && 'status' in err
    ? Number((err as { status?: unknown }).status)
    : NaN
  const bericht = err instanceof Error ? err.message : String(err ?? '')

  if (status === 429 || /\[429\b|RESOURCE_EXHAUSTED|\bquota\b/i.test(bericht)) return 'limiet'
  if (status === 401 || status === 403 || /\[40[13]\b|PERMISSION_DENIED|API key not valid/i.test(bericht)) return 'geweigerd'
  return 'overig'
}
