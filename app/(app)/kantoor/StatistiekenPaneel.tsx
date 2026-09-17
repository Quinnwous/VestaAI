'use client'

import { useEffect, useState } from 'react'

interface MakelaarStat {
  id: string
  name: string
  email: string
  objecten: number
}

interface KostenSchatting {
  deze_maand: number
  per_maand: Record<string, number>
  prijs_per_object: number
}

interface StatsData {
  perMaand: Record<string, number>
  makelaarStats: MakelaarStat[]
  totaalAltijd: number
  gepubliceerd: number
  dezeMaand: number
  kostenschatting: KostenSchatting
}

const MAAND_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mrt', '04': 'Apr', '05': 'Mei', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dec',
}

/** Read-only statistiekenoverzicht — iedereen in het kantoor ziet dezelfde cijfers (één rol, zie CLAUDE.md). */
export function StatistiekenPaneel() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.error) setFout(data.error)
        else setStats(data as StatsData)
      })
      .catch(() => setFout('Statistieken laden mislukt'))
      .finally(() => setLaden(false))
  }, [])

  if (laden) {
    return <p className="text-sm text-gray-500 animate-pulse">Statistieken laden...</p>
  }

  if (fout) {
    return <p className="text-sm text-red-600">{fout}</p>
  }

  if (!stats) return null

  const maandEntries = Object.entries(stats.perMaand)
  const maxMaand = Math.max(...maandEntries.map(([, v]) => v), 1)
  const gemiddeld = maandEntries.length > 0
    ? Math.round(maandEntries.reduce((s, [, v]) => s + v, 0) / maandEntries.length)
    : 0

  const tijdBespaard = Math.round(stats.totaalAltijd * 45)
  const tijdLabel = tijdBespaard >= 60
    ? `${Math.floor(tijdBespaard / 60)}u ${tijdBespaard % 60}min`
    : `${tijdBespaard} min`

  return (
    <div className="space-y-8 max-w-xl">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Totaal woningen', waarde: stats.totaalAltijd },
          { label: 'Gepubliceerd', waarde: stats.gepubliceerd },
          { label: 'Gem. per maand', waarde: gemiddeld },
        ].map(({ label, waarde }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{waarde}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {stats.totaalAltijd > 0 && (
        <div className="rounded-xl border border-[var(--merk-rand)] bg-[var(--merk-zacht)] p-4 flex items-center gap-4">
          <div className="text-2xl">⏱</div>
          <div>
            <p className="text-sm font-semibold text-[var(--merk-hover)]">
              Geschatte tijdsbesparing: <span className="text-[var(--merk-hover)]">{tijdLabel}</span>
            </p>
            <p className="text-xs text-[var(--merk-hover)] mt-0.5">
              Op basis van {stats.totaalAltijd} objecten × 45 minuten handmatig schrijven
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Woningen per maand (laatste 6 maanden)</h3>
        <div className="flex items-end gap-3 h-36">
          {maandEntries.map(([key, aantal]) => {
            const [, maand] = key.split('-')
            const hoogte = Math.round((aantal / maxMaand) * 100)
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 tabular-nums">{aantal}</span>
                <div
                  className="w-full rounded-t bg-[var(--merk)] transition-all"
                  style={{ height: `${Math.max(hoogte, 2)}%` }}
                />
                <span className="text-xs text-gray-400">{MAAND_LABELS[maand] ?? maand}</span>
              </div>
            )
          })}
        </div>
      </div>

      {stats.kostenschatting && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">API-kosten (schatting)</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Claude API — deze maand</span>
              <span className="text-sm font-bold text-gray-900">€{stats.kostenschatting.deze_maand.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400">
              Schatting op basis van €{stats.kostenschatting.prijs_per_object.toFixed(2)} per content-set (Claude Sonnet 4.6). Werkelijke kosten kunnen afwijken.
            </p>
          </div>
        </div>
      )}

      {stats.makelaarStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Woningen per teamlid</h3>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Naam</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Woningen (6 mnd)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.makelaarStats.map(m => (
                  <tr key={m.id} className="bg-white">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{m.name || '—'}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-semibold ${m.objecten > 0 ? 'text-[var(--merk)]' : 'text-gray-400'}`}>
                        {m.objecten}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
