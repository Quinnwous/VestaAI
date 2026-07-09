import type { CSSProperties, ReactNode } from 'react'
import { colors } from './tokens'

/** Uppercase groen labeltje boven een titel (redesign-signatuur). */
export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: colors.accent,
        margin: '0 0 8px',
        ...style,
      }}
    >
      {children}
    </p>
  )
}
