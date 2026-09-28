'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { PropertyInput } from '@/lib/schemas'
import { woningtypeLabel } from '@/lib/schemas'
import type { WaarderingReferentie, WaarderingUitkomst } from '@/lib/waardering'
import { bepaalPresentatieStappen, kantoorContactregel, logoWeergave, referentiesOnderschrift, verkoperWaarschuwingen } from '@/lib/presentatie'
import { wozUitInvoer, type WozIjkpunt } from '@/lib/woz'
import { euro, datum as datumFmt, m2 as m2Fmt, afstand as afstandFmt } from '@/lib/opmaak'
import { colors, radius } from '@/components/ui/tokens'
import { Eyebrow } from '@/components/ui'
import { PresentatieKaartStap } from './PresentatieKaartStap'
import { PresentatieVoortgang } from './PresentatieVoortgang'

type Correctie = { waarde: number; motivatie: string; datum: string }

interface Props {
  objectId: string
  address: string
  invoer: PropertyInput
  fotoUrl: string | null
  uitkomst: WaarderingUitkomst
  correctie: Correctie | null
  subject: { lat: number; lng: number } | null
  referenties: (WaarderingReferentie & { lat: number; lng: number })[]
  kantoor: { naam: string; logoUrl: string | null; kleur: string; telefoon: string | null; email: string | null }
}

/** Getal-tween (~500ms ease-out) — zelfde patroon als `WaardebepalingPaneel.tsx`'s
 * lokale `useTweenGetal` (geen gedeelde hook, zie het commentaar daar). Telt
 * hier bewust vanaf 0 op elke keer dat de waardestap mount (`key`-remount in
 * `WaardePresentatie` hieronder) — dat is precies het "keukentafel"-moment
 * waarop het getal mag oplopen. Reduced motion → meteen het eindgetal. */
function useTweenGetal(waarde: number | null, duurMs = 550): number | null {
  const [weergegeven, setWeergegeven] = useState<number | null>(waarde == null ? null : 0)
  useEffect(() => {
    if (waarde == null) { setWeergegeven(null); return }
    const verminderd = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (verminderd) { setWeergegeven(waarde); return }
    let frame: number
    const start = performance.now()
    const tick = (nu: number) => {
      const t = Math.min(1, (nu - start) / duurMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setWeergegeven(Math.round(waarde * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waarde])
  return weergegeven
}

const PODIUM_CSS = `
@keyframes presentatieFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.presentatie-stap-inhoud { animation: presentatieFadeIn 340ms cubic-bezier(.2,.8,.2,1); }
@media (prefers-reduced-motion: reduce) { .presentatie-stap-inhoud { animation: none !important; } }
@media (max-width: 720px) {
  .presentatie-waarde-getal { font-size: 46px !important; }
  .presentatie-tweekolom { grid-template-columns: 1fr !important; }
  .presentatie-titel { font-size: 30px !important; }
}
`

/**
 * Presentatiemodus ("keukentafel", docs/roadmap.md § Stand van zaken —
 * "Volgende ronde" item 1). Podium over de hele viewport, boven de topbar:
 * grote, rustige stappen zonder de werkomgeving (filters, correctie-
 * schakelaars, jargon-tabellen) eromheen. Rekent niets uit — alle getallen
 * komen kant-en-klaar uit `opslag.uitkomst`/`opslag.correctie`
 * (`app/(app)/object/[id]/presentatie/page.tsx` leest die net als de pdf-
 * route, zonder herberekening), dus dit scherm kan nooit een ander bedrag
 * tonen dan de pdf of het waarderingspaneel.
 *
 * Welke stappen er zijn bepaalt `lib/presentatie.ts` `bepaalPresentatieStappen()`
 * (puur, getest) — hier alleen de weergave per stap-id.
 */
export function WaardePresentatie({ objectId, address, invoer, fotoUrl, uitkomst, correctie, subject, referenties, kantoor }: Props) {
  const router = useRouter()
  const woz = useMemo(() => wozUitInvoer(invoer), [invoer])

  const stappen = useMemo(
    () => bepaalPresentatieStappen({ heeftGeo: subject != null, aantalReferenties: referenties.length, heeftWoz: woz != null }),
    [subject, referenties.length, woz],
  )

  const [index, setIndex] = useState(0)
  const laatsteIndex = stappen.length - 1
  const huidigeStap = stappen[Math.min(index, laatsteIndex)]

  const vorige = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const volgende = useCallback(() => setIndex((i) => Math.min(laatsteIndex, i + 1)), [laatsteIndex])
  const sluiten = useCallback(() => router.push(`/object/${objectId}`), [router, objectId])

  // Toetsenbordnavigatie — Sheet/Modal-patroon (Escape sluit), aangevuld met
  // de presentatiebediening (pijlen/spatie/PageUp/PageDown) uit de opdracht.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        volgende()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        vorige()
      } else if (e.key === 'Escape') {
        sluiten()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [volgende, vorige, sluiten])

  // Podium neemt de hele viewport over — de pagina erachter (met de topbar)
  // mag niet meescrollen zolang dit openstaat.
  useEffect(() => {
    const vorigeOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = vorigeOverflow
    }
  }, [])

  const [volledigScherm, setVolledigScherm] = useState(false)
  useEffect(() => {
    function onChange() {
      setVolledigScherm(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  async function toggleVolledigScherm() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen API niet ondersteund of geweigerd (bv. iOS Safari) — het
      // podium werkt prima zonder, gewoon negeren.
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--merk-zacht)',
        fontFamily: 'var(--merk-font-body, inherit)',
      }}
    >
      <style>{PODIUM_CSS}</style>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '20px 24px 0', flexShrink: 0 }}>
        <RondeKnop onClick={toggleVolledigScherm} label={volledigScherm ? 'Scherm herstellen' : 'Volledig scherm'}>
          {volledigScherm ? <VerkleinIcon /> : <VergrootIcon />}
        </RondeKnop>
        <RondeKnop onClick={sluiten} label="Sluiten">
          <SluitIcon />
        </RondeKnop>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 28px', overflow: 'auto' }}>
        <div key={huidigeStap} className="presentatie-stap-inhoud" style={{ width: '100%', maxWidth: 880 }}>
          {huidigeStap === 'woning' && <StapWoning address={address} invoer={invoer} fotoUrl={fotoUrl} kantoor={kantoor} />}
          {huidigeStap === 'waarde' && <StapWaarde uitkomst={uitkomst} />}
          {huidigeStap === 'kaart' && subject && (
            <StapKaart subject={subject} adres={address} referenties={referenties} />
          )}
          {huidigeStap === 'referenties' && <StapReferenties referenties={referenties} />}
          {huidigeStap === 'woz' && woz && <StapWoz woz={woz} indicatie={uitkomst.waarde} />}
          {huidigeStap === 'toelichting' && <StapToelichting correctie={correctie} kantoor={kantoor} />}
        </div>
      </div>

      <PresentatieVoortgang stappen={stappen} index={index} onGaNaar={setIndex} onVorige={vorige} onVolgende={volgende} />
    </div>
  )
}

