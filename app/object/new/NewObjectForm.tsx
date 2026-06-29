'use client'

import { useState, useEffect } from 'react'
import type { PropertyInput, ContentOutput } from '@/lib/schemas'
import { PropertyForm, clearDraft } from '@/components/PropertyForm'
import { LoadingProgress } from '@/components/LoadingProgress'
import { ResultTabs } from '@/components/ResultTabs'
import { NpsModal } from '@/components/NpsModal'

const RATE_LIMIT_SECONDS = 90

type PageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: ContentOutput; objectId: string | null }
  | { status: 'error'; message: string; isLimitError?: boolean; isRateLimit?: boolean }

export function NewObjectForm() {
  const [state, setState] = useState<PageState>({ status: 'idle' })
  const [countdown, setCountdown] = useState(0)

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
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Object invoeren</h2>
          <PropertyForm onSubmit={handleSubmit} />
        </div>
      )}

      {state.status === 'loading' && (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <LoadingProgress />
        </div>
      )}

      {state.status === 'success' && (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <ResultTabs
            data={state.data}
            objectId={state.objectId}
            onReset={handleReset}
          />
          <NpsModal trigger />
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
          {state.isRateLimit ? (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-1">Vorige generatie nog bezig</p>
              <p className="text-sm text-gray-500 mb-4">
                Automatisch opnieuw beschikbaar over <span className="font-mono font-medium text-blue-600">{countdown}s</span>
              </p>
              <div className="w-full max-w-xs mx-auto bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${((RATE_LIMIT_SECONDS - countdown) / RATE_LIMIT_SECONDS) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-red-600 mb-4">{state.message}</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {state.isLimitError ? (
                  <a
                    href="/api/stripe/checkout?plan=solo"
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Kies abonnement →
                  </a>
                ) : (
                  <button
                    onClick={handleReset}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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
