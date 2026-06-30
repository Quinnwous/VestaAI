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
    <div style={{ borderRadius: 18, background: '#F1F7F3', border: '1px solid #D5E8DD', padding: '22px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#1A6B45', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
            👋
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 6 }}>Welkom bij VestaAI</p>
            <p style={{ fontSize: 14, color: '#445249', lineHeight: 1.6 }}>
              Voer uw eerste woning in en ontvang direct alle teksten: Funda-tekst, brochure, social media posts, koper-e-mail en buurtomschrijving.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
              <Link
                href="/object/new"
                style={{ display: 'inline-block', borderRadius: 10, background: '#1A6B45', padding: '9px 18px', fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.2)' }}
              >
                Maak eerste object →
              </Link>
              <Link
                href="/settings"
                style={{ fontSize: 13, color: '#1A6B45', textDecoration: 'underline' }}
              >
                Stel uw huisstijl in
              </Link>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Sluit welkomstbericht"
          style={{ color: '#9AA6A0', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, marginTop: 2 }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
