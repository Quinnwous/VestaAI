'use client'

/**
 * Verkoopkaart-explorer v2 (item 7.2, docs/roadmap.md § 5 Fase 7 — port van
 * `docs/ontwerp/verkoopkaart.html`, spec: `docs/ontwerp/README.md`). Eigen
 * verkopen als mini-beeldmerk-pins op de MapLibre/PDOK-pastelkaart (7.1),
 * tijdlijn met afspeelknop, dropdown-filters, kerncijfers "in beeld", een
 * zijlijst die met de kaart meebeweegt.
 *
 * Databron (§ 3.1 patroon 1): `transacties` komt één keer mee met de pagina
 * (`haalEigenVerkopen`/`MET_COORDINATEN_KOLOMMEN`, al ≤ 2.000 rijen voor één
 * kantoor) en wordt hierna volledig client-side gefilterd/gesorteerd via de
 * pure functies in `lib/verkoopkaart.ts` (< 100 ms, geen server-aanroep per
 * filterwijziging — anders dan Marktanalyse, dat ook een RPC-tak heeft).
 *
 * ⚠️ "Verkocht door" (teamlid) staat in het filtermodel
 * (docs/ontwerp/README.md § 4) maar is hier bewust niet gebouwd —
 * `transacties` heeft geen makelaar-kolom, zie `lib/verkoopkaart.ts`
 * bovenaan en de opleverrapportage van dit item.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Badge, Button, EmptyState, FilterDropdown, FilterPills, RangeSlider,
  Chip, Checkbox, StatTile, SegmentedToggle, Switch, type FilterPil,
} from '@/components/ui'
import { colors, radius, shadow } from '@/components/ui/tokens'
import { BasisKaart, VerkopenLaag, HoverKaart, type VerkoopHoverInfo } from '@/components/kaart'
import { boundsUitPunten } from '@/lib/kaart'
import { useFilterState } from '@/hooks/useFilterState'
import {
  VerkoopkaartFilterSchema, standaardVerkoopkaartFilter, kwartaalBereikUitRijen,
  filterVerkoopkaartRijen, berekenVerkoopkaartKerncijfers, verkoopkaartSparklineReeks,
  sorteerVerkopen, MIN_N_KERNCIJFERS, PRIJS_BEREIK, OPP_BEREIK, BOUWJAAR_BEREIK,
} from '@/lib/verkoopkaart'
import { kwartaalUitNummer } from '@/lib/prijsindex'
import { woningtypeTaxonomie } from '@/lib/transactieNormalisatie'
import { typegroepLabel } from '@/lib/schemas'
import { euro, euroKort, m2, dagen, datum, nlNL } from '@/lib/opmaak'
import { bouwTransactiesCsv } from '@/lib/transactiesZoeken'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

const ENERGIELABELS = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
const WERKBLAD_HOOGTE = 620

function bereikGelijk(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

/** `2024-Q1` → `Q1 2024` (kortere vorm voor tijdlijn-ticks/label dan `lib/opmaak.ts` `kwartaalLabel`, die dezelfde bewerking op een string doet — hier op een doorlopend kwartaalnummer). */
function kwartaalKortLabel(kwartaalNr: number): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(kwartaalUitNummer(kwartaalNr))
  return m ? `Q${m[2]} ${m[1]}` : String(kwartaalNr)
}

function jaarVan(kwartaalNr: number): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(kwartaalUitNummer(kwartaalNr))
  return m ? m[1] : String(kwartaalNr)
}

