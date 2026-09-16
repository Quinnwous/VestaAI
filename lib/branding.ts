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

/**
 * Lettertype-opties voor de ingelogde omgeving. `css` verwijst naar een CSS-variabele
 * die `next/font/google` vooraf laadt in `app/layout.tsx` — nieuwe opties moeten daar
 * ook toegevoegd worden. Onbekend/leeg → `jakarta` (VestaAI's eigen font).
 */
export const FONT_OPTIES = {
  jakarta: { css: 'var(--font-jakarta)', label: 'Jakarta Sans (VestaAI-standaard)' },
  gantari: { css: 'var(--font-gantari)', label: 'Gantari' },
  // Vrije tegenhanger van Proxima Nova — het (betaalde) lettertype dat veel
  // makelaarskantoren voeren, waaronder i4 Housing.
  nunito: { css: 'var(--font-nunito)', label: 'Nunito Sans (Proxima Nova-stijl)' },
} as const
export type LettertypeKeuze = keyof typeof FONT_OPTIES

/**
 * Vormtaal van de ingelogde omgeving: afronding en schaduwdiepte. VestaAI's eigen
 * "zacht"-stijl is zacht-rond met diffuse schaduwen; "strak" is scherp-hoekig met
 * vlakke lijnen — voor een kantoor dat juist een zakelijke, rechte huisstijl voert.
 */
type Schaduwen = { card: string; btn: string; btnLg: string; dropdown: string; modal: string }

export const VORM_OPTIES = {
  zacht: {
    label: 'Zacht & rond (VestaAI-standaard)',
    radius: { sm: 10, md: 12, lg: 14, card: 16, cardLg: 18, cardXl: 20, pill: 9999 },
    // Typografische signatuur: VestaAI's eigen stijl zet een cursief accentwoord in
    // de kop en kapitale eyebrow-labels. Zakelijke huisstijlen doen dat vrijwel nooit.
    titelStijl: 'italic',
    titelGewicht: '500',
    labelTransform: 'uppercase',
    labelSpacing: '.08em',
    // Diffuse, merkgetinte schaduwen — merktint(alpha) geeft de rgba() van de primaire kleur.
    schaduw: (merktint: (alpha: number) => string): Schaduwen => ({
      card: `0 2px 12px ${merktint(.08)}`,
      btn: `0 4px 12px ${merktint(.28)}`,
      btnLg: `0 6px 18px ${merktint(.3)}`,
      dropdown: `0 12px 32px -4px ${merktint(.14)}`,
      modal: `0 24px 60px -8px ${merktint(.22)}`,
    }),
  },
  strak: {
    label: 'Strak & zakelijk',
    // Nul afronding op knoppen en velden — precies hoe zakelijke makelaarssites het doen;
    // kaarten houden een haarlijn-afronding zodat het geen ruwe blokkendoos wordt.
    radius: { sm: 0, md: 0, lg: 2, card: 2, cardLg: 3, cardXl: 4, pill: 2 },
    titelStijl: 'normal',
    titelGewicht: '700',
    labelTransform: 'none',
    labelSpacing: '.02em',
    // Vlakke rand i.p.v. schaduw — dunne neutrale contourlijn, geen "zwevend kaartje"-gevoel.
    schaduw: (merktint: (alpha: number) => string): Schaduwen => ({
      card: `0 0 0 1px rgba(14,26,19,.10)`,
      btn: `0 0 0 1px ${merktint(.55)}`,
      btnLg: `0 0 0 1px ${merktint(.6)}`,
      dropdown: `0 0 0 1px rgba(14,26,19,.10), 0 8px 24px -4px rgba(14,26,19,.14)`,
      modal: `0 0 0 1px rgba(14,26,19,.10), 0 16px 48px -8px rgba(14,26,19,.2)`,
    }),
  },
} as const
export type VormKeuze = keyof typeof VORM_OPTIES

