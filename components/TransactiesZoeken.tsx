'use client'

/**
 * Transacties opzoeken v2 (item 6.2, docs/roadmap.md § 5 Fase 6 — port van
 * `docs/ontwerp/transacties.html`, spec: `docs/ontwerp/README.md`).
 *
 * Databronnen (§ 3.1): de DataTable is server-gepagineerd via de RPC
 * `transacties_zoeken` (patroon 2, 50/pagina) — de server action
 * `app/(app)/marktanalyse/transacties/actions.ts` haalt op elke filter-/
 * sorteer-/paginawijziging een nieuwe pagina + de tegelrij-samenvatting
 * (`marktanalyse_samenvatting`, hergebruikt van item 6.1) op. CSV-export
 * gebruikt de los meegeleverde eigen-verkopenset (patroon 1, `haalEigenVerkopen`)
 * en filtert die client-side met dezelfde filterstand (`filtreerEigenVoorExport`).
 *
 * Afwijkingen van het prototype (zie `lib/transactiesZoeken.ts` voor de eerste twee):
 * - Geen "Verkocht door"-dropdown met individuele (fictieve) makelaars/kantoren
 *   — alleen de "Alleen eigen verkopen"-schakelaar (geen makelaar-kolom op
 *   `transacties`, zie het bestandscommentaar in lib/transactiesZoeken.ts).
 * - "Looptijd (maximaal)" is een segmented control (Alle/30/90/180 dgn) i.p.v.
 *   een eenzijdige schuiver — `RangeSlider` is tweezijdig, een losse
 *   eenzijdige variant leek de moeite niet waard voor één filter.
 * - Minikaart in de Sheet is een statische placeholder: de MapLibre-
 *   `BasisKaart` komt uit item 7.1 en is nog niet gemerged.
 * - "Toon op kaart" (prototype) is weggelaten i.p.v. een knop die niets doet
 *   — komt terug zodra 7.1 gemerged is.
 * - "Gebruik als referentie" werkt op de ene transactie die in de Sheet open
 *   staat (geen multi-select met checkboxes in de tabel, zoals het prototype
 *   ook per-rij via de Sheet doet).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge, Button, Modal, EmptyState, Sheet,
  FilterBar, FilterDropdown, FilterPills, RangeSlider, Chip, Checkbox,
  StatTile, SegmentedToggle, Switch, DataTable,
  type FilterPil, type DataTableKolom, type DataTableSortering,
} from '@/components/ui'
import { colors } from '@/components/ui/tokens'
import { useFilterState } from '@/hooks/useFilterState'
import {
  PRIJS_BEREIK, OPP_BEREIK, BOUWJAAR_BEREIK, PERCEEL_BEREIK,
  berekenDelta, richtingVanDelta,
} from '@/lib/marktanalyse'
import {
  TransactiesFilterSchema, standaardTransactiesFilterState, transactiesFilterNaarTransactieFilter,
  filtreerEigenVoorExport, sorteringVoorRpc, volgendeSortering,
  isSorteerbareKolom, verkochtDoorLabel, ratioTovVraagprijs, bouwTransactiesCsv,
  type TransactiesFilterState,
} from '@/lib/transactiesZoeken'
import { euro, euroKort, procent, dagen, datum, m2, nlNL } from '@/lib/opmaak'
import { woningtypeTaxonomie } from '@/lib/transactieNormalisatie'
import { typegroepLabel } from '@/lib/schemas'
import type { TransactieRow } from '@/lib/supabase'
import type { PlaatsWijkRij, ZoekTransactiesResultaat, MarktanalyseSamenvatting } from '@/lib/transactiesQuery'
import { haalTransactiesData } from '@/app/(app)/marktanalyse/transacties/actions'
import { lijstEigenDossiers, type DossierOptie } from '@/app/(app)/marktanalyse/transacties/dossier-actions'
import { voegReferentiesToe } from '@/app/(app)/object/[id]/waardering-actions'

const ENERGIELABELS = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
const MIN_N_VERGELIJKING = 6
const LOOPTIJD_OPTIES = [
  { value: '365', label: 'Alle' },
  { value: '180', label: 'tot 180 dgn' },
  { value: '90', label: 'tot 90 dgn' },
  { value: '30', label: 'tot 30 dgn' },
] as const

function bereikGelijk(a: [number, number], b: [number, number]) {
  return a[0] === b[0] && a[1] === b[1]
}

export function TransactiesZoeken({
  werkgebiedPlaatsen,
  plaatsenLijst,
  eigenVerkopen,
  dataTotEnMet,
  kantoorNaam,
  initieel,
}: {
  werkgebiedPlaatsen: string[]
  plaatsenLijst: PlaatsWijkRij[]
  eigenVerkopen: TransactieRow[]
  dataTotEnMet: string | null
  /** Getoond in de "Verkocht door"-kolom voor eigen verkopen (geen makelaar-kolom, zie het bestandscommentaar). */
  kantoorNaam: string
  initieel: { resultaat: ZoekTransactiesResultaat; samenvatting: MarktanalyseSamenvatting }
}) {
  const standaard = useMemo(() => standaardTransactiesFilterState(werkgebiedPlaatsen), [werkgebiedPlaatsen])
  const [filter, zetFilterDeel, zetFilterVolledig] = useFilterState(TransactiesFilterSchema, standaard)

  const [data, setData] = useState<{ resultaat: ZoekTransactiesResultaat; samenvatting: MarktanalyseSamenvatting }>(initieel)
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
    const rpcFilter = transactiesFilterNaarTransactieFilter(filter, { datumTot: dataTotEnMet })
    const sortering = sorteringVoorRpc(filter.sortKey, filter.sortDir)
    haalTransactiesData(rpcFilter, sortering, filter.pagina)
      .then(res => { if (!geannuleerd) setData(res) })
      .catch(() => { if (!geannuleerd) setFout('Kon de transacties niet laden. Probeer het opnieuw of pas de filters aan.') })
      .finally(() => { if (!geannuleerd) setLaden(false) })
    return () => { geannuleerd = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, dataTotEnMet])

  const { resultaat, samenvatting } = data
  const nu = samenvatting.huidig
  const vorig = samenvatting.vorig
  const geenResultaten = !laden && resultaat.totaal === 0

  // ── Filterbalk: opties (zelfde patroon als MarktanalyseExplorer, item 6.1) ──
  const plaatsen = useMemo(() => {
    const kaart = new Map<string, { label: string; n: number; wijken: { label: string; n: number }[] }>()
    for (const r of plaatsenLijst) {
      const bestaand = kaart.get(r.plaats) ?? { label: r.plaats, n: 0, wijken: [] }
      bestaand.n += r.n
      if (r.wijk) bestaand.wijken.push({ label: r.wijk, n: r.n })
      kaart.set(r.plaats, bestaand)
    }
    return Array.from(kaart.values())
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
  const prijsSamenvatting = !bereikGelijk(filter.prijs, PRIJS_BEREIK)
    ? `${euroKort(filter.prijs[0])} – ${filter.prijs[1] >= PRIJS_BEREIK[1] ? '∞' : euroKort(filter.prijs[1])}`
    : undefined
  const oppSamenvatting = !bereikGelijk(filter.opp, OPP_BEREIK)
    ? `${filter.opp[0]} – ${filter.opp[1] >= OPP_BEREIK[1] ? '∞' : filter.opp[1]} m²`
    : undefined
  const aangepastePeriode = !!(filter.datumVan || filter.datumTot)
  const meerTeller =
    (bereikGelijk(filter.bouwjaar, BOUWJAAR_BEREIK) ? 0 : 1) +
    (filter.energielabels.length ? 1 : 0) +
    (filter.kamers ? 1 : 0) +
    (bereikGelijk(filter.perceel, PERCEEL_BEREIK) ? 0 : 1) +
    (filter.tuin ? 1 : 0) +
    (filter.garage ? 1 : 0) +
    (filter.tov !== 'alle' ? 1 : 0) +
    (filter.looptijdMax < 365 ? 1 : 0) +
    (aangepastePeriode ? 1 : 0)

  // ── Zoekveld: lokale state + debounce (200 ms, zoals het prototype) ──
  const [zoekInput, setZoekInput] = useState(filter.zoek)
  useEffect(() => setZoekInput(filter.zoek), [filter.zoek])
  useEffect(() => {
    if (zoekInput === filter.zoek) return
    const t = setTimeout(() => zetFilterDeel({ zoek: zoekInput }), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoekInput])

  // ── Actieve filterpillen ──
  const pillen: FilterPil[] = []
  if (plaatsSamenvatting) pillen.push({ label: 'Plaats', waarde: plaatsSamenvatting, onVerwijder: () => zetFilterDeel({ plaatsen: [], wijken: [] }) })
  if (filter.wijken.length) pillen.push({ label: 'Wijken', waarde: filter.wijken.map(w => w.split('|')[1]).join(', '), onVerwijder: () => zetFilterDeel({ wijken: [] }) })
  if (typeSamenvatting) pillen.push({ label: 'Type', waarde: typeSamenvatting, onVerwijder: () => zetFilterDeel({ typen: [] }) })
  if (aangepastePeriode) pillen.push({ label: 'Periode', waarde: 'aangepast', onVerwijder: () => zetFilterDeel({ datumVan: '', datumTot: '' }) })
  else if (filter.periode !== 24) pillen.push({ label: 'Periode', waarde: filter.periode === 0 ? 'alles' : `${filter.periode} mnd`, onVerwijder: () => zetFilterDeel({ periode: 24 }) })
  if (prijsSamenvatting) pillen.push({ label: 'Prijs', waarde: prijsSamenvatting, onVerwijder: () => zetFilterDeel({ prijs: [...PRIJS_BEREIK] }) })
  if (oppSamenvatting) pillen.push({ label: 'Oppervlak', waarde: oppSamenvatting, onVerwijder: () => zetFilterDeel({ opp: [...OPP_BEREIK] }) })
  if (!bereikGelijk(filter.bouwjaar, BOUWJAAR_BEREIK)) pillen.push({ label: 'Bouwjaar', waarde: `${filter.bouwjaar[0]} – ${filter.bouwjaar[1]}`, onVerwijder: () => zetFilterDeel({ bouwjaar: [...BOUWJAAR_BEREIK] }) })
  if (filter.energielabels.length) pillen.push({ label: 'Energielabel', waarde: filter.energielabels.join(', '), onVerwijder: () => zetFilterDeel({ energielabels: [] }) })
  if (filter.kamers) pillen.push({ label: 'Kamers', waarde: `${filter.kamers}+`, onVerwijder: () => zetFilterDeel({ kamers: 0 }) })
  if (!bereikGelijk(filter.perceel, PERCEEL_BEREIK)) pillen.push({ label: 'Perceel', waarde: `${filter.perceel[0]} – ${filter.perceel[1]} m²`, onVerwijder: () => zetFilterDeel({ perceel: [...PERCEEL_BEREIK] }) })
  if (filter.tuin) pillen.push({ label: 'Kenmerk', waarde: 'tuin', onVerwijder: () => zetFilterDeel({ tuin: false }) })
  if (filter.garage) pillen.push({ label: 'Kenmerk', waarde: 'garage', onVerwijder: () => zetFilterDeel({ garage: false }) })
  if (filter.tov !== 'alle') pillen.push({ label: 'T.o.v. vraagprijs', waarde: filter.tov === 'boven' ? 'boven' : 'op of onder', onVerwijder: () => zetFilterDeel({ tov: 'alle' }) })
  if (filter.looptijdMax < 365) pillen.push({ label: 'Looptijd', waarde: `max ${filter.looptijdMax} dgn`, onVerwijder: () => zetFilterDeel({ looptijdMax: 365 }) })
  if (filter.alleenEigen) pillen.push({ label: 'Verkocht door', waarde: 'alleen eigen verkopen', onVerwijder: () => zetFilterDeel({ alleenEigen: false }) })
  if (filter.zoek) pillen.push({ label: 'Zoekterm', waarde: filter.zoek, onVerwijder: () => { setZoekInput(''); zetFilterDeel({ zoek: '' }) } })

  // ── Sticky tabelkop volgt de hoogte van de sticky filterbalk (incl. pillenrij) ──
  const filterBarWrapRef = useRef<HTMLDivElement>(null)
  const [tabelKopTop, setTabelKopTop] = useState(178)
  useEffect(() => {
    function ververs() {
      if (filterBarWrapRef.current) setTabelKopTop(Math.round(filterBarWrapRef.current.getBoundingClientRect().bottom) + 8)
    }
    ververs()
    window.addEventListener('resize', ververs)
    return () => window.removeEventListener('resize', ververs)
  }, [pillen.length])

  // ── Sorteren: DataTable-kolomklik + segmented presets in de kaartkop ──
  const huidigeSortering: DataTableSortering = { key: filter.sortKey, dir: filter.sortDir }
  function sorteerKlik(kolomId: string) {
    if (!isSorteerbareKolom(kolomId)) return
    zetFilterDeel(volgendeSortering({ sortKey: filter.sortKey, sortDir: filter.sortDir }, kolomId))
  }
  const SORT_PRESETS = [
    { key: 'verkoopdatum', dir: 'desc' as const, kort: 'Nieuwste' },
    { key: 'verkoopdatum', dir: 'asc' as const, kort: 'Oudste' },
    { key: 'prijs', dir: 'desc' as const, kort: 'Prijs ↓' },
    { key: 'prijs', dir: 'asc' as const, kort: 'Prijs ↑' },
    { key: 'm2', dir: 'desc' as const, kort: '€/m² ↓' },
    { key: 'looptijd', dir: 'asc' as const, kort: 'Looptijd' },
  ]
  const kolomLabel: Record<string, string> = {
    adres: 'adres', plaatswijk: 'plaats/wijk', type: 'type', verkoopdatum: 'verkoopdatum', prijs: 'prijs',
    opp: 'm²', m2: '€ per m²', ratio: 't.o.v. vraagprijs', looptijd: 'looptijd', verkochtDoor: 'verkocht door',
  }
  const sorteerLabel = (() => {
    const preset = SORT_PRESETS.find(p => p.key === filter.sortKey && p.dir === filter.sortDir)
    if (preset) return preset.kort.toLowerCase()
    return `${kolomLabel[filter.sortKey] ?? filter.sortKey} (${filter.sortDir === 'asc' ? 'oplopend' : 'aflopend'})`
  })()

  // ── DataTable-kolommen ──
  const kolommen: DataTableKolom<TransactieRow>[] = [
    { id: 'adres', header: 'Adres', meta: { sorteerbaar: true }, cell: ({ row }) => <b style={{ color: colors.text }}>{row.original.adres}</b> },
    { id: 'plaatswijk', header: 'Plaats / wijk', meta: { sorteerbaar: true }, cell: ({ row }) => `${row.original.wijk ?? '—'}, ${row.original.plaats ?? '—'}` },
    { id: 'type', header: 'Type', meta: { sorteerbaar: true }, cell: ({ row }) => row.original.woningtype_sub ?? '—' },
    { id: 'verkoopdatum', header: 'Verkoopdatum', meta: { num: true, sorteerbaar: true }, cell: ({ row }) => datum(row.original.verkoopdatum) },
    { id: 'prijs', header: 'Prijs', meta: { num: true, sorteerbaar: true }, cell: ({ row }) => euro(row.original.verkoopprijs) },
    { id: 'opp', header: 'm²', meta: { num: true, sorteerbaar: true }, cell: ({ row }) => m2(row.original.woonoppervlak_m2) },
    { id: 'm2', header: '€ per m²', meta: { num: true, sorteerbaar: true }, cell: ({ row }) => euro(row.original.prijs_m2) },
    {
      id: 'ratio',
      header: 'T.o.v. vraagprijs',
      meta: { num: true, sorteerbaar: true },
      cell: ({ row }) => {
        const r = ratioTovVraagprijs(row.original)
        return <span style={{ color: r != null && r > 0 ? colors.primary : r != null && r < 0 ? '#B45309' : undefined }}>{procent(r)}</span>
      },
    },
    { id: 'looptijd', header: 'Looptijd', meta: { num: true, sorteerbaar: true }, cell: ({ row }) => dagen(row.original.looptijd_dagen) },
    {
      id: 'verkochtDoor',
      header: 'Verkocht door',
      meta: { sorteerbaar: true },
      cell: ({ row }) =>
        row.original.eigen_verkoop ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--merk)', flex: 'none' }} />
            {verkochtDoorLabel(row.original, kantoorNaam)}
          </span>
        ) : (
          verkochtDoorLabel(row.original, kantoorNaam)
        ),
    },
  ]

  // ── Sheet (transactiedetails) ──
  const [sheetRij, setSheetRij] = useState<TransactieRow | null>(null)
  const rijen = resultaat.rijen
  function blader(richting: 1 | -1) {
    if (!sheetRij) return
    const idx = rijen.findIndex(r => r.id === sheetRij.id)
    if (idx === -1) return
    const volgende = Math.min(rijen.length - 1, Math.max(0, idx + richting))
    if (volgende !== idx) setSheetRij(rijen[volgende])
  }
  useEffect(() => {
    if (!sheetRij) return
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (e.key === 'ArrowDown') { e.preventDefault(); blader(1) }
      if (e.key === 'ArrowUp') { e.preventDefault(); blader(-1) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRij, rijen])

  // ── "Gebruik als referentie" (item 4.4) — werkt op de open Sheet-rij ──
  const [dossierModalOpen, setDossierModalOpen] = useState(false)
  const [dossierZoek, setDossierZoek] = useState('')
  const [dossiers, setDossiers] = useState<DossierOptie[] | null>(null)
  const [dossierFout, setDossierFout] = useState<string | null>(null)
  const [toevoegenBezig, setToevoegenBezig] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)

  useEffect(() => {
    if (!dossierModalOpen || dossiers !== null) return
    lijstEigenDossiers().then(res => { if ('error' in res) setDossierFout(res.error); else setDossiers(res) })
  }, [dossierModalOpen, dossiers])

  const gefilterdeDossiers = useMemo(() => {
    if (!dossiers) return []
    const q = dossierZoek.trim().toLowerCase()
    return q ? dossiers.filter(d => d.adres.toLowerCase().includes(q)) : dossiers
  }, [dossiers, dossierZoek])

  async function meenemenAlsReferentie(dossier: DossierOptie) {
    if (!sheetRij) return
    setToevoegenBezig(dossier.id)
    const res = await voegReferentiesToe(dossier.id, [sheetRij.id])
    setToevoegenBezig(null)
    if (res.ok) {
      setMelding(`${sheetRij.adres} toegevoegd als referentie aan de waardering van ${dossier.adres}.`)
      setDossierModalOpen(false)
      setDossierZoek('')
    } else {
      setDossierFout(res.error)
    }
  }

  // ── CSV-export (client-side, uitsluitend eigen verkopen) ──
  function exporteerCsv() {
    if (!filter.alleenEigen) return
    const rijenExport = filtreerEigenVoorExport(eigenVerkopen, filter, { datumTot: dataTotEnMet })
    const csv = bouwTransactiesCsv(rijenExport)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eigen-verkopen-${(dataTotEnMet ?? 'export').slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: colors.text, margin: 0 }}>Transacties opzoeken</h1>
        <Badge dot color="var(--merk-accent, #C61E45)" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>
          Data t/m <b style={{ color: colors.text }}>{datum(dataTotEnMet)}</b> · {nlNL.format(resultaat.totaal)} transacties in de selectie
        </Badge>
      </div>

      <div ref={filterBarWrapRef}>
        <FilterBar
          pillenRij={pillen.length > 0 ? <FilterPills pillen={pillen} onWisAlles={() => { setZoekInput(''); zetFilterVolledig(standaard) }} /> : undefined}
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
            onChange={v => zetFilterDeel({ periode: Number(v) as TransactiesFilterState['periode'], datumVan: '', datumTot: '' })}
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
                  onChange={v => zetFilterDeel({ tov: v as TransactiesFilterState['tov'] })}
                />
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: 'block', marginBottom: 6 }}>Looptijd (maximaal)</span>
                <SegmentedToggle
                  size="sm"
                  options={LOOPTIJD_OPTIES.map(o => ({ value: o.value, label: o.label }))}
                  value={String(filter.looptijdMax)}
                  onChange={v => zetFilterDeel({ looptijdMax: Number(v) })}
                />
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: 'block', marginBottom: 6 }}>Aangepaste periode (overschrijft de snelkeuze)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="date" aria-label="Van datum" value={filter.datumVan}
                    onChange={e => zetFilterDeel({ datumVan: e.target.value })}
                    style={{ height: 34, border: `1px solid ${colors.borderStrong}`, borderRadius: 8, padding: '0 8px', font: 'inherit', color: colors.bodyStrong, background: colors.surfaceAlt }}
                  />
                  <span style={{ color: colors.muted }}>–</span>
                  <input
                    type="date" aria-label="Tot datum" value={filter.datumTot}
                    onChange={e => zetFilterDeel({ datumTot: e.target.value })}
                    style={{ height: 34, border: `1px solid ${colors.borderStrong}`, borderRadius: 8, padding: '0 8px', font: 'inherit', color: colors.bodyStrong, background: colors.surfaceAlt }}
                  />
                </div>
              </div>
            </div>
          </FilterDropdown>

          <input
            type="search"
            value={zoekInput}
            onChange={e => setZoekInput(e.target.value)}
            placeholder="Zoek op adres…"
            aria-label="Zoek op adres"
            className="vui-input"
            style={{ width: 200, height: 36, borderRadius: 10, border: `1px solid ${colors.borderStrong}`, padding: '0 12px', fontSize: 13, background: colors.surfaceAlt }}
          />

          <span style={{ flex: 1 }} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: colors.bodyStrong, cursor: 'pointer' }}>
            <Switch checked={filter.alleenEigen} onChange={v => zetFilterDeel({ alleenEigen: v })} ariaLabel="Alleen eigen verkopen" />
            Alleen eigen verkopen
          </label>
          <button
            type="button"
            onClick={() => { setZoekInput(''); zetFilterVolledig(standaard) }}
            style={{ fontSize: 13, fontWeight: 600, color: colors.body, textDecoration: 'underline', textUnderlineOffset: 3, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Herstel
          </button>
        </FilterBar>
      </div>

      {fout && (
        <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: '#FFFBEE', border: '1px solid #F1DFA6', color: '#7A5A00', fontSize: 13.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{fout}</span>
          <Button variant="secondary" size="sm" onClick={() => zetFilterVolledig({ ...filter })}>Opnieuw proberen</Button>
        </div>
      )}

      {geenResultaten ? (
        <EmptyState
          titel="Geen transacties met deze filters"
          beschrijving="Er voldoen geen transacties aan de huidige combinatie van filters. Verbreed de zoekopdracht of wis de filters."
          actie={<Button variant="primary" size="sm" onClick={() => { setZoekInput(''); zetFilterVolledig(standaard) }}>Filters wissen</Button>}
        />
      ) : (
        <>
          <div className="vui-marktanalyse-tegels" style={{ marginBottom: 14 }}>
            <StatTile
              label="Transacties in selectie"
              hero
              waarde={laden ? undefined : nu.n}
              waarschuwing={laden ? '—' : undefined}
              opmaak={n => nlNL.format(Math.round(n))}
              delta={laden ? undefined : { tekst: vorig.n < MIN_N_VERGELIJKING ? 'geen vergelijking' : procent(berekenDelta(nu.n, vorig.n)), richting: vorig.n < MIN_N_VERGELIJKING ? null : richtingVanDelta(berekenDelta(nu.n, vorig.n), 0) }}
              bijschrift={`van ${nlNL.format(resultaat.totaal)} · vs vorige periode`}
            />
            <StatTile
              label="Mediaan prijs"
              waarde={laden || nu.mediaanPrijs == null ? undefined : nu.mediaanPrijs}
              waarschuwing={laden ? '—' : nu.mediaanPrijs == null ? '—' : undefined}
              opmaak={euro}
              delta={laden || nu.mediaanPrijs == null ? undefined : { tekst: vorig.n < MIN_N_VERGELIJKING ? 'geen vergelijking' : procent(berekenDelta(nu.mediaanPrijs, vorig.mediaanPrijs)), richting: vorig.n < MIN_N_VERGELIJKING ? null : richtingVanDelta(berekenDelta(nu.mediaanPrijs, vorig.mediaanPrijs), 1) }}
              bijschrift={`n = ${nlNL.format(nu.n)}`}
            />
            <StatTile
              label="Mediaan € per m²"
              waarde={laden || nu.mediaanM2 == null ? undefined : nu.mediaanM2}
              waarschuwing={laden ? '—' : nu.mediaanM2 == null ? '—' : undefined}
              opmaak={euro}
              delta={laden || nu.mediaanM2 == null ? undefined : { tekst: vorig.n < MIN_N_VERGELIJKING ? 'geen vergelijking' : procent(berekenDelta(nu.mediaanM2, vorig.mediaanM2)), richting: vorig.n < MIN_N_VERGELIJKING ? null : richtingVanDelta(berekenDelta(nu.mediaanM2, vorig.mediaanM2), 1) }}
              bijschrift={`n = ${nlNL.format(nu.n)}`}
            />
            <StatTile
              label="Mediaan looptijd"
              waarde={laden || nu.mediaanLooptijd == null ? undefined : nu.mediaanLooptijd}
              waarschuwing={laden ? '—' : nu.mediaanLooptijd == null ? '—' : undefined}
              opmaak={dagen}
              delta={laden || nu.mediaanLooptijd == null ? undefined : { tekst: vorig.n < MIN_N_VERGELIJKING ? 'geen vergelijking' : `${(berekenDelta(nu.mediaanLooptijd, vorig.mediaanLooptijd, 'absoluut') ?? 0) > 0 ? '+' : ''}${(berekenDelta(nu.mediaanLooptijd, vorig.mediaanLooptijd, 'absoluut') ?? 0).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} dgn`, richting: vorig.n < MIN_N_VERGELIJKING ? null : richtingVanDelta(berekenDelta(nu.mediaanLooptijd, vorig.mediaanLooptijd, 'absoluut'), -1) }}
              bijschrift={`n = ${nlNL.format(nu.n)}`}
            />
            <StatTile
              label="% t.o.v. vraagprijs"
              waarde={laden || nu.pctTovVraag == null ? undefined : nu.pctTovVraag}
              waarschuwing={laden ? '—' : nu.pctTovVraag == null ? '—' : undefined}
              opmaak={v => procent(v)}
              delta={laden || nu.pctTovVraag == null ? undefined : { tekst: vorig.n < MIN_N_VERGELIJKING ? 'geen vergelijking' : `${(berekenDelta(nu.pctTovVraag, vorig.pctTovVraag, 'absoluut') ?? 0) > 0 ? '+' : ''}${(berekenDelta(nu.pctTovVraag, vorig.pctTovVraag, 'absoluut') ?? 0).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} pt`, richting: vorig.n < MIN_N_VERGELIJKING ? null : richtingVanDelta(berekenDelta(nu.pctTovVraag, vorig.pctTovVraag, 'absoluut'), 1) }}
              bijschrift={`n = ${nlNL.format(nu.n)}`}
            />
          </div>

          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 'var(--merk-radius-card-lg, 18px)', boxShadow: 'var(--merk-shadow-card, 0 2px 12px rgba(20,24,27,.04))', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: colors.text, margin: 0 }}>Transacties</h2>
                <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 2 }}>Gesorteerd op <b style={{ color: colors.bodyStrong }}>{sorteerLabel}</b></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
                {/* Eigen scrollstrip i.p.v. de paginabreedte op te rekken — 6 segmenten passen niet op 390 px (les 23 sep 2026: overflow altijd op het kleinste element dat het nodig heeft). */}
                <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                  <SegmentedToggle
                    size="sm"
                    options={SORT_PRESETS.map(p => ({ value: `${p.key}|${p.dir}`, label: p.kort }))}
                    value={`${filter.sortKey}|${filter.sortDir}`}
                    onChange={v => { const [key, dir] = v.split('|'); zetFilterDeel({ sortKey: key, sortDir: dir as 'asc' | 'desc' }) }}
                    style={{ flexShrink: 0 }}
                  />
                </div>
                <span title={filter.alleenEigen ? 'Klaar om te exporteren' : 'Alleen eigen verkopen mogen geëxporteerd worden'} style={{ position: 'relative', display: 'inline-flex' }}>
                  <Button variant="secondary" size="sm" onClick={exporteerCsv} disabled={!filter.alleenEigen}>Exporteer CSV</Button>
                  {filter.alleenEigen && (
                    <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--merk-accent)', boxShadow: `0 0 0 2px ${colors.surface}` }} />
                  )}
                </span>
              </div>
            </div>

            <DataTable
              columns={kolommen}
              data={rijen}
              getRowId={r => r.id}
              sortering={huidigeSortering}
              onSorteerKlik={sorteerKlik}
              onRijKlik={r => setSheetRij(r)}
              laden={laden}
              stickyTop={tabelKopTop}
              paginatie={{
                pagina: filter.pagina,
                totaal: resultaat.totaal,
                perPagina: 50,
                onVorige: () => zetFilterDeel({ pagina: Math.max(1, filter.pagina - 1) }),
                onVolgende: () => zetFilterDeel({ pagina: filter.pagina + 1 }),
              }}
            />
          </div>
        </>
      )}

      {melding && (
        <div style={{ marginTop: 14, borderRadius: 10, background: 'var(--merk-zacht)', border: '1px solid var(--merk-rand)', padding: '9px 14px' }}>
          <p style={{ fontSize: 12.5, color: 'var(--merk-diep)', margin: 0 }}>{melding}</p>
        </div>
      )}

      <Sheet
        open={sheetRij !== null}
        onOpenChange={o => { if (!o) setSheetRij(null) }}
        titel={sheetRij?.adres ?? ''}
        omschrijving={sheetRij ? `${sheetRij.wijk ?? '—'}, ${sheetRij.plaats ?? '—'} · ${sheetRij.woningtype_sub ?? '—'}` : undefined}
        voet={
          sheetRij && (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="primary" size="sm" onClick={() => setDossierModalOpen(true)}>Gebruik als referentie</Button>
            </div>
          )
        }
      >
        {sheetRij && <SheetInhoud rij={sheetRij} kantoorNaam={kantoorNaam} />}
      </Sheet>

      {dossierModalOpen && (
        <Modal onClose={() => setDossierModalOpen(false)} title="Kies een dossier" maxWidth={480}>
          <p style={{ fontSize: 12.5, color: colors.body, margin: '0 0 12px' }}>
            {sheetRij?.adres} wordt toegevoegd als handmatige referentie aan de waardering van het gekozen dossier.
          </p>
          <input
            type="search"
            value={dossierZoek}
            onChange={e => setDossierZoek(e.target.value)}
            placeholder="Zoek op adres…"
            style={{ width: '100%', borderRadius: 10, border: `1px solid ${colors.borderStrong}`, padding: '9px 12px', fontSize: 13.5, marginBottom: 12 }}
          />
          {dossierFout && <p style={{ fontSize: 12.5, color: '#DC2626', margin: '0 0 10px' }}>{dossierFout}</p>}
          {dossiers === null ? (
            <p style={{ fontSize: 12.5, color: colors.muted }}>Dossiers laden…</p>
          ) : gefilterdeDossiers.length === 0 ? (
            <p style={{ fontSize: 12.5, color: colors.muted }}>Geen dossiers gevonden.</p>
          ) : (
            <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 6 }}>
              {gefilterdeDossiers.map(d => (
                <button
                  key={d.id}
                  type="button"
                  disabled={toevoegenBezig !== null}
                  onClick={() => meenemenAlsReferentie(d)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '10px 12px', background: colors.surface, cursor: toevoegenBezig !== null ? 'default' : 'pointer', fontSize: 13, color: colors.text, fontWeight: 600 }}
                >
                  <span>{d.adres}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--merk)' }}>{toevoegenBezig === d.id ? 'Bezig…' : 'Kies'}</span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

// ── Plaats/wijk-kiezer (dropdown-body), zelfde patroon als MarktanalyseExplorer ──
function PlaatsWijkKiezer({
  plaatsen,
  filter,
  zetFilterDeel,
}: {
  plaatsen: { label: string; n: number; wijken: { label: string; n: number }[] }[]
  filter: TransactiesFilterState
  zetFilterDeel: (deel: Partial<TransactiesFilterState>) => void
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
                  zetFilterDeel({ plaatsen: plaatsen2, wijken: wijken2 })
                }}
              />
              {wijkenGefilterd.map(w => {
                const key = `${p.label}|${w.label}`
                return (
                  <Checkbox
                    key={key}
                    label={w.label}
                    n={w.n}
                    ingesprongen
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

// ── Sheet-inhoud: alle velden + minikaart-placeholder (7.1 BasisKaart nog niet gemerged) ──
function veld(label: string, waarde: React.ReactNode, kleur?: string) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, color: colors.muted }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: kleur ?? colors.text, fontVariantNumeric: 'tabular-nums' }}>{waarde}</span>
    </div>
  )
}

function SheetSectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '13px 0', borderBottom: `1px solid ${colors.border}` }}>
      <h3 style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: colors.muted, margin: '0 0 9px' }}>{titel}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 16px' }}>{children}</div>
    </div>
  )
}

