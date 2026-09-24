'use client'

/**
 * Concurrentie-explorer v2 (item 6.3, docs/roadmap.md § 5 Fase 6 — port van
 * `docs/ontwerp/concurrentie.html`, spec: `docs/ontwerp/README.md`).
 *
 * Alles komt via RPC's op `verkopend_kantoor_norm` (patroon 2, § 3.1) — geen
 * client-side aggregatie meer op ruwe rijen, dat hield de v1-pagina op
 * ~5,5 s. De standaardfilter-data komt al mee met de pagina (server
 * component); elke volgende filterwijziging ververst via de server actions
 * in `actions.ts`.
 *
 * ⚠️ De RPC's (migratie `20260924_rpc_concurrentie_v2.sql`) zijn nog niet
 * toegepast — elk blok (tegels/wij-vs-markt/trend/matrix/ranglijst/drawer)
 * toont dan een nette "nog niet beschikbaar"-melding i.p.v. te crashen (zie
 * `Onbeschikbaar` hieronder).
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts'
import {
  Badge, EmptyState, Skeleton, SkeletonRij,
  FilterBar, FilterDropdown, FilterPills, Checkbox, SegmentedToggle,
  StatTile, ChartCard, Legenda, DumbbellStat, Sheet,
  type FilterPil,
} from '@/components/ui'
import { colors, radius } from '@/components/ui/tokens'
import { useFilterState } from '@/hooks/useFilterState'
import {
  ConcurrentieFilterSchema, standaardConcurrentieFilter,
  concurrentieFilterNaarTransactieFilter, concurrentieFilterZonderPeriode,
  type ConcurrentieFilterState, type RanglijstRij, type AandeelJaarRij, type MatrixCel, type ConcurrentProfielV2,
} from '@/lib/concurrentie'
import { PRIJSKLASSEN } from '@/lib/marktanalyse'
import { euro, procent, dagen, datum, nlNL } from '@/lib/opmaak'
import { woningtypeTaxonomie } from '@/lib/transactieNormalisatie'
import { typegroepLabel, type Typegroep } from '@/lib/schemas'
import type { PlaatsWijkRij } from '@/lib/transactiesQuery'
import { haalConcurrentieData, haalConcurrentProfiel, type ConcurrentieData } from '@/app/(app)/marktanalyse/concurrentie/actions'

const ONS = 'Eigen kantoor'
const MIN_N_BETROUWBAAR = 6
const CONCURRENT_KLEUREN = [colors.bodyStrong, colors.body, colors.muted]

function bereikGelijk<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function kortNaam(naam: string): string {
  const woorden = naam.split(' ')
  const suffixen = ['makelaardij', 'makelaars', 'wonen', 'woningen', 'vastgoed']
  const kort = woorden.length > 1 && suffixen.includes(woorden[1]?.toLowerCase()) ? woorden[0] : woorden.slice(0, 2).join(' ')
  return kort.length > 18 ? kort.slice(0, 17) + '…' : kort
}

/** Nette "nog niet beschikbaar"-melding voor een blok waarvan de RPC (nog) niet bestaat — geen crash, wel duidelijk. */
function Onbeschikbaar({ tekst = 'Deze cijfers zijn nog niet beschikbaar.' }: { tekst?: string }) {
  return (
    <p style={{ fontSize: 12.5, color: colors.muted, margin: '4px 0', fontStyle: 'italic' }}>{tekst}</p>
  )
}