// ── Stap 1 — De woning ──────────────────────────────────────────────────────
function StapWoning({ address, invoer, fotoUrl, kantoor }: { address: string; invoer: PropertyInput; fotoUrl: string | null; kantoor: Props['kantoor'] }) {
  const [fotoOk, setFotoOk] = useState(!!fotoUrl)
  const [logoGeladen, setLogoGeladen] = useState(!!kantoor.logoUrl)
  const toonFoto = fotoUrl && fotoOk
  const kenmerken = [woningtypeLabel(invoer), m2Fmt(invoer.oppervlak_m2), `bouwjaar ${invoer.bouwjaar}`].filter(Boolean).join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 22 }}>
      {toonFoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- externe Storage-URL, geen next/image-domein geconfigureerd (zelfde patroon als DossierHeader.tsx)
        <img
          src={fotoUrl}
          alt=""
          onError={() => setFotoOk(false)}
          style={{ width: '100%', maxWidth: 640, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: radius.cardLg, boxShadow: '0 24px 64px -24px rgba(20,24,27,.3)' }}
        />
      ) : (
        // Geen (bruikbare) dossierfoto: een klein kantoorlogo boven het adres
        // i.p.v. een lege of gebroken beeldplek — logoWeergave() maakt exact
        // dezelfde logo/naam-keuze als de kantoorafsluiting in StapToelichting.
        logoWeergave(kantoor.logoUrl, logoGeladen) === 'logo' && (
          // eslint-disable-next-line @next/next/no-img-element -- externe Storage-URL, zelfde patroon als AppTopbar.tsx
          <img
            src={kantoor.logoUrl!}
            alt={kantoor.naam}
            onError={() => setLogoGeladen(false)}
            style={{ height: 28, maxWidth: 200, objectFit: 'contain' }}
          />
        )
      )}
      <div>
        <Eyebrow style={{ textAlign: 'center' }}>Woningdossier</Eyebrow>
        <h1 className="presentatie-titel" style={{ fontFamily: 'var(--merk-font-heading, inherit)', fontSize: 46, fontWeight: 700, letterSpacing: '-.02em', color: colors.text, margin: 0 }}>
          {address}
        </h1>
        <p style={{ fontSize: 16, color: colors.body, marginTop: 10 }}>{kenmerken}</p>
      </div>
    </div>
  )
}

