import type { CSSProperties, ReactNode } from 'react'
import { colors } from './tokens'

export interface TabItem {
  id: string
  label: ReactNode
}

/**
 * Onderstreepte tab-balk (object-secties, content-tabs, settings-tabs).
 * `underline` = klassieke border-bottom stijl; anders compacte pill-loze tabs.
 */
export function TabBar({
  tabs,
  active,
  onChange,
  style,
  role,
  idPrefix,
}: {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  style?: CSSProperties
  /** 'tablist' schakelt aria-rollen in. */
  role?: 'tablist'
  idPrefix?: string
}) {
  return (
    <div
      role={role}
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: `1px solid ${colors.border}`,
        overflowX: 'auto',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role={role === 'tablist' ? 'tab' : undefined}
            aria-selected={role === 'tablist' ? isActive : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${tab.id}` : undefined}
            id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
            onClick={() => onChange(tab.id)}
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${isActive ? colors.primary : 'transparent'}`,
              padding: '11px 14px',
              marginBottom: -1,
              fontSize: 13.5,
              fontWeight: isActive ? 700 : 600,
              color: isActive ? colors.primary : colors.muted,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color .15s, border-color .15s',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
