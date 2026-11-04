import type { CSSProperties, ReactNode } from 'react'
import { colors } from './tokens'

/** Pill-badge. `dot` toont een gekleurd bolletje ervoor. */
export function Badge({
  children,
  color = colors.accent,
  bg,
  dot = false,
  style,
}: {
  children: ReactNode
  color?: string
  bg?: string
  dot?: boolean
  style?: CSSProperties
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 'var(--merk-radius-card-xl, 20px)',
        background: bg ?? `${color}14`,
        color,
        letterSpacing: '.02em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        // Live-stip: een zachte ring die uitdijt (globals.css .vui-badge-stip).
        <span
          aria-hidden
          className="vui-badge-stip"
          style={{
            position: 'relative',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            color,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  )
}