// ── Stap 2 — De waarde ──────────────────────────────────────────────────────
function StapWaarde({ uitkomst }: { uitkomst: WaarderingUitkomst }) {
  const getoond = useTweenGetal(uitkomst.waarde)
  const bandPct = uitkomst.laag != null && uitkomst.hoog != null && uitkomst.waarde != null && uitkomst.hoog > uitkomst.laag
    ? Math.max(0, Math.min(100, ((uitkomst.waarde - uitkomst.laag) / (uitkomst.hoog - uitkomst.laag)) * 100))
    : 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20 }}>
      <Eyebrow style={{ textAlign: 'center' }}>Indicatieve waarde</Eyebrow>
      <div
        className="presentatie-waarde-getal num"
        style={{ fontFamily: 'var(--merk-font-heading, inherit)', fontSize: 88, fontWeight: 700, letterSpacing: '-.03em', color: colors.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
      >
        {getoond == null ? '—' : euro(getoond)}
      </div>

      {uitkomst.laag != null && uitkomst.hoog != null && (
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: colors.body, marginBottom: 8 }}>
            <span>{euro(uitkomst.laag)}</span>
            <span>{euro(uitkomst.hoog)}</span>
          </div>
          <div style={{ position: 'relative', height: 8, borderRadius: radius.pill, background: 'rgba(20,24,27,.1)' }}>
            <div
              style={{
                position: 'absolute', top: -4, width: 4, height: 16, borderRadius: 3, background: 'var(--merk)',
                boxShadow: '0 0 0 4px rgba(20,24,27,.06)', left: `${bandPct}%`, transform: 'translateX(-50%)',
                transition: 'left 320ms cubic-bezier(.2,.8,.2,1)',
              }}
            />
          </div>
        </div>
      )}

      <p style={{ fontSize: 15, color: colors.body, margin: 0 }}>{referentiesOnderschrift(uitkomst.n)}</p>

      {verkoperWaarschuwingen(uitkomst.waarschuwingen).length > 0 && (
        <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 520, marginTop: 4 }}>
          {verkoperWaarschuwingen(uitkomst.waarschuwingen).map((w) => (
            <div key={w} style={{ background: '#FFFBEE', border: '1px solid #F1DFA6', borderRadius: radius.md, padding: '10px 16px', fontSize: 13.5, color: '#7A5A00' }}>
              {w}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12.5, color: colors.muted, maxWidth: 480, lineHeight: 1.5, marginTop: 8 }}>
        Dit is een indicatieve waardebepaling op basis van vergelijkbare verkopen, geen taxatie in de zin van NRVT/NWWI.
      </p>
    </div>
  )
}

// ── Stap 3 — Vergelijkbare verkopen op de kaart ─────────────────────────────
function StapKaart({ subject, adres, referenties }: { subject: { lat: number; lng: number }; adres: string; referenties: { id: string; lat: number; lng: number }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <Eyebrow style={{ textAlign: 'center' }}>Vergelijkbare verkopen</Eyebrow>
        <h2 className="presentatie-titel" style={{ fontFamily: 'var(--merk-font-heading, inherit)', fontSize: 30, fontWeight: 700, color: colors.text, margin: 0 }}>In de buurt verkocht</h2>
      </div>
      <PresentatieKaartStap subject={subject} adres={adres} referenties={referenties} />
    </div>
  )
}