export function VerkoopkaartExplorerV2({
  transacties,
  dataTotEnMet,
}: {
  transacties: TransactieMetCoordinaten[]
  dataTotEnMet: string | null
}) {
  const bereik = useMemo(() => kwartaalBereikUitRijen(transacties, dataTotEnMet), [transacties, dataTotEnMet])
  const standaard = useMemo(() => standaardVerkoopkaartFilter(bereik.van, bereik.tot), [bereik.van, bereik.tot])
  const [filter, zetFilterDeel, zetFilterVolledig] = useFilterState(VerkoopkaartFilterSchema, standaard)
  const taxonomie = useMemo(() => woningtypeTaxonomie(), [])

  // ── Afspelen door de tijd (docs/ontwerp/README.md § 6, "schrapbaar" in de
  // item-spec — hier wél gebouwd: eenvoudig bovenop de bestaande RangeSlider). ──
  const [speelt, setSpeelt] = useState(false)
  useEffect(() => {
    if (!speelt) return
    if (filter.tot >= bereik.tot) {
      setSpeelt(false)
      return
    }
    const id = setTimeout(() => zetFilterDeel({ tot: filter.tot + 1 }), 320)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speelt, filter.tot, bereik.tot])

  function afspelen() {
    if (speelt) {
      setSpeelt(false)
      return
    }
    zetFilterDeel({ tot: filter.van })
    setSpeelt(true)
  }

  // ── Filteren/sorteren (client-side, < 100 ms — § 3.1 patroon 1) ──
  const gefilterd = useMemo(() => filterVerkoopkaartRijen(transacties, filter), [transacties, filter])
  const kern = useMemo(() => berekenVerkoopkaartKerncijfers(gefilterd), [gefilterd])
  const reeks = useMemo(() => verkoopkaartSparklineReeks(gefilterd, filter.van, filter.tot), [gefilterd, filter.van, filter.tot])
  const gesorteerd = useMemo(() => sorteerVerkopen(gefilterd, filter.sort), [gefilterd, filter.sort])
  const teWeinigData = kern.n > 0 && kern.n < MIN_N_KERNCIJFERS

  const punten = useMemo(
    () => gefilterd.filter((t): t is TransactieMetCoordinaten & { lat: number; lng: number } => t.lat !== null && t.lng !== null),
    [gefilterd],
  )
  const bounds = useMemo(() => boundsUitPunten(punten), [punten])

  const [hover, setHover] = useState<VerkoopHoverInfo | null>(null)
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null)
  const [gemarkeerdId, setGemarkeerdId] = useState<string | null>(null)

  function kies(id: string) {
    setGeselecteerdId(huidig => (huidig === id ? null : id))
  }

  // ── Samenvattingen + tellers voor de filterbalk ──
  const typeSamenvatting = filter.typen.length
    ? (() => {
        const volledig = taxonomie.filter(t => t.subs.every(s => filter.typen.includes(s)))
        const rest = filter.typen.filter(s => !volledig.some(t => t.subs.includes(s)))
        const delen = [...volledig.map(t => typegroepLabel(t.groep)), ...rest]
        return delen.length <= 2 ? delen.join(', ') : `${delen[0]} +${delen.length - 1}`
      })()
    : undefined
  const prijsSamenvatting = !bereikGelijk(filter.prijs, PRIJS_BEREIK)
    ? `${euroKort(filter.prijs[0])} – ${filter.prijs[1] >= PRIJS_BEREIK[1] ? '∞' : euroKort(filter.prijs[1])}`
    : undefined
  const oppSamenvatting = !bereikGelijk(filter.opp, OPP_BEREIK)
    ? `${filter.opp[0]} – ${filter.opp[1] >= OPP_BEREIK[1] ? '∞' : filter.opp[1]} m²`
    : undefined
  const meerTeller =
    (bereikGelijk(filter.bouwjaar, BOUWJAAR_BEREIK) ? 0 : 1) +
    (filter.energielabels.length ? 1 : 0) +
    (filter.kamers ? 1 : 0) +
    (filter.tuin ? 1 : 0) +
    (filter.garage ? 1 : 0)

  const pillen: FilterPil[] = []
  if (typeSamenvatting) pillen.push({ label: 'Type', waarde: typeSamenvatting, onVerwijder: () => zetFilterDeel({ typen: [] }) })
  if (prijsSamenvatting) pillen.push({ label: 'Prijs', waarde: prijsSamenvatting, onVerwijder: () => zetFilterDeel({ prijs: [...PRIJS_BEREIK] }) })
  if (oppSamenvatting) pillen.push({ label: 'Oppervlak', waarde: oppSamenvatting, onVerwijder: () => zetFilterDeel({ opp: [...OPP_BEREIK] }) })
  if (!bereikGelijk(filter.bouwjaar, BOUWJAAR_BEREIK)) pillen.push({ label: 'Bouwjaar', waarde: `${filter.bouwjaar[0]} – ${filter.bouwjaar[1]}`, onVerwijder: () => zetFilterDeel({ bouwjaar: [...BOUWJAAR_BEREIK] }) })
  if (filter.energielabels.length) pillen.push({ label: 'Energielabel', waarde: filter.energielabels.join(', '), onVerwijder: () => zetFilterDeel({ energielabels: [] }) })
  if (filter.kamers) pillen.push({ label: 'Kamers', waarde: `${filter.kamers}+`, onVerwijder: () => zetFilterDeel({ kamers: 0 }) })
  if (filter.tuin) pillen.push({ label: 'Kenmerk', waarde: 'tuin', onVerwijder: () => zetFilterDeel({ tuin: false }) })
  if (filter.garage) pillen.push({ label: 'Kenmerk', waarde: 'garage', onVerwijder: () => zetFilterDeel({ garage: false }) })

  function exporteerCsv() {
    const csv = bouwTransactiesCsv(gesorteerd)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eigen-verkopen-${(dataTotEnMet ?? 'export').slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Tegeldefinities (hero "in beeld" + 4) — geen delta t.o.v. vorige
  // periode: de tijdlijn is al een bereik, net als het prototype (zie
  // `docs/ontwerp/verkoopkaart.html` `update()`-commentaar). ──
  const tegelDefs: { label: string; hero?: boolean; fmt: (v: number) => string; waarde: number | null; sparkline: (number | null)[]; bijschrift: string }[] = [
    { label: 'In beeld', hero: true, fmt: v => nlNL.format(Math.round(v)), waarde: kern.n, sparkline: reeks.n, bijschrift: `verkopen · ${kwartaalKortLabel(filter.van)} — ${kwartaalKortLabel(filter.tot)}` },
    { label: 'Mediaan prijs', fmt: euro, waarde: kern.mediaanPrijs, sparkline: reeks.prijs, bijschrift: `n = ${nlNL.format(kern.n)} · in de selectie` },
    { label: 'Mediaan per m²', fmt: euro, waarde: kern.mediaanM2, sparkline: reeks.m2, bijschrift: `n = ${nlNL.format(kern.n)} · in de selectie` },
    { label: 'Gem. looptijd', fmt: dagenAlsGetal, waarde: kern.gemLooptijd, sparkline: reeks.looptijd, bijschrift: `n = ${nlNL.format(kern.n)} · in de selectie` },
    { label: 'Boven vraagprijs', fmt: v => `${Math.round(v)}%`, waarde: kern.pctBovenVraagprijs, sparkline: reeks.boven, bijschrift: `n = ${nlNL.format(kern.n)} · van de verkopen` },
  ]

  const geenData = transacties.length === 0
  const sliderMax = bereik.tot > bereik.van ? bereik.tot : bereik.van + 1
  const tijdlijnTicks = useMemo(() => {
    const uit: string[] = []
    for (let n = bereik.van; n <= sliderMax; n++) if (n % 4 === 0) uit.push(jaarVan(n))
    return uit.length ? uit : [jaarVan(bereik.van)]
  }, [bereik.van, sliderMax])

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: colors.text, margin: 0 }}>Verkoopkaart</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', maxWidth: '100%' }}>
          {geenData || !dataTotEnMet ? (
            <Badge color={colors.muted} bg={colors.borderSoft}>Nog geen transacties</Badge>
          ) : (
            <Badge dot color="var(--merk-accent, #C61E45)" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
              Alleen eigen verkopen · data t/m <b style={{ color: colors.text }}>{datum(dataTotEnMet)}</b> · {nlNL.format(transacties.length)} verkopen
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={exporteerCsv} disabled={geenData}>Exporteer lijst (CSV)</Button>
        </div>
      </div>

      {geenData ? (
        <EmptyState
          titel="Nog geen eigen verkopen"
          beschrijving="Zodra je kantoor een import heeft (via /admin/transacties), vult de verkoopkaart zich automatisch."
        />
      ) : (
        <>
          {/* Eigen filterbalk-shell (i.p.v. <FilterBar>): het prototype heeft
              drie vaste rijen — dropdowns, tijdlijn, pillen — waarbij de
              tijdlijnrij nooit inklapt. <FilterBar>'s `segmentBRij` is daar
              niet geschikt voor (die krijgt een rode segment-B-tint). */}
          <div
            className="vui-verkoopkaart-filterbar"
            style={{
              position: 'sticky', top: 66, zIndex: 20,
              background: 'rgba(255,255,255,.82)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              border: `1px solid ${colors.border}`, borderRadius: radius.cardLg, boxShadow: shadow.card, marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexWrap: 'wrap' }}>
              <FilterDropdown label="Woningtype" aantalActief={filter.typen.length} onWis={() => zetFilterDeel({ typen: [] })}>
                {taxonomie.map(t => {
                  const alleAan = t.subs.every(s => filter.typen.includes(s))
                  const sommigeAan = !alleAan && t.subs.some(s => filter.typen.includes(s))
                  return (
                    <div key={t.groep}>
                      <Checkbox
                        label={typegroepLabel(t.groep)}
                        vet
                        checked={alleAan}
                        indeterminate={sommigeAan}
                        onChange={aan => zetFilterDeel({ typen: aan ? Array.from(new Set([...filter.typen, ...t.subs])) : filter.typen.filter(s => !t.subs.includes(s)) })}
                      />
                      {t.subs.map(s => (
                        <Checkbox
                          key={s}
                          label={s}
                          ingesprongen
                          checked={filter.typen.includes(s)}
                          onChange={aan => zetFilterDeel({ typen: aan ? [...filter.typen, s] : filter.typen.filter(x => x !== s) })}
                        />
                      ))}
                    </div>
                  )
                })}
              </FilterDropdown>

              <FilterDropdown label="Prijs" samenvatting={prijsSamenvatting} onWis={() => zetFilterDeel({ prijs: [...PRIJS_BEREIK] })}>
                <RangeSlider
                  min={PRIJS_BEREIK[0]} max={PRIJS_BEREIK[1]} stap={25_000} waarde={filter.prijs}
                  fmt={(v, kant) => (kant === 'tot' && v >= PRIJS_BEREIK[1] ? 'geen max' : euroKort(v))}
                  ticks={['€ 0', '1 mln', '2 mln', '3 mln', '4 mln', '5 mln+']}
                  onChange={v => zetFilterDeel({ prijs: v })}
                />
              </FilterDropdown>

              <FilterDropdown label="Woonoppervlak" samenvatting={oppSamenvatting} onWis={() => zetFilterDeel({ opp: [...OPP_BEREIK] })}>
                <RangeSlider
                  min={OPP_BEREIK[0]} max={OPP_BEREIK[1]} stap={5} waarde={filter.opp}
                  fmt={(v, kant) => (kant === 'tot' && v >= OPP_BEREIK[1] ? 'geen max' : m2(v))}
                  ticks={['30', '150', '300', '500+']}
                  onChange={v => zetFilterDeel({ opp: v })}
                />
              </FilterDropdown>

              <FilterDropdown label="Meer filters" aantalActief={meerTeller} breedte={380} uitlijning="end">
                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: 'block', marginBottom: 6 }}>Bouwjaar</span>
                    <RangeSlider min={BOUWJAAR_BEREIK[0]} max={BOUWJAAR_BEREIK[1]} stap={1} waarde={filter.bouwjaar} fmt={v => String(v)} ticks={['1900', '1950', '2000', String(BOUWJAAR_BEREIK[1])]} onChange={v => zetFilterDeel({ bouwjaar: v })} />
                  </div>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: 'block', marginBottom: 6 }}>Energielabel</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ENERGIELABELS.map(e => (
                        <Chip key={e} actief={filter.energielabels.includes(e)} onClick={() => zetFilterDeel({ energielabels: filter.energielabels.includes(e) ? filter.energielabels.filter(x => x !== e) : [...filter.energielabels, e] })}>
                          {e}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: 'block', marginBottom: 6 }}>Kamers</span>
                    <SegmentedToggle
                      size="sm"
                      options={[{ value: '0', label: 'Alle' }, { value: '2', label: '2+' }, { value: '3', label: '3+' }, { value: '4', label: '4+' }, { value: '5', label: '5+' }, { value: '6', label: '6+' }]}
                      value={String(filter.kamers)}
                      onChange={v => zetFilterDeel({ kamers: Number(v) })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <Switch checked={filter.tuin} onChange={v => zetFilterDeel({ tuin: v })} ariaLabel="Tuin" /> Tuin
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <Switch checked={filter.garage} onChange={v => zetFilterDeel({ garage: v })} ariaLabel="Garage" /> Garage
                    </label>
                  </div>
                </div>
              </FilterDropdown>

              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => { setSpeelt(false); zetFilterVolledig(standaard) }}
                style={{ fontSize: 13, fontWeight: 600, color: colors.body, textDecoration: 'underline', textUnderlineOffset: 3, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Herstel
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderTop: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted }}>Periode</span>
              <button
                type="button"
                onClick={afspelen}
                aria-label={speelt ? 'Pauzeren' : 'Afspelen door de tijd'}
                style={{
                  width: 36, height: 36, borderRadius: '50%', flex: 'none',
                  background: 'linear-gradient(180deg, #0A8AD2, var(--merk-hover))', color: '#fff',
                  display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px -4px rgba(var(--merk-rgb, 0,128,200),.6)',
                }}
              >
                {speelt ? (
                  <svg viewBox="0 0 12 12" width={13} height={13}><path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" /></svg>
                ) : (
                  <svg viewBox="0 0 12 12" width={13} height={13}><path d="M2.5 1.5v9l8-4.5z" fill="currentColor" /></svg>
                )}
              </button>
              <span style={{ fontSize: 13, fontWeight: 800, minWidth: 140, color: 'var(--merk-diep, var(--merk))', fontVariantNumeric: 'tabular-nums' }}>
                {kwartaalKortLabel(filter.van)} — {kwartaalKortLabel(filter.tot)}
              </span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <RangeSlider
                  min={bereik.van} max={sliderMax} stap={1}
                  waarde={[filter.van, filter.tot]}
                  fmt={v => kwartaalKortLabel(v)}
                  ticks={tijdlijnTicks}
                  onChange={([v, t]) => { setSpeelt(false); zetFilterDeel({ van: v, tot: t }) }}
                />
              </div>
            </div>

            {pillen.length > 0 && (
              <div style={{ padding: '10px 12px', borderTop: `1px solid ${colors.border}` }}>
                <FilterPills pillen={pillen} onWisAlles={() => zetFilterVolledig({ ...standaard, van: filter.van, tot: filter.tot })} />
              </div>
            )}
          </div>

          <div className="vui-verkoopkaart-tegels" style={{ marginBottom: 12 }}>
            {tegelDefs.map(d => (
              <StatTile
                key={d.label}
                label={d.label}
                hero={d.hero}
                waarde={teWeinigData || d.waarde == null ? undefined : d.waarde}
                opmaak={n => d.fmt(n)}
                waarschuwing={teWeinigData ? `Te weinig verkopen (${kern.n}) voor een betrouwbaar cijfer.` : d.waarde == null ? '—' : undefined}
                bijschrift={teWeinigData ? undefined : d.bijschrift}
                sparkline={teWeinigData ? undefined : d.sparkline}
              />
            ))}
          </div>

          <div className="vui-verkoopkaart-werkblad">
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.cardLg, boxShadow: shadow.card, padding: '16px 18px 12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ marginBottom: 8 }}>
                <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, letterSpacing: '-.01em' }}>Kaart</h2>
                <p style={{ fontSize: 12, color: colors.muted, margin: '2px 0 0' }}>eigen verkopen · sleep om te pannen, scroll om te zoomen</p>
              </div>
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <BasisKaart bounds={bounds} hoogte={WERKBLAD_HOOGTE - 68}>
                  <VerkopenLaag
                    transacties={gefilterd}
                    geselecteerdId={geselecteerdId}
                    gemarkeerdId={gemarkeerdId}
                    onHover={setHover}
                    onSelect={kies}
                  />
                  <HoverKaart info={hover} />
                </BasisKaart>
                <div
                  style={{
                    position: 'absolute', left: 12, bottom: 12, zIndex: 6,
                    background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)',
                    border: `1px solid ${colors.border}`, borderRadius: radius.pill,
                    padding: '6px 12px 6px 8px', fontSize: 12, fontWeight: 600, color: colors.bodyStrong,
                    display: 'flex', alignItems: 'center', gap: 8, boxShadow: shadow.card,
                  }}
                >
                  <svg viewBox="0 0 26 32" width={16} height={20} style={{ overflow: 'visible' }}>
                    <path d="M13 3 23 13 13 23 3 13Z" fill="none" stroke="var(--merk-accent, #C61E45)" strokeWidth={2} />
                    <path d="M13 7 19 13 13 19 7 13Z" fill="var(--merk, #0080C8)" />
                    <circle cx={13} cy={13} r={2} fill="#fff" />
                  </svg>
                  Verkocht door je kantoor · klik voor details
                </div>
                {gefilterd.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 7, display: 'grid', placeItems: 'center', background: 'rgba(245,247,250,.86)', borderRadius: radius.cardLg }}>
                    <div style={{ background: colors.surface, border: `1px dashed ${colors.borderStrong}`, borderRadius: radius.card, padding: '26px 30px', textAlign: 'center', maxWidth: 320, boxShadow: shadow.dropdown }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>Geen verkopen in deze selectie</h3>
                      <p style={{ margin: '0 0 14px', color: colors.body, fontSize: 13.5 }}>Verbreed de periode of haal een filter weg.</p>
                      <Button variant="primary" size="sm" onClick={() => zetFilterVolledig(standaard)}>Herstel filters</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.cardLg, boxShadow: shadow.card, padding: '16px 18px 12px', display: 'flex', flexDirection: 'column', minHeight: 0, height: WERKBLAD_HOOGTE }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, letterSpacing: '-.01em' }}>Verkopen</h2>
                  <p style={{ fontSize: 12, color: colors.muted, margin: '2px 0 0' }}>{nlNL.format(gesorteerd.length)} verkopen in de selectie</p>
                </div>
                <SegmentedToggle
                  size="sm"
                  options={[{ value: 'datum', label: 'Datum' }, { value: 'prijs', label: 'Prijs' }, { value: 'looptijd', label: 'Looptijd' }]}
                  value={filter.sort}
                  onChange={v => zetFilterDeel({ sort: v as typeof filter.sort })}
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '6px 2px' }}>
                {gesorteerd.length === 0 ? (
                  <p style={{ padding: '40px 20px', textAlign: 'center', color: colors.body, fontSize: 13.5 }}>Geen verkopen in deze selectie.</p>
                ) : (
                  gesorteerd.map(v => (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onMouseEnter={() => setGemarkeerdId(v.id)}
                      onMouseLeave={() => setGemarkeerdId(null)}
                      onClick={() => kies(v.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kies(v.id) } }}
                      style={{
                        display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12, alignItems: 'center',
                        padding: '9px 10px', borderRadius: radius.md, cursor: 'pointer',
                        background: v.id === geselecteerdId || v.id === gemarkeerdId ? 'var(--merk-zacht)' : 'transparent',
                        boxShadow: v.id === geselecteerdId ? 'inset 0 0 0 1.5px var(--merk-rand)' : undefined,
                      }}
                    >
                      <span style={{ width: 38, height: 38, borderRadius: radius.sm, background: 'linear-gradient(135deg, var(--merk-zacht), #D6EAF6)', color: 'var(--merk-diep, var(--merk))', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12 }} title={v.woningtype_sub ?? undefined}>
                        {(v.woningtype_groep ?? '?').charAt(0).toUpperCase()}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.adres}{v.plaats ? `, ${v.plaats}` : ''}</div>
                        <div style={{ fontSize: 12, color: colors.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                          {[v.verkoopdatum ? datum(v.verkoopdatum) : null, v.woonoppervlak_m2 ? m2(v.woonoppervlak_m2) : null, v.woningtype_sub].filter(Boolean).join(' · ')}
                        </div>
                      </span>
                      <span style={{ minWidth: 0, textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', color: 'var(--merk-diep, var(--merk))', fontVariantNumeric: 'tabular-nums' }}>{euroKort(v.verkoopprijs)}</div>
                        <div style={{ fontSize: 11, color: colors.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{v.looptijd_dagen != null ? dagen(v.looptijd_dagen) : '—'}</div>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function dagenAlsGetal(v: number): string {
  return `${Math.round(v)} dgn`
}

const RESPONSIVE_CSS = `
  .vui-verkoopkaart-tegels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  @media (max-width: 1100px) { .vui-verkoopkaart-tegels { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .vui-verkoopkaart-tegels { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .vui-verkoopkaart-werkblad { display: grid; grid-template-columns: minmax(0, 1fr) 364px; gap: 12px; }
  @media (max-width: 960px) { .vui-verkoopkaart-werkblad { grid-template-columns: minmax(0, 1fr); } }
`
