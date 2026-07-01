'use client'

import { useState, useEffect } from 'react'
import type { PropertyInput, ContentOutput } from '@/lib/schemas'
import { PropertyForm, clearDraft } from '@/components/PropertyForm'
import { LoadingProgress } from '@/components/LoadingProgress'
import { ResultTabs } from '@/components/ResultTabs'
import { NpsModal } from '@/components/NpsModal'

const RATE_LIMIT_SECONDS = 90

const DRAFT_KEY = 'vestaai_form_draft'

const DEMO_DATA: PropertyInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype: 'Appartement',
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1890,
  energielabel: 'D',
  vraagprijs: 595000,
  usps: 'Authentieke gevelwoning op de Herengracht · originele details bewaard · lichte woonkamer met grachtzicht · moderne open keuken · gerenoveerde badkamer · loopafstand van Jordaan en centrum',
  doelgroep: 'Jonge gezinnen',
  taal: 'nl',
}

type PageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: ContentOutput; objectId: string | null }
  | { status: 'error'; message: string; isLimitError?: boolean; isRateLimit?: boolean }

const card: React.CSSProperties = {
  borderRadius: 20,
  background: '#fff',
  border: '1px solid #E9EFEB',
  padding: '32px 28px',
  boxShadow: '0 2px 16px rgba(14,26,19,.05)',
}

export function NewObjectForm() {
  const [state, setState] = useState<PageState>({ status: 'idle' })
  const [countdown, setCountdown] = useState(0)
  const [formKey, setFormKey] = useState(0)
  const isLoading = state.status === 'loading'

  function fillDemo() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(DEMO_DATA)) } catch { /* ignore */ }
    setFormKey(k => k + 1)
  }

  useEffect(() => {
    if (!isLoading) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isLoading])

  useEffect(() => {
    if (state.status !== 'error' || !state.isRateLimit) return
    setCountdown(RATE_LIMIT_SECONDS)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setState({ status: 'idle' })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [state])

  const handleSubmit = async (input: PropertyInput) => {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json()
      if (!res.ok) {
        setState({
          status: 'error',
          message: json.error ?? 'Genereren mislukt',
          isLimitError: res.status === 402,
          isRateLimit: res.status === 429,
        })
        return
      }
      clearDraft()
      try {
        const count = parseInt(localStorage.getItem('vestaai_generated_count') ?? '0', 10)
        localStorage.setItem('vestaai_generated_count', String(count + 1))
      } catch { /* ignore */ }
      setState({
        status: 'success',
        data: json.output ?? json,
        objectId: json.object_id ?? null,
      })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Onbekende fout',
      })
    }
  }

  const handleReset = () => setState({ status: 'idle' })

  return (
    <>
      {state.status === 'idle' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', margin: 0 }}>Object invoeren</h2>
            <button
              type="button"
              onClick={fillDemo}
              style={{ fontSize: 13, fontWeight: 600, color: '#1A6B45', background: '#EAF5EE', border: '1px solid #C7E6D5', borderRadius: 9, padding: '7px 13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Probeer met voorbeeldadres →
            </button>
          </div>
          <PropertyForm key={formKey} onSubmit={handleSubmit} />
        </div>
      )}

      {state.status === 'loading' && (
        <div style={card}>
          <LoadingProgress />
        </div>
      )}

      {state.status === 'success' && (
        <div style={card}>
          <ResultTabs
            data={state.data}
            objectId={state.objectId}
            onReset={handleReset}
          />
          <NpsModal trigger={
            typeof window !== 'undefined'
              ? parseInt(localStorage.getItem('vestaai_generated_count') ?? '0', 10) >= 3
              : false
          } />
        </div>
      )}

      {state.status === 'error' && (
        <div style={{ ...card, textAlign: 'center' }}>
          {state.isRateLimit ? (
            <>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 6 }}>Vorige generatie nog bezig</p>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 20 }}>
                Automatisch opnieuw beschikbaar over{' '}
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1A6B45' }}>{countdown}s</span>
              </p>
              <div style={{ width: '100%', maxWidth: 280, margin: '0 auto', background: '#F1F7F3', borderRadius: 9999, height: 6 }}>
                <div
                  style={{ background: '#1A6B45', height: 6, borderRadius: 9999, transition: 'width 1s', width: `${((RATE_LIMIT_SECONDS - countdown) / RATE_LIMIT_SECONDS) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: '#DC2626', marginBottom: 20 }}>{state.message}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                {state.isLimitError ? (
                  <a
                    href="/api/stripe/checkout?plan=starter"
                    style={{ borderRadius: 11, background: '#1A6B45', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}
                  >
                    Kies abonnement →
                  </a>
                ) : (
                  <button
                    onClick={handleReset}
                    style={{ borderRadius: 11, background: '#1A6B45', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}
                  >
                    Probeer opnieuw
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
