'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'vestaai_nps_submitted'

interface NpsModalProps {
  trigger: boolean
}

export function NpsModal({ trigger }: NpsModalProps) {
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle')

  useEffect(() => {
    if (!trigger) return
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setOpen(true), 3000)
    return () => clearTimeout(t)
  }, [trigger])

  const handleSubmit = async () => {
    if (score === null) return
    setStatus('submitting')
    try {
      await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback }),
      })
    } catch {
      // stil falen — NPS is niet kritiek
    }
    localStorage.setItem(STORAGE_KEY, '1')
    setStatus('done')
    setTimeout(() => setOpen(false), 2000)
  }

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-4 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 p-6 sm:p-8">
        {status === 'done' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900">Bedankt voor je feedback!</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-gray-900">Hoe waarschijnlijk is het dat je VestaAI aanbeveelt?</p>
                <p className="text-xs text-gray-500 mt-0.5">0 = absoluut niet · 10 = zeker weten</p>
              </div>
              <button onClick={handleDismiss} className="text-gray-300 hover:text-gray-500 ml-4 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Score knoppen */}
            <div className="flex gap-1.5 mb-5 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  className={`flex-1 min-w-[28px] rounded-lg py-2 text-sm font-semibold transition-colors ${
                    score === i
                      ? i >= 9
                        ? 'bg-green-600 text-white'
                        : i >= 7
                        ? 'bg-blue-600 text-white'
                        : 'bg-orange-500 text-white'
                      : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Open vraag */}
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Wat mis je het meest? (optioneel)"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={score === null || status === 'submitting'}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {status === 'submitting' ? 'Versturen...' : 'Verstuur feedback'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Overslaan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
