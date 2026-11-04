import type { CSSProperties } from 'react'

/**
 * Isometrische 3D-woning in de merkkleuren van het kantoor (alles via
 * `var(--merk*)` + `color-mix`, dus een blauw kantoor krijgt een blauw huis).
 * Voor lege staten en beeldmomenten: zweeft rustig, de ramen gloeien zacht na
 * elkaar op en er staat een locatiepin boven (ring in de accentkleur, de
 * toegestane rode detailset uit docs/ontwerp/README.md § 1.2b). Puur
 * decoratief (`aria-hidden`); onder `prefers-reduced-motion` staat alles stil.
 * Server component — geen JavaScript nodig.
 */

const C30 = 0.866
type P = [number, number]

// Isometrische basis: F = voorste hoek op de grond, rechter-as (C30, -.5),
// linker-as (-C30, -.5). a/b = diepte/breedte, h = muurhoogte.
const F: P = [120, 158]
const A = 62
const B = 82
const H = 54
const NOK = 34

const op = (p: P, rechts: number, links: number, hoog: number): P => [
  p[0] + rechts * C30 - links * C30,
  p[1] - rechts * 0.5 - links * 0.5 - hoog,
]
const pts = (...ps: P[]) => ps.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

const L = op(F, 0, A, 0)
const R = op(F, B, 0, 0)
const Lb = op(F, 0, A, H)
const Fb = op(F, 0, 0, H)
const Rb = op(F, B, 0, H)
const Bb = op(F, B, A, H)
const nokStart = op(F, 0, A / 2, H + NOK)
const nokEind = op(F, B, A / 2, H + NOK)

/** Raam/deur op de rechtergevel: u = langs de gevel, v = hoogte. */
const rechtsVlak = (u: number, v: number, w: number, h: number) =>
  pts(op(F, u, 0, v), op(F, u + w, 0, v), op(F, u + w, 0, v + h), op(F, u, 0, v + h))
/** Raam op de linkergevel. */
const linksVlak = (s: number, v: number, w: number, h: number) =>
  pts(op(F, 0, s, v), op(F, 0, s + w, v), op(F, 0, s + w, v + h), op(F, 0, s, v + h))

// Grondvlak (tegel) rond de woning.
const MARGE = 18
const g1 = op(F, -MARGE, -MARGE, 0)
const g2 = op(F, B + MARGE, -MARGE, 0)
const g3 = op(F, B + MARGE, A + MARGE, 0)
const g4 = op(F, -MARGE, A + MARGE, 0)

// Schoorsteen op het voorste dakvlak: de onderkant volgt de dakhelling.
const dakHoogte = (l: number) => H + NOK * (l / (A / 2))
const T = H + NOK + 4
const schoorsteen = {
  voor: pts(op(F, 56, 8, dakHoogte(8)), op(F, 64, 8, dakHoogte(8)), op(F, 64, 8, T), op(F, 56, 8, T)),
  zij: pts(op(F, 56, 8, dakHoogte(8)), op(F, 56, 16, dakHoogte(16)), op(F, 56, 16, T), op(F, 56, 8, T)),
  top: pts(op(F, 56, 8, T), op(F, 64, 8, T), op(F, 64, 16, T), op(F, 56, 16, T)),
}

const PALET = {
  licht: {
    gevelLinks: 'color-mix(in srgb, var(--merk) 10%, #FFFFFF)',
    gevelRechts: 'color-mix(in srgb, var(--merk) 20%, #FFFFFF)',
    dakVoor: 'var(--merk)',
    dakAchter: 'var(--merk-diep)',
    schoorsteen: 'var(--merk-diep)',
    raam: 'color-mix(in srgb, var(--merk) 55%, #FFFFFF)',
    raamGloed: '#FFFFFF',
    deur: 'var(--merk-diep)',
    grond: 'color-mix(in srgb, var(--merk) 7%, #FFFFFF)',
    grondRand: 'color-mix(in srgb, var(--merk) 22%, #FFFFFF)',
    boom: 'color-mix(in srgb, var(--merk) 38%, #FFFFFF)',
    boomDonker: 'color-mix(in srgb, var(--merk) 52%, #FFFFFF)',
    stam: 'var(--merk-diep)',
    schaduw: 'rgba(20,24,27,.07)',
  },
  // Op een merkvlak (startbanner): witte gevels, donker dak.
  opMerk: {
    gevelLinks: 'rgba(255,255,255,.94)',
    gevelRechts: 'rgba(255,255,255,.80)',
    dakVoor: 'var(--merk-diep)',
    dakAchter: 'color-mix(in srgb, var(--merk-diep) 70%, #000000)',
    schoorsteen: 'color-mix(in srgb, var(--merk-diep) 80%, #000000)',
    raam: 'color-mix(in srgb, var(--merk) 70%, #FFFFFF)',
    raamGloed: '#FFF7DA',
    deur: 'var(--merk-diep)',
    grond: 'rgba(255,255,255,.10)',
    grondRand: 'rgba(255,255,255,.28)',
    boom: 'rgba(255,255,255,.30)',
    boomDonker: 'rgba(255,255,255,.22)',
    stam: 'rgba(255,255,255,.45)',
    schaduw: 'rgba(0,0,0,.10)',
  },
} as const

