'use client'

/**
 * DataTable — dichte, sorteerbare tabel op TanStack Table v9 (item 6.2,
 * docs/ontwerp/transacties.html § `.tabel`). TanStack v9 heeft een nieuwe,
 * feature-gebaseerde API (`useTable`/`tableFeatures`, geen `useReactTable`/
 * `getCoreRowModel` meer — zie `node_modules/@tanstack/react-table/skills/
 * getting-started/SKILL.md`). Deze tabel gebruikt bewust **geen**
 * sorteer-/pagineerfeature van TanStack: sortering en paginering gebeuren
 * server-side via de RPC `transacties_zoeken` (§ 3.1), TanStack levert alleen
 * het kolom-/rij-/celmodel en `FlexRender`. Zie
 * `node_modules/@tanstack/table-core/skills/client-vs-server/SKILL.md`.
 *
 * Kent zijn data niet zelf: de aanroeper geeft de huidige paginarijen, het
 * totaal en de sorteerstand mee, en krijgt een klik op een sorteerbare
 * kolomkop terug via `onSorteerKlik(kolomId)`. Dichte rijen (Stripe-achtig):
 * kleine padding, geen zebra, hover-highlight, sticky kop.
 *
 * Gebruik:
 *   const kolommen: DataTableKolom<Rij>[] = [
 *     { id: 'adres', header: 'Adres', cell: ({ row }) => row.original.adres },
 *     { id: 'prijs', header: 'Prijs', meta: { num: true, sorteerbaar: true }, cell: ({ row }) => euro(row.original.prijs) },
 *   ]
 *   <DataTable columns={kolommen} data={rijen} sortering={{ key: 'prijs', dir: 'desc' }}
 *     onSorteerKlik={k => ...} onRijKlik={r => openSheet(r)}
 *     paginatie={{ pagina: 1, totaal: 420, perPagina: 50, onVorige, onVolgende }} />
 */

