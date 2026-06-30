'use client'

import { useState } from 'react'
import type { PrijswijzigingOutput } from '@/lib/schemas'
import { TabContent } from './TabContent'

interface Props {
  objectId: string
  adres: string
  huidigeprijs: number
}

type Situatie = 'prijsreductie' | 'verkocht'
type Status = 'idle' | 'loading' | 'done' | 'error'

export function PrijswijzigingModal({ objectId, adres, huidigeprijs }: Props) {
  const [open, setOpen] = useState(false)
  const [situatie, setSituatie] = useState<Situatie>('prijsreductie')
  const [nieuweprijs, setNieuweprijs] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [fout, setFout] = useState('')
  const [output, setOutput] = useState<PrijswijzigingOutput | null>(null)
  const [actieveTab, setActieveTab] = useState<keyof PrijswijzigingOutput>('instagram_post')

  const handleGenereer = async () => {
    setStatus('loading')
    setFout('')
    setOutput(null)

    const res = await fetch(`/api/object/${objectId}/prijswijziging`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: situatie,
        nieuweprijs: nieuweprijs ? parseInt(nieuweprijs, 10) : undefined,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setFout(json.error ?? 'Genereren mislukt')
      setStatus('error')
      return
    }
    setOutput(json.output)
    setStatus('done')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Prijswijziging / Verkoop
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Prijswijziging / Verkoop</h2>
            <p className="text-xs text-gray-500 mt-0.5">{adres}</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status !== 'done' && (
          <div className="space-y-4">
            {/* Situatie */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Situatie</p>
              <div className="flex gap-2">
                {(['prijsreductie', 'verkocht'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSituatie(s)}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                      situatie === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {s === 'prijsreductie' ? 'Prijsreductie' : 'Verkocht'}
                  </button>
                ))}
              </div>
            </div>

            {/* Prijs */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {situatie === 'verkocht' ? 'Verkoopprijs (€)' : 'Nieuwe vraagprijs (€)'}
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={nieuweprijs}
                  onChange={e => setNieuweprijs(e.target.value)}
                  placeholder={huidigeprijs.toLocaleString('nl-NL')}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {situatie === 'prijsreductie' && huidigeprijs > 0 && nieuweprijs && (
                  <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                    -{Math.round((1 - parseInt(nieuweprijs) / huidigeprijs) * 100)}%
                  </span>
                )}
              </div>
            </div>

            {fout && <p className="text-xs text-red-600">{fout}</p>}

            <button
              onClick={handleGenereer}
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {status === 'loading' ? 'Genereren...' : 'Genereer content →'}
            </button>
          </div>
        )}

        {status === 'done' && output && (
          <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto">
              {([
                { key: 'instagram_post' as const, label: 'Instagram' },
                { key: 'linkedin_post' as const, label: 'LinkedIn' },
                { key: 'email_geinteresseerden' as const, label: 'E-mail' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActieveTab(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-colors ${
                    actieveTab === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <TabContent content={output[actieveTab]} />
            <button
              onClick={() => { setStatus('idle'); setOutput(null) }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Opnieuw genereren
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
