import type { CSSProperties, ReactNode } from 'react'
import { colors, serifFont } from './tokens'
import { Eyebrow } from './Eyebrow'

/**
 * Kop met optioneel accentwoord in de merkkleur. Of dat accent cursief staat, bepaalt de
 * vormtaal van het kantoor (`--merk-titel-stijl`): VestaAI's eigen zachte stijl zet het
 * cursief, een strakke zakelijke huisstijl rechtop — zie lib/branding.ts § VORM_OPTIES.
 */
export function SerifTitle({
  children,
  accent,
  size = 36,
  as: Tag = 'h1',
  style,
}: {
  children: ReactNode
  /** Cursief, groen accent-deel dat achter de titel komt. */
  accent?: ReactNode
  size?: number
  as?: 'h1' | 'h2' | 'h3'
  style?: CSSProperties
}) {
  return (
    <Tag
      style={{
        fontFamily: serifFont,
        fontWeight: 'var(--merk-titel-gewicht, 500)' as CSSProperties['fontWeight'],
        fontSize: size,
        lineHeight: 1.05,
        letterSpacing: '-.015em',
        color: colors.text,
        margin: 0,
        ...style,
      }}
    >
      {children}
      {accent != null && (
        <>
          {' '}
          <span style={{ fontStyle: 'var(--merk-titel-stijl, italic)' as CSSProperties['fontStyle'], color: colors.primary }}>{accent}</span>
        </>
      )}
    </Tag>
  )
}

/**
 * Paginakop: eyebrow + serif-titel (+ accent) + optionele subtitle en
 * rechts uitgelijnde actie (bv. een knop).
 */
export function PageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  action,
  titleSize = 36,
  style,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  accent?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  titleSize?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 26,
        ...style,
      }}
    >
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <SerifTitle accent={accent} size={titleSize} style={{ marginBottom: subtitle ? 6 : 0 }}>
          {title}
        </SerifTitle>
        {subtitle && (
          <p style={{ fontSize: 14.5, color: colors.body, margin: 0, lineHeight: 1.55, maxWidth: 620 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
