/**
 * Tellertekst voor `components/StijlLerenPaneel.tsx` (item 10.6, docs/roadmap.md
 * § fase 10): enkelvoud/meervoud correct, en bij nul een neutrale mededeling
 * i.p.v. een opdringerige melding — de aanroeper bepaalt zelf of daar nog een
 * kader/CTA omheen komt. Pure functie, los te testen.
 */
export function bewerkingenLabel(aantal: number): string {
  if (aantal === 1) return '1 bewerking wacht op je oordeel'
  return `${aantal} bewerkingen wachten op je oordeel`
}
