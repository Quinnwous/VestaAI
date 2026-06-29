'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'Funda-tekst schrijven', delay: 20000 },
  { label: 'Brochures opstellen', delay: 38000 },
  { label: 'Instagram-varianten maken', delay: 52000 },
  { label: 'LinkedIn-posts schrijven', delay: 63000 },
  { label: 'Koper-e-mail personaliseren', delay: 73000 },
  { label: 'Buurtomschrijving toevoegen', delay: 82000 },
]

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
  )
}

function WaitIcon() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
  )
}

export function LoadingProgress() {
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  useEffect(() => {
    const timers = STEPS.map((step, index) =>
      setTimeout(() => {
        setCompleted(prev => new Set(Array.from(prev).concat(index)))
      }, step.delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Content wordt gegenereerd</h2>
        <p className="text-sm text-gray-400">Even geduld — je assistent is aan het werk</p>
      </div>

      <div className="w-full max-w-xs space-y-2.5">
        {STEPS.map((step, index) => {
          const done = completed.has(index)
          const active = !done && (index === 0 || completed.has(index - 1))
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-300 ${
                done
                  ? 'bg-green-50 text-green-800'
                  : active
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-gray-400'
              }`}
            >
              {done ? <CheckIcon /> : active ? <SpinnerIcon /> : <WaitIcon />}
              <span className={done ? 'line-through opacity-60' : ''}>{step.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