export function ConcurrentieExplorer({
  werkgebiedPlaatsen,
  plaatsenLijst,
  dataTotEnMet,
  initieel,
}: {
  werkgebiedPlaatsen: string[]
  plaatsenLijst: PlaatsWijkRij[]
  dataTotEnMet: string | null
  initieel: ConcurrentieData
}) {
  const standaard = useMemo(() => standaardConcurrentieFilter(werkgebiedPlaatsen), [werkgebiedPlaatsen])
  const [filter, zetFilterDeel, zetFilterVolledig] = useFilterState(ConcurrentieFilterSchema, standaard)

  const [data, setData] = useState<ConcurrentieData>(initieel)
  const [laden, setLaden] = useState(false)
  const eersteRender = useRef(true)

  const opWijkniveau = filter.plaatsen.length === 1

  const depKey = JSON.stringify(filter)
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false
      return
    }
    let geannuleerd = false
    setLaden(true)
    const rpcFilter = concurrentieFilterNaarTransactieFilter(filter, { datumTot: dataTotEnMet })
    const rpcFilterZonderPeriode = concurrentieFilterZonderPeriode(filter)
    haalConcurrentieData(rpcFilter, rpcFilterZonderPeriode, opWijkniveau)
      .then(res => { if (!geannuleerd) setData(res) })
      .finally(() => { if (!geannuleerd) setLaden(false) })
    return () => { geannuleerd = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, dataTotEnMet, opWijkniveau])

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
    ? filter.plaatsen.length <= 2 ? filter.plaatsen.join(', ') : `${filter.plaatsen[0]} +${filter.plaatsen.length - 1}`
    : undefined
  const typeSamenvatting = filter.typen.length
    ? (() => {
        const volledig = taxonomie.filter(t => t.subs.every(s => filter.typen.includes(s)))
        const rest = filter.typen.filter(s => !volledig.some(t => t.subs.includes(s)))
        const delen = [...volledig.map(t => typegroepLabel(t.groep)), ...rest]
        return delen.length <= 2 ? delen.join(', ') : `${delen[0]} +${delen.length - 1}`
      })()
    : undefined
  const klasseSamenvatting = filter.klassen.length
    ? (() => {
        const labels = PRIJSKLASSEN.filter(k => filter.klassen.includes(k.key)).map(k => k.label)
        return labels.length === 1 ? labels[0] : `${labels.length} klassen`
      })()
    : undefined

  const pillen: FilterPil[] = []
  if (!bereikGelijk(filter.plaatsen, standaard.plaatsen)) {
    pillen.push({ label: 'Plaats', waarde: filter.plaatsen.join(', ') || '—', onVerwijder: () => zetFilterDeel({ plaatsen: standaard.plaatsen, wijken: [] }) })
  }
  if (filter.wijken.length) pillen.push({ label: 'Wijken', waarde: filter.wijken.map(w => w.split('|')[1]).join(', '), onVerwijder: () => zetFilterDeel({ wijken: [] }) })
  if (typeSamenvatting) pillen.push({ label: 'Woningtype', waarde: typeSamenvatting, onVerwijder: () => zetFilterDeel({ typen: [] }) })
  if (klasseSamenvatting) pillen.push({ label: 'Prijsklasse', waarde: klasseSamenvatting, onVerwijder: () => zetFilterDeel({ klassen: [] }) })
  if (filter.verborgen.length) pillen.push({ label: 'Verborgen', waarde: `${filter.verborgen.length} kantoor${filter.verborgen.length > 1 ? 'en' : ''}`, onVerwijder: () => zetFilterDeel({ verborgen: [] }) })

  // ── Zichtbare ranglijst (na "verberg dit kantoor") ──
  // ⚠️ `data.ranglijst === null` betekent "RPC nog niet beschikbaar" (migratie
  // niet toegepast), niet "geen concurrentiedata" — die twee mogen nooit
  // dezelfde lege staat tonen (anders meldt de pagina "verkopend kantoor
  // onbekend" terwijl de dataset dat veld wél gevuld heeft, alleen de RPC
  // nog niet bestaat).
  const rpcBeschikbaar = data.ranglijst !== null
  const ranglijstZichtbaar: RanglijstRij[] | null = data.ranglijst
    ? data.ranglijst.filter(r => !filter.verborgen.includes(r.kantoor))
    : null
  const heeftData = rpcBeschikbaar && !!ranglijstZichtbaar?.some(r => r.kantoor !== ONS && r.kantoor !== 'Onbekend')
  const nTotaal = ranglijstZichtbaar?.reduce((s, r) => s + r.aantal, 0) ?? 0
  const weinigData = rpcBeschikbaar && nTotaal > 0 && nTotaal < MIN_N_BETROUWBAAR

  const eigenRij = ranglijstZichtbaar?.find(r => r.kantoor === ONS) ?? null
  const positie = ranglijstZichtbaar ? ranglijstZichtbaar.findIndex(r => r.kantoor === ONS) + 1 : 0

  // ── Drawer (concurrentprofiel) ──
  const [drawerKantoor, setDrawerKantoor] = useState<string | null>(null)
  const [drawerData, setDrawerData] = useState<ConcurrentProfielV2 | null>(null)
  const [drawerLaden, setDrawerLaden] = useState(false)
  function openDrawer(kantoor: string) {
    setDrawerKantoor(kantoor)
    setDrawerLaden(true)
    setDrawerData(null)
    const rpcFilter = concurrentieFilterNaarTransactieFilter(filter, { datumTot: dataTotEnMet })
    haalConcurrentProfiel(rpcFilter, kantoor)
      .then(setDrawerData)
      .finally(() => setDrawerLaden(false))
  }

  // ── Trendgrafiek: wij + top 3 concurrenten (onafhankelijk van het periodefilter) ──
  const trendSeries = useMemo(() => bouwTrendSeries(data.aandeelJaar), [data.aandeelJaar])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: colors.text, margin: 0 }}>Concurrentie</h1>
        <Badge dot color="var(--merk-accent, #C61E45)" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
          Data t/m <b style={{ color: colors.text }}>{datum(dataTotEnMet)}</b>
          {rpcBeschikbaar ? ` · ${nlNL.format(nTotaal)} transacties in de selectie` : ''}
        </Badge>
      </div>

      <FilterBar pillenRij={pillen.length > 0 ? <FilterPills pillen={pillen} onWisAlles={() => zetFilterVolledig(standaard)} /> : undefined}>
        <FilterDropdown label="Plaats" samenvatting={plaatsSamenvatting} onWis={() => zetFilterDeel({ plaatsen: standaard.plaatsen, wijken: [] })}>
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
          onChange={v => zetFilterDeel({ periode: Number(v) as ConcurrentieFilterState['periode'] })}
          size="sm"
        />

        <FilterDropdown label="Prijsklasse" samenvatting={klasseSamenvatting} onWis={() => zetFilterDeel({ klassen: [] })}>
          {PRIJSKLASSEN.map(k => (
            <Checkbox
              key={k.key}
              label={k.label}
              checked={filter.klassen.includes(k.key)}
              onChange={aan => zetFilterDeel({ klassen: aan ? [...filter.klassen, k.key] : filter.klassen.filter(x => x !== k.key) })}
            />
          ))}
        </FilterDropdown>

        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => zetFilterVolledig(standaard)}
          style={{ background: 'none', border: 'none', color: colors.body, fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}
        >
          Herstel
        </button>
      </FilterBar>

      {rpcBeschikbaar && !heeftData && !laden ? (
        <EmptyState
          titel="Verkopend kantoor onbekend in deze export"
          beschrijving={
            <>
              Deze concurrentieanalyse werkt op het veld <b>verkopend kantoor</b> in de transactie-export. Voor de huidige
              dataset is dat veld niet gevuld, dus kunnen we geen marktaandeel, ranglijst of matrix tonen. Vraag de
              platform-admin om een nieuwe export met dit veld ingevuld.
            </>
          }
        />
      ) : (
        <>
          {/* ── Tegels ── */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            {laden ? (
              <SkeletonRij aantal={5} height={100} />
            ) : (
              <>
                <StatTile
                  hero
                  label="Marktaandeel eigen kantoor"
                  waarde={eigenRij?.aandeelPct ?? undefined}
                  opmaak={n => `${(n / 10).toFixed(1)}%`}
                  bijschrift={rpcBeschikbaar ? `n = ${nlNL.format(nTotaal)} · data t/m ${datum(dataTotEnMet)}` : undefined}
                  waarschuwing={!rpcBeschikbaar ? 'Nog niet beschikbaar.' : weinigData ? `Te weinig verkopen (${nTotaal}) voor een betrouwbaar cijfer.` : undefined}
                />
                <StatTile
                  label="Positie in de ranglijst"
                  waarde={positie || undefined}
                  opmaak={n => `#${n}`}
                  bijschrift={ranglijstZichtbaar ? `van ${ranglijstZichtbaar.length} kantoren · n = ${nlNL.format(nTotaal)}` : undefined}
                  waarschuwing={!rpcBeschikbaar ? 'Nog niet beschikbaar.' : undefined}
                />
                <StatTile
                  label="Gem. looptijd (wij)"
                  waarde={data.wijVsMarkt?.looptijdWij ?? undefined}
                  opmaak={dagenGetalOpmaak}
                  bijschrift={data.wijVsMarkt ? `n = ${nlNL.format(data.wijVsMarkt.nWij)} · markt ${dagen(data.wijVsMarkt.looptijdMarkt)}` : undefined}
                  waarschuwing={!data.wijVsMarkt ? 'Nog niet beschikbaar.' : undefined}
                />
                <StatTile
                  label="T.o.v. vraagprijs (wij)"
                  waarde={data.wijVsMarkt?.ratioWij != null ? data.wijVsMarkt.ratioWij * 10 : undefined}
                  opmaak={n => procent(n / 10)}
                  bijschrift={data.wijVsMarkt ? `n = ${nlNL.format(data.wijVsMarkt.nWij)} · markt ${procent(data.wijVsMarkt.ratioMarkt)}` : undefined}
                  waarschuwing={!data.wijVsMarkt ? 'Nog niet beschikbaar.' : undefined}
                />
                <StatTile
                  label="€ per m² (wij)"
                  waarde={data.wijVsMarkt?.m2Wij ?? undefined}
                  opmaak={euroGetalOpmaak}
                  bijschrift={data.wijVsMarkt ? `n = ${nlNL.format(data.wijVsMarkt.nWij)} · markt ${euro(data.wijVsMarkt.m2Markt)}` : undefined}
                  waarschuwing={!data.wijVsMarkt ? 'Nog niet beschikbaar.' : undefined}
                />
              </>
            )}
          </section>

          {/* ── Wij vs. markt ── */}
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.cardLg, padding: '16px 18px', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: '0 0 2px', color: colors.text }}>Wij vs. markt</h2>
            <div style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>medianen/gemiddelden binnen de huidige selectie</div>
            {laden ? (
              <SkeletonRij aantal={3} height={90} />
            ) : !data.wijVsMarkt ? (
              <Onbeschikbaar />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
                <div style={{ background: colors.surfaceAlt, borderRadius: radius.md, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.body, marginBottom: 14 }}>Looptijd</div>
                  <DumbbellStat wij={data.wijVsMarkt.looptijdWij} markt={data.wijVsMarkt.looptijdMarkt} fmt={dagen} gunstig={-1}
                    deltaFmt={dl => `${dl > 0 ? '+' : ''}${Math.round(dl)} dgn t.o.v. de markt`} />
                </div>
                <div style={{ background: colors.surfaceAlt, borderRadius: radius.md, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.body, marginBottom: 14 }}>T.o.v. vraagprijs</div>
                  <DumbbellStat wij={data.wijVsMarkt.ratioWij} markt={data.wijVsMarkt.ratioMarkt} fmt={v => procent(v)} gunstig={1}
                    deltaFmt={dl => `${dl > 0 ? '+' : ''}${dl.toFixed(1)} pt t.o.v. de markt`} />
                </div>
                <div style={{ background: colors.surfaceAlt, borderRadius: radius.md, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.body, marginBottom: 14 }}>€ per m²</div>
                  <DumbbellStat wij={data.wijVsMarkt.m2Wij} markt={data.wijVsMarkt.m2Markt} fmt={euro} gunstig={0}
                    deltaFmt={dl => `${dl >= 0 ? '+' : '−'}${euro(Math.abs(dl))} t.o.v. de markt/m²`} />
                </div>
              </div>
            )}
          </div>

          {/* ── Trend: marktaandeel per jaar ── */}
          <div style={{ marginBottom: 14 }}>
            <ChartCard
              titel="Marktaandeel per jaar"
              subtitel="alle jaren · plaats/type/prijsklasse-filters gelden wel, periode niet"
              laden={laden && !data.aandeelJaar}
              legenda={trendSeries.length ? <Legenda items={trendSeries.map(s => ({ label: s.label, kleur: s.kleur }))} /> : undefined}
            >
              {!data.aandeelJaar ? (
                <Onbeschikbaar />
              ) : (
                <TrendGrafiek series={trendSeries} />
              )}
            </ChartCard>
          </div>

          {/* ── Matrix + Ranglijst ── */}
          <div className="vui-concurrentie-matrix-ranglijst">
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.cardLg, padding: '16px 18px', minWidth: 0 }}>
              <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: '0 0 2px', color: colors.text }}>Wie wint waar</h2>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>
                {opWijkniveau ? 'top-kantoor per wijk × woningtype' : 'top-kantoor per plaats × woningtype'}
              </div>
              {laden ? (
                <Skeleton height={160} />
              ) : !data.matrix ? (
                <Onbeschikbaar />
              ) : (
                <WieWintWaarMatrix matrix={data.matrix} onKies={openDrawer} />
              )}
              <p style={{ fontSize: 11.5, color: colors.muted, margin: '10px 0 0' }}>Hover voor de top 3, klik op een cel voor het concurrentprofiel.</p>
            </div>

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.cardLg, padding: '16px 18px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, color: colors.text }}>Kantoren in dit segment</h2>
                  <div style={{ fontSize: 12, color: colors.muted }}>top 8 · klik voor het concurrentprofiel</div>
                </div>
                <SegmentedToggle
                  options={[{ value: 'aandeel', label: 'Aandeel' }, { value: 'aantal', label: 'Aantal' }, { value: 'looptijd', label: 'Looptijd' }]}
                  value={filter.sort}
                  onChange={v => zetFilterDeel({ sort: v as ConcurrentieFilterState['sort'] })}
                  size="sm"
                />
              </div>
              {laden ? (
                <SkeletonRij aantal={5} height={26} />
              ) : !ranglijstZichtbaar ? (
                <Onbeschikbaar />
              ) : (
                <Ranglijst rijen={ranglijstZichtbaar} sort={filter.sort} onKies={openDrawer} />
              )}
            </div>
          </div>
        </>
      )}

      <Sheet
        open={!!drawerKantoor}
        onOpenChange={open => { if (!open) setDrawerKantoor(null) }}
        titel={drawerKantoor ?? ''}
        omschrijving="Concurrentprofiel binnen de huidige plaats-/type-/prijsselectie"
      >
        {drawerLaden || !drawerKantoor ? (
          <SkeletonRij aantal={4} height={54} />
        ) : !drawerData ? (
          <Onbeschikbaar tekst="Het concurrentprofiel is nog niet beschikbaar." />
        ) : (
          <ConcurrentDrawerInhoud
            profiel={drawerData}
            magSchrappen={drawerKantoor !== ONS}
            onSchrap={() => {
              if (drawerKantoor) zetFilterDeel({ verborgen: [...filter.verborgen, drawerKantoor] })
              setDrawerKantoor(null)
            }}
          />
        )}
      </Sheet>
    </>
  )
}

