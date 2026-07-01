'use client'

import { useState } from 'react'

interface Props {
  objectId: string
}

export function RealworksExportButton({ objectId }: Props) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  async function handleExport() {
    setBezig(true)
    setFout('')

    try {
      const res = await fetch(`/api/export/realworks?id=${objectId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFout(data.error ?? 'Export mislukt')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const header = res.headers.get('Content-Disposition') ?? ''
      const match = header.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? `realworks_${objectId.slice(0, 8)}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setFout('Export mislukt — probeer opnieuw')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={bezig}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-[#1A6B45] hover:text-[#1A6B45] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Exporteer naar Realworks XML"
      >
        {bezig ? (
          <>
            <span className="w-3 h-3 border-2 border-gray-200 border-t-[#1A6B45] rounded-full animate-spin" />
            Exporteren…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Realworks XML
          </>
        )}
      </button>
      {fout && <span className="text-xs text-red-600">{fout}</span>}
    </div>
  )
}
