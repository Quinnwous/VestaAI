'use client'

/**
 * Tabs — tabbladen met merkkleurige onderstreping, op Radix Tabs.
 * Gebruik: <Tabs waarde={t} onChange={setT} tabs={[{waarde,label,inhoud}]} />
 * Radix regelt pijltjesnavigatie en de juiste aria-rollen; de bestaande
 * `TabBar` blijft voor puur visuele tabrijen zonder gekoppelde panelen.
 * Zet de tabwaarde in de URL (useFilterState) als hij deelbaar moet zijn.
 */

import type { ReactNode } from 'react'
import * as RadixTabs from '@radix-ui/react-tabs'
import { colors } from './tokens'

export interface TabDef {
  waarde: string
  label: string
  inhoud: ReactNode
}

export function Tabs({
  waarde,
  onChange,
  tabs,
}: {
  waarde: string
  onChange: (waarde: string) => void
  tabs: TabDef[]
}) {
  return (
    <RadixTabs.Root value={waarde} onValueChange={onChange}>
      <RadixTabs.List style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${colors.border}`, marginBottom: 16 }}>
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.waarde}
            value={t.waarde}
            className="vui-tab"
            style={{
              position: 'relative', height: 38, padding: '0 14px', border: 'none', background: 'none',
              fontSize: 13.5, fontWeight: 700, color: colors.muted, cursor: 'pointer',
            }}
          >
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((t) => (
        <RadixTabs.Content key={t.waarde} value={t.waarde} style={{ outline: 'none' }}>
          {t.inhoud}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
