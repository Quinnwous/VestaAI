'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setPlan, grantGratisToegang, setActief } from './actions'

export type KantoorRow = {
  id: string
  name: string
  plan: 'starter' | 'pro' | 'kantoor' | null
  trialEndsAt: string | null
  createdAt: string
  aantalMakelaars: number
  aantalObjecten: number
  adminEmail: string | null
  actief: boolean
}

const PLAN_OPTIES: { value: string; label: string }[] = [
  { value: 'gratis', label: 'Gratis / trial' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'kantoor', label: 'Kantoor' },
]

function statusLabel(row: KantoorRow): { label: string; klasse: string } {
  if (!row.actief) return { label: 'Gedeactiveerd', klasse: 'bg-red-100 text-red-700' }
  if (row.plan) return { label: row.plan.charAt(0).toUpperCase() + row.plan.slice(1), klasse: 'bg-blue-100 text-blue-700' }
  if (row.trialEndsAt && new Date(row.trialEndsAt) > new Date()) {
    const dagen = Math.ceil((new Date(row.trialEndsAt).getTime() - Date.now()) / 86400000)
    return { label: dagen > 90 ? 'Gratis' : `Trial (${dagen}d)`, klasse: 'bg-amber-100 text-amber-700' }
  }
  return { label: 'Verlopen', klasse: 'bg-gray-100 text-gray-600' }
}

export function AdminBeheer({ rows }: { rows: KantoorRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [bezigId, setBezigId] = useState<string | null>(null)

  const voerUit = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBezigId(id)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) alert(res.error ?? 'Er ging iets mis')
      setBezigId(null)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Kantoor</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Gebr.</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Obj.</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Plan wijzigen</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Acties</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map(row => {
            const status = statusLabel(row)
            const bezig = pending && bezigId === row.id
            return (
              <tr key={row.id} className={bezig ? 'opacity-50' : ''}>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900 text-xs">{row.name}</p>
                  <p className="text-gray-400 text-xs">{row.adminEmail ?? '—'}</p>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${status.klasse}`}>{status.label}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-700">{row.aantalMakelaars}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700">{row.aantalObjecten}</td>
                <td className="px-4 py-2.5">
                  <select
                    defaultValue={row.plan ?? 'gratis'}
                    disabled={bezig}
                    onChange={e => {
                      const v = e.target.value
                      const plan = v === 'gratis' ? null : (v as 'starter' | 'pro' | 'kantoor')
                      voerUit(row.id, () => setPlan(row.id, plan))
                    }}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                  >
                    {PLAN_OPTIES.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={bezig}
                      onClick={() => voerUit(row.id, () => grantGratisToegang(row.id))}
                      className="text-xs font-medium text-green-700 hover:text-green-800 disabled:opacity-40"
                    >
                      Gratis toegang
                    </button>
                    <button
                      type="button"
                      disabled={bezig}
                      onClick={() => {
                        const actie = row.actief ? 'deactiveren' : 'heractiveren'
                        if (confirm(`Kantoor "${row.name}" ${actie}?`)) {
                          voerUit(row.id, () => setActief(row.id, !row.actief))
                        }
                      }}
                      className={`text-xs font-medium disabled:opacity-40 ${row.actief ? 'text-red-600 hover:text-red-700' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                      {row.actief ? 'Deactiveren' : 'Heractiveren'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-400">Nog geen kantoren</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
