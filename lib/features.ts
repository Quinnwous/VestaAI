/**
 * Functie-vlag voor de contentsuite (woningteksten, brochures, virtual
 * staging, documenten) naast de nieuwe waarderingskoers van september 2026.
 *
 * Was vergrendeld op 15 sep, weer ontgrendeld op verzoek van Quinn (nog volop
 * aan het bouwen/testen). Zet `CONTENT_VERGRENDELD` op `true` om de hele
 * contentsuite in één keer weer op slot te zetten — dan verdwijnen de API's
 * achter een 403 en toont de UI (`ObjectWorkspace`, `object/new`) het
 * `InAanbouw`-slotpaneel in plaats van de echte formulieren.
 */
export const CONTENT_VERGRENDELD = false

export const CONTENT_SLOT_TEKST = {
  titel: 'Contentfuncties zijn tijdelijk gesloten',
  uitleg:
    'VestaAI richt zich op dit moment volledig op woningwaardering en marktanalyse. ' +
    'De woningteksten, brochures, virtual staging en documentenassistent blijven bewaard en komen later terug.',
} as const

/** Standaardantwoord voor API-routes die bij een vergrendelde functie horen. */
export function contentVergrendeldAntwoord(): Response {
  return new Response(
    JSON.stringify({ error: CONTENT_SLOT_TEKST.titel, reden: 'content_vergrendeld' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )
}
