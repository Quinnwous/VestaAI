'use client'

import { useEffect, useState } from 'react'
import { EmptyState, Skeleton } from '@/components/ui'
import type { CbsNiveau, VerrijkingOpslag } from '@/lib/schemas'
import { formatAfstand, formatEuro, formatGetal, formatOpgehaaldOp } from '@/lib/verrijkingOpslag'

/**
 * "Buurt & data" (item 10.3, docs/roadmap.md § fase 10) — WOZ, CBS-
 * buurtcijfers, voorzieningen en markttype uit `lib/verrijking.ts`, met bron
 * en peildatum/"opgehaald op" per blok. Gemount vanuit `ObjectWorkspace.tsx`
 * in élke fase van het dossier.
 *
 * Zolang `initieel` leeg is (nieuw dossier waarvan de fire-and-forget-fetch
 * uit `NewObjectForm.tsx` nog niet klaar is, of een ouder dossier van vóór dit
 * item) probeert dit paneel één keer automatisch op te halen via dezelfde
 * "Ververs"-actie — daarna alleen nog op expliciete klik, geen achtergrond-
 * polling.
 */
export function BuurtDataTab({ objectId, initieel }: { objectId: string; initieel: VerrijkingOpslag | null }) {
  const [data, setData] = useState<VerrijkingOpslag | null>(initieel)
  const [laden, setLaden] = useState(!initieel)
  const [fout, setFout] = useState('')

  const ververs = async () => {
    setLaden(true)
    setFout('')
    try {
      const res = await fetch(`/api/object/${objectId}/verrijking`, { method: 'POST' })
      const json = await res.json().catch(() => null) as { verrijking?: VerrijkingOpslag; error?: string } | null
      if (!res.ok || !json?.verrijking) {
        setFout(json?.error ?? 'Ophalen mislukt. Probeer het opnieuw.')
        setLaden(false)
        return
      }
      setData(json.verrijking)
      setLaden(false)
    } catch {
      setFout('Er ging iets mis met de verbinding.')
      setLaden(false)
    }
  }

  useEffect(() => {
    if (!initieel) ververs()
    // Eenmalig bij mount — zie toelichting hierboven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verversKnop = (
    <button
      type="button"
      onClick={ververs}
      disabled={laden}
      style={{
        fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', background: 'none', border: 'none',
        cursor: laden ? 'default' : 'pointer', padding: 0, textDecoration: 'underline', whiteSpace: 'nowrap',
        opacity: laden ? 0.6 : 1,
      }}
    >
      {laden ? 'Bezig…' : 'Ververs'}
    </button>
  )

  if (laden && !data) {
    return (
      <div style={{ display: 'grid', gap: 16 }} aria-busy="true">
        <Skeleton height={110} rounded={18} />
        <Skeleton height={170} rounded={18} />
        <Skeleton height={130} rounded={18} />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        titel={fout ? 'Buurtdata ophalen mislukt' : 'Nog geen buurtdata'}
        beschrijving={fout || 'WOZ-waarde, CBS-buurtcijfers en voorzieningen zijn nog niet opgehaald voor dit adres.'}
        actie={verversKnop}
      />
    )
  }

  const { woz, cbs, voorzieningen, markt } = data

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 12, color: '#98A0A6', margin: 0 }}>Opgehaald op {formatOpgehaaldOp(data.opgehaald_op)}</p>
        {verversKnop}
      </div>

      {fout && <p style={{ fontSize: 12.5, color: '#DC2626', margin: 0 }}>{fout}</p>}

      <div style={cardStyle}>
        <p style={blokLabel}>WOZ-waarde</p>
        {woz && woz.waarden.length > 0 ? (
          <div style={cijferGrid}>
            <div>
              <div style={cijferGroot}>{formatEuro(woz.waarden[0].waarde)}</div>
              <p style={bronStijl}>Peildatum {woz.waarden[0].peildatum} · belastingjaar {woz.waarden[0].belastingjaar}</p>
            </div>
            {woz.stijging_pct && (
              <div>
                <div style={cijferKlein}>{woz.stijging_pct}</div>
                <p style={bronStijl}>Ontwikkeling</p>
              </div>
            )}
            {woz.per_m2 != null && (
              <div>
                <div style={cijferKlein}>{formatEuro(woz.per_m2)} / m²</div>
                <p style={bronStijl}>Per vierkante meter</p>
              </div>
            )}
          </div>
        ) : (
          <p style={legeTekst}>Geen WOZ-gegevens gevonden voor dit adres.</p>
        )}
        <p style={bronStijl}>Bron: WOZ Waardeloket</p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <p style={blokLabel}>Buurtcijfers{cbs?.buurtnaam ? ` — ${cbs.buurtnaam}` : ''}</p>
          {cbs && <span style={badgeStijl}>{cbs.buurtprofiel}</span>}
        </div>
        {cbs ? (
          <div style={cijferGrid}>
            {cbs.inkomen && <Cijfer titel="Gem. inkomen" waarde={formatEuro(cbs.inkomen.waarde)} niveau={cbs.inkomen.niveau} />}
            {cbs.pct_koop && <Cijfer titel="Koopwoningen" waarde={`${cbs.pct_koop.waarde}%`} niveau={cbs.pct_koop.niveau} />}
            {cbs.pct_hoog_opgeleid && <Cijfer titel="Hbo/wo-opgeleid" waarde={`${cbs.pct_hoog_opgeleid.waarde}%`} niveau={cbs.pct_hoog_opgeleid.niveau} />}
            {cbs.dichtheid_per_km2 && <Cijfer titel="Inwoners/km²" waarde={formatGetal(cbs.dichtheid_per_km2.waarde)} niveau={cbs.dichtheid_per_km2.niveau} />}
          </div>
        ) : (
          <p style={legeTekst}>Geen CBS-buurtcijfers gevonden voor dit adres.</p>
        )}
        <p style={bronStijl}>
          {cbs?.bron ?? 'Bron: CBS Kerncijfers wijken en buurten'} — niveau tussen haakjes geeft aan of het cijfer op
          buurt-, wijk- of gemeenteniveau is; CBS onderdrukt cijfers voor kleine gebieden.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <p style={blokLabel}>Voorzieningen op afstand</p>
          {voorzieningen && <span style={badgeStijl}>{voorzieningen.nabijheid_beoordeling}</span>}
        </div>
        {voorzieningen ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <Voorziening titel="Supermarkt" items={voorzieningen.supermarkt} />
            <Voorziening titel="Apotheek" items={voorzieningen.apotheek} />
            <Voorziening titel="Huisarts" items={voorzieningen.huisarts} />
            <Voorziening titel="School" items={voorzieningen.scholen} />
            <Voorziening titel="OV-halte" items={voorzieningen.ov_haltes} />
            <Voorziening titel="Station" items={voorzieningen.treinstation} />
            <Voorziening titel="Groen" items={voorzieningen.groen} />
          </div>
        ) : (
          <p style={legeTekst}>Geen voorzieningen gevonden binnen 1,5 km.</p>
        )}
        <p style={bronStijl}>Bron: OpenStreetMap (Overpass)</p>
      </div>

      {markt && (
        <div style={cardStyle}>
          <p style={{ ...blokLabel, marginBottom: 12 }}>Markttype — {markt.label}</p>
          <div style={cijferGrid}>
            <div><div style={cijferKlein}>{markt.verkooptijd_weken}</div><p style={bronStijl}>Verkooptijd</p></div>
            <div><div style={cijferKlein}>{markt.overbiedingskans_pct}</div><p style={bronStijl}>Overbiedingskans</p></div>
            <div><div style={cijferKlein}>{markt.overbod_pct}</div><p style={bronStijl}>Gem. overbod</p></div>
          </div>
          <p style={{ fontSize: 12.5, color: '#5C6470', margin: '12px 0 0', lineHeight: 1.5 }}>{markt.marktomstandigheid}</p>
          <p style={bronStijl}>
            {markt.herkomst === 'afgeleid'
              ? 'Regionale typering, afgeleid uit CBS-WOZ en bevolkingsdichtheid van deze gemeente — geen actuele meting voor dit specifieke adres.'
              : 'Regionale typering op basis van gemeentecategorie.'}
          </p>
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
const cijferGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }
const cijferGroot: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: '#14181B', fontVariantNumeric: 'tabular-nums' }
const cijferKlein: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: '#14181B', fontVariantNumeric: 'tabular-nums' }
const badgeStijl: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--merk-radius-card-xl, 20px)',
  background: 'var(--merk-zacht)', color: 'var(--merk)', whiteSpace: 'nowrap',
}

function Cijfer({ titel, waarde, niveau }: { titel: string; waarde: string; niveau: CbsNiveau }) {
  const NIVEAU_LABEL: Record<CbsNiveau, string> = { buurt: 'buurt', wijk: 'wijk', gemeente: 'gemeente', nederland: 'NL' }
  return (
    <div>
      <div style={cijferKlein}>{waarde}</div>
      <p style={bronStijl}>{titel} ({NIVEAU_LABEL[niveau]})</p>
    </div>
  )
}

function Voorziening({ titel, items }: { titel: string; items: { naam: string; afstand_m: number }[] }) {
  const dichtstbij = items[0]
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 650, color: '#98A0A6', margin: '0 0 4px' }}>{titel}</p>
      {dichtstbij ? (
        <p style={{ fontSize: 13, color: '#14181B', margin: 0 }}>{formatAfstand(dichtstbij.afstand_m)}</p>
      ) : (
        <p style={{ fontSize: 13, color: '#98A0A6', margin: 0 }}>—</p>
      )}
    </div>
  )
}
