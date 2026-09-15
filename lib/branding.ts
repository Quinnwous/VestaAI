/**
 * Huisstijl-laag: de ingelogde omgeving neemt de kleuren en het logo van het
 * kantoor over, zodat elke makelaar zijn eigen platform ziet.
 *
 * Alles loopt via CSS-variabelen (`--merk-*`) die de (app)-layout op de
 * wrapper zet. Componenten verwijzen naar die variabelen, nooit naar een
 * hardgecodeerde merkkleur — anders werkt white-label alsnog niet.
 *
 * ⚠️ Niet de Tailwind `blue`-scale gebruiken voor merkkleuren: die is
 * projectbreed naar groen geremapt (zie tailwind.config.ts).
 */

/** VestaAI's eigen stijl — het vangnet als een kantoor nog niets heeft ingesteld. */
export const VESTA_MERK = {
  primair: '#1A6B45',
  accent: '#2A8A5C',
} as const

export type Branding = {
  naam: string
  logoUrl: string | null
  primair: string
  primairHover: string
  primairZacht: string
  primairRand: string
  accent: string
  opPrimair: string
  isEigenStijl: boolean
}

const HEX = /^#[0-9A-Fa-f]{6}$/

function naarRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function naarHex(r: number, g: number, b: number): string {
  const klem = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[klem(r), klem(g), klem(b)].map(n => n.toString(16).padStart(2, '0')).join('')}`
}

/** Donkerder maken voor hover-states. `factor` 0–1: 0.2 = 20% donkerder. */
export function donkerder(hex: string, factor: number): string {
  const [r, g, b] = naarRgb(hex)
  return naarHex(r * (1 - factor), g * (1 - factor), b * (1 - factor))
}

/** Naar wit toe mengen voor tints en zachte achtergronden. */
export function lichter(hex: string, factor: number): string {
  const [r, g, b] = naarRgb(hex)
  return naarHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor)
}

/**
 * Relatieve luminantie (WCAG). Bepaalt of tekst op de merkkleur zwart of wit moet
 * zijn — zonder dit wordt een licht kantoorlogo-geel onleesbaar met witte letters.
 */
function luminantie(hex: string): number {
  const kanaal = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const [r, g, b] = naarRgb(hex)
  return 0.2126 * kanaal(r) + 0.7152 * kanaal(g) + 0.0722 * kanaal(b)
}

/** Zwarte of witte tekst op deze achtergrond, afhankelijk van wat leesbaarder is. */
export function tekstOp(hex: string): string {
  return luminantie(hex) > 0.5 ? '#0E1A13' : '#FFFFFF'
}

function geldigeHex(waarde: unknown, fallback: string): string {
  return typeof waarde === 'string' && HEX.test(waarde) ? waarde : fallback
}

/**
 * Bouwt het merkpalet van een kantoor. Ontbreekt er iets, dan valt dat onderdeel
 * terug op de VestaAI-stijl — nooit op een half ingevuld palet.
 */
export function bouwBranding(kantoor: {
  name?: string | null
  logo_url?: string | null
  huisstijl_json?: Record<string, unknown> | null
} | null): Branding {
  const huisstijl = kantoor?.huisstijl_json ?? null
  const primair = geldigeHex(huisstijl?.primaire_kleur, VESTA_MERK.primair)
  const accent = geldigeHex(huisstijl?.accent_kleur, primair === VESTA_MERK.primair ? VESTA_MERK.accent : lichter(primair, 0.25))

  return {
    naam: kantoor?.name?.trim() || 'VestaAI',
    logoUrl: kantoor?.logo_url ?? null,
    primair,
    primairHover: donkerder(primair, 0.18),
    primairZacht: lichter(primair, 0.92),
    primairRand: lichter(primair, 0.72),
    accent,
    opPrimair: tekstOp(primair),
    isEigenStijl: primair !== VESTA_MERK.primair || !!kantoor?.logo_url,
  }
}

/** De CSS-variabelen die de (app)-layout op zijn wrapper zet. */
export function brandingCssVars(b: Branding): React.CSSProperties {
  return {
    '--merk': b.primair,
    '--merk-hover': b.primairHover,
    '--merk-zacht': b.primairZacht,
    '--merk-rand': b.primairRand,
    '--merk-accent': b.accent,
    '--merk-op': b.opPrimair,
  } as React.CSSProperties
}
