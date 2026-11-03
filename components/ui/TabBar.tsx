'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { colors } from './tokens'

export interface TabItem {
  id: string
  label: ReactNode
}

/**
 * Onderstreepte tab-balk (object-secties, content-tabs, settings-tabs).
 * `underline` = klassieke border-bottom stijl; anders compacte pill-loze tabs.
 *
 * De streep onder de actieve tab schuift mee naar de nieuwe tab (gemeten na
 * het renderen). Tot die meting er is — of als JavaScript faalt — staat de
 * klassieke onderrand op de knop zelf, dus er is altijd een actieve staat.
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
  const balkRef = useRef<HTMLDivElement>(null)
  const [streep, setStreep] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const balk = balkRef.current
    if (!balk) return
    const meet = () => {
      const knop = balk.querySelector<HTMLElement>('[data-actief="true"]')
      if (!knop) return setStreep(null)
      setStreep({ x: knop.offsetLeft, w: knop.offsetWidth })
    }
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(balk)
    return () => ro.disconnect()
  }, [active, tabs.length])

  return (
    <div
      ref={balkRef}
      role={role}
      className="vui-tabbalk"
      data-gemeten={streep ? 'true' : undefined}
      style={{
        position: 'relative',
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
            data-actief={isActive ? 'true' : undefined}
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
              color: isActive ? 'var(--merk-tekst)' : colors.muted,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color .15s, border-color .15s',
            }}
          >
            {tab.label}
          </button>
        )
      })}
      {streep && (
        <span
          aria-hidden
          className="vui-tabindicator"
          style={{ left: 0, width: streep.w, transform: `translateX(${streep.x}px)` }}
        />
      )}
    </div>
  )
}
