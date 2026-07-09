import type { CSSProperties, ReactNode } from 'react'
import { colors, serifFont } from './tokens'
import { Eyebrow } from './Eyebrow'

/** Serif-heading met optioneel cursief groen accentwoord (redesign-signatuur). */
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
        fontWeight: 500,
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
          <span style={{ fontStyle: 'italic', color: colors.primary }}>{accent}</span>
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
