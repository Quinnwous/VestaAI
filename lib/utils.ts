export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents)
}

export function formatM2(value: number): string {
  return `${value.toLocaleString('nl-NL')} m²`
}

export function relatieveDatum(iso: string): string {
  const nu = Date.now()
  const dan = new Date(iso).getTime()
  const diff = Math.floor((nu - dan) / 1000)

  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)} minuten geleden`
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`

  const dagen = Math.floor(diff / 86400)
  if (dagen === 1) return 'gisteren'
  if (dagen < 7) return `${dagen} dagen geleden`
  if (dagen < 14) return 'vorige week'
  if (dagen < 30) return `${Math.floor(dagen / 7)} weken geleden`

  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Aantal kalenderdagen (middernacht-grenzen in de lokale tijdzone, niet
 * afgeronde 24-uursblokken) sinds `faseSinds`. `nu` is verplicht (geen
 * default `new Date()`): item 10.2 (docs/roadmap.md § Fase 10) rekent dit
 * altijd server-side uit en geeft het getal door als prop — nooit
 * `new Date()` in een client component (hydratiemismatch, zie CLAUDE.md).
 * Nooit negatief (een fase-overgang "net" gezet kan door kloktijd-afronding
 * anders -0 dagen geven).
 */
export function dagenInFaseAantal(faseSinds: string, nu: Date): number {
  const middernacht = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.max(0, Math.round((middernacht(nu) - middernacht(new Date(faseSinds))) / 86400_000))
}

/**
 * "X dagen in <fase>" voor de fasestepper in DossierHeader.tsx (item 3.4,
 * docs/roadmap.md § Fase 3).
 */
export function dagenInFase(faseSinds: string, nu: Date = new Date()): string {
  const dagen = dagenInFaseAantal(faseSinds, nu)
  if (dagen <= 0) return 'vandaag'
  if (dagen === 1) return '1 dag'
  return `${dagen} dagen`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Gemiddelde, afgerond op `decimalen` (default 2) — `null` bij een lege set i.p.v. NaN. */
export function gemiddelde(waarden: number[], decimalen = 2): number | null {
  if (waarden.length === 0) return null
  const factor = 10 ** decimalen
  return Math.round((waarden.reduce((s, v) => s + v, 0) / waarden.length) * factor) / factor
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
