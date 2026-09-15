'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActief } from './actions'

export type KantoorRow = {
  id: string
  name: string
  createdAt: string
  aantalMakelaars: number
  aantalObjecten: number
  adminEmail: string | null
  actief: boolean
}

function statusLabel(row: KantoorRow): { label: string; klasse: string } {
  if (!row.actief) return { label: 'Gedeactiveerd', klasse: 'bg-red-100 text-red-700' }
  return { label: 'Actief', klasse: 'bg-green-100 text-green-700' }
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
                  <div className="flex items-center justify-end gap-2">
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
              <td colSpan={5} className="px-4 py-6 text-center text-xs text-gray-400">Nog geen kantoren</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
