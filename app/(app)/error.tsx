'use client'

import { useEffect } from 'react'

/**
 * Foutscherm binnen de ingelogde omgeving. Bestaat apart van `app/error.tsx` omdat een
 * error-boundary in deze route-group binnen de (app)-layout rendert: de `--merk*`-variabelen
 * staan er dus nog, zodat ook een foutmelding de kleuren van het kantoor draagt in plaats
 * van VestaAI-groen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#DC2626" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#14181B', margin: '0 0 8px' }}>Er is iets misgegaan</h2>
        <p style={{ fontSize: 14, color: '#5C6470', lineHeight: 1.6, margin: '0 0 24px' }}>
          {error.message || 'Onverwachte fout. Probeer het opnieuw.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            className="vui-btn vui-btn-primary"
            style={{ borderRadius: 'var(--merk-radius-md, 10px)', background: 'var(--merk)', color: 'var(--merk-op)', border: 'none', padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Probeer opnieuw
          </button>
          <a href="/woningen" style={{ fontSize: 14, color: '#5C6470', textDecoration: 'underline' }}>
            Terug naar je woningen
          </a>
        </div>
      </div>
    </main>
  )
}
