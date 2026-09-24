'use client'

/**
 * Chip — toggle-knopje voor een korte set losse waarden (energielabel A+++…G,
 * segment-B-typegroep). Gebruik: <Chip actief={geselecteerd} onClick={...}>A</Chip>.
 * Variant `accent` voor segment B (rode chip i.p.v. merkkleur), zie
 * docs/ontwerp/README.md § 1 punt 2b (segment B is de enige plek waar
 * `--merk-accent` als categoriekleur mag, geen semantische status).
 */

import type { ReactNode } from 'react'
import { colors, radius } from './tokens'

export function Chip({
  children,
  actief,
  onClick,
  variant = 'merk',
}: {
  children: ReactNode
  actief: boolean
  onClick: () => void
  variant?: 'merk' | 'accent'
}) {
  const kleur = variant === 'accent' ? 'var(--merk-accent, #C61E45)' : colors.primary
  return (
    <button
      type="button"
      aria-pressed={actief}
      onClick={onClick}
      className="vui-chip"
      style={{
        height: 30,
        padding: '0 12px',
        border: `1px solid ${actief ? kleur : colors.borderStrong}`,
        background: actief ? kleur : colors.surface,
        color: actief ? '#fff' : colors.bodyStrong,
        borderRadius: radius.pill,
        fontWeight: 600,
        fontSize: 12.5,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}
