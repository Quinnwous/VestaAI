'use client'

import { useRef, useState, useTransition } from 'react'
import { setObjectStatus } from './actions'

type ObjectStatus = 'draft' | 'published' | 'onder_bod' | 'verkocht'

const STATUS_CONFIG: Record<ObjectStatus, { label: string; kleur: string; punt: string }> = {
  draft: { label: 'Concept', kleur: 'bg-gray-100 text-gray-600 hover:bg-gray-200', punt: 'bg-gray-400' },
  published: { label: 'Gepubliceerd', kleur: 'bg-green-100 text-green-700 hover:bg-green-200', punt: 'bg-green-500' },
  onder_bod: { label: 'Onder bod', kleur: 'bg-amber-100 text-amber-700 hover:bg-amber-200', punt: 'bg-amber-500' },
  verkocht: { label: 'Verkocht', kleur: 'bg-blue-100 text-blue-700 hover:bg-blue-200', punt: 'bg-blue-500' },
}

interface Props {
  objectId: string
  initialStatus: ObjectStatus
}

export function StatusToggle({ objectId, initialStatus }: Props) {
  const [status, setStatus] = useState<ObjectStatus>(initialStatus)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleKies = (nieuw: ObjectStatus) => {
    setOpen(false)
    if (nieuw === status) return
    startTransition(async () => {
      const result = await setObjectStatus(objectId, nieuw)
      if (result.ok && result.status) {
        setStatus(result.status as ObjectStatus)
      }
    })
  }

  const config = STATUS_CONFIG[status]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${config.kleur} disabled:opacity-60`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.punt}`} />
        {isPending ? 'Opslaan…' : config.label}
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-1 text-xs overflow-hidden">
            {(Object.keys(STATUS_CONFIG) as ObjectStatus[]).map(s => (
              <button
                key={s}
                onClick={() => handleKies(s)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                  s === status ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[s].punt}`} />
                {STATUS_CONFIG[s].label}
                {s === status && (
                  <svg className="w-3 h-3 ml-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
