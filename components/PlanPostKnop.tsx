'use client'

import { useState } from 'react'

type Platform = 'instagram' | 'linkedin' | 'email' | 'overig'

interface Props {
  content: string
  platform: Platform
  objectId?: string | null
}

export function PlanPostKnop({ content, platform, objectId }: Props) {
  const [open, setOpen] = useState(false)
  const [datum, setDatum] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [tijd, setTijd] = useState('10:00')
  const [gepland, setGepland] = useState(false)
  const [bezig, setBezig] = useState(false)

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setBezig(true)

    const datumTijd = new Date(`${datum}T${tijd}:00`)
    await fetch('/api/planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        content,
        gepland_op: datumTijd.toISOString(),
        object_id: objectId ?? undefined,
      }),
    })

    setBezig(false)
    setGepland(true)
    setTimeout(() => { setGepland(false); setOpen(false) }, 2000)
  }

  if (gepland) {
    return (
      <span className="text-xs text-green-600 font-medium">✓ Ingepland</span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        📅 Plan
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-60">
          <form onSubmit={handlePlan} className="space-y-3">
            <p className="text-xs font-semibold text-gray-700">Post inplannen</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Datum</label>
              <input
                type="date"
                value={datum}
                onChange={e => setDatum(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tijdstip</label>
              <input
                type="time"
                value={tijd}
                onChange={e => setTijd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={bezig}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {bezig ? '...' : 'Inplannen'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400"
              >
                ✕
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
