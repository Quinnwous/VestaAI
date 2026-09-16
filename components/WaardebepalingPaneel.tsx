'use client'

import { useMemo, useState } from 'react'
import { berekenWaardering, type Subject, type WatAlsKenmerken } from '@/lib/waardering'
import { slaWaarderingCorrectieOp, verwijderWaarderingCorrectie } from '@/app/(app)/object/[id]/waardering-actions'
import type { TransactieRow } from '@/lib/supabase'

function formatEuro(n: number | null): string {
  return n !== null ? `€${n.toLocaleString('nl-NL')}` : '—'
}

/**
 * Module B — waardering (F7, besluit 16 sep 2026, zie CLAUDE.md §
 * Hoofdstructuur): modulaire aan/uit-blokken, referentieselectie met
 * bandbreedte, en een correctie die de makelaar met motivatie kan vastleggen.
 * Onderbouwde indicatie voor het verkoopadvies — geen NWWI-taxatie.
 */
export function WaardebepalingPaneel({
  objectId,
  subject,
  heeftGarage,
  heeftTuin,
  dataset,
  opgeslagenCorrectie,
}: {
  objectId: string
  subject: Subject
  heeftGarage: boolean
  heeftTuin: boolean
  dataset: TransactieRow[]
  opgeslagenCorrectie: { waarde: number; motivatie: string; datum: string } | null
}) {
  const [aanUit, setAanUit] = useState<WatAlsKenmerken>({ garage: true, tuin: true })
  const [correctieModus, setCorrectieModus] = useState(false)
  const [correctieWaarde, setCorrectieWaarde] = useState('')
  const [motivatie, setMotivatie] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [fout, setFout] = useState('')
  const [correctie, setCorrectie] = useState(opgeslagenCorrectie)

  const resultaat = useMemo(
    () => berekenWaardering(subject, { heeftGarage, heeftTuin }, dataset, aanUit),
    [subject, heeftGarage, heeftTuin, dataset, aanUit],
  )

  const opslaan = async () => {
    const waarde = Number(correctieWaarde)
    setStatus('saving'); setFout('')
    const res = await slaWaarderingCorrectieOp(objectId, waarde, motivatie)
    if (res.ok) {
      setCorrectie(res.correctie!)
      setCorrectieModus(false)
      setStatus('idle')
    } else {
      setStatus('error'); setFout(res.error)
    }
  }

  const verwijderen = async () => {
    setStatus('saving')
    const res = await verwijderWaarderingCorrectie(objectId)
    if (res.ok) { setCorrectie(null); setStatus('idle') } else { setStatus('error'); setFout(res.error) }
  }

  if (resultaat.midden === null) {
    return (
      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px dashed #E1E5E9', background: '#FAFBFB', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6', maxWidth: 380, margin: '0 auto' }}>
          Nog geen vergelijkbare verkopen in de dataset om een waarde op te baseren — dit vult zich zodra transacties zijn geïmporteerd.
        </p>
      </div>
    )
  }

  // Losse const i.p.v. resultaat.midden: TS-narrowing van een member-expressie
  // gaat verloren zodra hij via een closure (de onClick's hieronder) gelezen wordt.
  const midden = resultaat.midden

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', background: '#fff', padding: 22 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#98A0A6', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 6px' }}>Onderbouwde indicatie — geen taxatie</p>

        {correctie ? (
          <>
            <p style={{ fontSize: 30, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>{formatEuro(correctie.waarde)}</p>
            <p style={{ fontSize: 12.5, color: '#5C6470', margin: '0 0 4px' }}>Bijgesteld door de makelaar — model gaf {formatEuro(resultaat.midden)}</p>
            <p style={{ fontSize: 12.5, color: '#98A0A6', fontStyle: 'italic', margin: 0 }}>&ldquo;{correctie.motivatie}&rdquo;</p>
            <button type="button" onClick={verwijderen} disabled={status === 'saving'} style={{ marginTop: 8, fontSize: 12, color: '#98A0A6', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
              Correctie verwijderen
            </button>
          </>
        ) : (
          <p style={{ fontSize: 30, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>
            {formatEuro(resultaat.laag)} – {formatEuro(resultaat.hoog)}
          </p>
        )}

        <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '6px 0 0' }}>
          Gebaseerd op {resultaat.aantalReferenties} vergelijkbare verko{resultaat.aantalReferenties === 1 ? 'op' : 'pen'} · mediaan €{resultaat.m2PrijsMediaan?.toLocaleString('nl-NL')}/m²
        </p>
        {resultaat.weinigData && (
          <p style={{ fontSize: 12, color: '#D97706', margin: '6px 0 0', fontWeight: 600 }}>
            ⚠ Weinig referenties — bandbreedte is bewust ruim gehouden. Zie dit als indicatie, niet als harde wetmatigheid.
          </p>
        )}

        {!correctieModus && !correctie && (
          <button type="button" onClick={() => { setCorrectieModus(true); setCorrectieWaarde(String(midden)) }} style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--merk,#1A6B45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Zelf bijstellen
          </button>
        )}
        {!correctieModus && correctie && (
          <button type="button" onClick={() => { setCorrectieModus(true); setCorrectieWaarde(String(correctie.waarde)); setMotivatie(correctie.motivatie) }} style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--merk,#1A6B45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Correctie aanpassen
          </button>
        )}

        {correctieModus && (
          <div style={{ marginTop: 14, borderTop: '1px solid #EBEEF1', paddingTop: 14, display: 'grid', gap: 8, maxWidth: 420 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#14181B' }}>Eigen inschatting (€)</label>
            <input type="number" value={correctieWaarde} onChange={e => setCorrectieWaarde(e.target.value)} style={{ borderRadius: 8, border: '1px solid #E1E5E9', padding: '8px 10px', fontSize: 13.5 }} />
            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#14181B' }}>Waarom wijk je af? <span style={{ fontWeight: 500, color: '#98A0A6' }}>(verplicht — gaat mee in het verkoopadvies)</span></label>
            <textarea value={motivatie} onChange={e => setMotivatie(e.target.value)} rows={2} placeholder="Bijv: hoekligging met dieper perceel dan de referenties" style={{ borderRadius: 8, border: '1px solid #E1E5E9', padding: '8px 10px', fontSize: 13.5, resize: 'none' }} />
            {status === 'error' && <p style={{ fontSize: 12, color: '#DC2626' }}>{fout}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={opslaan} disabled={status === 'saving'} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--merk,#1A6B45)', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                {status === 'saving' ? 'Opslaan…' : 'Opslaan'}
              </button>
              <button type="button" onClick={() => setCorrectieModus(false)} style={{ fontSize: 13, color: '#5C6470', background: 'none', border: 'none', cursor: 'pointer' }}>Annuleer</button>
            </div>
          </div>
        )}
      </div>

      {(resultaat.kenmerkEffecten.garage || resultaat.kenmerkEffecten.tuin) && (
        <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', background: '#fff', padding: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 10px' }}>Wat-als-scenario&apos;s</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {resultaat.kenmerkEffecten.garage && heeftGarage && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#14181B' }}>
                <input type="checkbox" checked={aanUit.garage} onChange={e => setAanUit(a => ({ ...a, garage: e.target.checked }))} />
                Garage meetellen ({resultaat.kenmerkEffecten.garage.verschilPct > 0 ? '+' : ''}{resultaat.kenmerkEffecten.garage.verschilPct}%, o.b.v. {resultaat.kenmerkEffecten.garage.aantalMet} vs. {resultaat.kenmerkEffecten.garage.aantalZonder} referenties)
              </label>
            )}
            {resultaat.kenmerkEffecten.tuin && heeftTuin && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#14181B' }}>
                <input type="checkbox" checked={aanUit.tuin} onChange={e => setAanUit(a => ({ ...a, tuin: e.target.checked }))} />
                Tuin meetellen ({resultaat.kenmerkEffecten.tuin.verschilPct > 0 ? '+' : ''}{resultaat.kenmerkEffecten.tuin.verschilPct}%, o.b.v. {resultaat.kenmerkEffecten.tuin.aantalMet} vs. {resultaat.kenmerkEffecten.tuin.aantalZonder} referenties)
              </label>
            )}
          </div>
        </div>
      )}

      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', background: '#fff', padding: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 10px' }}>Referentietransacties ({resultaat.referenties.length})</p>
        <div style={{ display: 'grid', gap: 6 }}>
          {resultaat.referenties.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid #F1F3F5' }}>
              <span style={{ color: '#14181B' }}>{r.adres}</span>
              <span style={{ color: '#98A0A6' }}>{r.woonoppervlak_m2} m² · €{Math.round(r.m2Prijs).toLocaleString('nl-NL')}/m² · {r.verkoopdatum ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
