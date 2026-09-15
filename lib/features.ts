/**
 * Functie-vlaggen voor de koerswijziging van september 2026.
 *
 * VestaAI verschuift van content-generatie naar woningwaardering. De
 * content-functies (woningteksten, brochures, virtual staging, documenten)
 * blijven in de codebase staan maar zijn vergrendeld: ze zijn zichtbaar in de
 * navigatie met een slotje, en zowel de pagina's als de API's weigeren toegang.
 *
 * Zet `CONTENT_VERGRENDELD` op `false` om de hele contentsuite in één keer
 * terug aan te zetten. Er is bewust géén per-kantoor-uitzondering: dat besluit
 * (15 sep 2026) geldt ook voor pilotklant i4housing.
 */
export const CONTENT_VERGRENDELD = true

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
