'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { colors, radius, serifFont, shadow } from './tokens'

/**
 * Overlay-modal (design: donkere backdrop, witte kaart, serif-titel + ×).
 * Sluit bij een klik buiten het paneel én met Escape (docs/ontwerpprincipes.md
 * § Interactie: elke modal sluit met Escape).
 */
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
  // Ref, zodat een nieuwe onClose-functie per render de listener niet steeds
  // opnieuw hoeft te registreren.
  const sluit = useRef(onClose)
  sluit.current = onClose
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') sluit.current() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(20,24,27,.42)',
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
