'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ObjectRow } from '@/lib/supabase'

interface Props {
  objecten: Pick<ObjectRow, 'id' | 'address' | 'created_at' | 'status'>[]
  totalPages: number
  currentPage: number
  search: string
  totalCount: number
}

export function DashboardClient({ objecten, totalPages, currentPage, search, totalCount }: Props) {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    updateUrl({ search: zoekterm, page: '1' })
  }

  const formatDatum = (iso: string) =>
    new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div>
      {/* Zoekbalk */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={zoekterm}
          onChange={e => handleZoekChange(e.target.value)}
          placeholder="Zoek op adres..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:border-gray-400 transition-colors"
        >
          Zoek
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setZoekterm(''); updateUrl({ search: '', page: '1' }) }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Wis
          </button>
        )}
      </form>

      {/* Resultaten header */}
      {totalCount > 0 && (
        <p className="text-xs text-gray-500 mb-3">{totalCount} object{totalCount === 1 ? '' : 'en'}</p>
      )}

      {/* Lege state */}
      {objecten.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center">
          {search ? (
            <>
              <p className="text-sm font-medium text-gray-700">Geen objecten gevonden</p>
              <p className="text-xs text-gray-500 mt-1">Probeer een ander adres.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Nog geen objecten</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Maak je eerste object aan om te beginnen.</p>
              <Link
                href="/object/new"
                className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Nieuw object →
              </Link>
            </>
          )}
        </div>
      )}

      {/* Object-kaartjes */}
      {objecten.length > 0 && (
        <div className="space-y-2">
          {objecten.map(obj => (
            <Link
              key={obj.id}
              href={`/object/${obj.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {obj.address}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDatum(obj.created_at)}</p>
              </div>
              <svg
                className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {/* Paginering */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={currentPage === 1}
            onClick={() => updateUrl({ page: String(currentPage - 1) })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:border-gray-400 transition-colors"
          >
            ←
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => updateUrl({ page: String(currentPage + 1) })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:border-gray-400 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
