'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'Funda-tekst schrijven', delay: 18000 },
  { label: 'Brochures opstellen', delay: 32000 },
  { label: 'Instagram-varianten maken', delay: 46000 },
  { label: 'LinkedIn-posts schrijven', delay: 58000 },
  { label: 'Koper-e-mail personaliseren', delay: 68000 },
  { label: 'Buurtomschrijving toevoegen', delay: 77000 },
  { label: 'Energieadvies & subsidies ophalen', delay: 90000 },
  { label: 'Kopersvragen en marktanalyse genereren', delay: 105000 },
]

const TIMEOUT_MS = 125000

function CheckIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <div style={{ width: 16, height: 16, border: '2px solid #1A6B45', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
  )
}

function WaitIcon() {
  return (
    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #DCE5DF', flexShrink: 0 }} />
  )
}

export function LoadingProgress() {
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timers = STEPS.map((step, index) =>
      setTimeout(() => {
        setCompleted(prev => new Set(Array.from(prev).concat(index)))
      }, step.delay),
    )
    const timeoutTimer = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(timeoutTimer)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 30, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 18px', border: '3px solid #E3F0E8', borderTopColor: '#1A6B45', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 28, letterSpacing: '-.01em', color: '#0E1A13', margin: '0 0 6px' }}>
          Content wordt gegenereerd…
        </h1>
        <p style={{ fontSize: 14, color: '#9AA6A0', margin: 0 }}>
          {timedOut
            ? 'Dit duurt wat langer dan normaal — bijna klaar…'
            : 'Even geduld — VestaAI schrijft alles voor u.'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 460, background: '#fff', border: '1px solid #E9EFEB', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {STEPS.map((step, index) => {
          const done = completed.has(index)
          const active = !done && (index === 0 || completed.has(index - 1))
          return (
            <div
              key={step.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 10,
                padding: '9px 14px',
                fontSize: 14,
                transition: 'all .3s',
                background: done ? '#EAF5EE' : active ? '#F1F7F3' : 'transparent',
                color: done ? '#1A6B45' : active ? '#0E3B27' : '#9AA6A0',
              }}
            >
              {done ? <CheckIcon /> : active ? <SpinnerIcon /> : <WaitIcon />}
              <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? .6 : 1 }}>{step.label}</span>
            </div>
          )
        })}
      </div>

      {timedOut && (
        <p style={{ marginTop: 24, fontSize: 13, color: '#9AA6A0', textAlign: 'center', maxWidth: 280 }}>
          Sluit dit scherm niet — de content wordt op de achtergrond nog gegenereerd.
        </p>
      )}
    </div>
  )
}
