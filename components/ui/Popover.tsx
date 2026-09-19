'use client'

/**
 * Popover — dropdownpaneel onder een knop, op Radix Popover (kit.css `.pop`).
 * Gebruik: <Popover trigger={<button …/>} titel="Plaats" voet={…}>…</Popover>
 * Radix regelt botsing met de schermrand, Escape, klik-buiten en focus.
 * `uitlijning` = 'start' | 'center' | 'end' t.o.v. de trigger.
 * Het filtermodel dat hierop leunt staat in docs/ontwerp/README.md § 4.
 */

import type { ReactNode } from 'react'
import * as RadixPopover from '@radix-ui/react-popover'
import { colors, radius, shadow } from './tokens'

export function Popover({
  trigger,
  titel,
  voet,
  breedte = 320,
  uitlijning = 'start',
  open,
  onOpenChange,
  children,
}: {
  trigger: ReactNode
  titel?: string
  voet?: ReactNode
  breedte?: number
  uitlijning?: 'start' | 'center' | 'end'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          className="vui-pop"
          align={uitlijning}
          sideOffset={8}
          collisionPadding={12}
          style={{
            zIndex: 55,
            width: `min(${breedte}px, 92vw)`,
            maxHeight: 'min(420px, 70vh)',
            overflowY: 'auto',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            boxShadow: shadow.dropdown,
            padding: 14,
          }}
        >
          {titel && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <b style={{ fontSize: 13, color: colors.text }}>{titel}</b>
              <RadixPopover.Close
                aria-label="Sluiten"
                style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', border: 'none', background: 'none', color: colors.muted, cursor: 'pointer', borderRadius: radius.sm }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" width={13} height={13}>
                  <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
              </RadixPopover.Close>
            </div>
          )}
          {children}
          {voet && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>{voet}</div>
          )}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
