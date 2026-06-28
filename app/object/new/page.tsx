'use client'

import { useState } from 'react'
import type { PropertyInput, ContentOutput } from '@/lib/schemas'
import { PropertyForm } from '@/components/PropertyForm'
import { LoadingProgress } from '@/components/LoadingProgress'
import { ResultTabs } from '@/components/ResultTabs'

type PageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: ContentOutput }
  | { status: 'error'; message: string }

export default function NewObjectPage() {
  const [state, setState] = useState<PageState>({ status: 'idle' })

  const handleSubmit = async (input: PropertyInput) => {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Genereren mislukt')
      setState({ status: 'success', data })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Onbekende fout',
      })
    }
  }

  const handleReset = () => setState({ status: 'idle' })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">VestaAI</h1>
          <p className="mt-2 text-gray-500">Professionele vastgoedcontent in 90 seconden.</p>
        </div>

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
            <ResultTabs data={state.data} onReset={handleReset} />
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-red-600 mb-4">⚠️ {state.message}</p>
            <button
              onClick={handleReset}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Probeer opnieuw
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
