import type { CSSProperties } from 'react'
import { colors } from './tokens'

export interface SegOption<T extends string> {
  value: T
  label: string
}

/** Segmented control (bv. NL/EN, Origineel/Verbeterd, Lang/Kort). */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  style?: CSSProperties
}) {
  const pad = size === 'sm' ? '7px 13px' : '9px 15px'
  const fs = size === 'sm' ? 12.5 : 13.5
  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${colors.borderStrong}`,
        ...style,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: pad,
              fontSize: fs,
              fontWeight: active ? 700 : 600,
              border: 'none',
              cursor: 'pointer',
              background: active ? colors.primary : colors.surface,
              color: active ? '#fff' : colors.body,
              transition: 'background .15s, color .15s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
