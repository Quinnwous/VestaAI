'use client'

import { useEffect, useState } from 'react'

interface MakelaarStat {
  id: string
  name: string
  email: string
  objecten: number
}

interface NpsFeedback {
  score: number
  feedback: string
  datum: string
}

interface KostenSchatting {
  deze_maand: number
  budget_maand: number
  per_maand: Record<string, number>
  prijs_per_object: number
}

interface StatsData {
  perMaand: Record<string, number>
  makelaarStats: MakelaarStat[]
  totaalAltijd: number
  gepubliceerd: number
  plan: string
  trialEndsAt: string | null
  isTrialActief: boolean
  dezeMaand: number
  maandLimiet: number | null
  kostenschatting: KostenSchatting
  nps: {
    gemiddeld: number | null
    score: number | null
    totaal: number
    recenteFeedback: NpsFeedback[]
  }
}

const MAAND_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mrt', '04': 'Apr', '05': 'Mei', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dec',
}

export function StatistiekenTab() {
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

  const planLabels: Record<string, string> = { starter: 'Starter', pro: 'Pro', kantoor: 'Kantoor' }
  const tijdBespaard = Math.round(stats.totaalAltijd * 45)
  const tijdLabel = tijdBespaard >= 60
    ? `${Math.floor(tijdBespaard / 60)}u ${tijdBespaard % 60}min`
    : `${tijdBespaard} min`

  return (
    <div className="space-y-8 max-w-xl">
      {/* Abonnement & gebruik */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Abonnement</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">{planLabels[stats.plan] ?? stats.plan}</span>
            {stats.isTrialActief && stats.trialEndsAt && (
              <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                Proefperiode tot {new Date(stats.trialEndsAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </span>
        </div>
        {stats.maandLimiet !== null && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Objecten deze maand</span>
              <span className={stats.dezeMaand >= stats.maandLimiet ? 'text-red-600 font-semibold' : ''}>
                {stats.dezeMaand} / {stats.maandLimiet}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.dezeMaand >= stats.maandLimiet ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((stats.dezeMaand / stats.maandLimiet) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Samenvatting */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Totaal objecten', waarde: stats.totaalAltijd },
          { label: 'Gepubliceerd', waarde: stats.gepubliceerd },
          { label: 'Gem. per maand', waarde: gemiddeld },
        ].map(({ label, waarde }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{waarde}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tijdsbesparing */}
      {stats.totaalAltijd > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-4">
          <div className="text-2xl">⏱</div>
          <div>
            <p className="text-sm font-semibold text-green-900">
              Geschatte tijdsbesparing: <span className="text-green-700">{tijdLabel}</span>
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Op basis van {stats.totaalAltijd} objecten × 45 minuten handmatig schrijven
            </p>
          </div>
        </div>
      )}

      {/* Bar chart: objecten per maand */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Objecten per maand (laatste 6 maanden)</h3>
        <div className="flex items-end gap-3 h-36">
          {maandEntries.map(([key, aantal]) => {
            const [, maand] = key.split('-')
            const hoogte = Math.round((aantal / maxMaand) * 100)
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 tabular-nums">{aantal}</span>
                <div
                  className="w-full rounded-t bg-blue-500 transition-all"
                  style={{ height: `${Math.max(hoogte, 2)}%` }}
                />
                <span className="text-xs text-gray-400">{MAAND_LABELS[maand] ?? maand}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* API-kosten */}
      {stats.kostenschatting && (() => {
        const k = stats.kostenschatting
        const pct = Math.min((k.deze_maand / k.budget_maand) * 100, 100)
        const overschreden = k.deze_maand >= k.budget_maand * 0.9
        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">API-kosten (schatting)</h3>
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Claude API — deze maand</span>
                <span className={`text-sm font-bold ${overschreden ? 'text-amber-600' : 'text-gray-900'}`}>
                  €{k.deze_maand.toFixed(2)} / €{k.budget_maand.toFixed(0)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${overschreden ? 'bg-amber-500' : 'bg-[#1A6B45]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {overschreden && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  API-kosten naderen het maandbudget voor dit plan (€{k.budget_maand}/mo). Overweeg het plan te upgraden.
                </p>
              )}
              <p className="text-xs text-gray-400">
                Schatting op basis van €{k.prijs_per_object.toFixed(2)} per content-set (Claude Sonnet 4.6). Werkelijke kosten kunnen afwijken.
              </p>
            </div>
          </div>
        )
      })()}

      {/* NPS */}
      {stats.nps.totaal > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">NPS — klantfeedback</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className={`text-2xl font-bold ${
                stats.nps.score !== null && stats.nps.score >= 50 ? 'text-green-600'
                : stats.nps.score !== null && stats.nps.score >= 0 ? 'text-amber-600'
                : 'text-red-600'
              }`}>
                {stats.nps.score !== null ? (stats.nps.score > 0 ? '+' : '') + stats.nps.score : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">NPS score</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {stats.nps.gemiddeld !== null ? stats.nps.gemiddeld.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Gem. score /10</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.nps.totaal}</p>
              <p className="text-xs text-gray-500 mt-0.5">Reacties</p>
            </div>
          </div>

          {stats.nps.recenteFeedback.length > 0 && (
            <div className="space-y-2">
              {stats.nps.recenteFeedback.map((fb, i) => (
                <div key={i} className="rounded-lg border border-gray-100 bg-white px-4 py-3 flex items-start gap-3">
                  <span className={`text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 ${
                    fb.score >= 9 ? 'bg-green-100 text-green-700'
                    : fb.score >= 7 ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {fb.score}
                  </span>
                  <p className="text-xs text-gray-700 leading-relaxed">{fb.feedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per makelaar */}
      {stats.makelaarStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Objecten per teamlid</h3>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Naam</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Objecten (6 mnd)</th>
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
                      <span className={`font-semibold ${m.objecten > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
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
