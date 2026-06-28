'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'Funda-tekst schrijven', delay: 25000 },
  { label: 'Brochures opstellen', delay: 40000 },
  { label: 'Instagram-varianten maken', delay: 55000 },
  { label: 'LinkedIn-posts schrijven', delay: 65000 },
  { label: 'Koper-e-mail personaliseren', delay: 75000 },
  { label: 'Buurtomschrijving toevoegen', delay: 85000 },
]

export function LoadingProgress() {
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  useEffect(() => {
    const timers = STEPS.map((step, index) =>
      setTimeout(() => {
        setCompleted(prev => new Set([...prev, index]))
      }, step.delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Content wordt gegenereerd</h2>
        <p className="text-sm text-gray-500">Gemiddeld 60–90 seconden</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, index) => {
          const done = completed.has(index)
          const active = !done && (index === 0 || completed.has(index - 1))
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all ${
                done
                  ? 'bg-green-50 text-green-800'
                  : active
                  ? 'bg-blue-50 text-blue-800'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="text-base">
                {done ? '✅' : active ? '⏳' : '○'}
              </span>
              <span className={done ? 'line-through opacity-70' : ''}>{step.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
