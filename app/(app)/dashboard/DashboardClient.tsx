'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { relatieveDatum } from '@/lib/utils'
import type { ObjectRow } from '@/lib/supabase'

type StatusFilter = '' | 'draft' | 'published' | 'onder_bod' | 'verkocht'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Alles' },
  { value: 'draft', label: 'Concept' },
  { value: 'published', label: 'Gepubliceerd' },
  { value: 'onder_bod', label: 'Onder bod' },
  { value: 'verkocht', label: 'Verkocht' },
]

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: 'Concept',       color: '#9AA6A0', dot: '#9AA6A0' },
  published: { label: 'Gepubliceerd',  color: '#1A6B45', dot: '#1A6B45' },
  onder_bod: { label: 'Onder bod',     color: '#D97706', dot: '#D97706' },
  verkocht:  { label: 'Verkocht',      color: '#5A6B61', dot: '#5A6B61' },
}

interface Props {
  objecten: Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status'>[]
  totalPages: number
  currentPage: number
  search: string
  statusFilter: StatusFilter
  totalCount: number
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status]
  if (!cfg || status === 'draft') return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 20, border: `1px solid ${cfg.color}33`, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: cfg.color, background: `${cfg.color}11` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

export function DashboardClient({ objecten, totalPages, currentPage, search, statusFilter, totalCount }: Props) {
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

  const formatDatum = (iso: string) =>
    now !== null ? relatieveDatum(iso) : new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div>
      {/* Status-filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => updateUrl({ status: tab.value, page: '1' })}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              transition: 'all .15s',
              background: statusFilter === tab.value ? '#1A6B45' : '#fff',
              color: statusFilter === tab.value ? '#fff' : '#5A6B61',
              borderColor: statusFilter === tab.value ? '#1A6B45' : '#E4EAE6',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Zoekbalk — live filter via debounce, geen submit nodig */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="search"
          value={zoekterm}
          onChange={e => handleZoekChange(e.target.value)}
          placeholder="Zoek op adres…"
          className="vui-input"
          style={{ flex: 1, borderRadius: 11, border: '1px solid #E4EAE6', padding: '10px 14px', fontSize: 14, color: '#0E1A13', background: '#fff', outline: 'none' }}
        />
        {search && (
          <button
            type="button"
            onClick={() => { setZoekterm(''); updateUrl({ search: '', page: '1' }) }}
            style={{ borderRadius: 11, border: '1px solid #E4EAE6', padding: '10px 16px', fontSize: 14, color: '#9AA6A0', background: '#fff', cursor: 'pointer' }}
          >
            Wis
          </button>
        )}
      </div>

      {/* Resultaten header */}
      {totalCount > 0 && (
        <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 10 }}>{totalCount} object{totalCount === 1 ? '' : 'en'}</p>
      )}

      {/* Lege state */}
      {objecten.length === 0 && (
        <div style={{ borderRadius: 18, border: '2px dashed #E4EAE6', background: '#fff', padding: '64px 32px', textAlign: 'center' }}>
          {search || statusFilter ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13' }}>Geen objecten gevonden</p>
              <p style={{ fontSize: 14, color: '#9AA6A0', marginTop: 6 }}>
                {search && statusFilter
                  ? `Geen ${statusFilter === 'draft' ? 'concept' : 'gepubliceerde'} objecten voor "${search}".`
                  : search
                    ? 'Probeer een ander adres.'
                    : `Nog geen ${statusFilter === 'draft' ? 'concept-' : 'gepubliceerde '}objecten.`}
              </p>
              <button
                type="button"
                onClick={() => { setZoekterm(''); updateUrl({ search: '', status: '', page: '1' }) }}
                style={{ marginTop: 12, fontSize: 13, color: '#1A6B45', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Wis filters
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13' }}>Nog geen objecten</p>
              <p style={{ fontSize: 14, color: '#9AA6A0', marginTop: 6, marginBottom: 20 }}>Maak je eerste object aan om te beginnen.</p>
              <Link
                href="/object/new"
                style={{ display: 'inline-block', borderRadius: 11, background: '#1A6B45', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}
              >
                Nieuw object →
              </Link>
            </>
          )}
        </div>
      )}

      {/* Object-kaartjes */}
      {objecten.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {objecten.map(obj => (
            <Link
              key={obj.id}
              href={`/object/${obj.id}`}
              className="vui-card-hover"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, border: '1px solid #E9EFEB', background: '#fff', padding: '16px 20px', textDecoration: 'none' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0E1A13' }}>{obj.address}</p>
                  <StatusBadge status={obj.status ?? 'draft'} />
                </div>
                <p style={{ fontSize: 13, color: '#9AA6A0', marginTop: 3 }}>{formatDatum(obj.created_at)}</p>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#C7E6D5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {/* Paginering */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <button
            disabled={currentPage === 1}
            onClick={() => updateUrl({ page: String(currentPage - 1) })}
            aria-label="Vorige pagina"
            style={{ borderRadius: 10, border: '1px solid #E4EAE6', padding: '7px 14px', fontSize: 14, background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? .4 : 1, color: '#5A6B61' }}
          >
            ←
          </button>
          <span style={{ fontSize: 14, color: '#5A6B61' }} aria-live="polite">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => updateUrl({ page: String(currentPage + 1) })}
            aria-label="Volgende pagina"
            style={{ borderRadius: 10, border: '1px solid #E4EAE6', padding: '7px 14px', fontSize: 14, background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? .4 : 1, color: '#5A6B61' }}
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
