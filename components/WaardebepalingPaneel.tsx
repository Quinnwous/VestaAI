'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  berekenWaarderingV2,
  CORRECTIES_STANDAARD,
  type CorrectiesAan,
  type CorrectieNaam,
  type Kandidaat,
  type SubjectV2,
  type WaarderingReferentie,
  type WaarderingUitkomst,
} from '@/lib/waardering'
import {
  berekenWaardering,
  herstelReferentie,
  slaWaarderingCorrectieOp,
  sluitReferentieUit,
  verwijderToegevoegdeReferentie,
  verwijderWaarderingCorrectie,
  voegReferentiesToe,
  zoekWaarderingReferenties,
} from '@/app/(app)/object/[id]/waardering-actions'
import type { CbsIndexReeks } from '@/lib/cbsPrijsindex'
import type { DataTotEnMet } from '@/lib/transactiesQuery'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { colors, radius, shadow } from '@/components/ui/tokens'
import { WaarderingKaartClient } from '@/components/WaarderingKaartClient'
import { WaardebepalingPdfButton } from '@/components/WaardebepalingPdfButton'

function formatEuro(n: number | null): string {
  return n !== null ? `€ ${Math.round(n).toLocaleString('nl-NL')}` : '—'
}

function formatDatum(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CORRECTIE_LABEL: Record<CorrectieNaam, string> = {
  garage: 'Garage',
  tuin: 'Tuin',
  energielabel: 'Energielabelklasse',
  bouwperiode: 'Bouwperiode',
  grootte: 'Grootte (m²)',
}

const CORRECTIE_VOLGORDE: CorrectieNaam[] = ['garage', 'tuin', 'energielabel', 'bouwperiode', 'grootte']

// ── Kaartstijlen (poort van docs/ontwerp/waardebepaling.html + kit.css) ────
const card: React.CSSProperties = { borderRadius: radius.cardLg, border: `1px solid ${colors.border}`, background: colors.surface, padding: 22, boxShadow: shadow.card }
const titelStijl: React.CSSProperties = { fontSize: 15.5, fontWeight: 800, color: colors.text, margin: '0 0 2px', letterSpacing: '-.01em' }
const mutedStijl: React.CSSProperties = { fontSize: 12, color: colors.muted, margin: 0 }
const CHECK_SVG = (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={12} height={12}>
    <path d="m2.5 6.5 2.5 2.5 4.5-5" />
  </svg>
)

function chipStyle(variant: 'uit' | 'neutraal' | 'toegepast'): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: '0 14px',
    borderRadius: radius.pill, fontWeight: 700, fontSize: 12.5, border: `1px solid ${colors.borderStrong}`,
    background: colors.surface, color: colors.bodyStrong, cursor: 'pointer', transition: 'all 150ms',
  }
  if (variant === 'uit') return { ...base, color: colors.muted }
  if (variant === 'neutraal') return { ...base, background: '#EEF1F5' }
  return { ...base, background: 'var(--merk)', borderColor: 'var(--merk)', color: 'var(--merk-op)' }
}

const RESPONSIVE_CSS = `
.wb-grid { display: grid; grid-template-columns: minmax(0,5fr) minmax(0,7fr); gap: 16px; align-items: start; }
@media (max-width: 980px) { .wb-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) {
  .wb-hero-val { font-size: 34px !important; }
  .wb-woz-row { flex-direction: column; align-items: flex-start !important; gap: 4px; }
  .wb-woz-v { text-align: left !important; }
  .wb-kaart-vlak { height: 300px !important; }
}
`

type ServerData = {
  subject: SubjectV2
  kandidaten: Kandidaat[]
  regionaal: Kandidaat[] | undefined
  cbs: CbsIndexReeks
  dataTm: DataTotEnMet
  woz: { waarde: number; peildatum: string } | null
}

type Correctie = { waarde: number; motivatie: string; datum: string }

