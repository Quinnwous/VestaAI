/**
 * Eenvoudige, in-memory rate-limit voor het reset-mail-endpoint van de
 * kantoorlogin (item 9.2, `app/api/auth/kantoor-reset/route.ts`).
 *
 * Bewust géén nieuwe tabel voor iets dat ook prima in het geheugen van één
 * serverless-instance kan — de opdracht was expliciet "geen migratie zonder
 * noodzaak". Dit is dus geen waterdichte, over-instances-gedeelde limiet
 * (een Vercel-functie kan koud starten en de teller resetten), maar wél een
 * nuttige rem tegen een script dat er snel achter elkaar op los beukt binnen
 * dezelfde warme instance. Puur en met een injecteerbare klok, zodat dit
 * zonder `vi.useFakeTimers()`-gedoe te testen is.
 */

type Bucket = { aantal: number; resetOp: number }

const VENSTER_MS = 10 * 60 * 1000 // 10 minuten
const MAX_POGINGEN = 5

const emmers = new Map<string, Bucket>()

/**
 * Mag deze sleutel (bv. `ip:e-mail`) nog een poging doen? Telt 'm meteen mee
 * als het antwoord ja is — de aanroeper hoeft niet apart te "verbruiken".
 */
export function magResetPoging(sleutel: string, nu: number = Date.now()): boolean {
  const emmer = emmers.get(sleutel)

  if (!emmer || emmer.resetOp <= nu) {
    emmers.set(sleutel, { aantal: 1, resetOp: nu + VENSTER_MS })
    return true
  }

  if (emmer.aantal >= MAX_POGINGEN) return false

  emmer.aantal += 1
  return true
}

/** Bouwt de sleutel uit IP + e-mail (lowercase) — nooit alleen IP of alleen e-mail. */
export function bouwRateLimitSleutel(ip: string, email: string): string {
  return `${ip}:${email.trim().toLowerCase()}`
}

/** Alleen voor tests — maakt de module tussen tests weer schoon. */
export function _resetAlleEmmersVoorTest(): void {
  emmers.clear()
}
