'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import type { CbsNiveau, VerrijkingOpslag } from '@/lib/schemas'
import { euro } from '@/lib/opmaak'
import { WOZ_LOKET_URL } from '@/lib/woz'

/**
 * WOZ-kaart in "Buurt & data" (besluit 24 sep 2026, zie lib/woz.ts): de WOZ
 * per woning vult de makelaar zelf in — er is geen gratis, toegestane WOZ-API.
 * Volgorde: ingevuld door het kantoor → automatisch (als er ooit een bron
 * gekoppeld wordt) → het CBS-buurtgemiddelde, expliciet als "niet deze woning".
 */

type CbsMetriek = { waarde: number; niveau: CbsNiveau }
type WozAutomatisch = NonNullable<VerrijkingOpslag['woz']>

const NIVEAU_TEKST: Record<CbsNiveau, string> = { buurt: 'de buurt', wijk: 'de wijk', gemeente: 'de gemeente', nederland: 'Nederland' }

export function WozKaart({
  objectId,
  handmatigInitieel,
  automatisch,
  buurtGemiddelde,
  cbsBron,
}: {
  objectId: string
  handmatigInitieel: { waarde: number; peiljaar: number } | null
  automatisch: WozAutomatisch | null
  buurtGemiddelde: CbsMetriek | null
  cbsBron: string | null
}) {
  const router = useRouter()
  const [handmatig, setHandmatig] = useState(handmatigInitieel)
  const [bewerken, setBewerken] = useState(false)
  const [waarde, setWaarde] = useState(handmatigInitieel ? String(handmatigInitieel.waarde) : '')
  const [peiljaar, setPeiljaar] = useState(handmatigInitieel ? String(handmatigInitieel.peiljaar) : '')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const opslaan = async (leeg = false) => {
    setBezig(true)
    setFout('')
    try {
      const res = await fetch(`/api/object/${objectId}/woz`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leeg ? { waarde: null, peiljaar: null } : { waarde: waarde.replace(/[.\s€]/g, ''), peiljaar }),
      })
      const json = await res.json().catch(() => null) as { woz?: { waarde: number; peiljaar: number } | null; error?: string } | null
      if (!res.ok) {
        setFout(json?.error ?? 'Opslaan mislukt. Probeer het opnieuw.')
        return
      }
      setHandmatig(json?.woz ?? null)
      if (leeg) { setWaarde(''); setPeiljaar('') }
      setBewerken(false)
      // De waardering leest het WOZ-ijkpunt server-side (waardering-actions.ts).
      router.refresh()
    } catch {
      setFout('Er ging iets mis met de verbinding.')
    } finally {
      setBezig(false)
    }
  }

  const buurtRegel = buurtGemiddelde && (
    <p style={bronStijl}>
      Gemiddeld in {NIVEAU_TEKST[buurtGemiddelde.niveau]}: {euro(buurtGemiddelde.waarde)} ({cbsBron ?? 'CBS'})
    </p>
  )

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <p style={blokLabel}>WOZ-waarde</p>
        {!bewerken && (
          <button type="button" onClick={() => setBewerken(true)} style={linkKnop}>
            {handmatig ? 'Wijzig' : 'WOZ-waarde invullen'}
          </button>
        )}
      </div>

      {bewerken ? (
        <form
          onSubmit={(e) => { e.preventDefault(); void opslaan() }}
          style={{ display: 'grid', gap: 12, marginTop: 12 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label style={veldLabel}>
              WOZ-waarde (€)
              <Input inputMode="numeric" autoFocus placeholder="bijv. 845000" value={waarde} onChange={(e) => setWaarde(e.target.value)} />
            </label>
            <label style={veldLabel}>
              Waardepeildatum (jaar)
              <Input inputMode="numeric" placeholder="bijv. 2025" maxLength={4} value={peiljaar} onChange={(e) => setPeiljaar(e.target.value)} />
            </label>
          </div>
          <p style={{ ...bronStijl, margin: 0 }}>
            Staat op de WOZ-beschikking van de verkoper, of zoek de woning op in het{' '}
            <a href={WOZ_LOKET_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--merk)', fontWeight: 600 }}>
              WOZ-waardeloket ↗
            </a>
            . Peildatum 1 januari 2025 hoort bij belastingjaar 2026.
          </p>
          {fout && <p style={{ fontSize: 12.5, color: '#DC2626', margin: 0 }}>{fout}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button type="submit" size="sm" disabled={bezig}>{bezig ? 'Opslaan…' : 'Opslaan'}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={bezig} onClick={() => { setBewerken(false); setFout('') }}>Annuleer</Button>
            {handmatig && (
              <Button type="button" size="sm" variant="ghost" disabled={bezig} onClick={() => void opslaan(true)}>Wis</Button>
            )}
          </div>
        </form>
      ) : handmatig ? (
        <div style={{ marginTop: 8 }}>
          <div style={cijferGroot}>{euro(handmatig.waarde)}</div>
          <p style={bronStijl}>Peildatum 1 januari {handmatig.peiljaar} · belastingjaar {handmatig.peiljaar + 1} · ingevuld door je kantoor</p>
          {buurtRegel}
        </div>
      ) : automatisch && automatisch.waarden.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div style={cijferGroot}>{euro(automatisch.waarden[0].waarde)}</div>
          <p style={bronStijl}>Peildatum {automatisch.waarden[0].peildatum} · belastingjaar {automatisch.waarden[0].belastingjaar}</p>
          {buurtRegel}
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {buurtGemiddelde ? (
            <>
              <div style={cijferKlein}>{euro(buurtGemiddelde.waarde)}</div>
              <p style={bronStijl}>
                Gemiddelde WOZ-waarde van woningen in {NIVEAU_TEKST[buurtGemiddelde.niveau]} — niet de waarde van deze woning ({cbsBron ?? 'CBS'})
              </p>
            </>
          ) : (
            <p style={legeTekst}>Nog geen WOZ-waarde voor deze woning.</p>
          )}
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  borderRadius: 'var(--merk-radius-card-lg, 18px)',
  background: '#fff',
  border: '1px solid #E6E9EC',
  padding: 20,
  boxShadow: '0 2px 12px rgba(20,24,27,.04)',
}
const blokLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#14181B', margin: 0 }
const bronStijl: React.CSSProperties = { fontSize: 11.5, color: '#98A0A6', margin: '10px 0 0' }
const legeTekst: React.CSSProperties = { fontSize: 13, color: '#98A0A6', margin: 0 }
const cijferGroot: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: '#14181B', fontVariantNumeric: 'tabular-nums' }
const cijferKlein: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: '#14181B', fontVariantNumeric: 'tabular-nums' }
const veldLabel: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 12.5, fontWeight: 650, color: '#5C6470' }
const linkKnop: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', background: 'none', border: 'none',
  cursor: 'pointer', padding: 0, textDecoration: 'underline', whiteSpace: 'nowrap',
}
