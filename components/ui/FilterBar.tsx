'use client'

/**
 * FilterBar — sticky, frosted container voor een rij `FilterDropdown`s +
 * optioneel een pillenrij (actieve filters) en een segment-B-rij (item 6.1,
 * docs/ontwerp/README.md § 1.4 "frosted balken" + § 3.8). Herbruikbaar door
 * de volgende verkenners (6.2 Transacties, 6.3 Concurrentie) — de bar zelf
 * kent de filters niet, dat blijft pagina-specifiek. Gebruik:
 *   <FilterBar pillenRij={<FilterPills .../>} segmentBRij={...}>
 *     <FilterDropdown label="Plaats">...</FilterDropdown>
 *     ...
 *   </FilterBar>
 */

import type { ReactNode } from 'react'
import { colors, radius, shadow } from './tokens'

export function FilterBar({
  children,
  pillenRij,
  segmentBRij,
  stickyTop = 66,
}: {
  children: ReactNode
  pillenRij?: ReactNode
  segmentBRij?: ReactNode
  stickyTop?: number
}) {
  return (
    <div
      style={{
        position: 'sticky',
        top: stickyTop,
        zIndex: 20,
        background: 'rgba(255,255,255,.82)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        border: `1px solid ${colors.border}`,
        borderRadius: radius.cardLg,
        boxShadow: shadow.card,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexWrap: 'wrap' }}>
        {children}
      </div>
      {pillenRij && (
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${colors.border}` }}>{pillenRij}</div>
      )}
      {segmentBRij && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: `1px solid ${colors.border}`,
            borderRadius: `0 0 ${radius.cardLg} ${radius.cardLg}`,
            background: 'linear-gradient(90deg, var(--merk-accent-zacht, #FBE9EE), transparent 60%)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}
        >
          {segmentBRij}
        </div>
      )}
    </div>
  )
}
