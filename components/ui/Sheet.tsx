'use client'

/**
 * Sheet (drawer) — paneel dat vanaf de rechterkant inschuift, op Radix Dialog.
 * Gebruik: <Sheet open={o} onOpenChange={setO} titel="Referentie toevoegen">…</Sheet>
 * Radix regelt focus-trap, Escape, scroll-lock, focus-herstel en aria-*.
 * `breedte` is de maximale breedte in px (standaard 430, altijd ≤ 92vw).
 * `voet` staat vast onderaan; de inhoud ertussen scrollt.
 */

import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { colors, radius, shadow } from './tokens'

export function Sheet({
  open,
  onOpenChange,
  titel,
  omschrijving,
  breedte = 430,
  voet,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  titel: string
  omschrijving?: string
  breedte?: number
  voet?: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="vui-sluier"
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,27,.38)', zIndex: 58 }}
        />
        <Dialog.Content
          className="vui-sheet"
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 59,
            width: `min(${breedte}px, 92vw)`,
            background: colors.surface,
            borderLeft: `1px solid ${colors.border}`,
            boxShadow: shadow.modal,
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 20px 14px', borderBottom: `1px solid ${colors.border}` }}>
            <div>
              <Dialog.Title style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em', color: colors.text, margin: 0 }}>
                {titel}
              </Dialog.Title>
              {omschrijving ? (
                <Dialog.Description style={{ fontSize: 12.5, color: colors.muted, margin: '3px 0 0' }}>
                  {omschrijving}
                </Dialog.Description>
              ) : (
                // Radix waarschuwt in de console zonder Description; die van ons is optioneel.
                <Dialog.Description style={{ display: 'none' }}>{titel}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Sluiten"
              style={{ flex: 'none', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: radius.sm, border: 'none', background: 'none', color: colors.muted, cursor: 'pointer' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" width={15} height={15}>
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </Dialog.Close>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>{children}</div>

          {voet && (
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, background: colors.surfaceAlt }}>{voet}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
