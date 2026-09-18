'use client'

import { useState } from 'react'
import { radius, colors } from '@/components/ui/tokens'

interface Props {
  objectId: string
}

/**
 * Downloadt de waardebepaling-pdf (item 4.7) — zelfde fetch-blob-download
 * patroon als `handlePdfDownload` in `ResultTabs.tsx` (GET met object_id,
 * blob naar een tijdelijke <a download>).
 */
export function WaardebepalingPdfButton({ objectId }: Props) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  async function handleDownload() {
    setBezig(true)
    setFout(null)
    try {
      const res = await fetch(`/api/pdf/waardebepaling?object_id=${objectId}`)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? 'PDF genereren mislukt')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'waardebepaling.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'PDF genereren mislukt')
      window.setTimeout(() => setFout(null), 4000)
    } finally {
      setBezig(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={bezig}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px',
          fontWeight: 700, fontSize: 13, borderRadius: radius.md, border: 'none',
          background: 'var(--merk)', color: 'var(--merk-op)',
          cursor: bezig ? 'default' : 'pointer', opacity: bezig ? 0.7 : 1,
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} width={15} height={15}>
          <path d="M4 2h5l3 3v9H4z" />
          <path d="M9 2v3h3" />
        </svg>
        {bezig ? 'PDF maken…' : 'Waardebepaling-pdf'}
      </button>
      {fout && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, background: '#FFF5F5', border: '1px solid #F3C6C6', color: '#B42318', borderRadius: radius.sm, padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap', boxShadow: `0 8px 20px ${colors.border}` }}>
          {fout}
        </div>
      )}
    </div>
  )
}
