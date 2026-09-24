/**
 * Cookie-logica voor "laatst gebruikte kantoor-slug" (item 9.1): na een
 * geslaagde login (via `/login/[slug]`, of via de generieke `/login` als het
 * eigen kantoor een slug heeft) onthouden we die slug, zodat je na uitloggen
 * automatisch weer op je eigen inlogpagina landt (`app/api/auth/logout/route.ts`).
 *
 * Puur en zonder DOM/`document`-afhankelijkheid, zodat dit met vitest te
 * testen is — de aanroeper (`components/InlogFormulier.tsx`) zet de string
 * zelf op `document.cookie`, en de logout-route leest 'm via
 * `request.cookies.get(...)`.
 */
import { normaliseerSlug, isGeldigeSlug } from './slug'

export const LOGIN_SLUG_COOKIE = 'vesta_login_slug'

const MAX_AGE_SECONDEN = 60 * 60 * 24 * 365 // 1 jaar

/** `document.cookie`-string die de laatst gebruikte kantoor-slug onthoudt. */
export function bouwLoginSlugCookie(slug: string): string {
  return `${LOGIN_SLUG_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${MAX_AGE_SECONDEN}; samesite=lax`
}

/** `document.cookie`-string die de cookie meteen laat verlopen. */
export function wisLoginSlugCookie(): string {
  return `${LOGIN_SLUG_COOKIE}=; path=/; max-age=0; samesite=lax`
}

/**
 * Zet een rauwe cookiewaarde om in een veilig inlogpad. Valideert en
 * normaliseert eerst (open-redirect-vangrail: een gemanipuleerde of
 * verouderde cookiewaarde mag nooit ergens anders dan een `/login`-variant
 * naartoe wijzen) — bij twijfel valt dit terug op `fallback`.
 */
export function loginPadUitCookieWaarde(
  waarde: string | undefined | null,
  fallback: string = '/login',
): string {
  if (!waarde) return fallback
  let decoded: string
  try {
    decoded = decodeURIComponent(waarde)
  } catch {
    return fallback
  }
  const slug = normaliseerSlug(decoded)
  return isGeldigeSlug(slug) ? `/login/${slug}` : fallback
}