export function HuisIllustratie({
  breedte = 168,
  pin = true,
  variant = 'licht',
  style,
}: {
  /** `opMerk` voor gebruik op een merkverloop (witte gevels). */
  variant?: keyof typeof PALET
  breedte?: number
  /** Locatiepin boven het dak. */
  pin?: boolean
  style?: CSSProperties
}) {
  const kleur = PALET[variant]
  const ramenRechts: [number, number][] = [[8, 31], [33, 31], [58, 31], [8, 7], [58, 7]]
  const ramenLinks: [number, number][] = [[12, 31], [36, 31], [24, 7]]
  return (
    <svg
      aria-hidden="true"
      viewBox="0 -24 240 214"
      width={breedte}
      height={breedte * (214 / 240)}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      {/* Zachte schaduw op de grond (beweegt tegen de zweefbeweging in). */}
      <ellipse className="vui-zweef-schaduw" cx={F[0] + 10} cy={F[1] + 14} rx={78} ry={14} fill={kleur.schaduw} />

      <g className="vui-zweef">
        <polygon points={pts(g1, g2, g3, g4)} fill={kleur.grond} stroke={kleur.grondRand} strokeWidth={1} />

        {/* Boom achter links */}
        <rect x={L[0] - 10} y={L[1] - 34} width={3.4} height={26} rx={1.7} fill={kleur.stam} />
        <circle cx={L[0] - 8.5} cy={L[1] - 44} r={17} fill={kleur.boom} />
        <circle cx={L[0] - 3} cy={L[1] - 50} r={9} fill={kleur.boomDonker} opacity={0.5} />

        {/* Achterste dakvlak, gevels, voorste dakvlak — tekenvolgorde = diepte. */}
        <polygon points={pts(Lb, nokStart, nokEind, Bb)} fill={kleur.dakAchter} />

        <polygon points={pts(L, F, Fb, Lb)} fill={kleur.gevelLinks} />
        <polygon points={pts(Lb, Fb, nokStart)} fill={kleur.gevelLinks} />
        <polygon points={pts(F, R, Rb, Fb)} fill={kleur.gevelRechts} />

        {ramenLinks.map(([s, v], i) => (
          <g key={`l${i}`}>
            <polygon points={linksVlak(s, v, 14, 15)} fill={kleur.raam} />
            <polygon className="vui-raam-gloed" style={{ ['--d' as string]: `${i * 0.7 + 0.4}s` }} points={linksVlak(s + 2, v + 2, 10, 11)} fill={kleur.raamGloed} opacity={0.7} />
          </g>
        ))}
        {/* Raampje in de topgevel */}
        <polygon points={linksVlak(A / 2 - 5, H + 5, 10, 11)} fill={kleur.raam} />

        {ramenRechts.map(([u, v], i) => (
          <g key={`r${i}`}>
            <polygon points={rechtsVlak(u, v, 15, 15)} fill={kleur.raam} />
            <polygon className="vui-raam-gloed" style={{ ['--d' as string]: `${i * 0.9}s` }} points={rechtsVlak(u + 2, v + 2, 11, 11)} fill={kleur.raamGloed} opacity={0.7} />
          </g>
        ))}
        {/* Voordeur + stoep */}
        <polygon points={rechtsVlak(35, 0, 12, 24)} fill={kleur.deur} />
        <polygon points={rechtsVlak(37, 2, 8, 9)} fill={kleur.raam} opacity={0.5} />
        <polygon points={pts(op(F, 33, 0, 0), op(F, 49, 0, 0), op(F, 49, -6, 0), op(F, 33, -6, 0))} fill={kleur.grondRand} />

        <polygon points={pts(Fb, Rb, nokEind, nokStart)} fill={kleur.dakVoor} />
        <polygon points={schoorsteen.zij} fill={kleur.gevelLinks} />
        <polygon points={schoorsteen.voor} fill={kleur.gevelRechts} />
        <polygon points={schoorsteen.top} fill={kleur.schoorsteen} />
        {/* Lichtrand langs de nok */}
        <polyline points={pts(nokStart, nokEind)} stroke="rgba(255,255,255,.45)" strokeWidth={1.4} fill="none" strokeLinecap="round" />

        {pin && (
          <g transform={`translate(${nokEind[0] - 26}, ${nokEind[1] - 30})`}>
            <line x1={0} y1={6} x2={0} y2={22} stroke="var(--merk-accent)" strokeWidth={2} strokeLinecap="round" />
            <circle r={10.5} fill="#FFFFFF" stroke="var(--merk-accent)" strokeWidth={2.4} />
            <circle r={4.4} fill="var(--merk)" />
          </g>
        )}
      </g>
    </svg>
  )
}

