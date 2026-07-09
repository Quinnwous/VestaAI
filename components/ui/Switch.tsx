import { colors } from './tokens'

/** Aan/uit-schakelaar (design: pill met glijdende knop). */
export function Switch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 26,
        borderRadius: 9999,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? colors.primary : '#D5E0DA',
        transition: 'background .18s',
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(14,26,19,.22)',
          transition: 'left .18s',
        }}
      />
    </button>
  )
}
