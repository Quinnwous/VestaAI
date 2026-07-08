import type { CSSProperties, ReactNode } from 'react'
import { colors, radius, serifFont, shadow } from './tokens'

/** Overlay-modal (design: donkere backdrop, witte kaart, serif-titel + ×). */
export function Modal({
  onClose,
  title,
  children,
  maxWidth = 560,
  bodyStyle,
}: {
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  maxWidth?: number
  bodyStyle?: CSSProperties
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(14,26,19,.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth,
          background: colors.surface,
          borderRadius: radius.cardXl,
          boxShadow: shadow.modal,
          padding: 28,
          maxHeight: '88vh',
          overflowY: 'auto',
          ...bodyStyle,
        }}
      >
        {title != null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <h2
              style={{
                fontFamily: serifFont,
                fontWeight: 500,
                fontSize: 24,
                letterSpacing: '-.01em',
                color: colors.text,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              style={{
                background: 'none',
                border: 'none',
                color: colors.muted,
                fontSize: 24,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