/**
 * Isometrische staafgrafiek op een tegel — de lege staat van de verkenners
 * (marktanalyse, transacties, concurrentie, kaart) zolang er geen
 * transacties zijn. De staven groeien bij het verschijnen op (CSS), daarna
 * zweeft het geheel rustig.
 */
export function DataIllustratie({ breedte = 168, style }: { breedte?: number; style?: CSSProperties }) {
  const O: P = [120, 150]
  const at = (p: P, rechts: number, links: number, hoog: number): P => op(p, rechts, links, hoog)
  const S = 22
  const staven: { r: number; l: number; h: number; tint: number }[] = [
    { r: 8, l: 62, h: 34, tint: 30 },
    { r: 40, l: 62, h: 58, tint: 45 },
    { r: 72, l: 62, h: 46, tint: 60 },
    { r: 8, l: 26, h: 52, tint: 70 },
    { r: 40, l: 26, h: 84, tint: 100 },
    { r: 72, l: 26, h: 68, tint: 85 },
  ]
  const g = [at(O, -10, -10, 0), at(O, 104, -10, 0), at(O, 104, 98, 0), at(O, -10, 98, 0)]
  return (
    <svg aria-hidden="true" viewBox="0 -40 240 230" width={breedte} height={breedte * (230 / 240)} style={{ display: 'block', overflow: 'visible', ...style }}>
      <ellipse className="vui-zweef-schaduw" cx={O[0] + 6} cy={O[1] + 14} rx={82} ry={14} fill="rgba(20,24,27,.06)" />
      <g className="vui-zweef">
        <polygon points={pts(...g)} fill="color-mix(in srgb, var(--merk) 7%, #FFFFFF)" stroke="color-mix(in srgb, var(--merk) 22%, #FFFFFF)" strokeWidth={1} />
        {/* Rasterlijnen op de tegel */}
        {[22, 44, 66].map(l => (
          <polyline key={l} points={pts(at(O, -10, l, 0), at(O, 104, l, 0))} stroke="color-mix(in srgb, var(--merk) 16%, #FFFFFF)" strokeWidth={0.8} fill="none" />
        ))}
        {/* Tekenvolgorde = diepte: verst weg (grootste r + l) eerst. */}
        {[...staven].sort((x, y) => y.r + y.l - (x.r + x.l)).map((s, i) => {
          const top = (p: P) => at(p, 0, 0, s.h)
          const a = at(O, s.r, s.l, 0)
          const b = at(O, s.r + S, s.l, 0)
          const c = at(O, s.r + S, s.l + S, 0)
          const d = at(O, s.r, s.l + S, 0)
          const basis = `color-mix(in srgb, var(--merk) ${s.tint}%, #FFFFFF)`
          return (
            <g key={i} className="vui-staaf-groei" style={{ ['--d' as string]: `${i * 70 + 120}ms`, transformOrigin: `${a[0]}px ${a[1]}px` }}>
              <polygon points={pts(d, a, top(a), top(d))} fill={basis} />
              <polygon points={pts(a, b, top(b), top(a))} fill={`color-mix(in srgb, ${basis} 82%, var(--merk-diep))`} />
              <polygon points={pts(top(a), top(b), top(c), top(d))} fill={`color-mix(in srgb, ${basis} 70%, #FFFFFF)`} />
            </g>
          )
        })}
        {/* Pin boven de hoogste staaf (accent: de toegestane ring + stokje). */}
        <g transform={`translate(${at(O, 51, 37, 84)[0]}, ${at(O, 51, 37, 84)[1] - 30})`}>
          <line x1={0} y1={6} x2={0} y2={20} stroke="var(--merk-accent)" strokeWidth={2} strokeLinecap="round" />
          <circle r={9} fill="#FFFFFF" stroke="var(--merk-accent)" strokeWidth={2.2} />
          <circle r={3.8} fill="var(--merk)" />
        </g>
      </g>
    </svg>
  )
}
