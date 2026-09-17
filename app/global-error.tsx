'use client'

/**
 * Vangt fouten in de root-layout zelf (bv. `app/layout.tsx` crasht). Moet daarom zelf
 * `<html><body>` renderen en mag niet op de kantoor-huisstijl leunen — die kan juist de
 * oorzaak van de crash zijn. Neutraal en formeel (geen ingelogde context meer bekend hier),
 * VestaAI-groen mag. Houd de tekst "Er is iets misgegaan" gelijk aan `app/error.tsx` en
 * `app/(app)/error.tsx` — de DoD-scripts (`scripts/lib/dodSessie.mjs`, `toontFoutstaat`)
 * herkennen een foutstaat aan die exacte tekst.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nl">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            background: '#FFFFFF',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#DC2626" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#14181B', margin: '0 0 8px' }}>
              Er is iets misgegaan
            </h2>
            <p style={{ fontSize: 14, color: '#5C6470', lineHeight: 1.6, margin: '0 0 8px' }}>
              Onverwachte fout. Probeer het opnieuw.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: '#98A0A6', margin: '0 0 24px' }}>Referentie: {error.digest}</p>
            )}
            <button
              onClick={reset}
              style={{
                borderRadius: 10,
                background: '#1A6B45',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Probeer opnieuw
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