function dagenGetalOpmaak(n: number): string {
  return dagen(n)
}
function euroGetalOpmaak(n: number): string {
  return euro(n)
}

/** Plaats + wijk kiezen met zoekveld — zelfde patroon als MarktanalyseExplorer's PlaatsWijkKiezer (bewust page-local, niet gedeeld). */
function PlaatsWijkKiezer({
  plaatsen,
  filter,
  zetFilterDeel,
}: {
  plaatsen: { label: string; n: number; wijken: { label: string; n: number }[] }[]
  filter: ConcurrentieFilterState
  zetFilterDeel: (deel: Partial<ConcurrentieFilterState>) => void
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
        style={{ width: '100%', height: 34, borderRadius: radius.sm, border: `1px solid ${colors.borderStrong}`, padding: '0 10px', marginBottom: 8, background: colors.surfaceAlt, fontSize: 13 }}
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
                  zetFilterDeel({ plaatsen: plaatsen2, wijken: wijken2 })
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

type TrendSerie = { key: string; naam: string; label: string; kleur: string; punten: { jaar: number; pct: number | null; n: number }[] }

/** Wij + top 3 concurrenten (op totaal aantal over alle jaren) — puur presentatie, de data zelf komt al gevalideerd van de RPC. */
function bouwTrendSeries(rijen: AandeelJaarRij[] | null): TrendSerie[] {
  if (!rijen || rijen.length === 0) return []
  const totaalPerKantoor = new Map<string, number>()
  for (const r of rijen) totaalPerKantoor.set(r.kantoor, (totaalPerKantoor.get(r.kantoor) ?? 0) + r.aantal)
  const top3 = Array.from(totaalPerKantoor.entries())
    .filter(([naam]) => naam !== ONS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([naam]) => naam)
  const namen = [ONS, ...top3]
  const jaren = Array.from(new Set(rijen.map(r => r.jaar))).sort((a, b) => a - b)
  return namen.map((naam, i) => ({
    key: `s${i}`,
    naam,
    label: naam === ONS ? 'Wij' : kortNaam(naam),
    kleur: naam === ONS ? 'var(--merk)' : CONCURRENT_KLEUREN[i - 1] ?? colors.muted,
    punten: jaren.map(jaar => {
      const rij = rijen.find(r => r.jaar === jaar && r.kantoor === naam)
      const totaal = rijen.find(r => r.jaar === jaar)?.totaal ?? 0
      return { jaar, pct: totaal >= 3 ? ((rij?.aantal ?? 0) / totaal) * 100 : null, n: rij?.aantal ?? 0 }
    }),
  }))
}

function TrendGrafiek({ series }: { series: TrendSerie[] }) {
  if (series.length === 0) return <Onbeschikbaar tekst="Onvoldoende data voor een trend." />
  const jaren = series[0].punten.map(p => p.jaar)
  const data = jaren.map((jaar, i) => {
    const rij: Record<string, number | string | null> = { jaar: String(jaar) }
    series.forEach(s => { rij[s.key] = s.punten[i]?.pct ?? null })
    return rij
  })
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,24,27,.06)" vertical={false} />
        <XAxis dataKey="jaar" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={38} />
        <RTooltip content={<TrendTooltip series={series} />} />
        {series.map(s => (
          <Line
            key={s.key} type="monotone" dataKey={s.key} name={s.key} stroke={s.kleur}
            strokeWidth={s.naam === ONS ? 2.5 : 1.5} dot={s.naam === ONS ? { r: 3, fill: s.kleur, strokeWidth: 0 } : false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function TrendTooltip({ active, payload, label, series }: { active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string; series: TrendSerie[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '10px 12px', fontSize: 12, minWidth: 180 }}>
      <div style={{ fontWeight: 800, color: colors.text, marginBottom: 5 }}>{label}</div>
      {series.map(s => {
        const punt = payload.find(p => p.dataKey === s.key)
        if (!punt) return null
        return (
          <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '2px 0', color: colors.bodyStrong }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: s.kleur, display: 'inline-block' }} />
              {s.naam}
            </span>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{punt.value == null ? '—' : `${punt.value.toFixed(1)}%`}</b>
          </div>
        )
      })}
    </div>
  )
}

function WieWintWaarMatrix({ matrix, onKies }: { matrix: MatrixCel[]; onKies: (kantoor: string) => void }) {
  const groepen = useMemo(() => woningtypeTaxonomie().map(t => t.groep), [])
  const rijen = useMemo(() => {
    const labels = new Map<string, string>()
    matrix.forEach(c => labels.set(c.rijSleutel, c.rijLabel))
    return Array.from(labels.entries())
  }, [matrix])
  const cel = (rijSleutel: string, groep: string) => matrix.find(c => c.rijSleutel === rijSleutel && c.woningtypeGroep === groep)

  if (rijen.length === 0) return <Onbeschikbaar tekst="Geen data voor deze selectie." />

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `128px repeat(${groepen.length}, minmax(110px,1fr))`, gap: 7, minWidth: 520 }}>
        <div />
        {groepen.map(g => (
          <div key={g} style={{ fontSize: 10, fontWeight: 800, color: colors.muted, textTransform: 'uppercase', letterSpacing: '.02em', paddingBottom: 4, alignSelf: 'end' }}>
            {typegroepLabel(g)}
          </div>
        ))}
        {rijen.map(([rijSleutel, rijLabel]) => (
          <Fragment key={rijSleutel}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.bodyStrong, display: 'flex', alignItems: 'center' }}>
              {rijLabel}
            </div>
            {groepen.map(g => {
              const c = cel(rijSleutel, g)
              if (!c) return <div key={`${rijSleutel}-${g}`} style={{ borderRadius: radius.sm, border: `1px dashed ${colors.borderStrong}`, minHeight: 52, display: 'grid', placeItems: 'center', fontSize: 11.5, color: colors.muted }}>geen data</div>
              const top = c.top3[0]
              const wij = top?.kantoor === ONS
              const titel = c.top3.map(t => `${t.kantoor}: ${t.aandeelPct.toFixed(0)}% (n=${t.aantal})`).join('\n')
              return (
                <button
                  key={`${rijSleutel}-${g}`}
                  type="button"
                  title={titel}
                  onClick={() => top && onKies(top.kantoor)}
                  style={{
                    textAlign: 'left', borderRadius: radius.sm, padding: '9px 11px', minHeight: 52,
                    background: wij ? 'var(--merk-zacht)' : colors.surfaceAlt,
                    border: `1px solid ${wij ? 'var(--merk-rand)' : colors.border}`,
                    cursor: top ? 'pointer' : 'default',
                  }}
                >
                  {top ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 700, color: wij ? 'var(--merk-diep)' : colors.bodyStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {kortNaam(top.kantoor)}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2, color: wij ? 'var(--merk-diep)' : colors.text }}>
                        {top.aandeelPct.toFixed(0)}% <small style={{ fontWeight: 600, fontSize: 11, color: colors.muted }}>n={c.n}</small>
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 11.5, color: colors.muted }}>geen data</span>
                  )}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function Ranglijst({ rijen, sort, onKies }: { rijen: RanglijstRij[]; sort: ConcurrentieFilterState['sort']; onKies: (kantoor: string) => void }) {
  const sorters: Record<ConcurrentieFilterState['sort'], (a: RanglijstRij, b: RanglijstRij) => number> = {
    aandeel: (a, b) => b.aandeelPct - a.aandeelPct,
    aantal: (a, b) => b.aantal - a.aantal,
    looptijd: (a, b) => (a.mediaanLooptijd ?? 1e9) - (b.mediaanLooptijd ?? 1e9),
  }
  const gesorteerd = [...rijen].sort(sorters[sort]).slice(0, 8)
  if (gesorteerd.length === 0) return <p style={{ fontSize: 12.5, color: colors.muted, margin: '8px 0' }}>Geen kantoren in deze selectie.</p>
  const maxAandeel = Math.max(...gesorteerd.map(r => r.aandeelPct), 1)
  return (
    <div>
      {gesorteerd.map(r => (
        <div
          key={r.kantoor}
          role="button"
          tabIndex={0}
          onClick={() => onKies(r.kantoor)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKies(r.kantoor) } }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', alignItems: 'center', gap: 8, padding: '7px 0', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 12.5, fontWeight: r.kantoor === ONS ? 800 : 500, color: r.kantoor === ONS ? 'var(--merk-diep)' : colors.bodyStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.kantoor}
          </span>
          <span style={{ height: 8, background: colors.borderSoft, borderRadius: radius.pill, overflow: 'hidden', display: 'block' }}>
            <span style={{ display: 'block', height: '100%', width: `${(r.aandeelPct / maxAandeel) * 100}%`, background: r.kantoor === ONS ? 'var(--merk)' : colors.bodyStrong, borderRadius: radius.pill }} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.bodyStrong, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {r.aandeelPct.toFixed(1)}% <small style={{ fontWeight: 500, color: colors.muted }}>· n={r.aantal} · {dagen(r.mediaanLooptijd)}</small>
          </span>
        </div>
      ))}
    </div>
  )
}

