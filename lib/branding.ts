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
  /** Sfeerbeeld (team/kantoor), scherp getoond als banner op kantoor-gerelateerde pagina's. */
  achtergrondUrl: string | null
  achtergrondSecundairUrl: string | null
  /** Welkomstbanner op de startpagina; leeg = terugval op `achtergrondUrl`. */
  bannerUrl: string | null
  /** Verticale uitsnede van de banner in procenten (0 = boven, 100 = onder). */
  bannerFocusY: number
  /** Contactgegevens voor de merkbalk bovenaan — leeg = balk verdwijnt. */
  telefoon: string | null
  email: string | null
  /** Genormaliseerd via `websiteWeergave()` — `null` = niet ingevuld of ongeldig, niet tonen. */
  website: WebsiteWeergave | null
  primair: string
  primairHover: string
  primairZacht: string
  primairRand: string
  primairDiep: string
  primairLicht: string
  accent: string
  accentZacht: string
  accentRand: string
  opPrimair: string
  /** `primair`, verdonkerd tot ≥ 4,5 : 1 contrast op wit (item 14.4) — voor links en merkgekleurde tekst. */
  merkTekst: string
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
 * Ook hergebruikt door `lib/statischeKaart.ts` (`subjectPinStijl`) om te bepalen of
 * een (bijna) zwarte merkkleur op de pdf-locatiekaart eerst opgelicht moet worden.
 */
