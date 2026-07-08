import type { CSSProperties, ReactNode } from 'react'
import { colors, radius, shadow } from './tokens'

type CardVariant = 'default' | 'tinted' | 'dashed' | 'plain'

const VARIANTS: Record<CardVariant, CSSProperties> = {
  default: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.card,
  },
  tinted: {
    background: colors.tint2,
    border: `1px solid ${colors.greenBorder2}`,
  },
  dashed: {
    background: colors.surface,
    border: `2px dashed ${colors.borderStrong}`,
  },
  plain: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
  },
}

/** Witte kaart met hairline-rand + zachte schaduw; tinted/dashed varianten. */
export function Card({
  children,
  variant = 'default',
  pad = 22,
  rounded = radius.cardLg,
  hover = false,
  className,
  style,
  ...rest
}: {
  children: ReactNode
  variant?: CardVariant
  pad?: number | string
  rounded?: number
  hover?: boolean
  className?: string
  style?: CSSProperties
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'className'>) {
  return (
    <div
      className={[hover ? 'vui-card-hover' : '', className].filter(Boolean).join(' ') || undefined}
      style={{
        borderRadius: rounded,
        padding: pad,
        boxSizing: 'border-box',
        ...VARIANTS[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
