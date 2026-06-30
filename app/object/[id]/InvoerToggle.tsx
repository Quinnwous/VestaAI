'use client'

import { useState } from 'react'
import type { PropertyInput } from '@/lib/schemas'

type HoofdVeld = 'adres' | 'woningtype' | 'kamers' | 'oppervlak_m2' | 'bouwjaar' | 'energielabel' | 'vraagprijs' | 'usps' | 'doelgroep'

const LABELS: Record<HoofdVeld, string> = {
  adres: 'Adres',
  woningtype: 'Woningtype',
  kamers: 'Kamers',
  oppervlak_m2: 'Woonoppervlak',
  bouwjaar: 'Bouwjaar',
  energielabel: 'Energielabel',
  vraagprijs: 'Vraagprijs',
  usps: "USP's",
  doelgroep: 'Doelgroep',
}

const HOOFD_VELDEN: HoofdVeld[] = ['adres', 'woningtype', 'kamers', 'oppervlak_m2', 'bouwjaar', 'energielabel', 'vraagprijs', 'usps', 'doelgroep']

function formatWaarde(key: HoofdVeld, val: unknown): string {
  if (key === 'vraagprijs') {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(val))
  }
  if (key === 'oppervlak_m2') return `${val} m²`
  return String(val ?? '')
}

export function InvoerToggle({ invoer }: { invoer: PropertyInput }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Verberg invoer' : 'Toon oorspronkelijke invoer'}
        {invoer.taal === 'en' && (
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-1.5 py-0.5 leading-none">EN</span>
        )}
        {invoer.open_huis_datum && (
          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5 leading-none">Open huis {invoer.open_huis_datum}</span>
        )}
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {HOOFD_VELDEN.map(key => (
              <div key={key}>
                <dt className="text-xs text-gray-400">{LABELS[key]}</dt>
                <dd className="text-xs font-medium text-gray-800 mt-0.5 break-words">
                  {formatWaarde(key, invoer[key])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
