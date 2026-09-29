'use client'

/**
 * Marktanalyse-explorer v2 (item 6.1, docs/roadmap.md § 5 Fase 6 — port van
 * `docs/ontwerp/marktanalyse.html`, spec: `docs/ontwerp/README.md`).
 *
 * Databronnen (§ 3.1): eigen verkopen komen één keer mee met de pagina
 * (patroon 1, client-side gefilterd, < 100 ms — `filterEigenRijen`/
 * `wijKwartaalReeks` in `lib/marktanalyse.ts`) en voeden de "wij"-lijn plus de
 * tegel-sparklines. De regionale ("markt") cijfers komen van de RPC's
 * (patroon 2, `lib/transactiesQuery.ts`) via de server action
 * `app/(app)/marktanalyse/actions.ts`, die op elke filterwijziging opnieuw
 * wordt aangeroepen — de pagina zelf levert al de standaardfilter-data mee,
 * dus de eerste paint toont meteen cijfers zonder skeleton.
 *
 * Kwartaalbericht (item 6.4): `KwartaalberichtModal` (los bestand) doet de
 * echte generatie via `POST /api/kwartaalbericht` — deze explorer geeft
 * alleen de actieve `filter` door en toont/verbergt de modal.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Badge, Button, EmptyState, Skeleton,
  FilterBar, FilterDropdown, FilterPills, RangeSlider, Chip, Checkbox,
  StatTile, ChartCard, Legenda, SegmentedToggle, Switch, SelectMenu,
  type FilterPil,
} from '@/components/ui'
import { SegmentVergelijking, type SegmentVergelijkingWeergaveRij } from '@/components/SegmentVergelijking'
import { colors } from '@/components/ui/tokens'
import { useFilterState } from '@/hooks/useFilterState'
import {
  MarktanalyseFilterSchema, standaardFilterState, filterStateNaarTransactieFilter,
  filterStateNaarEigenFilter, segmentBFilter, filterEigenRijen, wijKwartaalReeks,
  berekenDelta, richtingVanDelta, segmentVergelijking, MIN_N_BETROUWBAAR,
  PRIJSKLASSEN, PRIJS_BEREIK, OPP_BEREIK, BOUWJAAR_BEREIK,
  PERCEEL_BEREIK, type MarktanalyseFilterState, type ReeksRijV2,
} from '@/lib/marktanalyse'
import { euro, euroKort, procent, dagen, datum, m2, kwartaalLabel, nlNL, deltaTekst } from '@/lib/opmaak'
import { SERIE } from '@/lib/grafiekThema'
import { woningtypeTaxonomie } from '@/lib/transactieNormalisatie'
import { typegroepLabel } from '@/lib/schemas'
import type { TransactieRow } from '@/lib/supabase'
import type { PlaatsWijkRij } from '@/lib/transactiesQuery'
import { haalMarktanalyseData, type MarktanalyseData } from '@/app/(app)/marktanalyse/actions'
import { bereikGelijk, verzamelingGelijk } from '@/lib/filterVergelijk'

const ENERGIELABELS = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
const MIN_N_REEKSPUNT = 3

/** Voegt markt/wij/(segment B)-kwartaalreeksen samen tot één rij-per-kwartaal-dataset voor recharts. */
function samenvoegVoorGrafiek(
  markt: ReeksRijV2[],
  wij: ReeksRijV2[],
  b: ReeksRijV2[] | null,
  sleutel: keyof Pick<ReeksRijV2, 'mediaanPrijs' | 'mediaanM2' | 'mediaanLooptijd' | 'pctTovVraag'>,
) {
  const kwartalen = new Set<string>()
  markt.forEach(r => kwartalen.add(r.kwartaal))
  wij.forEach(r => kwartalen.add(r.kwartaal))
  b?.forEach(r => kwartalen.add(r.kwartaal))
  const zoek = (arr: ReeksRijV2[], k: string) => arr.find(r => r.kwartaal === k)
  return Array.from(kwartalen)
    .sort()
    .map(k => {
      const m = zoek(markt, k)
      const w = zoek(wij, k)
      const bb = b ? zoek(b, k) : undefined
      return {
        kwartaal: k,
        label: kwartaalLabel(k),
        markt: m && m.n >= MIN_N_REEKSPUNT ? m[sleutel] : null,
        wij: w && w.n >= MIN_N_REEKSPUNT ? w[sleutel] : null,
        b: bb && bb.n >= MIN_N_REEKSPUNT ? bb[sleutel] : null,
        nMarkt: m?.n ?? 0,
        nWij: w?.n ?? 0,
        nB: bb?.n ?? 0,
      }
    })
}

