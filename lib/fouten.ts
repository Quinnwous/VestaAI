/**
 * Foutlogging (roadmap 2.4): één plek die elke onverwachte fout als gestructureerde
 * JSON-regel naar `console.error` schrijft. Landt zo automatisch in de Vercel-
 * runtime-logs, die de orchestrator via de Vercel-MCP kan lezen om een fout te
 * reproduceren — zonder dat we een externe dienst (Sentry) nodig hebben.
 *
 * Gebruik: `meldFout('object/[id]/hergenereer', err, { objectId })` in een catch-blok.
 * Geeft een korte referentie terug die je desgewenst in de API-response kunt zetten
 * (`{ error: '...', ref }`) zodat een gebruiker die referentie kan doorgeven.
 *
 * Nooit geheimen of persoonsgegevens loggen: `extra` wordt recursief gefilterd op
 * gevoelige sleutelnamen (zie SLEUTELS_GEVOELIG) voordat er iets naar de log gaat.
 */

const SLEUTELS_GEVOELIG = [
  'password',
  'wachtwoord',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'email',
  'secret',
]

const WEGGELATEN = '[weggelaten]'
const MAX_STACK_LENGTE = 2000

function isGevoeligeSleutel(sleutel: string): boolean {
  const laag = sleutel.toLowerCase()
  return SLEUTELS_GEVOELIG.some(s => laag.includes(s))
}

/**
 * Filtert gevoelige sleutels recursief uit een willekeurige waarde, en is bestand tegen
 * cyclische objecten (die anders `JSON.stringify` laten crashen) door al geziene
 * objecten te vervangen door een marker in plaats van oneindig te herhalen.
 */
function filterGevoelig(waarde: unknown, gezien: WeakSet<object> = new WeakSet()): unknown {
  if (waarde === null || typeof waarde !== 'object') return waarde

  if (gezien.has(waarde as object)) return '[cyclisch]'
  gezien.add(waarde as object)

  if (Array.isArray(waarde)) {
    return waarde.map(item => filterGevoelig(item, gezien))
  }

  if (waarde instanceof Date) return waarde.toISOString()

  const resultaat: Record<string, unknown> = {}
  for (const [sleutel, subwaarde] of Object.entries(waarde as Record<string, unknown>)) {
    resultaat[sleutel] = isGevoeligeSleutel(sleutel) ? WEGGELATEN : filterGevoelig(subwaarde, gezien)
  }
  return resultaat
}

function kortReferentie(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Haalt een leesbare naam, bericht en (ingekorte) stack uit een willekeurige gevangen waarde. */
function ontleedFout(error: unknown): { naam: string; bericht: string; stack?: string } {
  if (error instanceof Error) {
    return {
      naam: error.name || 'Error',
      bericht: error.message || '(geen bericht)',
      stack: error.stack ? error.stack.slice(0, MAX_STACK_LENGTE) : undefined,
    }
  }
  if (typeof error === 'string') {
    return { naam: 'NietFoutObject', bericht: error }
  }
  if (error === null || error === undefined) {
    return { naam: 'NietFoutObject', bericht: String(error) }
  }
  // Object (of ander type) zonder message: probeer iets zinnigs te tonen zonder te crashen.
  try {
    const alsRecord = error as Record<string, unknown>
    const bericht = typeof alsRecord.message === 'string' ? alsRecord.message : JSON.stringify(filterGevoelig(error))
    return { naam: 'NietFoutObject', bericht: bericht || '(leeg object)' }
  } catch {
    return { naam: 'NietFoutObject', bericht: '(kon fout niet serialiseren)' }
  }
}

/**
 * Meldt een fout als één gestructureerde JSON-regel via `console.error`, zodat die
 * in de Vercel-runtime-logs terechtkomt en doorzoekbaar is op `context`/`digest`.
 *
 * @param context   Herkenbare plek, bv. de routenaam (`'object/[id]/hergenereer'`).
 * @param error     De gevangen waarde — hoeft geen `Error` te zijn.
 * @param extra     Optionele, niet-gevoelige context (bv. objectId). Wordt gefilterd.
 * @returns         Korte referentie (digest van Next, of een korte random id) om aan
 *                   de gebruiker of de response mee te geven.
 */
export function meldFout(context: string, error: unknown, extra?: Record<string, unknown>): string {
  const { naam, bericht, stack } = ontleedFout(error)
  const digest = typeof (error as { digest?: unknown })?.digest === 'string'
    ? (error as { digest: string }).digest
    : undefined
  const referentie = digest ?? kortReferentie()

  const regel = {
    niveau: 'fout' as const,
    context,
    bericht,
    naam,
    stack,
    digest,
    ref: referentie,
    extra: extra ? filterGevoelig(extra) : undefined,
    tijd: new Date().toISOString(),
  }

  try {
    console.error(JSON.stringify(regel))
  } catch {
    // Uiterst onwaarschijnlijk (filterGevoelig vangt cycli al af), maar loggen mag
    // zelf nooit de aanroepende route laten crashen.
    console.error(JSON.stringify({ niveau: 'fout', context, bericht: '(kon foutregel niet serialiseren)', ref: referentie, tijd: new Date().toISOString() }))
  }

  return referentie
}
