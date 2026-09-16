import type { CSSProperties, ReactNode } from 'react'
import { colors } from './tokens'

/**
 * Labeltje in de merkkleur boven een titel. Kapitalen en letterafstand volgen de vormtaal
 * van het kantoor (`--merk-label-transform`): zacht = kapitaal (VestaAI's signatuur),
 * strak = gewoon, zoals zakelijke makelaarshuisstijlen het doen.
 */
export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 'var(--merk-label-spacing, .08em)',
        textTransform: 'var(--merk-label-transform, uppercase)' as CSSProperties['textTransform'],
        color: colors.accent,
        margin: '0 0 8px',
        ...style,
      }}
    >
      {children}
    </p>
  )
}