function ConcurrentDrawerInhoud({ profiel, magSchrappen, onSchrap }: { profiel: ConcurrentProfielV2; magSchrappen: boolean; onSchrap: () => void }) {
  const totVerdeling = profiel.verdeling.reduce((s, v) => s + v.n, 0) || 1
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ background: colors.surfaceAlt, borderRadius: radius.md, padding: '10px 12px' }}>
          <span style={{ display: 'block', fontSize: 11.5, color: colors.muted, fontWeight: 600, marginBottom: 2 }}>Verkopen</span>
          <span style={{ fontSize: 17, fontWeight: 800 }}>{nlNL.format(profiel.n)}</span>
        </div>
        <div style={{ background: colors.surfaceAlt, borderRadius: radius.md, padding: '10px 12px' }}>
          <span style={{ display: 'block', fontSize: 11.5, color: colors.muted, fontWeight: 600, marginBottom: 2 }}>Aandeel</span>
          <span style={{ fontSize: 17, fontWeight: 800 }}>{profiel.aandeelPct == null ? '—' : `${profiel.aandeelPct.toFixed(1)}%`}</span>
        </div>
        <div style={{ background: colors.surfaceAlt, borderRadius: radius.md, padding: '10px 12px' }}>
          <span style={{ display: 'block', fontSize: 11.5, color: colors.muted, fontWeight: 600, marginBottom: 2 }}>Gem. looptijd</span>
          <span style={{ fontSize: 17, fontWeight: 800 }}>{dagen(profiel.mediaanLooptijd)}</span>
        </div>
        <div style={{ background: colors.surfaceAlt, borderRadius: radius.md, padding: '10px 12px' }}>
          <span style={{ display: 'block', fontSize: 11.5, color: colors.muted, fontWeight: 600, marginBottom: 2 }}>T.o.v. vraagprijs</span>
          <span style={{ fontSize: 17, fontWeight: 800 }}>{procent(profiel.gemRatio)}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: colors.body, marginBottom: 8 }}>Verdeling per woningtype</span>
        {profiel.verdeling.map(v => (
          <div key={v.woningtypeGroep} style={{ display: 'grid', gridTemplateColumns: '112px 1fr 38px', alignItems: 'center', gap: 8, margin: '6px 0', fontSize: 12 }}>
            <span>{typegroepLabel(v.woningtypeGroep as Typegroep) || v.woningtypeGroep}</span>
            <span style={{ height: 8, background: colors.borderSoft, borderRadius: radius.pill, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${(v.n / totVerdeling) * 100}%`, background: 'var(--merk)', borderRadius: radius.pill }} />
            </span>
            <span style={{ textAlign: 'right', fontWeight: 700 }}>{Math.round((v.n / totVerdeling) * 100)}%</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: colors.body, marginBottom: 4 }}>Sterkste plaats</span>
        <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 13.5 }}>
          {profiel.sterkstePlaats ? `${profiel.sterkstePlaats} (${profiel.sterksteAandeelPct?.toFixed(0)}% aandeel)` : '—'}
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: colors.body, marginBottom: 4 }}>Trend per jaar</span>
        <MiniSparkline waarden={profiel.trend.map(t => t.aantal)} />
      </div>

      {magSchrappen && (
        <button
          type="button"
          onClick={onSchrap}
          style={{ marginTop: 4, padding: '8px 14px', borderRadius: radius.pill, background: 'none', border: '1px solid var(--merk-accent-rand)', color: 'var(--merk-accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Verberg dit kantoor
        </button>
      )}
    </div>
  )
}

function MiniSparkline({ waarden }: { waarden: number[] }) {
  if (waarden.length < 2) return <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>Onvoldoende data.</p>
  const w = 300, h = 38
  const mn = Math.min(...waarden), mx = Math.max(...waarden), sp = mx - mn || 1
  const punten = waarden.map((v, i) => [i / (waarden.length - 1) * w, h - 4 - ((v - mn) / sp) * (h - 14)])
  const d = punten.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const vlak = `${d} L${punten[punten.length - 1][0].toFixed(1)} ${h} L${punten[0][0].toFixed(1)} ${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', height: 40 }}>
      <path d={vlak} fill="var(--merk)" opacity={0.08} />
      <path d={d} fill="none" stroke="var(--merk)" strokeWidth={1.6} opacity={0.6} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
