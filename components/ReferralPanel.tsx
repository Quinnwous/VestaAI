'use client'

import { useEffect, useState } from 'react'

interface ReferralData {
  referral_code: string | null
  totaal: number
  beloond: number
  recente: Array<{ id: string; reward_applied: boolean; datum: string }>
}

interface Props {
  isAdmin: boolean
}

export function ReferralPanel({ isAdmin }: Props) {
  const [data, setData] = useState<ReferralData | null>(null)
  const [laden, setLaden] = useState(true)
  const [gekopieerd, setGekopieerd] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/referral')
      .then(r => r.json())
      .then(d => setData(d as ReferralData))
      .catch(() => setData(null))
      .finally(() => setLaden(false))
  }, [isAdmin])

  if (!isAdmin) return null

  const referralUrl = data?.referral_code
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://vestaai.nl'}/login?ref=${data.referral_code}`
    : null

  function kopieer() {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl).then(() => {
      setGekopieerd(true)
      setTimeout(() => setGekopieerd(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Doorverwijzingsprogramma</h3>
        <p className="text-xs text-gray-500">Deel uw unieke link. Nieuwe klanten krijgen 44 dagen gratis (i.p.v. 14), u verdient 1 maand gratis zodra ze betaald abonnee worden.</p>
      </div>

      {laden ? (
        <p className="text-xs text-gray-400 animate-pulse">Laden...</p>
      ) : !data?.referral_code ? (
        <p className="text-xs text-gray-400">Referral-code niet beschikbaar. Migratie <code>20260701_referrals.sql</code> nog toepassen in Supabase.</p>
      ) : (
        <>
          {/* Link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 truncate">
              {referralUrl}
            </div>
            <button
              onClick={kopieer}
              className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-[#1A6B45] hover:text-[#1A6B45] transition-colors"
            >
              {gekopieerd ? 'Gekopieerd ✓' : 'Kopieer'}
            </button>
          </div>

          {/* Statistieken */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-center">
              <p className="text-xl font-bold text-gray-900">{data.totaal}</p>
              <p className="text-xs text-gray-500">Doorverwijzingen</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-center">
              <p className="text-xl font-bold text-[#1A6B45]">{data.beloond}</p>
              <p className="text-xs text-gray-500">Beloningen verdiend</p>
            </div>
          </div>

          {data.recente.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recente doorverwijzingen</p>
              {data.recente.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs text-gray-600">
                  <span>{new Date(r.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className={`font-semibold ${r.reward_applied ? 'text-[#1A6B45]' : 'text-gray-400'}`}>
                    {r.reward_applied ? '✓ Beloond' : 'Proefperiode'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
