'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  berekenWaarderingV2,
  CORRECTIES_STANDAARD,
  type CorrectiesAan,
  type CorrectieNaam,
  type Kandidaat,
  type SubjectV2,
  type WaarderingUitkomst,
} from '@/lib/waardering'
import { berekenWaardering, slaWaarderingCorrectieOp, verwijderWaarderingCorrectie } from '@/app/(app)/object/[id]/waardering-actions'
import type { CbsIndexReeks } from '@/lib/cbsPrijsindex'
import type { DataTotEnMet } from '@/lib/transactiesQuery'
import { Badge, EmptyState, Skeleton, Switch } from '@/components/ui'
import { colors, radius, shadow } from '@/components/ui/tokens'

function formatEuro(n: number | null): string {
  return n !== null ? `€${Math.round(n).toLocaleString('nl-NL')}` : '—'
}

function formatDatum(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('nl-NL')
}

const CORRECTIE_LABEL: Record<CorrectieNaam, string> = {
  garage: 'Garage',
  tuin: 'Tuin',
  energielabel: 'Energielabelklasse',
  bouwperiode: 'Bouwperiode',
  grootte: 'Grootte (m²)',
}

const CORRECTIE_VOLGORDE: CorrectieNaam[] = ['garage', 'tuin', 'energielabel', 'bouwperiode', 'grootte']

const card: React.CSSProperties = { borderRadius: radius.cardLg, border: `1px solid ${colors.border}`, background: colors.surface, padding: 22, boxShadow: shadow.card }
const titelStijl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: colors.text, margin: '0 0 10px' }
const mutedStijl: React.CSSProperties = { fontSize: 12, color: colors.muted, margin: 0 }

type ServerData = {
  subject: SubjectV2
  kandidaten: Kandidaat[]
  regionaal: Kandidaat[] | undefined
  cbs: CbsIndexReeks
  dataTm: DataTotEnMet
}

type Correctie = { waarde: number; motivatie: string; datum: string }

/**
 * Module B — waardering v2 (item 4.3/4.5, docs/roadmap.md § 3.3, methode in
 * docs/waardering-methode.md): op mount haalt de server action
 * `berekenWaardering()` éénmalig kandidaten + regionale set + cbs-index op
 * (en slaat de uitkomst meteen op); de wat-als-correctieschakelaars daarna
 * herrekenen puur client-side met `berekenWaarderingV2()`, zonder nieuwe
 * serveraanroep (§ 3.3, item 4.5). Tot die eerste aanroep klaar is toont het
 * paneel de laatst opgeslagen uitkomst (geen lege flits), en zonder
 * opgeslagen uitkomst een skeleton. De opmaak hieronder is functioneel, niet
 * premium — dat is item 4.6 (`docs/ontwerp/waardebepaling.html`).
 */
