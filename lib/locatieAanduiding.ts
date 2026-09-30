/**
 * Tekstuele aanduiding bij een benaderde geocodering (item k2,
 * docs/archief/specs/k2-opruimen-benaderd.md). `lib/geocodering.ts` markeert een
 * transactie als `geocode_status = 'benaderd'` wanneer PDOK geen exacte
 * match op postcode + huisnummer vond, alleen straat + plaats — het
 * coördinaat (en dus de minikaart-pin) staat dan op straatniveau, niet op
 * het exacte pand. Statistische/locatie-claims nooit schijnzeker tonen
 * (CLAUDE.md § Conventies): dat verschil laten we zien, niet verzwijgen.
 *
 * `'exact'`, `'mislukt'` en `null`/`undefined` leveren geen aanduiding op:
 * bij `'exact'` is er niets te melden, en bij `'mislukt'` ontbreekt het
 * coördinaat sowieso al (de minikaart toont dan zelf "Locatie onbekend",
 * zie `components/kaart/TransactieMinikaart.tsx`).
 */
export function locatieAanduiding(status: string | null | undefined): string | null {
  if (status !== 'benaderd') return null
  return 'Locatie benaderd — op straatniveau, niet het exacte adres'
}
