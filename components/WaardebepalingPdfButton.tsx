'use client'

import { useState } from 'react'
import { radius, colors } from '@/components/ui/tokens'
import { Popover } from '@/components/ui'

interface Props {
  objectId: string
}

type Variant = 'intern' | 'verkoper'

/**
 * Downloadt de waardebepaling-pdf (item 4.7) — zelfde fetch-blob-download
 * patroon als `handlePdfDownload` in `ResultTabs.tsx` (GET met object_id,
 * blob naar een tijdelijke <a download>).
 *
 * Item H4: naast de bestaande interne versie kan de makelaar ook de
 * verkopersversie downloaden (`&voor=verkoper` — geen makelaar-notities, wel
 * het kantoorcontact). Gekozen vorm: een klein "split button"-pijltje naast
 * de hoofdknop dat een Popover met de tweede optie opent — dezelfde rustige
 * onderbouw als de bestaande filterdropdowns in de app, zonder een tweede
 * volwaardige knop in de koprij te zetten.
 */
export function WaardebepalingPdfButton({ objectId }: Props) {
  const [bezig, setBezig] = useState<Variant | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleDownload(variant: Variant) {
    setBezig(variant)
    setFout(null)
    setMenuOpen(false)
    try {
      const url = variant === 'verkoper'
        ? `/api/pdf/waardebepaling?object_id=${objectId}&voor=verkoper`
        : `/api/pdf/waardebepaling?object_id=${objectId}`
      const res = await fetch(url)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? 'PDF genereren mislukt')
      }
      const blob = await res.blob()
      const dlUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'waardebepaling.pdf'
      a.click()
      URL.revokeObjectURL(dlUrl)
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'PDF genereren mislukt')
      window.setTimeout(() => setFout(null), 4000)
    } finally {
      setBezig(null)
    }
  }

  const bezigMet = bezig !== null

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => handleDownload('intern')}
        disabled={bezigMet}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px',
          fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', borderRadius: `${radius.md} 0 0 ${radius.md}`, border: 'none',
          background: 'var(--merk)', color: 'var(--merk-op)',
          cursor: bezigMet ? 'default' : 'pointer', opacity: bezigMet ? 0.7 : 1,
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} width={15} height={15}>
          <path d="M4 2h5l3 3v9H4z" />
          <path d="M9 2v3h3" />
        </svg>
        {bezig === 'intern' ? 'PDF maken…' : 'Waardebepaling-pdf'}
      </button>

      <Popover
        open={menuOpen}
        onOpenChange={setMenuOpen}
        uitlijning="end"
        breedte={240}
        trigger={
          <button
            type="button"
            aria-label="Meer pdf-varianten"
            disabled={bezigMet}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 36,
              borderRadius: `0 ${radius.md} ${radius.md} 0`, border: 'none', borderLeft: '1px solid rgba(255,255,255,.35)',
              background: 'var(--merk)', color: 'var(--merk-op)',
              cursor: bezigMet ? 'default' : 'pointer', opacity: bezigMet ? 0.7 : 1,
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={11} height={11}>
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        }
      >
        <button
          type="button"
          onClick={() => handleDownload('verkoper')}
          disabled={bezigMet}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '8px 8px', border: 'none', background: 'none',
            borderRadius: radius.sm, fontSize: 13, fontWeight: 700, color: colors.text,
            cursor: bezigMet ? 'default' : 'pointer',
          }}
        >
          {bezig === 'verkoper' ? 'PDF maken…' : 'Verkopersversie'}
        </button>
        <p style={{ margin: '2px 8px 0', fontSize: 11.5, lineHeight: 1.4, color: colors.muted }}>
          Zonder je eigen notities, met het kantoorcontact erop — voor de verkoper zelf.
        </p>
      </Popover>

      {fout && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, background: '#FFF5F5', border: '1px solid #F3C6C6', color: '#B42318', borderRadius: radius.sm, padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap', boxShadow: `0 8px 20px ${colors.border}` }}>
          {fout}
        </div>
      )}
    </div>
  )
}
