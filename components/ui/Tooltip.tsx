'use client'

/**
 * Tooltip — korte toelichting bij hover én focus, op Radix Tooltip.
 * Gebruik: <Tooltip tekst="Aantal verkopen in de periode"><button …/></Tooltip>
 * Eén <TooltipProvider> hoort hoog in de boom (staat in app/(app)/layout.tsx).
 * Alleen voor toelichting, nooit voor informatie die je nodig hebt om te kiezen —
 * die hoort zichtbaar in beeld (docs/ontwerpprincipes.md).
 */

import type { ReactNode } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import { colors, radius, shadow } from './tokens'

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={220} skipDelayDuration={400}>{children}</RadixTooltip.Provider>
}

export function Tooltip({
  tekst,
  kant = 'top',
  children,
}: {
  tekst: ReactNode
  kant?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactNode
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          className="vui-pop"
          side={kant}
          sideOffset={6}
          collisionPadding={10}
          style={{
            zIndex: 70,
            maxWidth: 260,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            boxShadow: shadow.dropdown,
            padding: '8px 11px',
            fontSize: 12.5,
            lineHeight: 1.45,
            color: colors.bodyStrong,
          }}
        >
          {tekst}
          <RadixTooltip.Arrow width={10} height={5} style={{ fill: colors.surface }} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
