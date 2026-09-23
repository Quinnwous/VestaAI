import type { CSSProperties } from 'react'

/**
 * Recharts-thema voor élke interactieve verkenner (item 6.1, docs/roadmap.md
 * § 3.7/3.8 — bindend): geen library-defaults. "Wij" = merkkleur met een
 * licht verloopvlak, "markt" = donker neutraal dun (context/referentielijn,
 * bewust geen categoriekleur), segment B = accentkleur. Nooit een dubbele
 * as. Kleuren lopen via `var(--merk*)` zodat elk kantoor zijn eigen palet
 * krijgt (zie CLAUDE.md § Bouwregel) — poort van `docs/ontwerp/kit.css`
 * `--serie-*`.
 */

export const SERIE = {
  wij: 'var(--merk)',
  markt: '#2C3238',
  b: 'var(--merk-accent)',
} as const

export type SerieKey = keyof typeof SERIE

/** Labels bij `SERIE`, voor legenda's en tooltips. */
export const SERIE_LABEL: Record<SerieKey, string> = {
  wij: 'Wij',
  markt: 'Markt',
  b: 'Segment B',
}

/** Lijndikte: "wij" en segment B iets dikker dan de neutrale marktlijn. */
export const LIJN_DIKTE: Record<SerieKey, number> = {
  wij: 2.5,
  markt: 1.5,
  b: 2,
}

/** Opacity van het verloopvlak onder de "wij"-lijn (enige reeks met een vlak). */
export const VLAK_OPACITY = 0.16

/** Rasterlijnen: dun en licht, nooit dominanter dan de data. */
export const RASTER_KLEUR = 'rgba(20,24,27,.06)'
export const AS_KLEUR = '#98A0A6'

/** Curve-type voor vloeiende lijnen (Catmull-Rom-achtig gevoel via recharts' monotone-variant). */
export const LIJN_CURVE = 'monotone' as const

/** Getal-tweens (StatTile) en popover/segment-animaties — zie docs/ontwerp/README.md § 1.8. */
export const TWEEN_MS = 400
export const EASE = 'cubic-bezier(.2,.8,.2,1)'

/**
 * Bouwt de recharts-tooltipinhoud-props consistent: frosted kaart, alle
 * reeksen + n. Component-niveau (JSX) hoort in de aanroepende ChartCard —
 * dit bestand blijft puur (geen React-afhankelijkheid), zie CLAUDE.md §
 * Conventies ("rekenlogica als pure functies").
 */
export const TOOLTIP_STYLE: CSSProperties = {
  background: 'rgba(255,255,255,.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(20,24,27,.07)',
  borderRadius: 12,
  boxShadow: '0 14px 44px -10px rgba(20,24,27,.24), 0 2px 8px rgba(20,24,27,.06)',
  padding: '10px 12px',
  fontSize: 12,
  minWidth: 200,
}
