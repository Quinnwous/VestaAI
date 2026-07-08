import type {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { colors } from './tokens'

/** Basis-inputstijl (design: #FBFCFB → #fff op focus via .vui-input). */
export function fieldStyle(style?: CSSProperties): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 12,
    border: `1px solid ${colors.borderStrong}`,
    padding: '12px 14px',
    fontSize: 14,
    color: colors.text,
    background: colors.bg,
    outline: 'none',
    fontFamily: 'inherit',
    ...style,
  }
}

export function Label({
  children,
  htmlFor,
  hint,
  style,
}: {
  children: ReactNode
  htmlFor?: string
  hint?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: hint ? 'space-between' : 'flex-start',
        marginBottom: 8,
        ...style,
      }}
    >
      <label htmlFor={htmlFor} style={{ fontSize: 13.5, fontWeight: 700, color: colors.text }}>
        {children}
      </label>
      {hint && <span style={{ fontSize: 12, color: colors.muted }}>{hint}</span>}
    </div>
  )
}

export function Input({
  className,
  style,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={['vui-input', className].filter(Boolean).join(' ')}
      style={fieldStyle(style)}
      {...rest}
    />
  )
}

export function Textarea({
  className,
  style,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={['vui-input', className].filter(Boolean).join(' ')}
      style={fieldStyle({ resize: 'vertical', lineHeight: 1.55, ...style })}
      {...rest}
    />
  )
}

export function Select({
  className,
  style,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={['vui-input', className].filter(Boolean).join(' ')}
      style={fieldStyle({ cursor: 'pointer', ...style })}
      {...rest}
    >
      {children}
    </select>
  )
}