export type Branding = {
  naam: string
  logoUrl: string | null
  faviconUrl: string | null
  /** Sfeerbeeld (team/kantoor) dat als licht watermerk in de zijmarges staat. */
  achtergrondUrl: string | null
  achtergrondSecundairUrl: string | null
  /** Contactgegevens voor de merkbalk bovenaan — leeg = balk verdwijnt. */
  telefoon: string | null
  email: string | null
  primair: string
  primairHover: string
  primairZacht: string
  primairRand: string
  primairDiep: string
  accent: string
  opPrimair: string
  lettertype: LettertypeKeuze
  vorm: VormKeuze
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

function geldigeLettertype(waarde: unknown): LettertypeKeuze {
  return typeof waarde === 'string' && waarde in FONT_OPTIES ? (waarde as LettertypeKeuze) : 'jakarta'
}

function geldigeVorm(waarde: unknown): VormKeuze {
  return typeof waarde === 'string' && waarde in VORM_OPTIES ? (waarde as VormKeuze) : 'zacht'
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
  const lettertype = geldigeLettertype(huisstijl?.lettertype)
  const vorm = geldigeVorm(huisstijl?.vorm)
  const tekst = (waarde: unknown): string | null =>
    typeof waarde === 'string' && waarde.trim() ? waarde.trim() : null

  return {
    naam: kantoor?.name?.trim() || 'VestaAI',
    logoUrl: kantoor?.logo_url ?? null,
    faviconUrl: tekst(huisstijl?.favicon_url),
    achtergrondUrl: tekst(huisstijl?.achtergrond_url),
    achtergrondSecundairUrl: tekst(huisstijl?.achtergrond_secundair_url),
    telefoon: tekst(huisstijl?.telefoon),
    email: tekst(huisstijl?.email),
    primair,
    primairHover: donkerder(primair, 0.18),
    primairZacht: lichter(primair, 0.92),
    primairRand: lichter(primair, 0.72),
    primairDiep: donkerder(primair, 0.55),
    accent,
    opPrimair: tekstOp(primair),
    lettertype,
    vorm,
    isEigenStijl: primair !== VESTA_MERK.primair || !!kantoor?.logo_url,
  }
}

/**
 * Geeft de logo-URL alleen terug als hij ook echt laadt. react-pdf's `<Image>` kent geen
 * onError: een verlopen URL laat daar de hele PDF-generatie klappen, dus dat checken we
 * vooraf. In de browser vangt AppTopbar het zelf op met onError.
 */
export async function bruikbaarLogo(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok ? url : null
  } catch {
    return null
  }
}

/** De CSS-variabelen die de (app)-layout op zijn wrapper zet. */
export function brandingCssVars(b: Branding): React.CSSProperties {
  const font = FONT_OPTIES[b.lettertype]
  const vorm = VORM_OPTIES[b.vorm]
  const [r, g, b_] = naarRgb(b.primair)
  const tint = (alpha: number) => `rgba(${r},${g},${b_},${alpha})`
  const schaduw = vorm.schaduw(tint)

  return {
    '--merk': b.primair,
    // Los kanalen-triplet voor plekken die nog `rgba(26,107,69,.2)`-literals gebruiken:
    // `rgba(var(--merk-rgb, 26,107,69), .2)` blijft zo ook merk-bewust.
    '--merk-rgb': `${r},${g},${b_}`,
    '--merk-hover': b.primairHover,
    '--merk-zacht': b.primairZacht,
    '--merk-rand': b.primairRand,
    '--merk-diep': b.primairDiep,
    '--merk-accent': b.accent,
    '--merk-op': b.opPrimair,
    '--merk-font-heading': font.css,
    '--merk-font-body': font.css,
    '--merk-titel-stijl': vorm.titelStijl,
    '--merk-titel-gewicht': vorm.titelGewicht,
    '--merk-label-transform': vorm.labelTransform,
    '--merk-label-spacing': vorm.labelSpacing,
    '--merk-radius-sm': `${vorm.radius.sm}px`,
    '--merk-radius-md': `${vorm.radius.md}px`,
    '--merk-radius-lg': `${vorm.radius.lg}px`,
    '--merk-radius-card': `${vorm.radius.card}px`,
    '--merk-radius-card-lg': `${vorm.radius.cardLg}px`,
    '--merk-radius-card-xl': `${vorm.radius.cardXl}px`,
    '--merk-radius-pill': `${vorm.radius.pill}px`,
    '--merk-shadow-card': schaduw.card,
    '--merk-shadow-btn': schaduw.btn,
    '--merk-shadow-btn-lg': schaduw.btnLg,
    '--merk-shadow-dropdown': schaduw.dropdown,
    '--merk-shadow-modal': schaduw.modal,
  } as React.CSSProperties
}