// ── Grafieken lazy geladen (`components/grafieken/MarktanalyseGrafieken.tsx`,
// het énige bestand van de marktanalyse dat recharts importeert) — SSR
// rendert `ResponsiveContainer` toch niets zichtbaars, dus de skeleton (in
// exact dezelfde hoogte als de ChartCard-container, zie CLAUDE.md § hydratie-
// les: nooit opacity:0 tot een effect het toont) voorkomt layout-verschuiving. ──
const GRAFIEK_SKELETON = <Skeleton height="100%" rounded={10} />
const LijnGrafiek = dynamic(
  () => import('@/components/grafieken/MarktanalyseGrafieken').then(m => m.LijnGrafiek),
  { ssr: false, loading: () => GRAFIEK_SKELETON },
)
const LooptijdGrafiek = dynamic(
  () => import('@/components/grafieken/MarktanalyseGrafieken').then(m => m.LooptijdGrafiek),
  { ssr: false, loading: () => GRAFIEK_SKELETON },
)

// Modal wordt pas geopend na een klik: pas dan de JS laden, de knop zelf
// blijft meteen zichtbaar (geen loading-UI nodig, ssr niet relevant).
const KwartaalberichtModal = dynamic(
  () => import('@/components/KwartaalberichtModal').then(m => m.KwartaalberichtModal),
  { ssr: false },
)