export function WaardebepalingPaneel({
  objectId,
  opgeslagenUitkomst,
  opgeslagenCorrectie,
}: {
  objectId: string
  opgeslagenUitkomst: WaarderingUitkomst | null
  opgeslagenCorrectie: Correctie | null
}) {
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [laden, setLaden] = useState(true)
  const [ophaalFout, setOphaalFout] = useState<string | null>(null)
  const [correctiesAan, setCorrectiesAan] = useState<CorrectiesAan>(CORRECTIES_STANDAARD)

  const [correctieModus, setCorrectieModus] = useState(false)
  const [correctieWaarde, setCorrectieWaarde] = useState('')
  const [motivatie, setMotivatie] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [fout, setFout] = useState('')
  const [correctie, setCorrectie] = useState(opgeslagenCorrectie)

  useEffect(() => {
    let actief = true
    berekenWaardering(objectId).then(res => {
      if (!actief) return
      if (res.ok) {
        setServerData({ subject: res.subject, kandidaten: res.kandidaten, regionaal: res.regionaal, cbs: res.cbs, dataTm: res.dataTm })
        setCorrectiesAan(CORRECTIES_STANDAARD)
        if (res.correctie) setCorrectie(res.correctie)
      } else {
        setOphaalFout(res.error)
      }
      setLaden(false)
    })
    return () => { actief = false }
    // objectId is stabiel voor de levensduur van dit paneel — geen andere deps nodig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId])

  const uitkomst: WaarderingUitkomst | null = useMemo(() => {
    if (!serverData) return opgeslagenUitkomst
    return berekenWaarderingV2(serverData.subject, serverData.kandidaten, {
      regionaal: serverData.regionaal,
      cbs: serverData.cbs,
      correcties: correctiesAan,
    })
  }, [serverData, correctiesAan, opgeslagenUitkomst])

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

  if (!uitkomst) {
    if (laden) {
      return (
        <div style={{ display: 'grid', gap: 16 }}>
          <Skeleton height={140} rounded={radius.cardLg} />
          <Skeleton height={90} rounded={radius.cardLg} />
        </div>
      )
    }
    return (
      <EmptyState
        titel="Nog geen waardebepaling"
        beschrijving={ophaalFout ?? 'Er zijn nog geen vergelijkbare verkopen gevonden om een waarde op te baseren — dit vult zich zodra transacties zijn geïmporteerd.'}
      />
    )
  }

  const straalLabel = uitkomst.straal_m == null ? null : uitkomst.straal_m >= 1000 ? `${uitkomst.straal_m / 1000} km` : `${uitkomst.straal_m} m`
  const indexBasisLabel = uitkomst.index_basis === 'eigen' ? 'eigen data' : uitkomst.index_basis === 'cbs' ? 'CBS' : 'geen correctie'

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <p style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 6px' }}>
          Onderbouwde indicatie — geen taxatie
        </p>

        {correctie ? (
          <>
            <p style={{ fontSize: 30, fontWeight: 700, color: colors.text, margin: '0 0 4px' }}>{formatEuro(correctie.waarde)}</p>
            <p style={{ fontSize: 12.5, color: colors.body, margin: '0 0 4px' }}>Bijgesteld door de makelaar — model gaf {formatEuro(uitkomst.waarde)}</p>
            <p style={{ fontSize: 12.5, color: colors.muted, fontStyle: 'italic', margin: 0 }}>&ldquo;{correctie.motivatie}&rdquo;</p>
            <button type="button" onClick={verwijderen} disabled={status === 'saving'} style={{ marginTop: 8, fontSize: 12, color: colors.muted, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
              Correctie verwijderen
            </button>
          </>
        ) : uitkomst.waarde !== null ? (
          <p style={{ fontSize: 30, fontWeight: 700, color: colors.text, margin: '0 0 4px' }}>
            {formatEuro(uitkomst.laag)} – {formatEuro(uitkomst.hoog)}
          </p>
        ) : (
          <p style={{ fontSize: 15, fontWeight: 600, color: colors.body, margin: '0 0 4px' }}>
            Nog geen waarde te bepalen{uitkomst.waarschuwingen[0] ? ` — ${uitkomst.waarschuwingen[0]}` : ''}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 0' }}>
          <Badge>n = {uitkomst.n}</Badge>
          {straalLabel && <Badge>straal {straalLabel}</Badge>}
          {uitkomst.methode === 'plaats' && <Badge>op plaats + type</Badge>}
          {uitkomst.index_tm && <Badge>index t/m {uitkomst.index_tm} ({indexBasisLabel})</Badge>}
          {serverData?.dataTm.laatsteVerkoopdatum && <Badge>data t/m {formatDatum(serverData.dataTm.laatsteVerkoopdatum)}</Badge>}
        </div>

        {uitkomst.waarschuwingen.length > 0 && (
          <div style={{ marginTop: 8, display: 'grid', gap: 2 }}>
            {uitkomst.waarschuwingen.map(w => (
              <p key={w} style={{ fontSize: 12, color: '#D97706', fontWeight: 600, margin: 0 }}>⚠ {w}</p>
            ))}
          </div>
        )}

        {!correctieModus && !correctie && (
          <button type="button" onClick={() => { setCorrectieModus(true); setCorrectieWaarde(String(uitkomst.waarde ?? '')) }} style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Zelf bijstellen
          </button>
        )}
        {!correctieModus && correctie && (
          <button type="button" onClick={() => { setCorrectieModus(true); setCorrectieWaarde(String(correctie.waarde)); setMotivatie(correctie.motivatie) }} style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Correctie aanpassen
          </button>
        )}

        {correctieModus && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${colors.borderSoft}`, paddingTop: 14, display: 'grid', gap: 8, maxWidth: 420 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: colors.text }}>Eigen inschatting (€)</label>
            <input type="number" value={correctieWaarde} onChange={e => setCorrectieWaarde(e.target.value)} style={{ borderRadius: 8, border: `1px solid ${colors.borderStrong}`, padding: '8px 10px', fontSize: 13.5 }} />
            <label style={{ fontSize: 12.5, fontWeight: 700, color: colors.text }}>Waarom wijk je af? <span style={{ fontWeight: 500, color: colors.muted }}>(verplicht — gaat mee in het verkoopadvies)</span></label>
            <textarea value={motivatie} onChange={e => setMotivatie(e.target.value)} rows={2} placeholder="Bijv: hoekligging met dieper perceel dan de referenties" style={{ borderRadius: 8, border: `1px solid ${colors.borderStrong}`, padding: '8px 10px', fontSize: 13.5, resize: 'none' }} />
            {status === 'error' && <p style={{ fontSize: 12, color: '#DC2626' }}>{fout}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={opslaan} disabled={status === 'saving'} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--merk)', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                {status === 'saving' ? 'Opslaan…' : 'Opslaan'}
              </button>
              <button type="button" onClick={() => setCorrectieModus(false)} style={{ fontSize: 13, color: colors.body, background: 'none', border: 'none', cursor: 'pointer' }}>Annuleer</button>
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <p style={titelStijl}>Wat-als: correcties {!serverData && <span style={{ fontWeight: 400, color: colors.muted }}>(laden…)</span>}</p>
        <div style={{ display: 'grid', gap: 12 }}>
          {CORRECTIE_VOLGORDE.map(naam => {
            const info = uitkomst.correcties[naam]
            const toepasbaar = naam === 'grootte' ? uitkomst.grootte !== null : uitkomst.effecten[naam] !== null
            const tekst = !info ? 'geen data' : info.toelichting === 'geen data' ? 'niet toepasbaar — te weinig data' : info.toelichting
            return (
              <div key={naam} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: colors.text, margin: 0 }}>{CORRECTIE_LABEL[naam]}</p>
                  <p style={mutedStijl}>{tekst}</p>
                </div>
                <Switch
                  checked={correctiesAan[naam] ?? true}
                  onChange={aan => setCorrectiesAan(prev => ({ ...prev, [naam]: aan }))}
                  disabled={!serverData || !toepasbaar}
                  ariaLabel={`${CORRECTIE_LABEL[naam]} meewegen in de waarde`}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div style={card}>
        <p style={titelStijl}>Referentietransacties ({uitkomst.referenties.length})</p>
        {uitkomst.referenties.length === 0 ? (
          <p style={mutedStijl}>Geen vergelijkbare verkopen binnen het werkgebied gevonden.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>Adres</th>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>Afstand</th>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>Datum</th>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>Prijs</th>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>m²</th>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>€/m²</th>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>Index</th>
                  <th style={{ padding: '0 8px 8px 0', fontWeight: 700 }}>Gewicht</th>
                  <th style={{ padding: '0 0 8px 0', fontWeight: 700 }}>Geïmpliceerd</th>
                </tr>
              </thead>
              <tbody>
                {uitkomst.referenties.map(r => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${colors.borderSoft}`, background: r.handmatig ? colors.tint : undefined }}>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.text }}>{r.adres}{r.handmatig ? ' · handmatig' : ''}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.body }}>{r.afstand_m != null ? `${r.afstand_m} m` : '—'}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.body }}>{formatDatum(r.verkoopdatum)}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.body }}>{formatEuro(r.prijs)}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.body }}>{r.m2}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.body }}>{formatEuro(r.prijs_m2)}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.body }}>×{r.index_factor}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: colors.body }}>{r.gewicht.toFixed(2)}</td>
                    <td style={{ padding: '6px 0', color: colors.text, fontWeight: 600 }}>{formatEuro(r.waarde_geimpliceerd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
