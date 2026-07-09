import type { CSSProperties, ReactNode } from 'react'
import { colors, STATUS_CFG } from './tokens'

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
        borderRadius: 20,
        background: bg ?? `${color}14`,
        color,
        letterSpacing: '.02em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  )
}

/** Object-statusbadge (dot + label), gedreven door STATUS_CFG. */
export function StatusBadge({ status, style }: { status: string; style?: CSSProperties }) {
  const cfg = STATUS_CFG[status]
  if (!cfg) return null
  return (
    <Badge color={cfg.color} bg={`${cfg.color}14`} dot style={style}>
      {cfg.label}
    </Badge>
  )
}
