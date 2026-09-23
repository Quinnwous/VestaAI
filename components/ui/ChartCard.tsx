'use client'

/**
 * ChartCard — witte kaart met kaartkop (titel + grijze ondertitel/n) en een
 * optionele legenda, voor elke grafiek in een interactieve verkenner (item
 * 6.1, docs/ontwerp/README.md § 1: "inhoud in ronde witte kaarten met
 * kaartkop, nooit een kale tabel of grafiek op de pagina"). `laden` toont een
 * skeleton i.p.v. de children. Gebruik:
 *   <ChartCard titel="Mediaan verkoopprijs" subtitel="per kwartaal · n = 214" laden={pending}
 *     legenda={<Legenda items={[...]} />}>
 *     <ResponsiveContainer>...</ResponsiveContainer>
 *   </ChartCard>
 */

import type { ReactNode } from 'react'
import { colors, radius, shadow } from './tokens'
import { Skeleton } from './Skeleton'

export function ChartCard({
  titel,
  subtitel,
  legenda,
  laden = false,
  hoogte = 236,
  children,
}: {
  titel: string
  subtitel?: ReactNode
  legenda?: ReactNode
  laden?: boolean
  hoogte?: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.cardLg,
        boxShadow: shadow.card,
        padding: '16px 18px 12px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, letterSpacing: '-.01em', color: colors.text }}>{titel}</h2>
          {subtitel && <div style={{ fontSize: 12, color: colors.muted }}>{subtitel}</div>}
        </div>
        {legenda && !laden && <div>{legenda}</div>}
      </div>
      {laden ? <Skeleton height={hoogte} rounded={10} /> : <div style={{ height: hoogte }}>{children}</div>}
    </div>
  )
}

/** Pil-legenda (wij/markt/segment B) — geen legendabox, zie docs/ontwerp/README.md § 1.9. */
export function Legenda({ items }: { items: { label: string; kleur: string; getoond?: boolean }[] }) {
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: 12, color: colors.body }}>
      {items.filter(i => i.getoond !== false).map(i => (
        <span key={i.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: radius.pill, background: colors.tint2 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: i.kleur, display: 'inline-block' }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