// ── Stap 4 — De zes belangrijkste referenties ───────────────────────────────
function StapReferenties({ referenties }: { referenties: WaarderingReferentie[] }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <Eyebrow style={{ textAlign: 'center' }}>Referenties</Eyebrow>
        <h2 className="presentatie-titel" style={{ fontFamily: 'var(--merk-font-heading, inherit)', fontSize: 30, fontWeight: 700, color: colors.text, margin: 0 }}>Vergelijkbare woningen</h2>
      </div>
      <div style={{ background: '#fff', borderRadius: radius.cardLg, padding: '8px 12px', boxShadow: '0 16px 44px -20px rgba(20,24,27,.25)' }}>
        {referenties.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 12px',
              borderTop: i === 0 ? 'none' : `1px solid ${colors.borderSoft}`,
            }}
          >
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--merk-zacht)', color: 'var(--merk-diep)', fontWeight: 800, fontSize: 13, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>{r.adres}</div>
              <div style={{ fontSize: 13, color: colors.body, marginTop: 2 }}>
                {datumFmt(r.verkoopdatum)} · {m2Fmt(r.m2)}{r.afstand_m != null ? ` · ${afstandFmt(r.afstand_m)}` : ''}
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, color: colors.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{euro(r.prijs)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stap 5 — WOZ-waarde ──────────────────────────────────────────────────────
function StapWoz({ woz, indicatie }: { woz: WozIjkpunt; indicatie: number | null }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Eyebrow style={{ textAlign: 'center' }}>Ter vergelijking</Eyebrow>
      <h2 className="presentatie-titel" style={{ fontFamily: 'var(--merk-font-heading, inherit)', fontSize: 30, fontWeight: 700, color: colors.text, margin: '0 0 24px' }}>WOZ-waarde</h2>
      <div className="presentatie-tweekolom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640, margin: '0 auto' }}>
        <WozKolom label="Onze indicatie" waarde={indicatie} nadruk />
        <WozKolom label={`WOZ-waarde · peildatum ${datumFmt(woz.peildatum)}`} waarde={woz.waarde} />
      </div>
    </div>
  )
}

function WozKolom({ label, waarde, nadruk = false }: { label: string; waarde: number | null; nadruk?: boolean }) {
  return (
    <div style={{ background: nadruk ? 'var(--merk)' : '#fff', color: nadruk ? 'var(--merk-op)' : colors.text, borderRadius: radius.cardLg, padding: '22px 18px', boxShadow: '0 16px 44px -20px rgba(20,24,27,.22)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, opacity: nadruk ? 0.85 : 1, color: nadruk ? undefined : colors.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>{euro(waarde)}</div>
    </div>
  )
}

// ── Stap 6 — Toelichting van de makelaar ────────────────────────────────────
function StapToelichting({ correctie, kantoor }: { correctie: Correctie | null; kantoor: Props['kantoor'] }) {
  const [logoGeladen, setLogoGeladen] = useState(!!kantoor.logoUrl)
  const contactregel = kantoorContactregel(kantoor)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 24 }}>
      <div>
        <Eyebrow style={{ textAlign: 'center' }}>Toelichting</Eyebrow>
        <h2 className="presentatie-titel" style={{ fontFamily: 'var(--merk-font-heading, inherit)', fontSize: 30, fontWeight: 700, color: colors.text, margin: 0 }}>Toelichting van de makelaar</h2>
      </div>

      {correctie ? (
        <div style={{ background: '#fff', borderRadius: radius.cardLg, padding: '22px 26px', maxWidth: 560, boxShadow: '0 16px 44px -20px rgba(20,24,27,.22)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, marginBottom: 6 }}>Bijgestelde waarde</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: colors.text, fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>{euro(correctie.waarde)}</div>
          <p style={{ fontSize: 15, color: colors.body, lineHeight: 1.6, margin: 0 }}>{correctie.motivatie}</p>
        </div>
      ) : (
        <p style={{ fontSize: 15, color: colors.body, maxWidth: 480 }}>
          Deze indicatie is direct gebaseerd op de vergelijkbare verkopen hierboven, zonder verdere bijstelling.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 8 }}>
        {logoWeergave(kantoor.logoUrl, logoGeladen) === 'logo' ? (
          // eslint-disable-next-line @next/next/no-img-element -- externe Storage-URL, zelfde patroon als AppTopbar.tsx
          <img src={kantoor.logoUrl!} alt={kantoor.naam} onError={() => setLogoGeladen(false)} style={{ height: 34, objectFit: 'contain' }} />
        ) : (
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--merk-diep, var(--merk))' }}>{kantoor.naam}</div>
        )}
        {contactregel && (
          <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>{contactregel}</p>
        )}
      </div>
    </div>
  )
}

// ── Chrome (sluiten / volledig scherm) ──────────────────────────────────────
function RondeKnop({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  const stijl: CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.85)',
    color: colors.bodyStrong, display: 'grid', placeItems: 'center', cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(20,24,27,.12)',
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} style={stijl}>
      {children}
    </button>
  )
}

function VergrootIcon() {
  return (
    <svg viewBox="0 0 20 20" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2H2v5M13 2h5v5M7 18H2v-5M13 18h5v-5" />
    </svg>
  )
}

function VerkleinIcon() {
  return (
    <svg viewBox="0 0 20 20" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h5V2M13 2v5h5M18 13h-5v5M7 18v-5H2" />
    </svg>
  )
}

function SluitIcon() {
  return (
    <svg viewBox="0 0 20 20" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}
