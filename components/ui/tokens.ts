/**
 * Design-tokens voor de dashboard-redesign (Claude Design → live app).
 * Eén bron voor kleuren/typografie/vorm die de inline-gestylede primitives
 * en schermen gebruiken. Tailwind-equivalenten staan in tailwind.config.ts
 * (`forest`-scale + `font-serif`) voor class-based plekken.
 */

// Merk-bewust met terugval op VestaAI's eigen groene basisstijl: binnen de (app)-omgeving
// van een kantoor met eigen huisstijl zet lib/branding.ts de --merk-*-variabelen op de
// wrapper (zie app/(app)/layout.tsx); buiten die omgeving (landing/auth/admin) zijn die
// variabelen niet gezet en gelden de fallback-waarden hieronder — VestaAI's eigen stijl.
export const colors = {
  // Merk
  primary: 'var(--merk, #1A6B45)',
  primaryHover: 'var(--merk-hover, #114230)',
  accent: 'var(--merk-accent, #2A8A5C)',
  deep: 'var(--merk-diep, #0E3B27)',
  // Oppervlakken — kleurloos grijs, want een groene ondertoon vloekt met een
  // kantoor dat blauw of rood voert. De merkkleur komt uit de --merk*-variabelen.
  bg: '#FAFBFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F8F9',
  tint: 'var(--merk-zacht, #EAF5EE)',
  tint2: 'var(--merk-zacht, #F1F7F3)',
  // Tekst
  text: '#14181B',
  body: '#5C6470',
  bodyStrong: '#2C3238',
  muted: '#98A0A6',
  // Randen
  border: '#E6E9EC',
  borderStrong: '#E1E5E9',
  borderSoft: '#EBEEF1',
  greenBorder: 'var(--merk-rand, #C7E6D5)',
  greenBorder2: 'var(--merk-rand, #D5E8DD)',
  // Status
  statusDraft: '#98A0A6',
  statusOnderBod: '#D97706',
  statusVerkocht: '#5C6470',
} as const

// Apart gedefinieerd omdat "Gepubliceerd" de merkkleur van het kantoor moet volgen.
export const STATUS_PUBLISHED_COLOR = colors.primary

export const serifFont = 'var(--merk-font-heading, var(--font-newsreader)), Georgia, serif'

export const radius = {
  sm: 'var(--merk-radius-sm, 10px)',
  md: 'var(--merk-radius-md, 12px)',
  lg: 'var(--merk-radius-lg, 14px)',
  card: 'var(--merk-radius-card, 16px)',
  cardLg: 'var(--merk-radius-card-lg, 18px)',
  cardXl: 'var(--merk-radius-card-xl, 20px)',
  pill: 'var(--merk-radius-pill, 9999px)',
} as const

export const shadow = {
  card: 'var(--merk-shadow-card, 0 2px 12px rgba(20,24,27,.04))',
  cardStrong: '0 2px 16px rgba(20,24,27,.04)',
  btn: 'var(--merk-shadow-btn, 0 4px 12px rgba(26,107,69,.22))',
  btnLg: 'var(--merk-shadow-btn-lg, 0 6px 18px rgba(26,107,69,.24))',
  dropdown: 'var(--merk-shadow-dropdown, 0 12px 32px rgba(20,24,27,.14))',
  modal: 'var(--merk-shadow-modal, 0 24px 60px rgba(20,24,27,.24))',
} as const

/** Object-status → label + kleur (dashboardfilters, badges, StatusToggle). */
export const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Concept', color: colors.statusDraft },
  published: { label: 'Gepubliceerd', color: STATUS_PUBLISHED_COLOR },
  onder_bod: { label: 'Onder bod', color: colors.statusOnderBod },
  verkocht: { label: 'Verkocht', color: colors.statusVerkocht },
}

/** Plan → badge-kleuren (sidebar + account). */