/** Deterministische pseudo-positie uit het transactie-id — géén echte coördinaat (die staan alleen op `transacties_met_coordinaten`, hier niet opgehaald). Puur voor een levendige placeholder tot 7.1 (`BasisKaart`, MapLibre) gemerged is. */
function pseudoPositie(id: string): { x: number; y: number } {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return { x: 12 + (hash % 76), y: 14 + ((hash >> 8) % 62) }
}

function MinikaartPlaceholder({ rij }: { rij: TransactieRow }) {
  const { x, y } = pseudoPositie(rij.id)
  return (
    <div
      title="Kaartweergave volgt zodra item 7.1 (BasisKaart) gemerged is"
      style={{
        position: 'relative', height: 118, borderRadius: 'var(--merk-radius-md, 12px)', overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        background: 'radial-gradient(140px 100px at 28% 22%, rgba(var(--merk-rgb, 26,107,69),.16), transparent 70%), linear-gradient(135deg, #EAF2F7, #F6FAFC)',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(20,24,27,.05) 0 1px, transparent 1px 27px), repeating-linear-gradient(90deg, rgba(20,24,27,.05) 0 1px, transparent 1px 27px)',
        }}
      />
      <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 22, height: 27, marginLeft: -11, marginTop: -27 }}>
        <svg viewBox="0 0 26 32" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 2px 3px rgba(20,24,27,.28))' }}>
          <circle cx={13} cy={13} r={15} fill="var(--merk)" opacity={0.16} />
          <path d="M13 2.5 23.5 13 13 23.5 2.5 13Z" fill="none" stroke="var(--merk-accent)" strokeWidth={2} />
          <path d="M13 6.5 19.5 13 13 19.5 6.5 13Z" fill="var(--merk)" />
          <circle cx={13} cy={13} r={2.1} fill="#fff" />
        </svg>
      </div>
      {rij.wijk && (
        <span
          style={{
            position: 'absolute', left: 10, bottom: 10, fontSize: 11, fontWeight: 800, color: 'var(--merk-diep)',
            background: 'rgba(255,255,255,.88)', padding: '3px 10px', borderRadius: 'var(--merk-radius-pill, 9999px)',
            boxShadow: '0 1px 3px rgba(20,24,27,.12)',
          }}
        >
          {rij.wijk}
        </span>
      )}
    </div>
  )
}