/** Getal-tween (~400ms ease-out), zelfde patroon als components/ui/StatTile.tsx — geen exported hook daar, dus lokaal. */
function useTweenGetal(waarde: number | null, duurMs = 400): number | null {
  const [weergegeven, setWeergegeven] = useState<number | null>(waarde)
  const vorige = useRef<number | null>(waarde)
  useEffect(() => {
    const verminderd = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (waarde === null) { setWeergegeven(null); vorige.current = null; return }
    if (verminderd || vorige.current === null) { setWeergegeven(waarde); vorige.current = waarde; return }
    const van = vorige.current
    if (van === waarde) return
    let frame: number
    const start = performance.now()
    const tick = (nu: number) => {
      const t = Math.min(1, (nu - start) / duurMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setWeergegeven(Math.round(van + (waarde - van) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
      else vorige.current = waarde
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [waarde, duurMs])
  return weergegeven
}

function correctiesPil(correcties: Partial<Record<CorrectieNaam, number>>) {
  const keys = Object.keys(correcties) as CorrectieNaam[]
  if (keys.length === 0) {
    return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: radius.pill, background: '#EEF1F5', color: colors.muted, fontWeight: 700, fontSize: 12 }}>–</span>
  }
  return (
    <>
      {keys.map(k => (
        <span key={k} style={{ display: 'inline-block', marginRight: 4, padding: '2px 10px', borderRadius: radius.pill, background: 'var(--merk-zacht)', color: 'var(--merk-diep)', fontWeight: 700, fontSize: 12 }}>
          {CORRECTIE_LABEL[k]} ×{correcties[k]!.toFixed(2)}
        </span>
      ))}
    </>
  )
}

/**
 * Waardebepalingspaneel (item 4.6, premium port van `docs/ontwerp/waardebepaling.html`
 * — het prototype ís de spec, docs/roadmap.md § 3.8) + item 4.4 (referenties
 * handmatig uitsluiten/toevoegen). Rekenkern blijft `lib/waardering.ts`
 * (v2, ongewijzigd): op mount haalt `berekenWaardering()` éénmalig kandidaten +
 * regionale set + cbs-index + WOZ-ijkpunt + de opgeslagen handmatige selectie
 * op (en slaat de uitkomst meteen op); wat-als-correcties én handmatig
 * uitsluiten/toevoegen herrekenen daarna puur client-side met
 * `berekenWaarderingV2()`, zonder nieuwe serveraanroep — de mutatie-acties
 * (`sluitReferentieUit`/`herstelReferentie`/`voegReferentiesToe`/
 * `verwijderToegevoegdeReferentie`) persisteren op de achtergrond ("fire and
 * forget", optimistic UI, net als de wat-als-schakelaars al deden).
 *
 * Uitsluiten van een automatisch geselecteerde referentie gaat via
 * `handmatig.uitgesloten` (filtert vóór `kiesReferenties()`); een handmatig
 * tóégevoegde referentie omzeilt die selectie bewust, dus "uitsluiten" is
 * daar hetzelfde als "verwijderen" (`verwijderToegevoegdeReferentie`) — een
 * kleine, lokale kandidaat-cache (`handmatigKandidaten`) houdt 'm bewaard
 * zodat "Herstel" 'm zonder nieuwe zoekactie kan terugzetten.
 */
export function WaardebepalingPaneel({
  objectId,
  address,
  opgeslagenUitkomst,
  opgeslagenCorrectie,
}: {
  objectId: string
  address?: string
  opgeslagenUitkomst: WaarderingUitkomst | null
  opgeslagenCorrectie: Correctie | null
}) {
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [laden, setLaden] = useState(true)
  const [ophaalFout, setOphaalFout] = useState<string | null>(null)
  const [herberekenBezig, setHerberekenBezig] = useState(false)
  const [correctiesAan, setCorrectiesAan] = useState<CorrectiesAan>(CORRECTIES_STANDAARD)

  // Item 4.4 — handmatige referentieselectie (client-state; server persisteert op de achtergrond)
  const [uitgeslotenIds, setUitgeslotenIds] = useState<Set<string>>(new Set())
  const [handmatigKandidaten, setHandmatigKandidaten] = useState<Record<string, Kandidaat>>({})
  const [snapshots, setSnapshots] = useState<Record<string, WaarderingReferentie>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerZoek, setDrawerZoek] = useState('')
  const [drawerResultaten, setDrawerResultaten] = useState<Kandidaat[]>([])
  const [drawerBezig, setDrawerBezig] = useState(false)

  const [correctieModus, setCorrectieModus] = useState(false)
  const [correctieWaarde, setCorrectieWaarde] = useState('')
  const [motivatie, setMotivatie] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [fout, setFout] = useState('')
  const [correctie, setCorrectie] = useState(opgeslagenCorrectie)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  function toon(bericht: string) {
    setToast(bericht)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => {
    let actief = true
    berekenWaardering(objectId).then(res => {
      if (!actief) return
      if (res.ok) {
        setServerData({ subject: res.subject, kandidaten: res.kandidaten, regionaal: res.regionaal, cbs: res.cbs, dataTm: res.dataTm, woz: res.woz })
        setCorrectiesAan(CORRECTIES_STANDAARD)
        setUitgeslotenIds(new Set(res.handmatigUitgesloten))
        setHandmatigKandidaten(Object.fromEntries(res.handmatigToegevoegd.map(k => [k.id, k])))
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

  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    let actief = true
    setDrawerBezig(true)
    const timer = window.setTimeout(async () => {
      const res = await zoekWaarderingReferenties(objectId, drawerZoek)
      if (!actief) return
      if (res.ok) setDrawerResultaten(res.kandidaten)
      setDrawerBezig(false)
    }, 250)
    return () => { actief = false; window.clearTimeout(timer) }
  }, [drawerOpen, drawerZoek, objectId])

  const toegevoegdActief = useMemo(
    () => Object.values(handmatigKandidaten).filter(k => !uitgeslotenIds.has(k.id)),
    [handmatigKandidaten, uitgeslotenIds],
  )

  const uitkomst: WaarderingUitkomst | null = useMemo(() => {
    if (!serverData) return opgeslagenUitkomst
    return berekenWaarderingV2(serverData.subject, serverData.kandidaten, {
      regionaal: serverData.regionaal,
      cbs: serverData.cbs,
      correcties: correctiesAan,
      handmatig: { uitgesloten: Array.from(uitgeslotenIds), toegevoegd: toegevoegdActief },
      woz: serverData.woz,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverData, correctiesAan, uitgeslotenIds, toegevoegdActief])

  // Tabelrijen = actieve referenties + zo-net uitgesloten rijen (uit hun
  // snapshot, zodat ze dimmed met een Herstel-knop blijven staan i.p.v.
  // spoorloos te verdwijnen) — matcht het prototype-gedrag.
  const tabelRijen = useMemo(() => {
    if (!uitkomst) return []
    const actieveIds = new Set(uitkomst.referenties.map(r => r.id))
    const uitgeslotenRijen = Object.values(snapshots).filter(s => uitgeslotenIds.has(s.id) && !actieveIds.has(s.id))
    return [...uitkomst.referenties, ...uitgeslotenRijen].sort((a, b) => b.gewicht - a.gewicht)
  }, [uitkomst, snapshots, uitgeslotenIds])

  const coordsById = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number }>()
    serverData?.kandidaten.forEach(k => { if (k.lat != null && k.lng != null) m.set(k.id, { lat: k.lat, lng: k.lng }) })
    return m
  }, [serverData])

  const kaartReferenties = useMemo(() => {
    if (!uitkomst) return []
    return uitkomst.referenties
      .map(r => { const c = coordsById.get(r.id); return c ? { ...r, lat: c.lat, lng: c.lng } : null })
      .filter((r): r is WaarderingReferentie & { lat: number; lng: number } => r !== null)
  }, [uitkomst, coordsById])

  const gewogenTween = useTweenGetal(uitkomst?.waarde ?? null)

  function onUitsluiten(ref: WaarderingReferentie) {
    setSnapshots(s => ({ ...s, [ref.id]: ref }))
    setUitgeslotenIds(s => new Set(s).add(ref.id))
    if (ref.handmatig) void verwijderToegevoegdeReferentie(objectId, ref.id)
    else void sluitReferentieUit(objectId, ref.id)
    toon('Referentie uitgesloten — waarde herberekend')
  }

  function onHerstellen(ref: WaarderingReferentie) {
    setUitgeslotenIds(s => { const n = new Set(s); n.delete(ref.id); return n })
    if (ref.handmatig) void voegReferentiesToe(objectId, [ref.id])
    else void herstelReferentie(objectId, ref.id)
    toon('Referentie hersteld — waarde herberekend')
  }

  function kandidaatToevoegen(k: Kandidaat) {
    setHandmatigKandidaten(prev => ({ ...prev, [k.id]: k }))
    setUitgeslotenIds(prev => { if (!prev.has(k.id)) return prev; const n = new Set(prev); n.delete(k.id); return n })
    void voegReferentiesToe(objectId, [k.id])
    toon('Referentie toegevoegd — waarde herberekend')
  }

  async function herbereken() {
    setHerberekenBezig(true)
    const res = await berekenWaardering(objectId, { correcties: correctiesAan })
    if (res.ok) {
      setServerData({ subject: res.subject, kandidaten: res.kandidaten, regionaal: res.regionaal, cbs: res.cbs, dataTm: res.dataTm, woz: res.woz })
      setUitgeslotenIds(new Set(res.handmatigUitgesloten))
      setHandmatigKandidaten(Object.fromEntries(res.handmatigToegevoegd.map(k => [k.id, k])))
      toon('Waarde herberekend')
    } else {
      toon(res.error)
    }
    setHerberekenBezig(false)
  }

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
          <Skeleton height={280} rounded={radius.cardLg} />
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
  const heroBadge: React.CSSProperties = { background: 'rgba(255,255,255,.16)', color: '#fff' }
  const bandPct = uitkomst.laag != null && uitkomst.hoog != null && uitkomst.waarde != null && uitkomst.hoog > uitkomst.laag
    ? Math.max(0, Math.min(100, ((uitkomst.waarde - uitkomst.laag) / (uitkomst.hoog - uitkomst.laag)) * 100))
    : 50
  const leegStaat = uitkomst.n === 0 && toegevoegdActief.length === 0

  return (
    <div style={{ minWidth: 0 }}>
      <style>{RESPONSIVE_CSS}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', margin: 0, color: colors.text }}>Waardebepaling</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button" onClick={herbereken} disabled={herberekenBezig}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', fontWeight: 700, fontSize: 13, borderRadius: radius.md, border: `1px solid ${colors.borderStrong}`, background: colors.surface, color: colors.bodyStrong, cursor: herberekenBezig ? 'default' : 'pointer', opacity: herberekenBezig ? 0.6 : 1 }}
          >
            {herberekenBezig ? 'Herberekenen…' : 'Herbereken'}
          </button>
          {!leegStaat && <WaardebepalingPdfButton objectId={objectId} />}
        </div>
      </div>

      {leegStaat ? (
        <EmptyState
          titel="Nog geen referenties binnen 5 km"
          beschrijving="Er zijn nog geen vergelijkbare verkopen gevonden om deze woning te waarderen. Voeg handmatig een referentie toe om te beginnen."
          actie={
            <button type="button" onClick={() => setDrawerOpen(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--merk-op)', background: 'var(--merk)', border: 'none', borderRadius: radius.md, padding: '9px 16px', cursor: 'pointer' }}>
              Referentie toevoegen
            </button>
          }
        />
      ) : (
        <>
          <div className="wb-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              {/* Hero: puntwaarde + band + badges */}
              <div style={{ borderRadius: radius.cardLg, padding: '22px 22px 24px', background: 'linear-gradient(135deg, var(--merk-licht) 0%, var(--merk-diep) 100%)', color: '#fff', boxShadow: `0 2px 4px rgba(20,24,27,.06), 0 16px 36px -14px rgba(var(--merk-rgb,26,107,69),.7)` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.78)' }}>Indicatieve waarde</div>
                <div className="wb-hero-val num" style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, marginTop: 2 }}>
                  {gewogenTween == null ? '—' : formatEuro(gewogenTween)}
                </div>
                {uitkomst.weinigData && uitkomst.n > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.94)', color: '#B45309', fontWeight: 800, fontSize: 11.5, padding: '5px 11px', borderRadius: radius.pill, marginTop: 10 }}>
                    <span>⚠︎</span><span>Weinig data (n = {uitkomst.n}) — bandbreedte verbreed</span>
                  </div>
                )}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 800, marginBottom: 7 }}>
                    <span>{formatEuro(uitkomst.laag)}<small style={{ display: 'block', fontWeight: 600, color: 'rgba(255,255,255,.72)', fontSize: 10.5 }}>laag</small></span>
                    <span style={{ textAlign: 'right' }}>{formatEuro(uitkomst.hoog)}<small style={{ display: 'block', fontWeight: 600, color: 'rgba(255,255,255,.72)', fontSize: 10.5 }}>hoog</small></span>
                  </div>
                  <div style={{ position: 'relative', height: 8, borderRadius: radius.pill, background: 'rgba(255,255,255,.62)' }}>
                    <div style={{ position: 'absolute', top: -5, width: 3, height: 18, borderRadius: 2, background: '#fff', boxShadow: '0 0 0 4px rgba(255,255,255,.28)', left: `${bandPct}%`, transition: 'left 220ms cubic-bezier(.2,.8,.2,1)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
                  <Badge style={heroBadge}>n = {uitkomst.n}</Badge>
                  {straalLabel && <Badge style={heroBadge}>straal {straalLabel}</Badge>}
                  {uitkomst.methode === 'plaats' && <Badge style={heroBadge}>methode: plaats</Badge>}
                  {uitkomst.index_tm && <Badge style={heroBadge}>index t/m {uitkomst.index_tm} ({indexBasisLabel})</Badge>}
                  <Badge style={heroBadge}>peildatum {formatDatum(uitkomst.peildatum)}</Badge>
                  {serverData?.dataTm.laatsteVerkoopdatum && <Badge style={heroBadge}>data t/m {formatDatum(serverData.dataTm.laatsteVerkoopdatum)}</Badge>}
                </div>
              </div>

              {/* WOZ-ijkpunt — nooit als invoer, alleen tonen als de opzoeking iets opleverde */}
              {serverData?.woz && (
                <div className="wb-woz-row" style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 18px' }}>
                  <div>
                    <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: colors.muted, background: '#EEF1F5', padding: '2px 8px', borderRadius: radius.pill, marginBottom: 4 }}>WOZ-ijkpunt</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.body }}>Geen invoer voor de berekening</div>
                    <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 2 }}>Peildatum {formatDatum(serverData.woz.peildatum)}</div>
                  </div>
                  <div className="wb-woz-v num" style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.01em', color: colors.text, textAlign: 'right' }}>{formatEuro(serverData.woz.waarde)}</div>
                </div>
              )}

              {/* Makelaarscorrectie (bestaand) */}
              <div style={{ ...card, padding: '16px 18px 18px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: colors.text }}>Makelaarscorrectie</h3>
                {correctie && !correctieModus ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', borderRadius: radius.md, background: 'var(--merk-zacht)', border: '1px solid var(--merk-rand)', color: 'var(--merk-diep)', fontSize: 12.5, fontWeight: 700 }}>
                    <span>Correctie: {formatEuro(correctie.waarde)} — {correctie.motivatie}</span>
                    <button type="button" onClick={() => { setCorrectieModus(true); setCorrectieWaarde(String(correctie.waarde)); setMotivatie(correctie.motivatie) }} style={{ marginLeft: 'auto', color: 'var(--merk-diep)', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5 }}>
                      Bewerken
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
                    <label style={{ display: 'block' }}>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: colors.bodyStrong, marginBottom: 6 }}>Bijgestelde waarde</span>
                      <input type="text" inputMode="numeric" value={correctieWaarde} onChange={e => setCorrectieWaarde(e.target.value)} placeholder={`€ ${(uitkomst.waarde ?? 0).toLocaleString('nl-NL')}`} style={{ width: '100%', borderRadius: radius.sm, border: `1px solid ${colors.borderStrong}`, padding: '9px 12px', fontSize: 13.5, background: colors.surfaceAlt }} />
                    </label>
                    <label style={{ display: 'block' }}>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: colors.bodyStrong, marginBottom: 6 }}>Motivatie (verplicht) <span style={{ fontWeight: 500, color: colors.muted }}>— gaat mee in het verkoopadvies</span></span>
                      <textarea value={motivatie} onChange={e => setMotivatie(e.target.value)} rows={2} placeholder="Bijvoorbeeld: recent verbouwd, betere staat dan referenties…" style={{ width: '100%', borderRadius: radius.sm, border: `1px solid ${colors.borderStrong}`, padding: '9px 12px', fontSize: 13.5, background: colors.surfaceAlt, resize: 'vertical', minHeight: 60 }} />
                    </label>
                    {status === 'error' && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, margin: 0 }}>{fout}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button type="button" onClick={opslaan} disabled={status === 'saving'} style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px', fontSize: 12.5, fontWeight: 700, color: 'var(--merk-op)', background: 'var(--merk)', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>
                        {status === 'saving' ? 'Opslaan…' : 'Vastleggen'}
                      </button>
                      {correctie && (
                        <button type="button" onClick={() => setCorrectieModus(false)} style={{ fontSize: 13, fontWeight: 600, color: colors.body, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Annuleer</button>
                      )}
                      {correctie && (
                        <button type="button" onClick={verwijderen} disabled={status === 'saving'} style={{ fontSize: 12, color: colors.muted, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginLeft: 'auto' }}>
                          Correctie verwijderen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5, margin: '2px 4px' }}>
                Indicatieve waardebepaling op basis van vergelijkbare verkopen, geen taxatie in de zin van NRVT/NWWI.
              </p>
            </div>

            <div>
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div>
                    <p style={titelStijl}>Referentiekaart</p>
                    <p style={mutedStijl}>{uitkomst.methode === 'plaats' ? 'locatie onbekend' : `± straal ${straalLabel ?? ''} rond het subject`}</p>
                  </div>
                  <button type="button" onClick={() => setDrawerOpen(true)} style={{ height: 32, padding: '0 12px', fontSize: 12.5, fontWeight: 700, borderRadius: radius.md, border: `1px solid ${colors.borderStrong}`, background: colors.surface, color: colors.bodyStrong, cursor: 'pointer' }}>
                    Referentie toevoegen
                  </button>
                </div>
                <div className="wb-kaart-vlak" style={{ position: 'relative', borderRadius: radius.md, overflow: 'hidden', background: '#F4EFE5', height: 440 }}>
                  {serverData?.subject.lat != null && serverData?.subject.lng != null ? (
                    <WaarderingKaartClient
                      subject={{ lat: serverData.subject.lat, lng: serverData.subject.lng, adres: address ?? 'Dit adres' }}
                      straalM={uitkomst.straal_m}
                      referenties={kaartReferenties}
                      uitgeslotenIds={uitgeslotenIds}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: 24, color: colors.body }}>
                      <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: colors.text }}>Geen locatiegegevens</p>
                      <p style={{ margin: 0, maxWidth: '34ch', fontSize: 12.5 }}>De adresverrijking is niet gelukt. Referenties zijn gekozen op plaats en woningtype, niet op afstand.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Referentietabel */}
          <div style={{ ...card, marginTop: 16 }}>
            <p style={titelStijl}>Referenties</p>
            <p style={{ ...mutedStijl, marginBottom: 8 }}>
              n = {uitkomst.n} · {uitkomst.methode === 'plaats' ? 'methode: plaats + woningtype' : `straal ${straalLabel ?? '—'}`}
              {serverData?.dataTm.laatsteVerkoopdatum ? ` · data t/m ${formatDatum(serverData.dataTm.laatsteVerkoopdatum)}` : ''}
            </p>
            {tabelRijen.length === 0 ? (
              <p style={mutedStijl}>Geen vergelijkbare verkopen binnen het werkgebied gevonden.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: colors.muted, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800 }}>#</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800 }}>Adres</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800, textAlign: 'right' }}>Afstand</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800 }}>Datum</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800, textAlign: 'right' }}>Prijs</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800, textAlign: 'right' }}>m²</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800, textAlign: 'right' }}>€/m²</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800, textAlign: 'right' }}>Index</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800 }}>Correcties</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800, textAlign: 'right' }}>Gewicht</th>
                      <th style={{ padding: '0 8px 8px 0', fontWeight: 800, textAlign: 'right' }}>Geïmpliceerd</th>
                      <th style={{ padding: '0 0 8px 0' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelRijen.map((r, i) => {
                      const uitgesloten = uitgeslotenIds.has(r.id)
                      return (
                        <tr key={r.id} style={{ borderTop: `1px solid ${colors.borderSoft}`, opacity: uitgesloten ? 0.48 : 1 }}>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.body }}>{i + 1}</td>
                          <td style={{ padding: '10px 8px 10px 0' }}>
                            <span style={{ fontWeight: 700, color: colors.text, textDecoration: uitgesloten ? 'line-through' : 'none' }}>{r.adres}</span>
                            {r.handmatig && <span style={{ display: 'inline-block', marginLeft: 7, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: radius.pill, background: 'var(--merk-accent-zacht)', color: 'var(--merk-accent)' }}>handmatig</span>}
                          </td>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.body }}>{r.afstand_m != null ? `${r.afstand_m} m` : '—'}</td>
                          <td style={{ padding: '10px 8px 10px 0', color: colors.body }}>{formatDatum(r.verkoopdatum)}</td>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.body }}>{formatEuro(r.prijs)}</td>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.body }}>{r.m2}</td>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.body }}>{formatEuro(r.prijs_m2)}</td>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.body }}>×{r.index_factor}</td>
                          <td style={{ padding: '10px 8px 10px 0' }}>{correctiesPil(r.correcties)}</td>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.body }}>{r.gewicht.toFixed(3)}</td>
                          <td style={{ padding: '10px 8px 10px 0', textAlign: 'right', color: colors.text, fontWeight: 700 }}>{formatEuro(r.waarde_geimpliceerd)}</td>
                          <td style={{ padding: '10px 0' }}>
                            {uitgesloten ? (
                              <button type="button" onClick={() => onHerstellen(r)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--merk)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Herstel
                              </button>
                            ) : (
                              <button type="button" onClick={() => onUitsluiten(r)} aria-label={`Referentie ${r.adres} uitsluiten`} title="Uitsluiten" style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', color: colors.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Correcties (wat-als) */}
          <div style={{ ...card, marginTop: 16 }}>
            <p style={titelStijl}>Correcties</p>
            <p style={{ ...mutedStijl, marginBottom: 10 }}>{!serverData && 'laden…'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(216px, 1fr))', gap: 12 }}>
              {CORRECTIE_VOLGORDE.map(naam => {
                const info = uitkomst.correcties[naam]
                const variant: 'uit' | 'neutraal' | 'toegepast' = !info?.aan ? 'uit' : info.toegepast ? 'toegepast' : 'neutraal'
                return (
                  <div key={naam} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '12px 14px' }}>
                    <button
                      type="button"
                      disabled={!serverData}
                      onClick={() => setCorrectiesAan(prev => ({ ...prev, [naam]: !(prev[naam] ?? true) }))}
                      aria-pressed={info?.aan ?? true}
                      style={chipStyle(variant)}
                    >
                      {info?.aan && CHECK_SVG}
                      <span>{CORRECTIE_LABEL[naam]}</span>
                    </button>
                    <p style={{ fontSize: 12, color: colors.muted, lineHeight: 1.4, margin: '8px 0 0' }}>{info?.toelichting ?? 'geen data'}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Waarschuwingen */}
          <div style={{ ...card, marginTop: 16 }}>
            <p style={titelStijl}>Waarschuwingen</p>
            <div style={{ marginTop: 10 }}>
              {uitkomst.waarschuwingen.length === 0 ? (
                <p style={{ ...mutedStijl, fontSize: 13 }}>Geen waarschuwingen bij deze berekening.</p>
              ) : (
                uitkomst.waarschuwingen.map(w => (
                  <div key={w} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: '#FFFBEE', border: '1px solid #F1DFA6', borderRadius: radius.md, padding: '11px 14px', fontSize: 13, color: '#7A5A00', marginBottom: 8 }}>
                    <span>⚠︎</span><span>{w}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Drawer — referentie toevoegen (item 4.4) */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,27,.34)', zIndex: 58, opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none', transition: 'opacity 220ms cubic-bezier(.2,.8,.2,1)' }}
      />
      <aside
        role="dialog" aria-modal="true" aria-labelledby="wbDrawerTitel"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(430px, 92vw)',
          background: 'rgba(255,255,255,.96)', boxShadow: shadow.modal, zIndex: 59,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 220ms cubic-bezier(.2,.8,.2,1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 id="wbDrawerTitel" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: colors.text }}>Referentie toevoegen</h2>
          <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Sluiten" style={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', color: colors.body, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px 20px', overflowY: 'auto', flex: 1 }}>
          <input
            type="text" value={drawerZoek} onChange={e => setDrawerZoek(e.target.value)} placeholder="Zoek op adres…" aria-label="Zoek op adres"
            style={{ width: '100%', height: 36, border: `1px solid ${colors.borderStrong}`, borderRadius: radius.sm, padding: '0 12px', fontSize: 13.5, background: colors.surfaceAlt, marginBottom: 14 }}
          />
          {drawerBezig ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <Skeleton height={64} rounded={radius.md} />
              <Skeleton height={64} rounded={radius.md} />
              <Skeleton height={64} rounded={radius.md} />
            </div>
          ) : drawerResultaten.length === 0 ? (
            <p style={{ fontSize: 12, color: colors.muted, margin: 0 }}>Geen kandidaten gevonden{drawerZoek.trim() ? ` voor "${drawerZoek.trim()}"` : ''}.</p>
          ) : (
            drawerResultaten.map(k => {
              const toegevoegd = !!handmatigKandidaten[k.id] && !uitgeslotenIds.has(k.id)
              return (
                <div key={k.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '12px 14px', marginBottom: 10, opacity: toegevoegd ? 0.55 : 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: colors.text }}>{k.adres}{k.plaats ? `, ${k.plaats}` : ''}</div>
                  <div style={{ fontSize: 12, color: colors.body, marginTop: 3 }}>
                    {k.woonoppervlak_m2 ? `${k.woonoppervlak_m2} m²` : '—'} · bouwjaar {k.bouwjaar ?? '—'} · verkocht {formatDatum(k.verkoopdatum)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                    <span style={{ fontWeight: 800, color: 'var(--merk-diep)', fontSize: 13 }}>{formatEuro(k.verkoopprijs)}</span>
                    {toegevoegd ? (
                      <span style={{ fontSize: 12, color: colors.muted }}>Toegevoegd ✓</span>
                    ) : (
                      <button type="button" onClick={() => kandidaatToevoegen(k)} style={{ height: 30, padding: '0 12px', fontSize: 12, fontWeight: 700, borderRadius: radius.md, border: `1px solid ${colors.borderStrong}`, background: colors.surface, color: colors.bodyStrong, cursor: 'pointer' }}>
                        Toevoegen
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', background: 'rgba(20,24,27,.94)', color: '#fff', padding: '11px 20px', borderRadius: radius.pill, fontSize: 13, fontWeight: 700, boxShadow: shadow.modal, zIndex: 90, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