export function MarktanalyseExplorer({
  werkgebiedPlaatsen,
  plaatsenLijst,
  eigenVerkopen,
  dataTotEnMet,
  initieel,
}: {
  werkgebiedPlaatsen: string[]
  plaatsenLijst: PlaatsWijkRij[]
  eigenVerkopen: TransactieRow[]
  dataTotEnMet: string | null
  initieel: MarktanalyseData
}) {
  const standaard = useMemo(() => standaardFilterState(werkgebiedPlaatsen), [werkgebiedPlaatsen])
  const [filter, zetFilterDeel, zetFilterVolledig] = useFilterState(MarktanalyseFilterSchema, standaard)

  const [data, setData] = useState<MarktanalyseData>(initieel)
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const eersteRender = useRef(true)

  const depKey = JSON.stringify(filter)
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false
      return
    }
    let geannuleerd = false
    setLaden(true)
    setFout(null)
    const filtersA = filterStateNaarTransactieFilter(filter, { datumTot: dataTotEnMet })
    const filtersVerdeling = filterStateNaarTransactieFilter(filter, { datumTot: dataTotEnMet, metKlasse: false })
    const filtersB = segmentBFilter(filter, { datumTot: dataTotEnMet })
    haalMarktanalyseData(filtersA, filtersVerdeling, filtersB)
      .then(res => { if (!geannuleerd) setData(res) })
      .catch(() => { if (!geannuleerd) setFout('Kon de marktcijfers niet laden. Probeer het opnieuw of pas de filters aan.') })
      .finally(() => { if (!geannuleerd) setLaden(false) })
    return () => { geannuleerd = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, dataTotEnMet])

  // ── "Wij" (eigen verkopen, patroon 1 — client-side, < 100 ms) ──
  const rowsWij = useMemo(
    () => filterEigenRijen(eigenVerkopen, filterStateNaarEigenFilter(filter, { datumTot: dataTotEnMet })),
    [eigenVerkopen, filter, dataTotEnMet],
  )
  const reeksWij = useMemo(() => wijKwartaalReeks(rowsWij), [rowsWij])
  const segmentBActief = filter.b && !!filter.bPlaats

  const nu = data.samenvatting.huidig
  const vorig = data.samenvatting.vorig
  const teWeinigData = nu.n < MIN_N_BETROUWBAAR
  const geenResultaten = !laden && nu.n === 0

  // ── Filterbalk: opties ──
  const plaatsen = useMemo(() => {
    const map = new Map<string, { label: string; n: number; wijken: { label: string; n: number }[] }>()
    for (const r of plaatsenLijst) {
      const bestaand = map.get(r.plaats) ?? { label: r.plaats, n: 0, wijken: [] }
      bestaand.n += r.n
      if (r.wijk) bestaand.wijken.push({ label: r.wijk, n: r.n })
      map.set(r.plaats, bestaand)
    }
    return Array.from(map.values())
  }, [plaatsenLijst])
  const taxonomie = useMemo(() => woningtypeTaxonomie(), [])

  const plaatsSamenvatting = filter.plaatsen.length
    ? filter.plaatsen.length <= 2
      ? filter.plaatsen.join(', ')
      : `${filter.plaatsen[0]} +${filter.plaatsen.length - 1}`
    : undefined
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
    (bereikGelijk(filter.perceel, PERCEEL_BEREIK) ? 0 : 1) +
    (filter.tuin ? 1 : 0) +
    (filter.garage ? 1 : 0) +
    (filter.tov !== 'alle' ? 1 : 0)

  // ── Actieve filterpillen ──
  const pillen: FilterPil[] = []
  if (!verzamelingGelijk(filter.plaatsen, standaard.plaatsen)) {
    // Leeg = expliciet "alle plaatsen" (via "Wis" in de dropdown, sinds
    // 27 sep 2026 een geldige, afwijkende staat, geen "—"/lege pil).
    pillen.push({
      label: 'Plaats',
      waarde: filter.plaatsen.length ? filter.plaatsen.join(', ') : 'Alle plaatsen',
      onVerwijder: () => zetFilterDeel({ plaatsen: standaard.plaatsen, wijken: [] }),
    })
  }
  if (filter.klasse) {
    const k = PRIJSKLASSEN.find(k => k.key === filter.klasse)
    if (k) pillen.push({ label: 'Prijsklasse', waarde: k.label, onVerwijder: () => zetFilterDeel({ klasse: '' }) })
  }
  if (prijsSamenvatting) pillen.push({ label: 'Prijs', waarde: prijsSamenvatting, onVerwijder: () => zetFilterDeel({ prijs: [...PRIJS_BEREIK] }) })
  if (oppSamenvatting) pillen.push({ label: 'Oppervlak', waarde: oppSamenvatting, onVerwijder: () => zetFilterDeel({ opp: [...OPP_BEREIK] }) })
  if (typeSamenvatting) pillen.push({ label: 'Type', waarde: typeSamenvatting, onVerwijder: () => zetFilterDeel({ typen: [] }) })
  if (filter.wijken.length) pillen.push({ label: 'Wijken', waarde: filter.wijken.map(w => w.split('|')[1]).join(', '), onVerwijder: () => zetFilterDeel({ wijken: [] }) })
  if (!bereikGelijk(filter.bouwjaar, BOUWJAAR_BEREIK)) pillen.push({ label: 'Bouwjaar', waarde: `${filter.bouwjaar[0]} – ${filter.bouwjaar[1]}`, onVerwijder: () => zetFilterDeel({ bouwjaar: [...BOUWJAAR_BEREIK] }) })
  if (filter.energielabels.length) pillen.push({ label: 'Energielabel', waarde: filter.energielabels.join(', '), onVerwijder: () => zetFilterDeel({ energielabels: [] }) })
  if (filter.kamers) pillen.push({ label: 'Kamers', waarde: `${filter.kamers}+`, onVerwijder: () => zetFilterDeel({ kamers: 0 }) })
  if (!bereikGelijk(filter.perceel, PERCEEL_BEREIK)) pillen.push({ label: 'Perceel', waarde: `${filter.perceel[0]} – ${filter.perceel[1]} m²`, onVerwijder: () => zetFilterDeel({ perceel: [...PERCEEL_BEREIK] }) })
  if (filter.tuin) pillen.push({ label: 'Kenmerk', waarde: 'tuin', onVerwijder: () => zetFilterDeel({ tuin: false }) })
  if (filter.garage) pillen.push({ label: 'Kenmerk', waarde: 'garage', onVerwijder: () => zetFilterDeel({ garage: false }) })
  if (filter.tov !== 'alle') pillen.push({ label: 'T.o.v. vraagprijs', waarde: filter.tov === 'boven' ? 'boven' : 'op of onder', onVerwijder: () => zetFilterDeel({ tov: 'alle' }) })

  // ── Tegels ──
  const tegelDefs: {
    label: string
    hero?: boolean
    fmt: (v: number) => string
    sleutel: keyof Pick<ReeksRijV2, 'mediaanPrijs' | 'mediaanM2' | 'mediaanLooptijd' | 'pctTovVraag'> | 'n'
    deltaType: 'relatief' | 'absoluut'
    gunstig: 1 | -1 | 0
    eenheid?: string
  }[] = [
    { label: 'Mediaan verkoopprijs', hero: true, fmt: euro, sleutel: 'mediaanPrijs', deltaType: 'relatief', gunstig: 1 },
    { label: 'Mediaan prijs per m²', fmt: euro, sleutel: 'mediaanM2', deltaType: 'relatief', gunstig: 1 },
    { label: 'Mediaan looptijd', fmt: dagen, sleutel: 'mediaanLooptijd', deltaType: 'absoluut', gunstig: -1, eenheid: 'dgn' },
    { label: 'Verkocht t.o.v. vraagprijs', fmt: v => procent(v), sleutel: 'pctTovVraag', deltaType: 'absoluut', gunstig: 1, eenheid: 'pt' },
    { label: 'Verkopen in de selectie', fmt: v => nlNL.format(Math.round(v)), sleutel: 'n', deltaType: 'relatief', gunstig: 0 },
  ]
  const reeksVoorSparkline = reeksWij.length ? reeksWij : data.reeksMarkt
  const huidigWaarde = (sleutel: (typeof tegelDefs)[number]['sleutel']): number | null =>
    sleutel === 'n' ? nu.n : (nu[sleutel] as number | null)
  const vorigWaarde = (sleutel: (typeof tegelDefs)[number]['sleutel']): number | null =>
    sleutel === 'n' ? vorig.n : (vorig[sleutel] as number | null)

  // ── Segment A vs. B (F1): vergelijkingsrijen onder de tegels ──
  // `data.samenvattingB` is `null` zowel als B uit staat als wanneer de
  // aanroep mislukte — `segmentBFout` maakt dat onderscheid (alleen "mislukt"
  // toont een foutmelding, segment A blijft in beide gevallen gewoon werken).
  const bHuidig = data.samenvattingB?.huidig ?? null
  const segmentBLaden = segmentBActief && laden
  const segmentBFout = segmentBActief && !laden && data.samenvattingB == null
  const vergelijking = useMemo(
    () => segmentVergelijking(nu, bHuidig, MIN_N_BETROUWBAAR),
    [nu, bHuidig],
  )
  const vergelijkingRijen: SegmentVergelijkingWeergaveRij[] = tegelDefs.map(d => {
    const r = vergelijking.find(x => x.metriek === d.sleutel)!
    return {
      key: d.sleutel,
      label: d.label,
      aTekst: r.a == null ? '—' : d.fmt(r.a),
      bTekst: r.b == null ? '—' : d.fmt(r.b),
      verschil: r.verschil,
      verschilTekst: deltaTekst(r.verschil, d.eenheid),
    }
  })
  const vergelijkingWaarschuwingA = teWeinigData
    ? `Segment A heeft te weinig verkopen (n = ${nu.n}) voor een betrouwbare vergelijking.`
    : undefined
  const vergelijkingWaarschuwingB =
    !teWeinigData && bHuidig && bHuidig.n < MIN_N_BETROUWBAAR
      ? `Segment B heeft te weinig verkopen (n = ${bHuidig.n}) voor een betrouwbare vergelijking — kies een andere plaats of een breder type.`
      : undefined

  // Geen eigen <AppPagina>/eyebrow hier: `app/(app)/marktanalyse/layout.tsx`
  // omhult alle vier Marktinzichten-schermen al met AppPagina + de gedeelde
  // "Marktinzichten"-eyebrow ("Zoeken in de markt") — een tweede eyebrow zou
  // een letterlijke dubbeling zijn. Dit blok is de schermspecifieke kop uit
  // het prototype: titel + databadge + kwartaalbericht-knop.
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: colors.text, margin: 0 }}>Marktanalyse</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', maxWidth: '100%' }}>
          {geenResultaten || !dataTotEnMet ? (
            // Fix review item 6.1, 24 sep 2026: bij 0 transacties (nieuw
            // kantoor, bv. i4housing zonder import) las de rode live-stip +
            // "Data t/m — · 0 transacties" als een foutmelding. Neutrale
            // badge, geen losse "—"/"·", en geen accentkleur (die is nooit
            // semantisch, CLAUDE.md § Conventies) — de rode live-stip blijft
            // wél de norm zodra er wél data is (docs/ontwerp/README.md § 1.2b).
            <Badge color={colors.muted} bg={colors.borderSoft}>
              Nog geen transacties
            </Badge>
          ) : (
            <Badge dot color="var(--merk-accent)" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
              Data t/m <b style={{ color: colors.text }}>{datum(dataTotEnMet)}</b> · {nlNL.format(nu.n)} transacties in de selectie
            </Badge>
          )}
          <KwartaalberichtKnop filter={filter} disabled={geenResultaten} />
        </div>
      </div>

      <FilterBar
        pillenRij={pillen.length > 0 ? <FilterPills pillen={pillen} onWisAlles={() => zetFilterVolledig(standaard)} /> : undefined}
        segmentBRij={
          filter.b ? (
            <>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--merk-accent)' }}>Segment B</span>
              <SelectMenu
                waarde={filter.bPlaats || undefined}
                onChange={v => zetFilterDeel({ bPlaats: v })}
                opties={plaatsen.map(p => ({ waarde: p.label, label: p.label }))}
                plaatshouder="Kies een plaats…"
                breedte={180}
                ariaLabel="Plaats voor segment B"
              />
              <SelectMenu
                waarde={filter.bGroep}
                onChange={v => zetFilterDeel({ bGroep: v })}
                opties={[{ waarde: 'alle', label: 'Alle typen' }, ...taxonomie.map(t => ({ waarde: t.groep, label: typegroepLabel(t.groep) }))]}
                breedte={160}
                ariaLabel="Woningtype voor segment B"
              />
              <span style={{ fontSize: 12, color: colors.body, marginLeft: 'auto' }}>
                Segment B verschijnt als tweede reeks in elke grafiek; de vergelijking met segment A staat direct onder de kerncijfers.
              </span>
            </>
          ) : undefined
        }
      >
        <FilterDropdown label="Plaats" samenvatting={plaatsSamenvatting} onWis={() => zetFilterDeel({ plaatsen: [], wijken: [] })}>
          <PlaatsWijkKiezer plaatsen={plaatsen} filter={filter} zetFilterDeel={zetFilterDeel} />
        </FilterDropdown>

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

        <SegmentedToggle
          options={[{ value: '12', label: '12 mnd' }, { value: '24', label: '24 mnd' }, { value: '36', label: '36 mnd' }, { value: '0', label: 'Alles' }]}
          value={String(filter.periode)}
          onChange={v => zetFilterDeel({ periode: Number(v) as MarktanalyseFilterState['periode'] })}
          size="sm"
        />

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
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: 'block', marginBottom: 6 }}>Perceel (niet voor appartementen)</span>
              <RangeSlider min={PERCEEL_BEREIK[0]} max={PERCEEL_BEREIK[1]} stap={50} waarde={filter.perceel} fmt={(v, kant) => (kant === 'tot' && v >= PERCEEL_BEREIK[1] ? 'geen max' : m2(v))} ticks={['0', '1.000', '2.500', '5.000+']} onChange={v => zetFilterDeel({ perceel: v })} />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <Switch checked={filter.tuin} onChange={v => zetFilterDeel({ tuin: v })} ariaLabel="Tuin" /> Tuin
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <Switch checked={filter.garage} onChange={v => zetFilterDeel({ garage: v })} ariaLabel="Garage" /> Garage
              </label>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: 'block', marginBottom: 6 }}>Verkocht t.o.v. vraagprijs</span>
              <SegmentedToggle
                size="sm"
                options={[{ value: 'alle', label: 'Alle' }, { value: 'boven', label: 'Boven vraagprijs' }, { value: 'op_of_onder', label: 'Op of onder' }]}
                value={filter.tov}
                onChange={v => zetFilterDeel({ tov: v as MarktanalyseFilterState['tov'] })}
              />
            </div>
          </div>
        </FilterDropdown>

        <span style={{ flex: 1 }} />
        {/* Korter label (was "Vergelijk met segment B") — fix review item 6.1,
            24 sep 2026: op 1280 px viel "Herstel" anders op een tweede regel;
            de volledige omschrijving blijft staan als aria-label. */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: colors.bodyStrong, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Switch checked={filter.b} onChange={v => zetFilterDeel({ b: v, bPlaats: v && !filter.bPlaats ? (plaatsen.find(p => !filter.plaatsen.includes(p.label))?.label ?? '') : filter.bPlaats })} ariaLabel="Vergelijk met segment B" />
          Segment B
        </label>
        <button
          type="button"
          onClick={() => zetFilterVolledig(standaard)}
          style={{ fontSize: 13, fontWeight: 600, color: colors.body, textDecoration: 'underline', textUnderlineOffset: 3, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Herstel
        </button>
      </FilterBar>

      {fout && (
        <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: '#FFFBEE', border: '1px solid #F1DFA6', color: '#7A5A00', fontSize: 13.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{fout}</span>
          <Button variant="secondary" size="sm" onClick={() => zetFilterVolledig({ ...filter })}>Opnieuw proberen</Button>
        </div>
      )}

      {geenResultaten ? (
        <EmptyState
          titel="Geen verkopen in deze selectie"
          beschrijving="Er zijn geen transacties die aan alle filters voldoen. Verbreed de periode, haal een filter weg of kies een extra plaats."
          actie={<Button variant="primary" size="sm" onClick={() => zetFilterVolledig(standaard)}>Herstel filters</Button>}
        />
      ) : (
        <>
          <div className="vui-marktanalyse-tegels">
            {tegelDefs.map(d => {
              const w = huidigWaarde(d.sleutel)
              const v = vorigWaarde(d.sleutel)
              const deltaWaarde = vorig.n < MIN_N_BETROUWBAAR ? null : berekenDelta(w, v, d.deltaType)
              const richting = richtingVanDelta(deltaWaarde, d.gunstig)
              const sparkline = reeksVoorSparkline.slice(-8).map(r => (d.sleutel === 'n' ? r.n : (r[d.sleutel] as number | null)))
              return (
                <StatTile
                  key={d.label}
                  label={d.label}
                  hero={d.hero}
                  waarde={teWeinigData || w == null ? undefined : w}
                  opmaak={n => d.fmt(n)}
                  waarschuwing={teWeinigData ? `Te weinig verkopen (${nu.n}) voor een betrouwbaar cijfer — verbreed de filters.` : w == null ? '—' : undefined}
                  delta={teWeinigData ? undefined : { tekst: deltaTekst(deltaWaarde, d.eenheid), richting }}
                  bijschrift={`n = ${nlNL.format(nu.n)} · vs vorige periode`}
                  sparkline={teWeinigData ? undefined : sparkline}
                />
              )
            })}
          </div>

          {segmentBActief && (
            <SegmentVergelijking
              rijen={vergelijkingRijen}
              nA={nu.n}
              nB={bHuidig?.n ?? 0}
              waarschuwingA={vergelijkingWaarschuwingA}
              waarschuwingB={vergelijkingWaarschuwingB}
              laden={segmentBLaden}
              fout={segmentBFout}
            />
          )}

          <div className="vui-marktanalyse-grafieken" style={{ marginBottom: 12 }}>
            <ChartCard
              titel="Mediaan verkoopprijs"
              subtitel={<>per kwartaal · {data.reeksMarkt.length} kwartalen · n = {nlNL.format(nu.n)}</>}
              laden={laden}
              legenda={<Legenda items={[{ label: 'Wij', kleur: SERIE.wij }, { label: 'Markt', kleur: SERIE.markt }, { label: 'Segment B', kleur: SERIE.b, getoond: segmentBActief }]} />}
            >
              <LijnGrafiek data={samenvoegVoorGrafiek(data.reeksMarkt, reeksWij, data.reeksB, 'mediaanPrijs')} yFmt={euroKort} ttFmt={euro} segmentB={segmentBActief} />
            </ChartCard>
            <ChartCard
              titel="Mediaan prijs per m²"
              subtitel={<>per kwartaal · {data.reeksMarkt.length} kwartalen · n = {nlNL.format(nu.n)}</>}
              laden={laden}
              legenda={<Legenda items={[{ label: 'Wij', kleur: SERIE.wij }, { label: 'Markt', kleur: SERIE.markt }, { label: 'Segment B', kleur: SERIE.b, getoond: segmentBActief }]} />}
            >
              <LijnGrafiek data={samenvoegVoorGrafiek(data.reeksMarkt, reeksWij, data.reeksB, 'mediaanM2')} yFmt={euroKort} ttFmt={v => euro(v) + '/m²'} segmentB={segmentBActief} />
            </ChartCard>
          </div>

          <div className="vui-marktanalyse-grafieken">
            <ChartCard
              titel="Mediaan looptijd"
              subtitel={<>dagen van aanmelding tot verkoop · n = {nlNL.format(nu.n)}</>}
              laden={laden}
              legenda={<Legenda items={[{ label: 'Wij', kleur: SERIE.wij }, { label: 'Markt', kleur: SERIE.markt }, { label: 'Segment B', kleur: SERIE.b, getoond: segmentBActief }]} />}
            >
              <LooptijdGrafiek data={samenvoegVoorGrafiek(data.reeksMarkt, reeksWij, data.reeksB, 'mediaanLooptijd')} segmentB={segmentBActief} />
            </ChartCard>
            <ChartCard
              titel="Verdeling naar prijsklasse"
              subtitel="aandeel van de verkopen · klik om te filteren"
              laden={laden}
              hoogte={236}
            >
              {data.verdeling ? (
                <PrijsklasseVerdeling
                  rijen={data.verdeling}
                  actief={filter.klasse}
                  onKlik={k => zetFilterDeel({ klasse: filter.klasse === k ? '' : k })}
                />
              ) : (
                <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>
                  Deze cijfers kunnen we nu niet laden. Probeer het later opnieuw.
                </p>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </>
  )
}

// ── Plaats/wijk-kiezer (dropdown-body) ──
function PlaatsWijkKiezer({
  plaatsen,
  filter,
  zetFilterDeel,
}: {
  plaatsen: { label: string; n: number; wijken: { label: string; n: number }[] }[]
  filter: MarktanalyseFilterState
  zetFilterDeel: (deel: Partial<MarktanalyseFilterState>) => void
}) {
  const [zoek, setZoek] = useState('')
  const t = zoek.trim().toLowerCase()
  return (
    <div>
      <input
        value={zoek}
        onChange={e => setZoek(e.target.value)}
        placeholder="Zoek plaats of wijk…"
        aria-label="Zoek plaats of wijk"
        className="vui-input"
        style={{ width: '100%', height: 34, borderRadius: 8, border: `1px solid ${colors.borderStrong}`, padding: '0 10px', marginBottom: 8, background: colors.surfaceAlt, fontSize: 13 }}
      />
      {plaatsen
        .filter(p => !t || p.label.toLowerCase().includes(t) || p.wijken.some(w => w.label.toLowerCase().includes(t)))
        .map(p => {
          const wijkenGefilterd = p.wijken.filter(w => !t || w.label.toLowerCase().includes(t) || p.label.toLowerCase().includes(t))
          return (
            <div key={p.label}>
              <Checkbox
                label={p.label}
                vet
                n={p.n}
                checked={filter.plaatsen.includes(p.label)}
                onChange={aan => {
                  const plaatsen2 = aan ? [...filter.plaatsen, p.label] : filter.plaatsen.filter(x => x !== p.label)
                  const wijken2 = aan ? filter.wijken : filter.wijken.filter(w => !w.startsWith(p.label + '|'))
                  zetFilterDeel({ plaatsen: plaatsen2.length ? plaatsen2 : [p.label], wijken: wijken2 })
                }}
              />
              {wijkenGefilterd.map(w => {
                const key = `${p.label}|${w.label}`
                return (
                  <Checkbox
                    key={key}
                    label={w.label}
                    ingesprongen
                    n={w.n}
                    checked={filter.wijken.includes(key)}
                    onChange={aan => {
                      const wijken2 = aan ? [...filter.wijken, key] : filter.wijken.filter(x => x !== key)
                      const plaatsen2 = aan && !filter.plaatsen.includes(p.label) ? [...filter.plaatsen, p.label] : filter.plaatsen
                      zetFilterDeel({ wijken: wijken2, plaatsen: plaatsen2 })
                    }}
                  />
                )
              })}
            </div>
          )
        })}
    </div>
  )
}

// ── Verdeling naar prijsklasse (horizontale staven, markt vs. wij) ──
function PrijsklasseVerdeling({
  rijen,
  actief,
  onKlik,
}: {
  rijen: { klasse: string; label: string; n: number; nEigen: number }[]
  actief: string
  onKlik: (klasse: string) => void
}) {
  const totMarkt = rijen.reduce((s, r) => s + r.n, 0) || 1
  const totWij = rijen.reduce((s, r) => s + r.nEigen, 0) || 1
  const maxAandeel = Math.max(...rijen.map(r => r.n / totMarkt), 0.01)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 4, height: '100%', justifyContent: 'center' }}>
      {rijen.map(r => {
        const aandeelMarkt = r.n / totMarkt
        const aandeelWij = r.nEigen / totWij
        const isActief = actief === r.klasse
        const isGedimd = !!actief && !isActief
        return (
          <div
            key={r.klasse}
            role="button"
            tabIndex={0}
            aria-pressed={isActief}
            onClick={() => onKlik(r.klasse)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKlik(r.klasse) } }}
            title={`${nlNL.format(r.n)} verkopen in de markt, ${nlNL.format(r.nEigen)} van ons`}
            style={{ display: 'grid', gridTemplateColumns: '112px 1fr 92px', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 6px', borderRadius: 8, opacity: isGedimd ? 0.45 : 1 }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: isActief ? colors.primary : colors.bodyStrong }}>{r.label}</span>
            <span style={{ height: 20, background: colors.borderSoft, borderRadius: 999, position: 'relative', overflow: 'hidden', boxShadow: isActief ? `0 0 0 2px var(--merk-rand, ${colors.primary}33)` : 'none' }}>
              <span style={{ position: 'absolute', inset: 0, width: `${(aandeelMarkt / maxAandeel) * 100}%`, background: SERIE.markt, opacity: 0.45, borderRadius: 999 }} />
              <span style={{ position: 'absolute', top: 6, bottom: 6, left: 0, width: `${(aandeelWij / maxAandeel) * 100}%`, background: SERIE.wij, borderRadius: 999 }} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {procent(aandeelWij * 100, false)} <small style={{ color: colors.muted, fontWeight: 600 }}>· {procent(aandeelMarkt * 100, false)}</small>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Kwartaalbericht (item 6.4): knop + modal, echte generatie in KwartaalberichtModal ──
function KwartaalberichtKnop({ filter, disabled }: { filter: MarktanalyseFilterState; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? 'Geen transacties in de huidige selectie' : undefined}
      >
        Kwartaalbericht schrijven
      </Button>
      {open && <KwartaalberichtModal filter={filter} onClose={() => setOpen(false)} />}
    </>
  )
}