function SheetInhoud({ rij, kantoorNaam }: { rij: TransactieRow; kantoorNaam: string }) {
  const ratio = ratioTovVraagprijs(rij)
  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <MinikaartPlaceholder rij={rij} />
      </div>
      <SheetSectie titel="Woning">
        {veld('Plaats', rij.plaats ?? '—')}
        {veld('Wijk', rij.wijk ?? '—')}
        {veld('Type', rij.woningtype_sub ?? '—')}
        {veld('Bouwjaar', rij.bouwjaar ?? '—')}
        {veld('Woonoppervlak', m2(rij.woonoppervlak_m2))}
        {veld('Perceel', rij.perceel_m2 == null ? '—' : m2(rij.perceel_m2))}
      </SheetSectie>
      <SheetSectie titel="Prijs">
        {veld('Verkoopprijs', euro(rij.verkoopprijs))}
        {veld('Vraagprijs', euro(rij.vraagprijs))}
        {veld('€ per m²', euro(rij.prijs_m2))}
        {veld('T.o.v. vraagprijs', procent(ratio), ratio != null && ratio > 0 ? colors.primary : ratio != null && ratio < 0 ? '#B45309' : undefined)}
      </SheetSectie>
      <SheetSectie titel="Verkoop">
        {veld('Verkoopdatum', datum(rij.verkoopdatum))}
        {veld('Looptijd', dagen(rij.looptijd_dagen))}
        {veld('Verkocht door', verkochtDoorLabel(rij, kantoorNaam))}
      </SheetSectie>
      <div style={{ padding: '13px 0' }}>
        <h3 style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: colors.muted, margin: '0 0 9px' }}>Kenmerken</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 16px' }}>
          {veld('Energielabel', rij.energielabel ?? '—')}
          {veld('Kamers', rij.kamers ?? '—')}
          {veld('Tuin', rij.tuin ? 'Ja' : 'Nee')}
          {veld('Garage', rij.garage ? 'Ja' : 'Nee')}
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: colors.muted, margin: '4px 0 0' }}>Blader met ↑ / ↓ door de rijen op deze pagina.</p>
    </div>
  )
}
