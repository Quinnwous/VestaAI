/**
 * Design-tokens voor de dashboard-redesign (Claude Design → live app).
 * Eén bron voor kleuren/typografie/vorm die de inline-gestylede primitives
 * en schermen gebruiken. Tailwind-equivalenten staan in tailwind.config.ts
 * (`forest`-scale + `font-serif`) voor class-based plekken.
 */

export const colors = {
  // Merk
  primary: '#1A6B45',
  primaryHover: '#114230',
  accent: '#2A8A5C',
  deep: '#0E3B27',
  // Oppervlakken
  bg: '#FBFCFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAF8',
  tint: '#EAF5EE',
  tint2: '#F1F7F3',
  // Tekst
  text: '#0E1A13',
  body: '#5A6B61',
  bodyStrong: '#2A362D',
  muted: '#9AA6A0',
  // Randen
  border: '#E9EFEB',
  borderStrong: '#E4EAE6',
  borderSoft: '#EAF0EC',
  greenBorder: '#C7E6D5',
  greenBorder2: '#D5E8DD',
  // Status
  statusDraft: '#9AA6A0',
  statusPublished: '#1A6B45',
  statusOnderBod: '#D97706',
  statusVerkocht: '#5A6B61',
} as const

export const serifFont = 'var(--font-newsreader), Georgia, serif'

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  card: 16,
  cardLg: 18,
  cardXl: 20,
  pill: 9999,
} as const

export const shadow = {
  card: '0 2px 12px rgba(14,26,19,.04)',
  cardStrong: '0 2px 16px rgba(14,26,19,.04)',
  btn: '0 4px 12px rgba(26,107,69,.22)',
  btnLg: '0 6px 18px rgba(26,107,69,.24)',
  dropdown: '0 12px 32px rgba(14,26,19,.14)',
  modal: '0 24px 60px rgba(14,26,19,.24)',
} as const

/** Object-status → label + kleur (dashboardfilters, badges, StatusToggle). */
export const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Concept', color: colors.statusDraft },
  published: { label: 'Gepubliceerd', color: colors.statusPublished },
  onder_bod: { label: 'Onder bod', color: colors.statusOnderBod },
  verkocht: { label: 'Verkocht', color: colors.statusVerkocht },
}

/** Plan → badge-kleuren (sidebar + account). */
export const PLAN_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  starter: { bg: '#F1F7F3', color: '#2A8A5C', label: 'Starter' },
  pro: { bg: '#E3F0E8', color: '#1A6B45', label: 'Pro' },
  kantoor: { bg: '#D5E8DD', color: '#114230', label: 'Kantoor' },
}
