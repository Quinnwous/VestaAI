'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Wisselt de header-CTA op /prijzen: ingelogd → "Naar dashboard", anders Inloggen/Aanmelden.
// Client-side via /api/me zodat de pagina statisch blijft.
export function PrijzenAuthCta() {
  const [ingelogd, setIngelogd] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then((d: { ingelogd?: boolean }) => setIngelogd(!!d.ingelogd))
      .catch(() => {})
  }, [])

  if (ingelogd) {
    return (
      <Link
        href="/dashboard"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Naar dashboard →
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
        Inloggen
      </Link>
      <Link
        href="/login?aanmelden=1"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Aanmelden →
      </Link>
    </div>
  )
}