import type { ReactNode } from 'react'
import { tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import { colors } from './tokens'
import { Skeleton } from './Skeleton'

/** Gedeelde features-configuratie — alléén het `num`/`sorteerbaar`-metaslot, geen sorteer-/pagineerfeature (zie bestandscommentaar). */
export const dataTableFeatures = tableFeatures({
  columnMeta: {} as { num?: boolean; sorteerbaar?: boolean },
})

/** Kolomdefinitie getypeerd op `dataTableFeatures` — gebruik dit type i.p.v. `ColumnDef` rechtstreeks. */
export type DataTableKolom<T extends RowData> = ColumnDef<typeof dataTableFeatures, T>

export type DataTableSortering = { key: string; dir: 'asc' | 'desc' }

export type DataTablePaginatie = {
  pagina: number
  totaal: number
  perPagina: number
  onVorige: () => void
  onVolgende: () => void
}

// ⚠️ `overflow-x: auto` op de wrapper maakt die zelf het "scroll-anker" i.p.v. de pagina,
// wat de sticky kolomkoppen stukmaakt (zelfde valkuil als docs/ontwerp/transacties.html
// § `.tabel-wrap`-commentaar: "maakt zelf een scroll-anker, wat de sticky kop stuk maakt").
// Daarom: geen horizontale scroll op brede schermen (de tabel past dan binnen `minBreedte`);
// pas onder 1040 px (waar de tabel breder is dan het scherm) schakelt de wrapper over op
// overflow-x:auto én valt de sticky kop terug op position:static — exact het prototype-gedrag.
const DATATABLE_STYLE = `
  .vui-datatable-rij:hover td { background: var(--merk-zacht); }
  .vui-datatable-th-sorteerbaar:hover { color: var(--merk); }
  @media (max-width: 1040px) {
    .vui-datatable-wrap { overflow-x: auto; }
    .vui-datatable-th { position: static !important; }
  }
`

export function DataTable<T extends RowData>({
  columns,
  data,
  getRowId,
  sortering,
  onSorteerKlik,
  onRijKlik,
  laden = false,
  leeg,
  paginatie,
  stickyTop = 178,
  minBreedte = 900,
}: {
  columns: DataTableKolom<T>[]
  data: T[]
  getRowId?: (row: T, index: number) => string
  sortering?: DataTableSortering
  /** Weggelaten = geen enkele kolom klikbaar, ongeacht `meta.sorteerbaar`. */
  onSorteerKlik?: (kolomId: string) => void
  onRijKlik?: (row: T) => void
  laden?: boolean
  /** Getoond onder de tabel als `data` leeg is en er niet geladen wordt. */
  leeg?: ReactNode
  paginatie?: DataTablePaginatie
  /**
   * Sticky-offset — volgt de hoogte van de sticky filterbalk erboven. Geef
   * een `var(--iets, 178px)`-string mee (i.p.v. een React-state-getal) als de
   * waarde bij scrollen/pillen-wijziging verandert: een her-render van deze
   * tabel (nieuwe `stickyTop`-prop) maakt de sticky kop stuk zodra hij een
   * groter getal krijgt terwijl er al gescrold is — vermoedelijk omdat
   * TanStack dan zijn kolom-/rijmodel opnieuw opbouwt tijdens het scrollen
   * (zie `docs/besluiten.md`, item 6.2). Een CSS-variabele die je zelf buiten
   * React om bijwerkt (`element.style.setProperty(...)`) omzeilt dat, net als
   * `docs/ontwerp/transacties.html` (`--tabel-kop-top`) al deed.
   */
  stickyTop?: number | string
  minBreedte?: number
}) {
  const table = useTable({ features: dataTableFeatures, columns, data, getRowId })

  return (
    <div>
      <style>{DATATABLE_STYLE}</style>
      <div className="vui-datatable-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'fixed', minWidth: minBreedte }}>
          <thead>
            {table.getHeaderGroups().map(groep => (
              <tr key={groep.id}>
                {groep.headers.map(header => {
                  const kolomId = header.column.id
                  const sorteerbaar = !!onSorteerKlik && header.column.columnDef.meta?.sorteerbaar === true
                  const actief = sortering?.key === kolomId
                  return (
                    <th
                      key={header.id}
                      onClick={sorteerbaar ? () => onSorteerKlik(kolomId) : undefined}
                      aria-sort={actief ? (sortering?.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`vui-datatable-th${sorteerbaar ? ' vui-datatable-th-sorteerbaar' : ''}`}
                      style={{
                        position: 'sticky',
                        top: stickyTop,
                        zIndex: 2,
                        background: 'rgba(255,255,255,.97)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        textAlign: header.column.columnDef.meta?.num ? 'right' : 'left',
                        fontSize: 11,
                        fontWeight: 800,
                        color: actief ? 'var(--merk-diep)' : colors.muted,
                        padding: 9,
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: sorteerbaar ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'normal',
                        lineHeight: 1.25,
                        verticalAlign: 'bottom',
                        transition: 'color .15s',
                      }}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      {actief && (
                        <span style={{ display: 'inline-block', width: 9, marginLeft: 2, color: 'var(--merk-diep)', fontSize: 9 }}>
                          {sortering?.dir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {laden
              ? Array.from({ length: 14 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {columns.map((kolom, j) => (
                      <td key={j} style={{ padding: '8px 9px', borderBottom: `1px solid ${colors.border}` }}>
                        <Skeleton height={12} width={kolom.meta?.num ? '55%' : '75%'} />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    tabIndex={onRijKlik ? 0 : undefined}
                    onClick={onRijKlik ? () => onRijKlik(row.original) : undefined}
                    onKeyDown={onRijKlik ? e => { if (e.key === 'Enter') onRijKlik(row.original) } : undefined}
                    className={onRijKlik ? 'vui-datatable-rij' : undefined}
                    style={{ cursor: onRijKlik ? 'pointer' : undefined }}
                  >
                    {row.getAllCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{
                          padding: '8px 9px',
                          borderBottom: `1px solid ${colors.border}`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: colors.bodyStrong,
                          textAlign: cell.column.columnDef.meta?.num ? 'right' : 'left',
                          fontVariantNumeric: cell.column.columnDef.meta?.num ? 'tabular-nums' : undefined,
                        }}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!laden && data.length === 0 && leeg}

      {paginatie && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, fontSize: 12.5, color: colors.body }}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {paginatie.totaal === 0 ? (
              '0 van 0'
            ) : (
              <>
                {((paginatie.pagina - 1) * paginatie.perPagina + 1).toLocaleString('nl-NL')}
                {'–'}
                {Math.min(paginatie.pagina * paginatie.perPagina, paginatie.totaal).toLocaleString('nl-NL')} van{' '}
                {paginatie.totaal.toLocaleString('nl-NL')}
              </>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={paginatie.pagina <= 1}
              onClick={paginatie.onVorige}
              style={knopStyle(paginatie.pagina <= 1)}
            >
              Vorige
            </button>
            <button
              type="button"
              disabled={paginatie.pagina * paginatie.perPagina >= paginatie.totaal}
              onClick={paginatie.onVolgende}
              style={knopStyle(paginatie.pagina * paginatie.perPagina >= paginatie.totaal)}
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function knopStyle(uit: boolean) {
  return {
    height: 32,
    padding: '0 14px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 10,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.surface,
    color: uit ? colors.muted : colors.bodyStrong,
    cursor: uit ? 'default' : 'pointer',
    opacity: uit ? 0.5 : 1,
  } as const
}
