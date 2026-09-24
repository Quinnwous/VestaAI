/**
 * Slug-logica voor de kantoorspecifieke inlogpagina (`/login/[slug]`, item 9.1).
 * Puur en deterministisch — geen I/O, zodat de vorm van een slug op precies
 * één plek staat (hier), gedeeld door de admin-invoer (validatie), de
 * databaseconstraint (zie `supabase/migrations/20260923_kantoren_slug.sql`,
 * met dezelfde regex — kan niet importeren, dus bewust gedupliceerd, hou ze
 * in sync) en de cookie-logica in `lib/loginSlugCookie.ts`.
 */

/** Lowercase, alleen a-z/0-9, één koppelteken tussen woorden — geen rand-/dubbele koppeltekens. */
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const SLUG_MIN_LENGTE = 2
export const SLUG_MAX_LENGTE = 60

/**
 * Normaliseert vrije tekst (kantoornaam, admin-invoer) naar een url-veilige slug:
 * diakrieten weg (é → e), lowercase, spaties/leestekens naar één koppelteken,
 * geen rand-koppeltekens. Geeft nooit een foutmelding — een leeg of onbruikbaar
 * resultaat is een lege string, `isGeldigeSlug` bepaalt de geldigheid.
 */
export function normaliseerSlug(waarde: string): string {
  return waarde
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Geldige, genormaliseerde slug? (Roep dit aan ná `normaliseerSlug`, of op al genormaliseerde invoer.) */
export function isGeldigeSlug(waarde: string): boolean {
  return (
    waarde.length >= SLUG_MIN_LENGTE &&
    waarde.length <= SLUG_MAX_LENGTE &&
    SLUG_REGEX.test(waarde)
  )
}
