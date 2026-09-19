'use client'

/**
 * SelectMenu — keuzelijst met eigen vormgeving, op Radix Select.
 * Gebruik: <SelectMenu waarde={v} onChange={setV} opties={[{waarde,label}]} />
 * Heet bewust niet `Select`: die naam is al bezet door het native <select> in
 * Field.tsx, dat in formulieren blijft (goedkoper en op mobiel vertrouwder).
 * Gebruik deze in filter-UI, waar de vorm en de merkkleur moeten kloppen.
 */

import * as RadixSelect from '@radix-ui/react-select'
import { colors, radius, shadow } from './tokens'

export interface SelectOptie {
  waarde: string
  label: string
}

export function SelectMenu({
  waarde,
  onChange,
  opties,
  plaatshouder = 'Kies…',
  breedte,
  ariaLabel,
}: {
  waarde: string | undefined
  onChange: (waarde: string) => void
  opties: SelectOptie[]
  plaatshouder?: string
  breedte?: number | string
  ariaLabel?: string
}) {
  return (
    <RadixSelect.Root value={waarde} onValueChange={onChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className="vui-input"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          height: 34, padding: '0 10px', width: breedte,
          background: colors.surfaceAlt, border: `1px solid ${colors.borderStrong}`,
          borderRadius: radius.sm, fontSize: 13, fontWeight: 600, color: colors.bodyStrong, cursor: 'pointer',
        }}
      >
        <RadixSelect.Value placeholder={plaatshouder} />
        <RadixSelect.Icon>
          <svg viewBox="0 0 16 16" fill="none" stroke={colors.muted} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
            <path d="m4 6.5 4 4 4-4" />
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="vui-pop"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          style={{
            zIndex: 65, minWidth: 'var(--radix-select-trigger-width)', maxHeight: 'min(340px, 60vh)',
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: radius.md, boxShadow: shadow.dropdown, overflow: 'hidden',
          }}
        >
          <RadixSelect.Viewport style={{ padding: 5 }}>
            {opties.map((o) => (
              <RadixSelect.Item
                key={o.waarde}
                value={o.waarde}
                className="vui-menu-item"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '7px 9px', borderRadius: radius.sm, fontSize: 13,
                  color: colors.bodyStrong, cursor: 'pointer', outline: 'none', userSelect: 'none',
                }}
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <svg viewBox="0 0 12 12" fill="none" stroke="var(--merk)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={12} height={12}>
                    <path d="m2.5 6.5 2.5 2.5 4.5-5" />
                  </svg>
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