export function luminantie(hex: string): number {
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

/** De donkere tekstkleur die `besteTekstOp`/`tekstOp` als alternatief voor wit gebruiken. */
const DONKERE_TEKST = '#0E1A13'

/**
 * WCAG-contrastratio tussen twee kleuren (1–21). Symmetrisch: de volgorde van
 * `a`/`b` maakt niet uit. Basis voor `besteTekstOp` en `verdonkerTotContrast`
 * — item 14.4 (toegankelijkheid): `tekstOp`'s `luminantie > 0,5`-drempel kiest
 * niet altijd de kleur met het hoogste contrast (bv. i4-blauw `#0080C8`: wit
 * geeft 4,3 : 1, net onder de 4,5 : 1 voor gewone tekst).
 */
export function contrastRatio(a: string, b: string): number {
  const la = luminantie(a)
  const lb = luminantie(b)
  const lichtste = Math.max(la, lb)
  const donkerste = Math.min(la, lb)
  return (lichtste + 0.05) / (donkerste + 0.05)
}

/**
 * Kiest tussen wit en de donkere tekstkleur de kleur met het hoogste contrast
 * op `hex` — vervangt `tekstOp`'s vaste `luminantie > 0,5`-drempel voor
 * `opPrimair`/`--merk-op`. Bij een middenkleur (zoals i4-blauw) kan dit nog
 * steeds onder de 4,5 : 1-AA-drempel voor gewone tekst uitkomen; dat is een
 * bewuste ontwerpkeuze (donkere knoptekst of een donkerder merkkleur) — zie
 * `--merk-tekst`/`verdonkerTotContrast` voor tekst/links die wél altijd AA moet halen.
 */
export function besteTekstOp(hex: string): string {
  return contrastRatio(hex, '#FFFFFF') >= contrastRatio(hex, DONKERE_TEKST) ? '#FFFFFF' : DONKERE_TEKST
}

/**
 * Verdonkert `hex` in kleine stappen (2 % dichter naar zwart per stap, tot
 * 100 stappen) tot het contrast met `achtergrond` minstens `doel` (WCAG AA
 * voor gewone tekst: 4,5 : 1) haalt. Haalt de kleur dat al, dan blijft hij
 * ongewijzigd. Elke stap gaat uit van de oorspronkelijke `hex` (niet
 * cumulatief vanaf de vorige stap) om afrondingsdrift te voorkomen. Bewaart
 * de tint: alle kanalen worden met dezelfde factor verdonkerd, dus de
 * verhouding tussen r/g/b — en daarmee de kleurtoon — blijft gelijk.
 * Gebruikt voor `--merk-tekst`: de merkkleur zelf, bruikbaar voor links en
 * merkgekleurde tekst op een witte achtergrond.
 */
export function verdonkerTotContrast(hex: string, achtergrond = '#FFFFFF', doel = 4.5): string {
  if (contrastRatio(hex, achtergrond) >= doel) return hex
  for (let stap = 1; stap <= 100; stap++) {
    const kandidaat = donkerder(hex, stap * 0.02)
    if (contrastRatio(kandidaat, achtergrond) >= doel) return kandidaat
  }
  // Uiterste terugval — zou bij een normale merkkleur nooit bereikt moeten worden.
  return donkerder(hex, 0.98)
}

export type WebsiteWeergave = { label: string; href: string }

/**
 * Normaliseert een vrij ingevoerde website-url voor weergave: `label` is de
 * kale hostnaam zonder protocol/`www.` (`https://www.i4housing.nl/` →
 * `i4housing.nl`), `href` is altijd een volledige `https://`-url (protocol
 * ontbreekt het? dan wordt het toegevoegd). Ongeldige invoer (leeg, geen
 * geldige hostnaam) geeft `null` terug — de UI laat het element dan
 * verdwijnen, zelfde conventie als `telefoon`/`email`.
 */
export function websiteWeergave(url: string | null | undefined): WebsiteWeergave | null {
  const ruw = typeof url === 'string' ? url.trim() : ''
  if (!ruw) return null
  const metProtocol = /^https?:\/\//i.test(ruw) ? ruw : `https://${ruw}`
  let parsed: URL
  try {
    parsed = new URL(metProtocol)
  } catch {
    return null
  }
  if (!parsed.hostname || !parsed.hostname.includes('.')) return null
  const pad = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '')
  const label = `${parsed.hostname.replace(/^www\./i, '')}${pad}`
  return { label, href: parsed.href }
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
    bannerUrl: tekst(huisstijl?.banner_url),
    // 50 % = het midden, het gedrag van `object-fit: cover` zonder instelling.
    bannerFocusY: typeof huisstijl?.banner_focus_y === 'number' ? huisstijl.banner_focus_y : 50,
    telefoon: tekst(huisstijl?.telefoon),
    email: tekst(huisstijl?.email),
    website: websiteWeergave(tekst(huisstijl?.website)),
    primair,
    primairHover: donkerder(primair, 0.18),
    primairZacht: lichter(primair, 0.92),
    primairRand: lichter(primair, 0.72),
    primairDiep: donkerder(primair, 0.55),
    // Lichter dan primair maar duidelijk minder wit dan `primairZacht` (die is een
    // achtergrondtint) — voor verlopen zoals de hero-tegel (roadmap 1.9e).
    primairLicht: lichter(primair, 0.25),
    accent,
    accentZacht: lichter(accent, 0.92),
    accentRand: lichter(accent, 0.72),
    opPrimair: besteTekstOp(primair),
    merkTekst: verdonkerTotContrast(primair),
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
  const [ar, ag, ab] = naarRgb(b.accent)

  return {
    '--merk': b.primair,
    // Los kanalen-triplet voor plekken die nog `rgba(26,107,69,.2)`-literals gebruiken:
    // `rgba(var(--merk-rgb), .2)` blijft zo ook merk-bewust (fallback staat centraal
    // op :root in globals.css, niet meer per gebruiksplek — roadmap 1.9).
    '--merk-rgb': `${r},${g},${b_}`,
    '--merk-hover': b.primairHover,
    '--merk-zacht': b.primairZacht,
    '--merk-rand': b.primairRand,
    '--merk-diep': b.primairDiep,
    '--merk-licht': b.primairLicht,
    '--merk-accent': b.accent,
    '--merk-accent-zacht': b.accentZacht,
    '--merk-accent-rand': b.accentRand,
    '--merk-accent-rgb': `${ar},${ag},${ab}`,
    '--merk-op': b.opPrimair,
    '--merk-tekst': b.merkTekst,
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

/**
 * Dezelfde variabelen als `brandingCssVars`, als `:root { … }`-regel. Nodig
 * voor Radix-portals (Sheet, Popover, Tooltip, SelectMenu): die renderen direct
 * in `<body>`, búiten de layout-div met de inline variabelen, en erven anders
 * de VestaAI-groene terugval van `:root` in globals.css (les 24 sep 2026:
 * concurrentprofiel-drawer was groen bij een blauw/zwart kantoor).
 * `<` wordt geweigerd zodat een waarde nooit uit de `<style>`-tag kan breken.
 */
export function brandingRootCss(b: Branding): string {
  const regels = Object.entries(brandingCssVars(b) as Record<string, string | number>)
    .filter(([, waarde]) => !String(waarde).includes('<'))
    .map(([naam, waarde]) => `${naam}:${waarde};`)
    .join('')
  return `:root{${regels}}`
}
