'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { relatieveDatum } from '@/lib/utils'
import type { ObjectRow, ObjectFase } from '@/lib/supabase'

type FaseFilter = '' | ObjectFase

const FASE_TABS: { value: FaseFilter; label: string }[] = [
  { value: '', label: 'Alles' },
  { value: 'acquisitie', label: 'Acquisitie' },
  { value: 'in_verkoop', label: 'In verkoop' },
  { value: 'verkocht', label: 'Verkocht' },
]

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: 'Concept',       color: '#98A0A6', dot: '#98A0A6' },
  published: { label: 'Gepubliceerd',  color: 'var(--merk,#1A6B45)', dot: 'var(--merk,#1A6B45)' },
  onder_bod: { label: 'Onder bod',     color: '#D97706', dot: '#D97706' },
  verkocht:  { label: 'Verkocht',      color: '#5C6470', dot: '#5C6470' },
}

const FASE_BADGE: Record<ObjectFase, { label: string; color: string }> = {
  acquisitie: { label: 'Acquisitie', color: '#D97706' },
  in_verkoop: { label: 'In verkoop', color: 'var(--merk,#1A6B45)' },
  verkocht: { label: 'Verkocht', color: '#5C6470' },
}

const UITSLAG_BADGE: Record<string, { label: string; color: string }> = {
  gewonnen: { label: 'Gewonnen', color: 'var(--merk,#1A6B45)' },
  verloren: { label: 'Verloren', color: '#DC2626' },
}

interface Props {
  objecten: Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status' | 'fase' | 'pitch_uitslag'>[]
  totalPages: number
  currentPage: number
  search: string
  faseFilter: FaseFilter
  totalCount: number
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status]
  if (!cfg || status === 'draft') return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 'var(--merk-radius-card-xl, 20px)', border: `1px solid ${cfg.color}33`, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: cfg.color, background: `${cfg.color}11` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function FaseBadge({ fase, pitchUitslag }: { fase: ObjectFase; pitchUitslag: string | null }) {
  // In de acquisitiefase telt de pitch-uitslag zwaarder dan de fase zelf.
  const uitslag = fase === 'acquisitie' && pitchUitslag ? UITSLAG_BADGE[pitchUitslag] : undefined
  const cfg = uitslag ?? FASE_BADGE[fase]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 'var(--merk-radius-card-xl, 20px)', border: `1px solid ${cfg.color}33`, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: cfg.color, background: `${cfg.color}11` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

export function DashboardClient({ objecten, totalPages, currentPage, search, faseFilter, totalCount }: Props) {
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
      {/* Fase-filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FASE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => updateUrl({ fase: tab.value, page: '1' })}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--merk-radius-card-xl, 20px)',
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              transition: 'all .15s',
              background: faseFilter === tab.value ? 'var(--merk,#1A6B45)' : '#fff',
              color: faseFilter === tab.value ? 'var(--merk-op,#fff)' : '#5C6470',
              borderColor: faseFilter === tab.value ? 'var(--merk,#1A6B45)' : '#E1E5E9',
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
          style={{ flex: 1, borderRadius: 'var(--merk-radius-md, 11px)', border: '1px solid #E1E5E9', padding: '10px 14px', fontSize: 14, color: '#14181B', background: '#fff', outline: 'none' }}
        />
        {search && (
          <button
            type="button"
            onClick={() => { setZoekterm(''); updateUrl({ search: '', page: '1' }) }}
            style={{ borderRadius: 'var(--merk-radius-md, 11px)', border: '1px solid #E1E5E9', padding: '10px 16px', fontSize: 14, color: '#98A0A6', background: '#fff', cursor: 'pointer' }}
          >
            Wis
          </button>
        )}
      </div>

      {/* Resultaten header */}
      {totalCount > 0 && (
        <p style={{ fontSize: 13, color: '#98A0A6', marginBottom: 10 }}>{totalCount} woning{totalCount === 1 ? '' : 'en'}</p>
      )}

      {/* Lege state */}
      {objecten.length === 0 && (
        <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '2px dashed #E1E5E9', background: '#fff', padding: '64px 32px', textAlign: 'center' }}>
          {search || faseFilter ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#14181B' }}>Geen woningen gevonden</p>
              <p style={{ fontSize: 14, color: '#98A0A6', marginTop: 6 }}>
                {search
                  ? 'Probeer een ander adres.'
                  : `Nog geen woningen in fase "${FASE_TABS.find(t => t.value === faseFilter)?.label}".`}
              </p>
              <button
                type="button"
                onClick={() => { setZoekterm(''); updateUrl({ search: '', fase: '', page: '1' }) }}
                style={{ marginTop: 12, fontSize: 13, color: 'var(--merk,#1A6B45)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Wis filters
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#14181B' }}>Nog geen woningen</p>
              <p style={{ fontSize: 14, color: '#98A0A6', marginTop: 6, marginBottom: 20 }}>Maak je eerste woning aan om te beginnen.</p>
              <Link
                href="/object/new"
                style={{ display: 'inline-block', borderRadius: 'var(--merk-radius-md, 11px)', background: 'var(--merk,#1A6B45)', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(var(--merk-rgb,26,107,69),.22)' }}
              >
                Nieuwe woning →
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--merk-radius-lg, 14px)', border: '1px solid #E6E9EC', background: '#fff', padding: '16px 20px', textDecoration: 'none' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#14181B' }}>{obj.address}</p>
                  <FaseBadge fase={(obj.fase ?? 'in_verkoop') as ObjectFase} pitchUitslag={obj.pitch_uitslag ?? null} />
                  {obj.fase !== 'acquisitie' && <StatusBadge status={obj.status ?? 'draft'} />}
                </div>
                <p style={{ fontSize: 13, color: '#98A0A6', marginTop: 3 }}>{formatDatum(obj.created_at)}</p>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--merk-rand,#C7E6D5)">
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
            style={{ borderRadius: 'var(--merk-radius-md, 10px)', border: '1px solid #E1E5E9', padding: '7px 14px', fontSize: 14, background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? .4 : 1, color: '#5C6470' }}
          >
            ←
          </button>
          <span style={{ fontSize: 14, color: '#5C6470' }} aria-live="polite">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => updateUrl({ page: String(currentPage + 1) })}
            aria-label="Volgende pagina"
            style={{ borderRadius: 'var(--merk-radius-md, 10px)', border: '1px solid #E1E5E9', padding: '7px 14px', fontSize: 14, background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? .4 : 1, color: '#5C6470' }}
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
