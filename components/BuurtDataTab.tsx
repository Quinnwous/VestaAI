'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EmptyState, Skeleton } from '@/components/ui'
import type { CbsNiveau, FetchStatus, VerrijkingOpslag } from '@/lib/schemas'
import { euro, procent, dagen, datum, datumTijd, afstand, nlNL } from '@/lib/opmaak'

/**
 * "Buurt & data" (item 10.3, docs/roadmap.md § fase 10) — WOZ, CBS-
 * buurtcijfers, voorzieningen (`lib/verrijking.ts`) en een "Markt in
 * [plaats]"-blok uit de eigen transactiedataset, met bron en peildatum/
 * "opgehaald op" per blok. Gemount vanuit `ObjectWorkspace.tsx` in élke fase
 * van het dossier.
 *
 * Item 10.3-fix (23 sep 2026, review hoofdsessie): elke bron toont nu
 * expliciet `ok`/`leeg`/`mislukt` i.p.v. alles wat geen data opleverde als
 * hetzelfde "niets gevonden" te tonen — een mislukte/getimede-out aanroep
 * (Overpass, WOZ-loket) verdient een andere boodschap dan een bron die
 * gewoon niets over dit adres weet. Zie lib/verrijking.ts voor de
 * onderliggende reparatie (Overpass-mirror + User-Agent) en de WOZ-bevinding
 * (dode API, geen betrouwbare vervanger binnen deze sessie gevonden).
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

  const { woz, cbs, voorzieningen, marktEigen } = data
  // Oudere rijen (vóór deze fix) hebben nog geen `bronnen` — dan afleiden uit
  // de aan-/afwezigheid van data (het oude gedrag), i.p.v. deze rij te
  // negeren en een geforceerde herophaal af te dwingen.
  const statusWoz: FetchStatus = data.bronnen?.woz ?? (woz ? 'ok' : 'leeg')
  const statusCbs: FetchStatus = data.bronnen?.cbs ?? (cbs ? 'ok' : 'leeg')
  const statusVoorzieningen: FetchStatus = data.bronnen?.voorzieningen ?? (voorzieningen ? 'ok' : 'leeg')

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 12, color: '#98A0A6', margin: 0 }}>Opgehaald op {datumTijd(data.opgehaald_op)}</p>
        {verversKnop}
      </div>

      {fout && <p style={{ fontSize: 12.5, color: '#DC2626', margin: 0 }}>{fout}</p>}

      {/* WOZ-waarde */}
      <div style={cardStyle}>
        <p style={blokLabel}>WOZ-waarde</p>
        {statusWoz === 'ok' && woz && woz.waarden.length > 0 ? (
          <div style={cijferGrid}>
            <div>
              <div style={cijferGroot}>{euro(woz.waarden[0].waarde)}</div>
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
                <div style={cijferKlein}>{euro(woz.per_m2)} / m²</div>
                <p style={bronStijl}>Per vierkante meter</p>
              </div>
            )}
          </div>
        ) : (
          <BronMelding status={statusWoz} leeg="Geen WOZ-gegevens gevonden voor dit adres." />
        )}
        <p style={bronStijl}>Bron: WOZ Waardeloket</p>
      </div>

      {/* CBS-buurtcijfers */}
      <div style={cardStyle}>
        <p style={{ ...blokLabel, marginBottom: 12 }}>Buurtcijfers{cbs?.buurtnaam ? ` — ${cbs.buurtnaam}` : ''}</p>
        {statusCbs === 'ok' && cbs ? (
          <div style={cijferGrid}>
            {cbs.inkomen && <Cijfer titel="Gem. inkomen" waarde={euro(cbs.inkomen.waarde)} niveau={cbs.inkomen.niveau} />}
            {cbs.pct_koop && <Cijfer titel="Koopwoningen" waarde={`${cbs.pct_koop.waarde}%`} niveau={cbs.pct_koop.niveau} />}
            {cbs.pct_hoog_opgeleid && <Cijfer titel="Hbo/wo-opgeleid" waarde={`${cbs.pct_hoog_opgeleid.waarde}%`} niveau={cbs.pct_hoog_opgeleid.niveau} />}
            {cbs.dichtheid_per_km2 && <Cijfer titel="Inwoners/km²" waarde={nlNL.format(cbs.dichtheid_per_km2.waarde)} niveau={cbs.dichtheid_per_km2.niveau} />}
          </div>
        ) : (
          <BronMelding status={statusCbs} leeg="Geen CBS-buurtcijfers gevonden voor dit adres." />
        )}
        <p style={bronStijl}>
          {cbs?.bron ?? 'Bron: CBS Kerncijfers wijken en buurten'} — niveau tussen haakjes geeft aan of het cijfer op
          buurt-, wijk- of gemeenteniveau is; CBS onderdrukt cijfers voor kleine gebieden.
        </p>
      </div>

      {/* Voorzieningen op afstand */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <p style={blokLabel}>Voorzieningen op afstand</p>
          {statusVoorzieningen === 'ok' && voorzieningen && <span style={badgeStijl}>{voorzieningen.nabijheid_beoordeling}</span>}
        </div>
        {statusVoorzieningen === 'ok' && voorzieningen ? (
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
          <BronMelding status={statusVoorzieningen} leeg="Geen voorzieningen gevonden binnen 1,5 km." />
        )}
        <p style={bronStijl}>Bron: OpenStreetMap (Overpass)</p>
      </div>

      {/* Markt in [plaats] — eigen transactiedataset (vervangt sinds de review
          van 23 sep 2026 het vuistregel-marktblok, dat de eigen marktanalyse
          tegensprak: zie lib/schemas.ts MarktEigenDataSchema). */}
      {marktEigen && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <p style={blokLabel}>Markt in {marktEigen.plaats}</p>
            <Link
              href={`/marktanalyse?plaatsen=${encodeURIComponent(marktEigen.plaats)}`}
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--merk)', textDecoration: 'none' }}
            >
              Bekijk in marktanalyse →
            </Link>
          </div>
          {marktEigen.n === 0 ? (
            <p style={legeTekst}>Nog geen eigen transacties in {marktEigen.plaats} in de afgelopen 12 maanden.</p>
          ) : (
            <>
              <div style={cijferGrid}>
                <div><div style={cijferKlein}>{euro(marktEigen.mediaanPrijs)}</div><p style={bronStijl}>Mediaan verkoopprijs</p></div>
                <div><div style={cijferKlein}>{marktEigen.mediaanM2 != null ? `${euro(marktEigen.mediaanM2)} /m²` : '—'}</div><p style={bronStijl}>Mediaan € per m²</p></div>
                <div><div style={cijferKlein}>{dagen(marktEigen.mediaanLooptijd)}</div><p style={bronStijl}>Mediaan looptijd</p></div>
                <div><div style={cijferKlein}>{procent(marktEigen.pctTovVraag)}</div><p style={bronStijl}>T.o.v. vraagprijs</p></div>
              </div>
              {marktEigen.n < 5 && (
                <p style={{ fontSize: 12, color: '#B45309', margin: '12px 0 0' }}>
                  Gebaseerd op maar {marktEigen.n} {marktEigen.n === 1 ? 'transactie' : 'transacties'} — beperkte betrouwbaarheid.
                </p>
              )}
            </>
          )}
          <p style={bronStijl}>n = {marktEigen.n} · data t/m {datum(marktEigen.periodeTot)} · eigen transactiedataset</p>
        </div>
      )}
    </div>
  )
}

/** Neutrale melding per brondstatus — 'mislukt' wijst expliciet naar Ververs, 'leeg' niet (dat zou een herhaling zijn van dezelfde uitkomst). */
function BronMelding({ status, leeg }: { status: FetchStatus; leeg: string }) {
  if (status === 'mislukt') {
    return <p style={legeTekst}>Kon niet worden opgehaald — probeer <strong>Ververs</strong> hierboven opnieuw.</p>
  }
  return <p style={legeTekst}>{leeg}</p>
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
        <p style={{ fontSize: 13, color: '#14181B', margin: 0 }}>{afstand(dichtstbij.afstand_m)}</p>
      ) : (
        <p style={{ fontSize: 13, color: '#98A0A6', margin: 0 }}>—</p>
      )}
    </div>
  )
}
