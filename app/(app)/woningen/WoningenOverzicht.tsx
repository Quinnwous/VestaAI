'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  colors, radius, shadow,
  DataTable, type DataTableKolom, type DataTablePaginatie,
  SelectMenu,
  EmptyState,
} from '@/components/ui'
import { BasisKaart } from '@/components/kaart'
import { WoningenKaartLaag, type WoningKaartPunt, type WoningHoverInfo } from '@/components/WoningenKaartLaag'
import { WoningenKaartHover } from '@/components/WoningenKaartHover'
import { relatieveDatum, formatDatum } from '@/lib/utils'
import { berekenKaartBounds, WONINGEN_SORTEER_OPTIES, type WoningenSortering } from '@/lib/woningenOverzicht'
import type { ObjectFase } from '@/lib/supabase'

export type WoningRij = {
  id: string
  address: string
  created_at: string
  status: string
  fase: ObjectFase
  makelaar_id: string
}

export type WoningKaartRij = WoningRij & {
  lat: number | null
  lng: number | null
}

type FaseFilter = '' | ObjectFase
type Weergave = 'tabel' | 'kaart'

const FASE_TABS: { value: FaseFilter; label: string }[] = [
  { value: '', label: 'Alles' },
  { value: 'verkoopadvies', label: 'Verkoopadvies' },
  { value: 'in_verkoop', label: 'In verkoop' },
  { value: 'verkocht', label: 'Verkocht' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Concept', color: '#98A0A6' },
  published: { label: 'Gepubliceerd', color: 'var(--merk)' },
  onder_bod: { label: 'Onder bod', color: '#D97706' },
  verkocht: { label: 'Verkocht', color: '#5C6470' },
}

// Geen pitch-concept meer (item 1.9c, besluit Quinn 17 sep 2026): de badge
// toont alleen de fase, geen "Gewonnen/Verloren"-uitslag meer.
const FASE_BADGE: Record<ObjectFase, { label: string; color: string }> = {
  verkoopadvies: { label: 'Verkoopadvies', color: '#D97706' },
  in_verkoop: { label: 'In verkoop', color: 'var(--merk)' },
  verkocht: { label: 'Verkocht', color: '#5C6470' },
}

function FaseBadge({ fase }: { fase: ObjectFase }) {
  const cfg = FASE_BADGE[fase]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: radius.pill, border: `1px solid ${cfg.color}33`, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: cfg.color, background: `${cfg.color}11` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status]
  if (!cfg || status === 'draft') return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: radius.pill, border: `1px solid ${cfg.color}33`, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: cfg.color, background: `${cfg.color}11` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

/**
 * `/woningen` v2 (item 10.1, docs/roadmap.md § Fase 10) — filterbalk (zoeken,
 * fase, makelaar, sortering, tabel/kaart-toggle) + de gekozen weergave. Alle
 * standen staan in de URL (docs/ontwerpprincipes.md § Interactie). Data komt
 * al server-gefilterd/-gesorteerd binnen (page.tsx) — dit component regelt
 * alleen de interactie en de weergave zelf.
 */
export function WoningenOverzicht({
  weergave,
  rijen,
  kaartRijen,
  currentPage,
  search,
  faseFilter,
  makelaarFilter,
  sorteer,
  totalCount,
  faseTelling,
  makelaars,
}: {
  weergave: Weergave
  rijen: WoningRij[]
  kaartRijen: WoningKaartRij[]
  currentPage: number
  search: string
  faseFilter: FaseFilter
  makelaarFilter: string
  sorteer: WoningenSortering
  totalCount: number
  faseTelling: Record<ObjectFase, number>
  makelaars: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [zoekterm, setZoekterm] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateUrl = useCallback((params: Record<string, string>) => {
    const current = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => {
      if (v) current.set(k, v)
      else current.delete(k)
    })
    router.push(`${pathname}?${current.toString()}`)
  }, [router, pathname, searchParams])

  const handleZoekChange = (value: string) => {
    setZoekterm(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateUrl({ search: value, page: '1' })
    }, 300)
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const [now, setNow] = useState<number | null>(null)
  useEffect(() => { setNow(Date.now()) }, [])
  const formatRelatief = useCallback(
    (iso: string) => (now !== null ? relatieveDatum(iso) : formatDatum(iso)),
    [now],
  )

  const makelaarNaamPerId = useMemo(() => new Map(makelaars.map((m) => [m.id, m.name])), [makelaars])
  const geenEnkeleFilterActief = !search && !faseFilter && !makelaarFilter

  const makelaarOpties = useMemo(
    () => [{ waarde: '', label: 'Alle makelaars' }, ...makelaars.map((m) => ({ waarde: m.id, label: m.name }))],
    [makelaars],
  )

  const kolommen = useMemo<DataTableKolom<WoningRij>[]>(() => [
    {
      id: 'address',
      header: 'Adres',
      cell: ({ row }) => (
        <Link href={`/object/${row.original.id}`} style={{ color: colors.text, fontWeight: 700, textDecoration: 'none' }}>
          {row.original.address}
        </Link>
      ),
    },
    {
      id: 'fase',
      header: 'Fase',
      cell: ({ row }) => <FaseBadge fase={row.original.fase} />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (row.original.fase !== 'verkoopadvies' ? <StatusBadge status={row.original.status} /> : <span style={{ color: colors.muted }}>—</span>),
    },
    {
      id: 'makelaar',
      header: 'Makelaar',
      cell: ({ row }) => <span style={{ color: colors.body }}>{makelaarNaamPerId.get(row.original.makelaar_id) ?? '—'}</span>,
    },
    {
      id: 'aangemaakt',
      header: 'Aangemaakt',
      meta: { num: true },
      cell: ({ row }) => <span style={{ color: colors.muted }}>{formatRelatief(row.original.created_at)}</span>,
    },
  ], [makelaarNaamPerId, formatRelatief])

  const paginatie: DataTablePaginatie | undefined = weergave === 'tabel' && totalCount > 0
    ? {
      pagina: currentPage,
      totaal: totalCount,
      perPagina: 20,
      onVorige: () => updateUrl({ page: String(currentPage - 1) }),
      onVolgende: () => updateUrl({ page: String(currentPage + 1) }),
    }
    : undefined

  return (
    <div>
      {/* Filterbalk */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FASE_TABS.map((tab) => {
            const aantal = tab.value === '' ? Object.values(faseTelling).reduce((s, n) => s + n, 0) : faseTelling[tab.value as ObjectFase]
            const actief = faseFilter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => updateUrl({ fase: tab.value, page: '1' })}
                style={{
                  padding: '6px 14px',
                  borderRadius: radius.pill,
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  background: actief ? 'var(--merk)' : colors.surface,
                  color: actief ? 'var(--merk-op)' : colors.body,
                  borderColor: actief ? 'var(--merk)' : colors.borderStrong,
                }}
              >
                {tab.label}{aantal > 0 ? ` · ${aantal}` : ''}
              </button>
            )
          })}
        </div>

        <span style={{ flex: 1 }} />

        {makelaars.length > 1 && (
          <SelectMenu
            waarde={makelaarFilter}
            onChange={(v) => updateUrl({ makelaar: v, page: '1' })}
            opties={makelaarOpties}
            ariaLabel="Filter op makelaar"
            breedte={168}
          />
        )}

        <SelectMenu
          waarde={sorteer}
          onChange={(v) => updateUrl({ sorteer: v, page: '1' })}
          opties={WONINGEN_SORTEER_OPTIES.map((o) => ({ waarde: o.value, label: o.label }))}
          ariaLabel="Sorteer"
          breedte={150}
        />

        <div style={{ display: 'inline-flex', borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.borderStrong}` }}>
          {(['tabel', 'kaart'] as Weergave[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => updateUrl({ weergave: w })}
              style={{
                padding: '8px 15px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: weergave === w ? 'var(--merk)' : colors.surface,
                color: weergave === w ? 'var(--merk-op)' : colors.body,
              }}
            >
              {w === 'tabel' ? 'Tabel' : 'Kaart'}
            </button>
          ))}
        </div>
      </div>

      {/* Zoekbalk */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="search"
          value={zoekterm}
          onChange={(e) => handleZoekChange(e.target.value)}
          placeholder="Zoek op adres…"
          className="vui-input"
          style={{ flex: 1, maxWidth: 360, borderRadius: radius.md, border: `1px solid ${colors.borderStrong}`, padding: '10px 14px', fontSize: 14, color: colors.text, background: colors.surface, outline: 'none' }}
        />
        {search && (
          <button
            type="button"
            onClick={() => { setZoekterm(''); updateUrl({ search: '', page: '1' }) }}
            style={{ borderRadius: radius.md, border: `1px solid ${colors.borderStrong}`, padding: '10px 16px', fontSize: 14, color: colors.muted, background: colors.surface, cursor: 'pointer' }}
          >
            Wis
          </button>
        )}
      </div>

      {totalCount > 0 && (
        <p style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>{totalCount} woning{totalCount === 1 ? '' : 'en'}</p>
      )}

      {totalCount === 0 ? (
        <EmptyState
          titel={geenEnkeleFilterActief ? 'Nog geen woningen' : 'Geen woningen gevonden'}
          beschrijving={
            geenEnkeleFilterActief
              ? 'Maak je eerste woning aan om te beginnen.'
              : (search ? 'Probeer een ander adres.' : 'Pas de filters aan om meer woningen te zien.')
          }
          actie={
            geenEnkeleFilterActief ? (
              <Link
                href="/object/new"
                style={{ display: 'inline-block', borderRadius: radius.md, background: 'var(--merk)', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: 'var(--merk-op)', textDecoration: 'none' }}
              >
                Nieuwe woning →
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { setZoekterm(''); updateUrl({ search: '', fase: '', makelaar: '', page: '1' }) }}
                style={{ fontSize: 13, color: 'var(--merk)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Wis filters
              </button>
            )
          }
        />
      ) : weergave === 'tabel' ? (
        <div style={{ borderRadius: radius.cardLg, border: `1px solid ${colors.border}`, background: colors.surface, padding: 16, boxShadow: shadow.card }}>
          <DataTable
            columns={kolommen}
            data={rijen}
            getRowId={(r) => r.id}
            paginatie={paginatie}
            minBreedte={720}
            stickyTop={0}
          />
        </div>
      ) : (
        <WoningenKaartWeergave rijen={kaartRijen} />
      )}
    </div>
  )
}

function WoningenKaartWeergave({ rijen }: { rijen: WoningKaartRij[] }) {
  const router = useRouter()
  const [hover, setHover] = useState<WoningHoverInfo | null>(null)
  const [gehoveredId, setGehoveredId] = useState<string | null>(null)

  const punten = useMemo<WoningKaartPunt[]>(
    () => rijen.filter((r): r is WoningKaartRij & { lat: number; lng: number } => r.lat != null && r.lng != null),
    [rijen],
  )
  const zonderCoordinaat = rijen.length - punten.length
  const bounds = useMemo(() => berekenKaartBounds(punten.map((p) => ({ lat: p.lat, lng: p.lng }))), [punten])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 12 }} className="woningen-werkblad">
        <style>{'@media (max-width: 960px) { .woningen-werkblad { grid-template-columns: 1fr !important; } }'}</style>
        <BasisKaart bounds={bounds} hoogte={560}>
          <WoningenKaartLaag
            woningen={punten}
            geselecteerdId={gehoveredId}
            onHover={(info) => { setHover(info); setGehoveredId(info?.woning.id ?? null) }}
            onSelect={(id) => router.push(`/object/${id}`)}
          />
          <WoningenKaartHover info={hover} />
        </BasisKaart>

        <div style={{ borderRadius: radius.cardLg, border: `1px solid ${colors.border}`, background: colors.surface, boxShadow: shadow.card, padding: 10, height: 560, overflowY: 'auto' }}>
          {punten.length === 0 ? (
            <p style={{ fontSize: 13, color: colors.muted, padding: '20px 10px', textAlign: 'center' }}>
              Geen van deze woningen heeft nog een coördinaat.
            </p>
          ) : (
            punten.map((p) => (
              <Link
                key={p.id}
                href={`/object/${p.id}`}
                onMouseEnter={() => setGehoveredId(p.id)}
                onMouseLeave={() => setGehoveredId(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '9px 10px', borderRadius: radius.md, textDecoration: 'none',
                  background: gehoveredId === p.id ? 'var(--merk-zacht)' : 'transparent',
                }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700, color: colors.text }}>
                  {p.address}
                </span>
                <FaseBadge fase={p.fase} />
              </Link>
            ))
          )}
        </div>
      </div>
      {zonderCoordinaat > 0 && (
        <p style={{ fontSize: 12.5, color: colors.muted, marginTop: 10 }}>
          {zonderCoordinaat} woning{zonderCoordinaat === 1 ? '' : 'en'} zonder coördinaat {zonderCoordinaat === 1 ? 'staat' : 'staan'} niet op de kaart.
        </p>
      )}
    </div>
  )
}
