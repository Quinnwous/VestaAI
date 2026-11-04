'use client'

import { useEffect } from 'react'
import { DataIllustratie } from '@/components/ui/HuisIllustratie'

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
    // Server logt de volledige fout al gestructureerd (lib/fouten.ts, via meldFout in de
    // API-routes of automatisch door Next voor een render-fout). Hier alleen de referentie
    // client-side loggen — meldFout niet aanroepen vanuit een client component, want dat
    // trekt de server-only bundel (o.a. Supabase-clients) mee in de client-bundle.
    console.error('[AppError]', error.digest ?? error.message)
  }, [error])

  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div className="vui-binnen" style={{ textAlign: 'center', maxWidth: 420 }}>
        {/* Rustig beeld i.p.v. een rood waarschuwingsicoon: een fout is
            meestal tijdelijk, en rood is bij i4 de accentkleur. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <DataIllustratie breedte={150} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#14181B', margin: '0 0 8px' }}>Er is iets misgegaan</h2>
        <p style={{ fontSize: 14, color: '#5C6470', lineHeight: 1.6, margin: '0 0 8px' }}>
          {error.message || 'Onverwachte fout. Probeer het opnieuw.'}
        </p>
        {error.digest && (
          <p style={{ fontSize: 12, color: '#5C6470', margin: '0 0 24px' }}>Referentie: {error.digest}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            className="vui-btn vui-btn-primary"
            style={{ borderRadius: 'var(--merk-radius-md, 10px)', background: 'var(--merk)', color: 'var(--merk-op)', border: 'none', padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Probeer opnieuw
          </button>
          <a href="/dashboard" style={{ fontSize: 14, color: '#5C6470', textDecoration: 'underline' }}>
            Terug naar dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
