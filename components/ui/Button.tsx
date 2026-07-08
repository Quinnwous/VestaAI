import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { colors, radius, shadow } from './tokens'

export type BtnVariant = 'primary' | 'secondary' | 'ghost'
export type BtnSize = 'sm' | 'md' | 'lg'

const SIZE: Record<BtnSize, CSSProperties> = {
  sm: { padding: '9px 16px', fontSize: 13, borderRadius: radius.sm },
  md: { padding: '11px 18px', fontSize: 13.5, borderRadius: 11 },
  lg: { padding: '14px 22px', fontSize: 15, borderRadius: radius.md },
}

const VARIANT: Record<BtnVariant, CSSProperties> = {
  primary: {
    background: colors.primary,
    color: '#fff',
    border: 'none',
    fontWeight: 700,
    boxShadow: shadow.btn,
  },
  secondary: {
    background: colors.surface,
    color: colors.body,
    border: `1px solid ${colors.borderStrong}`,
    fontWeight: 600,
  },
  ghost: {
    background: 'none',
    color: colors.body,
    border: 'none',
    fontWeight: 600,
  },
}

/** className voor hover-states (inline styles kunnen geen :hover). */
export function buttonClass(variant: BtnVariant = 'primary'): string {
  return `vui-btn vui-btn-${variant}`
}

/** Losse style — voor <a>/<Link>/form-submit die geen <Button> kunnen zijn. */
export function buttonStyle(
  variant: BtnVariant = 'primary',
  size: BtnSize = 'md',
  opts: { full?: boolean } = {},
): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    lineHeight: 1.1,
    width: opts.full ? '100%' : undefined,
    ...SIZE[size],
    ...VARIANT[variant],
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  className,
  style,
  children,
  ...rest
}: {
  variant?: BtnVariant
  size?: BtnSize
  full?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[buttonClass(variant), className].filter(Boolean).join(' ')}
      style={{ ...buttonStyle(variant, size, { full }), ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}
