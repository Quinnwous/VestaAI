'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { colors } from '@/components/ui'

const ITEMS = [
  { href: '/marktanalyse', label: 'Marktanalyse' },
  { href: '/marktanalyse/transacties', label: 'Transacties opzoeken' },
  { href: '/marktanalyse/concurrentie', label: 'Concurrentieanalyse' },
  { href: '/marktanalyse/kaart', label: 'Verkoopkaart' },
]

/** Sub-navigatie tussen de vier Marktinzichten-schermen — gedeeld via het layout-segment. */
export function MarktinzichtenNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${colors.border}`, marginBottom: 30, overflowX: 'auto' }}>
      {ITEMS.map(item => {
        const actief = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flexShrink: 0, padding: '11px 14px', marginBottom: -1, textDecoration: 'none',
              fontSize: 13.5, fontWeight: actief ? 700 : 600,
              color: actief ? colors.primary : colors.muted,
              borderBottom: `2px solid ${actief ? colors.primary : 'transparent'}`,
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
