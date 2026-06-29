'use client'

import Link from 'next/link'
import { useState } from 'react'

const STORAGE_KEY = 'vestaai_welcome_dismissed'

export function WelkomBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(STORAGE_KEY)
  })

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-lg">
            👋
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Welkom bij VestaAI!</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Voer je eerste woning in en ontvang direct alle teksten die je nodig hebt:
              Funda-tekst, brochure, social media posts, koper-e-mail en buurtomschrijving.
            </p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <Link
                href="/object/new"
                className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Maak eerste object →
              </Link>
              <Link
                href="/settings"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Stel je huisstijl in
              </Link>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5"
          aria-label="Sluit welkomstbericht"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
